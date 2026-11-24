<?php
// Student submissions API. Call as: /controllers/SubmissionController.php?action=<action>
// All POST requests need the header  X-Requested-With: XMLHttpRequest
//
//   POST submit   [student]   task_id, file          upload or replace own file (blocked once scored or closed)
//   POST remove   [student]   task_id                 remove own submission (only while not scored)
//   POST score    [faculty]   id, score, feedback      score '' clears the score
//   GET  download&id=[&view=1]                         faculty: any submission, student: only their own

require_once __DIR__ . '/../services/Api.php';
require_once __DIR__ . '/../services/Auth.php';
require_once __DIR__ . '/../services/FileStorage.php';
require_once __DIR__ . '/../models/Task.php';
require_once __DIR__ . '/../models/Submission.php';
require_once __DIR__ . '/TaskController.php';

class SubmissionController {
    private Task $tasks;
    private Submission $submissions;

    public function __construct() {
        $this->tasks = new Task();
        $this->submissions = new Submission();
    }

    public function submit(): never {
        $me = Auth::requireStudent();
        $t = $this->findTask(Api::int('task_id'));
        $mine = $this->submissions->getForStudent($t['id'], $me['id']);

        if (Task::isClosed($t)) throw new HttpError('Submissions closed at the due date.', 409);
        if ($mine && $mine['score'] !== null) throw new HttpError('This submission was already scored.', 409);

        $f = FileStorage::store('file');
        if (!$f) throw new InvalidArgumentException('Upload failed. Use pdf, doc(x), ppt(x), xls(x), txt, png, jpg or zip up to 30 MB.');
        if ($mine) FileStorage::remove($mine['file_path']);
        $this->submissions->save($t['id'], $me['id'], $f['name'], $f['path'], $f['size']);

        $saved = $this->submissions->getForStudent($t['id'], $me['id']);
        Api::ok('Your work was submitted.', ['submission' => TaskController::submissionJson($t, $saved)], $mine ? 200 : 201);
    }

    public function remove(): never {
        $me = Auth::requireStudent();
        $t = $this->findTask(Api::int('task_id'));
        $mine = $this->submissions->getForStudent($t['id'], $me['id']);
        if (!$mine) throw new HttpError('You have no submission for this task.', 404);
        if ($mine['score'] !== null) throw new HttpError('This submission was already scored.', 409);

        FileStorage::remove($mine['file_path']);
        $this->submissions->delete($mine['id']);
        Api::ok('Submission removed.');
    }

    public function score(): never {
        Auth::requireFaculty();
        $s = $this->submissions->getById(Api::int('id'));
        if (!$s) throw new HttpError('Submission not found.', 404);
        $t = $this->tasks->getById($s['task_id']);

        $raw = Api::str('score');
        if ($raw !== '' && !is_numeric($raw)) throw new InvalidArgumentException('Score must be a number.');
        $score = $raw === '' ? null : max(0, min((float)$raw, (float)$t['max_score']));
        $this->submissions->setScore($s['id'], $score, Api::str('feedback'));

        Api::ok('Score saved.', ['submission' => TaskController::submissionJson($t, $this->submissions->getById($s['id']))]);
    }

    public function download(): never {
        $me = Auth::user();
        $s = $this->submissions->getById(Api::int('id'));
        if (!$s) throw new HttpError('File not found.', 404);
        if (!Auth::isFaculty() && (int)$s['student_id'] !== (int)$me['id']) throw new HttpError('Not allowed.', 403);
        FileStorage::send($s['file_path'], $s['file_name'], isset($_GET['view']));
    }

    private function findTask(int $id): array {
        $t = $this->tasks->getById($id);
        if (!$t) throw new HttpError('Task not found.', 404);
        return $t;
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    Api::run(SubmissionController::class, [
        'submit'   => ['POST', 'submit'],
        'remove'   => ['POST', 'remove'],
        'score'    => ['POST', 'score'],
        'download' => ['GET', 'download'],
    ]);
}
