<?php
class SubmissionController extends Controller
{
    /** Shape a submission row for JSON (no internal file paths). Used by TaskController too. */
    public static function shape(array $s, array $task): array
    {
        return [
            'id'           => (int) $s['id'],
            'file_name'    => $s['file_name'],
            'file_size'    => (int) $s['file_size'],
            'ext'          => Util::ext($s['file_name']),
            'viewable'     => Util::viewable($s['file_name']),
            'submitted_at' => $s['submitted_at'],
            'is_late'      => Util::isLate($task, $s['submitted_at']),
            'score'        => $s['score'] !== null ? (float) $s['score'] : null,
            'feedback'     => $s['feedback'],
        ];
    }

    private function mine(int $taskId): ?array
    {
        $s = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ? AND student_id = ?');
        $s->execute([$taskId, $this->me['id']]);
        return $s->fetch() ?: null;
    }

    /** POST submissions.submit  (multipart: task_id, file) : student submits or replaces work. */
    public function submit()
    {
        if ($this->isFaculty()) Http::fail('Only students can submit work.', 403);

        $taskId = Request::int('task_id');
        $t = $this->find('tasks', $taskId);
        if (!$t) Http::fail('Task not found.', 404);

        $mine = $this->mine($taskId);
        $closed = $t['due_date'] && time() > strtotime($t['due_date']) && !$t['allow_late'];
        if ($closed) Http::fail('Submissions closed at the due date.', 403);
        if ($mine && $mine['score'] !== null) Http::fail('This work was already scored and can no longer be changed.', 409);

        $up = Uploader::one('file');
        if (!$up) Http::fail('Upload failed. Use pdf, doc(x), ppt(x), xls(x), txt, png, jpg or zip up to 30 MB.', 422);

        if ($mine) Uploader::remove($mine['file_path']);
        $this->pdo->prepare('INSERT INTO submissions (task_id, student_id, file_name, file_path, file_size) VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE file_name=VALUES(file_name), file_path=VALUES(file_path), file_size=VALUES(file_size), submitted_at=NOW()')
            ->execute([$taskId, $this->me['id'], $up[0], $up[1], $up[2]]);

        $saved = $this->mine($taskId);
        Http::ok($saved ? self::shape($saved, $t) : [], 'Your work was submitted.');
    }

    /** POST submissions.remove {task_id} : student un-submits (only if not scored yet). */
    public function remove()
    {
        if ($this->isFaculty()) Http::fail('Only students can remove their submission.', 403);

        $mine = $this->mine(Request::int('task_id'));
        if (!$mine) Http::fail('No submission found.', 404);
        if ($mine['score'] !== null) Http::fail('Scored work cannot be removed.', 409);

        Uploader::remove($mine['file_path']);
        $this->pdo->prepare('DELETE FROM submissions WHERE id = ?')->execute([$mine['id']]);
        Http::ok([], 'Submission removed.');
    }

    /** POST submissions.score {task_id, submission_id, score, feedback} : faculty grades. Empty score clears it. */
    public function score()
    {
        $this->requireFaculty();

        $t = $this->find('tasks', Request::int('task_id'));
        if (!$t) Http::fail('Task not found.', 404);

        $raw = Request::str('score');
        if ($raw !== '' && !is_numeric($raw)) Http::fail('Score must be a number.', 422);
        $score = $raw === '' ? null : max(0, min((float) $raw, (float) $t['max_score']));

        $st = $this->pdo->prepare('UPDATE submissions SET score=?, feedback=? WHERE id=? AND task_id=?');
        $st->execute([$score, Request::str('feedback'), Request::int('submission_id'), $t['id']]);

        Http::ok(['score' => $score], 'Score saved.');
    }
}
