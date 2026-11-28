<?php
/*
    TASKS — the Tasks and Activities tabs of a class.

    Tasks tab
      faculty   list()   name, deadline, "28/29 Submitted", Active/Closed, edit/delete
      student   list()   name, file handed in, date, score, Pending/Submitted/Missing
    Activities tab
      show()    the task's details (instructions, deadline, points, attachment)
                faculty: every student's submission, with grading
                student: their own submission, hand in / replace / unsubmit
    create() update() delete()   faculty
    submit() unsubmit()          student, while the task is open
    grade()                      faculty
    file()                       task attachment or a submitted file, after checking access

    Rules:
    - The class's professor (and the college dean of its department) manage tasks.
    - Every student of the class gets every task.
    - A task is open until its deadline, or until the faculty closes it.
      After that students can't hand in, change or remove work.
    - Handing in again replaces the old file and clears its grade.
    - Students are told when a task is posted and when their work is graded;
      the faculty is told when work is handed in.
*/
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../models/Task.php";
require_once __DIR__ . "/../services/ClassAccess.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../services/Notifier.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";

class TaskController {
    public const TITLE_MAX = 150;
    public const INSTRUCTIONS_MAX = 5000;
    public const MAX_SCORE_LIMIT = 1000;

    private Task $tasks;
    private ClassAccess $access;

    public function __construct(
        private PDO $pdo,
        private CurrentUser $user,
        private FileStorage $storage,
        private ?string $now = null          // "Y-m-d H:i:s"; tests pass a fixed time
    ) {
        $this->tasks = new Task($pdo);
        $this->access = new ClassAccess($pdo);
        // Deadlines are typed in school time, so "now" uses it too (APP_TIMEZONE, default Philippines).
        $this->now ??= (new DateTime('now', new DateTimeZone(getenv('APP_TIMEZONE') ?: 'Asia/Manila')))->format('Y-m-d H:i:s');
    }

    // ---------- read ----------

    public function list(int $classId, ?string $search = null): ApiResponse {
        if (($denied = $this->denyClass($classId)) !== null) {
            return $denied;
        }
        $manage = $this->access->canManage($this->user, $classId);
        $rows = $this->tasks->forClass($classId, $search);
        $ids = array_map(fn($r) => (int) $r['id'], $rows);

        if ($manage) {
            $students = array_keys($this->access->classStudents($classId));
            $counts = $this->tasks->submittedCounts($ids, $students);
            $tasks = array_map(fn($r) => $this->format($r) + [
                'submitted_count' => $counts[(int) $r['id']] ?? 0,
                'student_count'   => count($students),
            ], $rows);
        } else {
            $mine = $this->tasks->studentSubmissions($ids, $this->user->id);
            $tasks = array_map(fn($r) => $this->format($r) + [
                'my_submission' => isset($mine[(int) $r['id']]) ? $this->formatSubmission($mine[(int) $r['id']], $r) : null,
                'remark'        => $this->remark($r, $mine[(int) $r['id']] ?? null),
            ], $rows);
        }
        return new ApiResponse(true, 200, "Tasks loaded.", [
            'class'      => $this->access->classDetails($classId),
            'can_manage' => $manage,
            'tasks'      => $tasks,
        ]);
    }

    public function show(int $id): ApiResponse {
        $task = $this->tasks->find($id);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Task not found.", []);
        }
        $classId = (int) $task['class_id'];
        $manage = $this->access->canManage($this->user, $classId);
        $body = [
            'class'      => $this->access->classDetails($classId),
            'can_manage' => $manage,
            'task'       => $this->format($task),
        ];
        if ($manage) {
            $students = $this->access->classStudents($classId);
            $sections = [];
            foreach ($this->access->classBlocks($classId) as $s) {
                $sections[$s['id']] = $s['name'];
            }
            $subs = $this->tasks->submissions($id);
            $body['submissions'] = array_values(array_map(fn($s) => [
                'student'    => ['id' => $s['id'], 'name' => $s['name'], 'section' => $sections[$s['block_id']] ?? ''],
                'submission' => isset($subs[$s['id']]) ? $this->formatSubmission($subs[$s['id']], $task) : null,
                'remark'     => $this->remark($task, $subs[$s['id']] ?? null),
            ], $students));
            $body['submitted_count'] = count(array_intersect_key($subs, $students));
            $body['student_count'] = count($students);
        } else {
            $mine = $this->tasks->submission($id, $this->user->id);
            $body['my_submission'] = $mine === null ? null : $this->formatSubmission($mine, $task);
            $body['remark'] = $this->remark($task, $mine);
        }
        return new ApiResponse(true, 200, "Task loaded.", $body);
    }

    // ---------- faculty ----------

    public function create(int $classId, array $input, array $files): ApiResponse {
        if (($denied = $this->denyManage($classId)) !== null) {
            return $denied;
        }
        [$fields, $errors] = $this->validate($input, true);
        $errors = array_merge($errors, $this->fileErrors($files));
        if ($errors !== []) {
            return new ApiResponse(false, 400, $errors[0], ['errors' => $errors]);
        }
        $file = $files === [] ? null : $this->storage->store($files[0]);
        try {
            $id = $this->tasks->create($fields + [
                'class_id'   => $classId,
                'created_by' => $this->user->id,
                'attachment' => $file,
            ]);
        } catch (Throwable $e) {
            if ($file !== null) {
                $this->storage->delete($file['stored_name']);
            }
            throw $e;
        }
        $notified = (new Notifier($this->pdo, $this->user->id))->taskPosted($classId, $id, $fields['title'], $fields['deadline']);
        return new ApiResponse(true, 201, "Task posted.", $this->show($id)->body + ['notified' => $notified]);
    }

    public function update(int $id, array $input, array $files = [], bool $removeAttachment = false): ApiResponse {
        $task = $this->tasks->find($id);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Task not found.", []);
        }
        if (($denied = $this->denyManage((int) $task['class_id'])) !== null) {
            return $denied;
        }
        [$fields, $errors] = $this->validate($input, false);
        $errors = array_merge($errors, $this->fileErrors($files));
        if ($errors !== []) {
            return new ApiResponse(false, 400, $errors[0], ['errors' => $errors]);
        }
        $attachment = false;
        if ($files !== []) {
            $attachment = $this->storage->store($files[0]);
        } elseif ($removeAttachment) {
            $attachment = null;
        }
        $this->tasks->update($id, $fields, $attachment);
        if ($attachment !== false && $task['attachment_stored_name'] !== null) {
            $this->storage->delete($task['attachment_stored_name']);
        }
        return new ApiResponse(true, 200, "Task updated.", $this->show($id)->body);
    }

    public function delete(int $id): ApiResponse {
        $task = $this->tasks->find($id);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Task not found.", []);
        }
        if (($denied = $this->denyManage((int) $task['class_id'])) !== null) {
            return $denied;
        }
        $stored = $this->tasks->storedFiles($id);
        $this->tasks->delete($id);
        foreach ($stored as $name) {
            $this->storage->delete($name);
        }
        return new ApiResponse(true, 200, "Task deleted.", ['id' => $id]);
    }

    public function grade(int $submissionId, $score, ?string $feedback): ApiResponse {
        $sub = $this->tasks->findSubmission($submissionId);
        $task = $sub === null ? null : $this->tasks->find((int) $sub['task_id']);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Submission not found.", []);
        }
        if (($denied = $this->denyManage((int) $task['class_id'])) !== null) {
            return $denied;
        }
        $max = (int) $task['max_score'];
        if (!is_numeric($score) || (float) $score < 0 || (float) $score > $max) {
            return new ApiResponse(false, 400, "Score must be a number from 0 to $max.", ['errors' => ["Score must be a number from 0 to $max."]]);
        }
        $feedback = $feedback === null ? null : trim($feedback);
        if ($feedback !== null && mb_strlen($feedback) > 1000) {
            return new ApiResponse(false, 400, "Feedback can be at most 1,000 characters.", []);
        }
        $this->tasks->grade($submissionId, round((float) $score, 2), $feedback === '' ? null : $feedback, $this->user->id, $this->now);
        (new Notifier($this->pdo, $this->user->id))->taskGraded(
            (int) $task['class_id'], (int) $task['id'], (int) $sub['student_id'], $task['title'], self::num((float) $score) . '/' . $max
        );
        return new ApiResponse(true, 200, "Score saved.", [
            'submission' => $this->formatSubmission($this->tasks->findSubmission($submissionId), $task),
        ]);
    }

    // ---------- student ----------

    public function submit(int $id, array $files): ApiResponse {
        $task = $this->tasks->find($id);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Task not found.", []);
        }
        if (!$this->user->is('student')) {
            return new ApiResponse(false, 403, "Only students hand in work.", []);
        }
        if (!$this->isOpen($task)) {
            return new ApiResponse(false, 409, "This task is closed. You can't hand in work anymore.", []);
        }
        if ($files === []) {
            return new ApiResponse(false, 400, "Choose a file to hand in.", ['errors' => ["Choose a file to hand in."]]);
        }
        $errors = $this->fileErrors($files, "Hand in one file. Put several files in a ZIP.");
        if ($errors !== []) {
            return new ApiResponse(false, 400, $errors[0], ['errors' => $errors]);
        }
        $old = $this->tasks->submission($id, $this->user->id);
        $file = $this->storage->store($files[0]);
        try {
            $this->tasks->saveSubmission($id, $this->user->id, $file, $this->now);
        } catch (Throwable $e) {
            $this->storage->delete($file['stored_name']);
            throw $e;
        }
        if ($old !== null) {
            $this->storage->delete($old['stored_name']);
        }
        $name = $this->access->userNames([$this->user->id])[$this->user->id] ?? 'A student';
        (new Notifier($this->pdo, $this->user->id))->taskSubmitted(
            (int) $task['class_id'], $id, (int) $task['created_by'], $name, $task['title']
        );
        return new ApiResponse(true, 200, $old === null ? "Work handed in." : "Your file was replaced.", $this->show($id)->body);
    }

    public function unsubmit(int $id): ApiResponse {
        $task = $this->tasks->find($id);
        if ($task === null || $this->denyClass((int) $task['class_id']) !== null) {
            return new ApiResponse(false, 404, "Task not found.", []);
        }
        $mine = $this->tasks->submission($id, $this->user->id);
        if ($mine === null) {
            return new ApiResponse(false, 404, "You haven't handed in anything yet.", []);
        }
        if (!$this->isOpen($task)) {
            return new ApiResponse(false, 409, "This task is closed. Your work can't be removed.", []);
        }
        if ($mine['score'] !== null) {
            return new ApiResponse(false, 409, "Your work is already graded. Ask your teacher if it needs changes.", []);
        }
        $this->tasks->deleteSubmission((int) $mine['id']);
        $this->storage->delete($mine['stored_name']);
        return new ApiResponse(true, 200, "Your work was removed.", $this->show($id)->body);
    }

    // ---------- files ----------

    /*
        $kind 'attachment': the task's file (anyone in the class).
        $kind 'submission': a handed-in file (its student, or the class's managers).
        Returns ['path', 'name', 'mime'] or an ApiResponse error.
    */
    public function file(int $id, string $kind, bool $inline): array|ApiResponse {
        if ($kind === 'submission') {
            $sub = $this->tasks->findSubmission($id);
            $task = $sub === null ? null : $this->tasks->find((int) $sub['task_id']);
            $ok = $task !== null && $this->denyClass((int) $task['class_id']) === null
                && ((int) $sub['student_id'] === $this->user->id || $this->access->canManage($this->user, (int) $task['class_id']));
            if (!$ok) {
                return new ApiResponse(false, 404, "File not found.", []);
            }
            $file = ['stored' => $sub['stored_name'], 'name' => $sub['original_name'], 'ext' => $sub['extension'], 'mime' => $sub['mime_type']];
        } else {
            $task = $this->tasks->find($id);
            if ($task === null || $this->denyClass((int) $task['class_id']) !== null || $task['attachment_stored_name'] === null) {
                return new ApiResponse(false, 404, "File not found.", []);
            }
            $file = ['stored' => $task['attachment_stored_name'], 'name' => $task['attachment_original_name'],
                     'ext' => $task['attachment_extension'], 'mime' => $task['attachment_mime_type']];
        }
        if ($inline && !in_array($file['ext'], FileStorage::VIEWABLE, true)) {
            return new ApiResponse(false, 415, "This file type can't be previewed. Download it instead.", []);
        }
        return ['path' => $this->storage->path($file['stored']), 'name' => $file['name'], 'mime' => $file['mime']];
    }

    // ---------- helpers ----------

    // 403/404 unless the user manages the class or is one of its students.
    private function denyClass(int $classId): ?ApiResponse {
        if (!$this->access->classExists($classId)) {
            return new ApiResponse(false, 404, "Class not found.", []);
        }
        if ($this->access->canManage($this->user, $classId) || $this->access->enrollment($this->user, $classId)['enrolled']) {
            return null;
        }
        return new ApiResponse(false, 403, "You don't have access to this class.", []);
    }

    private function denyManage(int $classId): ?ApiResponse {
        if (($denied = $this->denyClass($classId)) !== null) {
            return $denied;
        }
        return $this->access->canManage($this->user, $classId)
            ? null
            : new ApiResponse(false, 403, "Only the class's faculty can manage tasks.", []);
    }

    private function isOpen(array $task): bool {
        return !(bool) $task['is_closed'] && $task['deadline'] > $this->now;
    }

    // pending | submitted | graded | missing
    private function remark(array $task, ?array $submission): string {
        if ($submission !== null) {
            return $submission['score'] !== null ? 'graded' : 'submitted';
        }
        return $this->isOpen($task) ? 'pending' : 'missing';
    }

    /*
        Checks title, instructions, max_score, deadline, is_closed.
        $creating: every field is required; otherwise only the given ones are checked.
        Returns [fields to save, errors].
    */
    private function validate(array $in, bool $creating): array {
        $fields = [];
        $errors = [];
        if ($creating || array_key_exists('title', $in)) {
            $title = trim((string) ($in['title'] ?? ''));
            if ($title === '') {
                $errors[] = "Task name is required.";
            } elseif (mb_strlen($title) > self::TITLE_MAX) {
                $errors[] = "Task name can be at most " . self::TITLE_MAX . " characters.";
            }
            $fields['title'] = $title;
        }
        if ($creating || array_key_exists('instructions', $in)) {
            $text = trim((string) ($in['instructions'] ?? ''));
            if (mb_strlen($text) > self::INSTRUCTIONS_MAX) {
                $errors[] = "Instructions can be at most 5,000 characters.";
            }
            $fields['instructions'] = $text;
        }
        if ($creating || array_key_exists('max_score', $in)) {
            $max = $in['max_score'] ?? 100;
            if (!is_numeric($max) || (int) $max != $max || (int) $max < 1 || (int) $max > self::MAX_SCORE_LIMIT) {
                $errors[] = "Points must be a whole number from 1 to " . self::MAX_SCORE_LIMIT . ".";
            }
            $fields['max_score'] = (int) $max;
        }
        if ($creating || array_key_exists('deadline', $in)) {
            $deadline = self::parseDeadline((string) ($in['deadline'] ?? ''));
            if ($deadline === null) {
                $errors[] = "Deadline is required.";
            } elseif ($creating && $deadline <= $this->now) {
                $errors[] = "Deadline must be in the future.";
            }
            $fields['deadline'] = $deadline;
        }
        if (array_key_exists('is_closed', $in)) {
            $fields['is_closed'] = filter_var($in['is_closed'], FILTER_VALIDATE_BOOLEAN);
        } elseif ($creating) {
            $fields['is_closed'] = false;
        }
        return [$fields, $errors];
    }

    // "2026-11-20T23:59" or "2026-11-20 23:59[:00]" → "2026-11-20 23:59:00"; a date alone means end of day.
    private static function parseDeadline(string $value): ?string {
        $value = trim(str_replace('T', ' ', $value));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $value .= ' 23:59:00';
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $value)) {
            $value .= ':00';
        }
        $d = DateTime::createFromFormat('Y-m-d H:i:s', $value);
        return $d && $d->format('Y-m-d H:i:s') === $value ? $value : null;
    }

    private function fileErrors(array $files, string $tooMany = "A task can have only one attachment."): array {
        if (count($files) > 1) {
            return [$tooMany];
        }
        if ($files !== [] && ($e = $this->storage->validate($files[0])) !== null) {
            return [$e];
        }
        return [];
    }

    private static function num(float $n): string {
        return rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }

    private function format(array $r): array {
        $id = (int) $r['id'];
        return [
            'id'           => $id,
            'class_id'     => (int) $r['class_id'],
            'title'        => $r['title'],
            'instructions' => $r['instructions'],
            'max_score'    => (int) $r['max_score'],
            'deadline'     => $r['deadline'],
            'is_closed'    => (bool) $r['is_closed'],
            'status'       => $this->isOpen($r) ? 'active' : 'closed',
            'attachment'   => $r['attachment_stored_name'] === null ? null : [
                'name'         => $r['attachment_original_name'],
                'type'         => strtoupper((string) $r['attachment_extension']),
                'size_label'   => FileStorage::sizeLabel((int) $r['attachment_size_bytes']),
                'viewable'     => in_array($r['attachment_extension'], FileStorage::VIEWABLE, true),
                'view_url'     => "api/tasks.php?id=$id&action=file&kind=attachment&view=1",
                'download_url' => "api/tasks.php?id=$id&action=file&kind=attachment",
            ],
            'created_at'   => $r['created_at'],
            'updated_at'   => $r['updated_at'],
        ];
    }

    private function formatSubmission(array $s, array $task): array {
        $id = (int) $s['id'];
        return [
            'id'           => $id,
            'name'         => $s['original_name'],
            'type'         => strtoupper((string) $s['extension']),
            'size_label'   => FileStorage::sizeLabel((int) $s['size_bytes']),
            'viewable'     => in_array($s['extension'], FileStorage::VIEWABLE, true),
            'view_url'     => "api/tasks.php?id=$id&action=file&kind=submission&view=1",
            'download_url' => "api/tasks.php?id=$id&action=file&kind=submission",
            'submitted_at' => $s['submitted_at'],
            'is_late'      => $s['submitted_at'] > $task['deadline'],
            'score'        => $s['score'] === null ? null : (float) $s['score'],
            'score_label'  => $s['score'] === null ? null : self::num((float) $s['score']) . '/' . (int) $task['max_score'],
            'feedback'     => $s['feedback'],
            'graded_at'    => $s['graded_at'],
        ];
    }
}
