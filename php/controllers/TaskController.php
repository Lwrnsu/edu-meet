<?php
class TaskController extends Controller
{
    /** Shape a task row for JSON (no internal file paths). */
    private function shape(array $t, array $atts = []): array
    {
        return [
            'id'          => (int) $t['id'],
            'title'       => $t['title'],
            'description' => $t['description'],
            'due_date'    => $t['due_date'],
            'max_score'   => (int) $t['max_score'],
            'allow_late'  => (int) $t['allow_late'] === 1,
            'created_at'  => $t['created_at'],
            'attachments' => array_map(function ($a) {
                return [
                    'id'        => (int) $a['id'],
                    'file_name' => $a['file_name'],
                    'file_size' => (int) $a['file_size'],
                    'ext'       => Util::ext($a['file_name']),
                    'viewable'  => Util::viewable($a['file_name']),
                ];
            }, $atts),
        ];
    }

    private function attachmentsFor(int $taskId): array
    {
        $s = $this->pdo->prepare('SELECT * FROM task_files WHERE task_id = ? ORDER BY id');
        $s->execute([$taskId]);
        return $s->fetchAll();
    }

    private function addFiles(int $taskId): void
    {
        foreach (Uploader::many('attachments') as [$name, $stored, $size]) {
            $this->pdo->prepare('INSERT INTO task_files (task_id, file_name, file_path, file_size) VALUES (?,?,?,?)')
                ->execute([$taskId, $name, $stored, $size]);
        }
    }

    /** GET tasks.list */
    public function index()
    {
        $st = $this->pdo->prepare('SELECT t.*, s.score,
            (SELECT COUNT(*) FROM submissions WHERE task_id = t.id) AS submitted_count
            FROM tasks t LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = ?
            ORDER BY t.created_at DESC, t.id DESC');
        $st->execute([$this->me['id']]);

        $atts = [];
        foreach ($this->pdo->query('SELECT * FROM task_files ORDER BY id')->fetchAll() as $a) {
            $atts[$a['task_id']][] = $a;
        }

        $tasks = [];
        foreach ($st->fetchAll() as $t) {
            $row = $this->shape($t, $atts[$t['id']] ?? []);
            $row['submitted_count'] = (int) $t['submitted_count'];
            $row['my_score']        = $t['score'] !== null ? (float) $t['score'] : null;
            $tasks[] = $row;
        }
        Http::ok(['tasks' => $tasks, 'total_students' => count(Db::students())]);
    }

    /** GET tasks.show&id= : one task. Students get their own work, faculty get all submissions. */
    public function show()
    {
        $t = $this->find('tasks', Request::int('id'));
        if (!$t) Http::fail('Task not found.', 404);

        $data = ['task' => $this->shape($t, $this->attachmentsFor((int) $t['id']))];

        if (!$this->isFaculty()) {
            $s = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ? AND student_id = ?');
            $s->execute([$t['id'], $this->me['id']]);
            $mine = $s->fetch() ?: null;

            $closed = $t['due_date'] && time() > strtotime($t['due_date']) && !$t['allow_late'];
            $data['closed']     = (bool) $closed;
            $data['my_submission'] = $mine ? SubmissionController::shape($mine, $t) : null;
            $data['can_submit'] = !$closed && !($mine && $mine['score'] !== null);
            $data['can_remove'] = $mine && $mine['score'] === null;
            Http::ok($data);
        }

        $q = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ?');
        $q->execute([$t['id']]);
        $subs = [];
        foreach ($q->fetchAll() as $r) $subs[$r['student_id']] = $r;

        $rows = [];
        $scores = [];
        foreach (Db::students() as $stu) {
            $sub = $subs[$stu['id']] ?? null;
            if ($sub && $sub['score'] !== null) $scores[] = (float) $sub['score'];
            $rows[] = [
                'student'    => ['id' => (int) $stu['id'], 'name' => $stu['name']],
                'submission' => $sub ? SubmissionController::shape($sub, $t) : null,
            ];
        }
        $data['submissions'] = $rows;
        $data['stats'] = [
            'students'  => count($rows),
            'submitted' => count($subs),
            'scored'    => count($scores),
            'average'   => $scores ? array_sum($scores) / count($scores) : null,
        ];
        Http::ok($data);
    }

    /**
     * POST tasks.save (multipart/form-data)
     * fields: id (omit to create), title, description, due_date, max_score, allow_late,
     *         remove_att[] (attachment ids), attachments[] (files)
     */
    public function save()
    {
        $this->requireFaculty();

        $title = Request::str('title');
        if ($title === '') Http::fail('Title is required.', 422);

        $dueRaw = Request::str('due_date');
        $due = $dueRaw !== '' ? date('Y-m-d H:i:s', strtotime($dueRaw)) : null;
        $v = [$title, Request::str('description'), $due, max(1, Request::int('max_score', 100)), Request::flag('allow_late') ? 1 : 0];

        $id = Request::int('id');
        if ($id) {
            if (!$this->find('tasks', $id)) Http::fail('Task not found.', 404);
            $this->pdo->prepare('UPDATE tasks SET title=?, description=?, due_date=?, max_score=?, allow_late=? WHERE id=?')
                ->execute(array_merge($v, [$id]));

            foreach ((array) Request::get('remove_att', []) as $aid) {
                $s = $this->pdo->prepare('SELECT * FROM task_files WHERE id = ? AND task_id = ?');
                $s->execute([(int) $aid, $id]);
                if ($a = $s->fetch()) {
                    Uploader::remove($a['file_path']);
                    $this->pdo->prepare('DELETE FROM task_files WHERE id = ?')->execute([$a['id']]);
                }
            }
            $this->addFiles($id);
            Http::ok(['id' => $id], 'Task updated.');
        }

        $this->pdo->prepare('INSERT INTO tasks (title, description, due_date, max_score, allow_late, created_by) VALUES (?,?,?,?,?,?)')
            ->execute(array_merge($v, [$this->me['id']]));
        $newId = (int) $this->pdo->lastInsertId();
        $this->addFiles($newId);
        Http::ok(['id' => $newId], 'Task posted.');
    }

    /** POST tasks.delete {id} : removes task, attachments, submissions and their files. */
    public function delete()
    {
        $this->requireFaculty();
        $id = Request::int('id');
        if (!$this->find('tasks', $id)) Http::fail('Task not found.', 404);

        foreach (['task_files', 'submissions'] as $tbl) {
            $s = $this->pdo->prepare("SELECT file_path FROM $tbl WHERE task_id = ?");
            $s->execute([$id]);
            foreach ($s->fetchAll() as $r) Uploader::remove($r['file_path']);
        }
        $this->pdo->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);
        Http::ok([], 'Task deleted.');
    }
}
