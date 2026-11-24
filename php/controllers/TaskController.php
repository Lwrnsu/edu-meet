<?php
// Class tasks API. Call as: /controllers/TaskController.php?action=<action>
// All POST requests need the header  X-Requested-With: XMLHttpRequest
// Responses are ApiResponse JSON: { response, code, message, body }
// except the file downloads (attachment, downloadAll, exportScores).
//
//   GET  list                         all tasks (faculty: submission counts, student: own score)
//   GET  show&id=                     one task + attachments + (student) own submission / (faculty) roster
//   POST save        [faculty]        create or update a task (multipart; see save())
//   POST delete      [faculty]        id
//   GET  attachment&id=[&view=1]      download / view a task attachment
//   GET  downloadAll&id= [faculty]    ZIP of every submission
//   GET  exportScores&id= [faculty]   CSV of scores

require_once __DIR__ . '/../services/Api.php';
require_once __DIR__ . '/../services/Auth.php';
require_once __DIR__ . '/../services/FileStorage.php';
require_once __DIR__ . '/../models/Task.php';
require_once __DIR__ . '/../models/Submission.php';
require_once __DIR__ . '/../models/ClassUser.php';

class TaskController {
    private Task $tasks;
    private Submission $submissions;
    private ClassUser $users;

    public function __construct() {
        $this->tasks = new Task();
        $this->submissions = new Submission();
        $this->users = new ClassUser();
    }

    public function list(): never {
        $me = Auth::user();
        $total = count($this->users->students());
        $rows = array_map(fn($t) => $this->taskJson($t) + [
            'attachment_count' => (int)$t['attachment_count'],
            'submission_count' => (int)$t['submission_count'],
            'student_count' => $total,
            'my_score' => $t['my_score'] !== null ? (float)$t['my_score'] : null,
        ], $this->tasks->getAll($me['id']));
        Api::ok('Tasks loaded.', ['tasks' => $rows, 'viewer' => $me]);
    }

    public function show(): never {
        $me = Auth::user();
        $t = $this->findTask(Api::int('id'));
        $body = [
            'task' => $this->taskJson($t),
            'attachments' => array_map(fn($a) => $this->attachmentJson($a), $this->tasks->getAttachments($t['id'])),
            'viewer' => $me,
        ];

        if (!Auth::isFaculty()) {
            $mine = $this->submissions->getForStudent($t['id'], $me['id']);
            $body['my_submission'] = $mine ? self::submissionJson($t, $mine) : null;
            $body['can_submit'] = !Task::isClosed($t) && !($mine && $mine['score'] !== null);
        } else {
            $subs = $this->submissions->getByTask($t['id']);
            $roster = [];
            foreach ($this->users->students() as $s) {
                $sub = $subs[$s['id']] ?? null;
                $roster[] = ['student' => ['id' => (int)$s['id'], 'name' => $s['name']],
                             'submission' => $sub ? self::submissionJson($t, $sub) : null];
            }
            $scored = array_filter($subs, fn($s) => $s['score'] !== null);
            $body['roster'] = $roster;
            $body['stats'] = [
                'students' => count($roster),
                'submitted' => count(array_filter($roster, fn($r) => $r['submission'])),
                'scored' => count($scored),
                'average' => $scored ? round(array_sum(array_column($scored, 'score')) / count($scored), 2) : null,
            ];
        }
        Api::ok('Task loaded.', $body);
    }

    // Multipart fields: id (optional, to update), title, description, due_date (e.g. 2026-12-01T23:59, '' = no due date),
    // max_score, allow_late (1/0), remove_attachments[] (ids), attachments[] (files).
    // When updating, any field that is not sent keeps its current value.
    public function save(): never {
        $me = Auth::requireFaculty();
        $id = Api::int('id');
        $existing = $id ? $this->findTask($id) : null;
        $in = Api::input();
        $has = fn($k) => array_key_exists($k, $in);

        $title = $has('title') || !$existing ? Api::str('title') : $existing['title'];
        if ($title === '') throw new InvalidArgumentException('Title is required.');

        if ($has('due_date')) {
            $due = Api::str('due_date');
            if ($due !== '' && strtotime($due) === false) throw new InvalidArgumentException('Due date is not a valid date.');
            $dueDate = $due !== '' ? date('Y-m-d H:i:s', strtotime($due)) : null;
        } else {
            $dueDate = $existing['due_date'] ?? null;
        }

        $v = [
            'title' => $title,
            'description' => $has('description') ? Api::str('description') : ($existing['description'] ?? ''),
            'due_date' => $dueDate,
            'max_score' => $has('max_score') ? max(1, Api::int('max_score')) : (int)($existing['max_score'] ?? 100),
            'allow_late' => $has('allow_late')
                ? (filter_var($in['allow_late'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0)
                : (int)($existing['allow_late'] ?? 1),
        ];

        if ($existing) {
            $this->tasks->update($id, $v);
            foreach ((array)($in['remove_attachments'] ?? []) as $aid) {
                if ($a = $this->tasks->removeAttachment((int)$aid, $id)) FileStorage::remove($a['file_path']);
            }
        } else {
            $id = $this->tasks->create($v, $me['id']);
        }
        foreach (FileStorage::storeMany('attachments') as $f) {
            $this->tasks->addAttachment($id, $f['name'], $f['path'], $f['size']);
        }
        Api::ok($existing ? 'Task updated.' : 'Task posted.', ['task' => $this->taskJson($this->tasks->getById($id))], $existing ? 200 : 201);
    }

    public function delete(): never {
        Auth::requireFaculty();
        $t = $this->findTask(Api::int('id'));
        foreach ($this->tasks->delete($t['id']) as $p) FileStorage::remove($p);
        Api::ok('Task deleted.');
    }

    public function attachment(): never {
        Auth::user();
        $a = $this->tasks->getAttachment(Api::int('id'));
        if (!$a) throw new HttpError('File not found.', 404);
        FileStorage::send($a['file_path'], $a['file_name'], isset($_GET['view']));
    }

    public function downloadAll(): never {
        Auth::requireFaculty();
        $t = $this->findTask(Api::int('id'));
        if (!class_exists('ZipArchive')) throw new HttpError('ZIP is not enabled on the server. Enable extension=zip in php.ini.', 500);

        $tmp = tempnam(sys_get_temp_dir(), 'zip');
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($this->submissions->getByTaskWithNames($t['id']) as $r) {
            $full = FileStorage::dir() . basename($r['file_path']);
            if (is_file($full)) $zip->addFile($full, preg_replace('/[\\\\\/:*?"<>|]/', '', $r['name'] . ' - ' . $r['file_name']));
        }
        $count = $zip->numFiles;
        $zip->close();
        if (!$count) { @unlink($tmp); throw new HttpError('No submissions to download yet.', 404); }

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="submissions-task-' . $t['id'] . '.zip"');
        header('Content-Length: ' . filesize($tmp));
        readfile($tmp);
        unlink($tmp);
        exit;
    }

    public function exportScores(): never {
        Auth::requireFaculty();
        $t = $this->findTask(Api::int('id'));
        $subs = $this->submissions->getByTask($t['id']);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="scores-task-' . $t['id'] . '.csv"');
        echo "\xEF\xBB\xBF";
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Student', 'Submitted', 'Score', 'Max score', 'Late', 'Feedback'], ',', '"', '');
        foreach ($this->users->students() as $s) {
            $r = $subs[$s['id']] ?? null;
            fputcsv($out, [
                $s['name'],
                $r ? $r['submitted_at'] : 'Not submitted',
                $r && $r['score'] !== null ? (float)$r['score'] : '',
                $t['max_score'],
                $r && Task::isLate($t, $r['submitted_at']) ? 'Yes' : '',
                $r ? $r['feedback'] : '',
            ], ',', '"', '');
        }
        exit;
    }

    // ---- helpers ----

    private function findTask(int $id): array {
        $t = $this->tasks->getById($id);
        if (!$t) throw new HttpError('Task not found.', 404);
        return $t;
    }

    private function taskJson(array $t): array {
        return [
            'id' => (int)$t['id'],
            'title' => $t['title'],
            'description' => $t['description'],
            'due_date' => $t['due_date'],
            'max_score' => (int)$t['max_score'],
            'allow_late' => (bool)$t['allow_late'],
            'closed' => Task::isClosed($t),
            'created_at' => $t['created_at'],
        ];
    }

    private function attachmentJson(array $a): array {
        return [
            'id' => (int)$a['id'],
            'file_name' => $a['file_name'],
            'file_size' => (int)$a['file_size'],
            'type' => FileStorage::ext($a['file_name']),
            'viewable' => FileStorage::viewable($a['file_name']),
        ];
    }

    public static function submissionJson(array $task, array $s): array {
        return [
            'id' => (int)$s['id'],
            'student_id' => (int)$s['student_id'],
            'file_name' => $s['file_name'],
            'file_size' => (int)$s['file_size'],
            'type' => FileStorage::ext($s['file_name']),
            'viewable' => FileStorage::viewable($s['file_name']),
            'submitted_at' => $s['submitted_at'],
            'late' => Task::isLate($task, $s['submitted_at']),
            'score' => $s['score'] !== null ? (float)$s['score'] : null,
            'feedback' => $s['feedback'],
        ];
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    Api::run(TaskController::class, [
        'list'         => ['GET', 'list'],
        'show'         => ['GET', 'show'],
        'save'         => ['POST', 'save'],
        'delete'       => ['POST', 'delete'],
        'attachment'   => ['GET', 'attachment'],
        'downloadAll'  => ['GET', 'downloadAll'],
        'exportScores' => ['GET', 'exportScores'],
    ]);
}
