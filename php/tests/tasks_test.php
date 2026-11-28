<?php
/*
    Tests for Tasks / Activities and the rich-text cleaner.

    Uses a throwaway SQLite database and a temp upload folder. From the php folder:

        php tests/tasks_test.php
*/
require_once __DIR__ . "/../controllers/TaskController.php";
require_once __DIR__ . "/../helpers/RichText.php";
require_once __DIR__ . "/fixtures.php";

$passed = 0;
$failed = 0;
function check(string $name, bool $ok, string $detail = ''): void {
    global $passed, $failed;
    if ($ok) { $passed++; echo "  ok   $name\n"; }
    else     { $failed++; echo "  FAIL $name" . ($detail !== '' ? " — $detail" : '') . "\n"; }
}

$pdo = edumeet_test_db();
$pdo->exec("
    INSERT INTO departments (department_id, name, slug) VALUES (3, 'College of Computer Studies', 'ccs');
    INSERT INTO programs VALUES (8, 3, 'Computer Science', 'BSCS');
    INSERT INTO blocks VALUES (1, 8, '2A', 2), (2, 8, '2B', 2), (9, 8, '3A', 3);
");
foreach ([[1, 'Maria', 'Santos', 'faculty', 3], [2, 'Jose', 'Reyes', 'faculty', 3],
          [10, 'Aiden', 'Esguerra', 'student', 3], [11, 'Bianca', 'Bautista', 'student', 3],
          [12, 'Carlo', 'Lim', 'student', 3], [13, 'Outside', 'Student', 'student', 3],
          [20, 'Dean', 'Cruz', 'college_dean', 3]] as $p) {
    add_person($pdo, ...$p);
}
put_in_blocks($pdo, [1 => 10, 2 => 11, 9 => 13]);
add_class($pdo, 100, 'Graphics', 1, 8, [1, 2], [12]);   // 12 = irregular
add_class($pdo, 101, 'Other', 2, 8, [9]);

$dir = sys_get_temp_dir() . '/edumeet-tasks-' . bin2hex(random_bytes(4));
$storage = new FileStorage($dir, fn($from, $to) => copy($from, $to));
function fakeUpload(string $name, int $bytes = 2048): array {
    $tmp = tempnam(sys_get_temp_dir(), 'up');
    file_put_contents($tmp, str_repeat('x', min($bytes, 4096)));
    return ['name' => $name, 'tmp_name' => $tmp, 'size' => $bytes, 'error' => UPLOAD_ERR_OK];
}
$NOW = '2026-11-10 08:00:00';
function tc(int $id, string $role, ?string $now = null): TaskController {
    global $pdo, $storage, $NOW;
    return new TaskController($pdo, new CurrentUser($id, $role), $storage, $now ?? $NOW);
}
function inbox(int $userId): array {
    global $pdo;
    $s = $pdo->prepare("SELECT title FROM notifications WHERE user_id = ? ORDER BY id");
    $s->execute([$userId]);
    return $s->fetchAll(PDO::FETCH_COLUMN);
}

echo "\nTASKS\n";

$r = tc(1, 'faculty')->create(100, ['title' => 'Photoshop', 'instructions' => 'Edit the photo.', 'max_score' => 100, 'deadline' => '2026-11-13T23:59'], []);
check("Faculty adds a task", $r->code === 201 && $r->body['task']['status'] === 'active', $r->message);
$photo = $r->body['task']['id'];
check("Deadline saved with seconds", $r->body['task']['deadline'] === '2026-11-13 23:59:00');
check("Every student of the class is notified (block + irregular)", $r->body['notified'] === 3 && inbox(10) === ['New task'] && inbox(12) === ['New task'] && inbox(13) === []);

$r = tc(1, 'faculty')->create(100, ['title' => '', 'max_score' => 0, 'deadline' => '2026-11-01'], []);
check("Add task validates name, points and future deadline", $r->code === 400 && count($r->body['errors']) === 3, json_encode($r->body));
check("Student can't add a task", tc(10, 'student')->create(100, ['title' => 'x', 'deadline' => '2026-12-01'], [])->code === 403);
check("Other faculty can't add a task", tc(2, 'faculty')->create(100, ['title' => 'x', 'deadline' => '2026-12-01'], [])->code === 403);
check("Dean of the department can add a task", tc(20, 'college_dean')->create(100, ['title' => 'Figma', 'deadline' => '2026-11-20', 'max_score' => 50], [fakeUpload('Brief.pdf')])->code === 201);
$figma = (int) $pdo->query("SELECT id FROM tasks WHERE title = 'Figma'")->fetchColumn();

$r = tc(10, 'student')->submit($photo, [fakeUpload('Esguerra_Photoshop.zip', 5000)]);
check("Student hands in a ZIP", $r->code === 200 && $r->body['remark'] === 'submitted' && $r->body['my_submission']['name'] === 'Esguerra_Photoshop.zip', $r->message);
check("Faculty is told about the submission", inbox(1) === ['New submission']);
check("Hand in two files is refused", tc(11, 'student')->submit($photo, [fakeUpload('a.pdf'), fakeUpload('b.pdf')])->code === 400);
check("Hand in a disallowed type is refused", tc(11, 'student')->submit($photo, [fakeUpload('virus.exe')])->code === 400);
check("Faculty can't hand in work", tc(1, 'faculty')->submit($photo, [fakeUpload('a.pdf')])->code === 403);
check("Student from another class can't see the task", tc(13, 'student')->show($photo)->code === 404);

$r = tc(1, 'faculty')->list(100);
$row = array_values(array_filter($r->body['tasks'], fn($t) => $t['id'] === $photo))[0];
check("Faculty list shows 1/3 submitted", $row['submitted_count'] === 1 && $row['student_count'] === 3);

$r = tc(1, 'faculty')->show($photo);
$byName = array_column($r->body['submissions'], null, 'remark');
check("Faculty sees each student with a remark", count($r->body['submissions']) === 3
    && array_column(array_column($r->body['submissions'], 'student'), 'name') === ['Aiden Esguerra', 'Bianca Bautista', 'Carlo Lim']);
check("Faculty sees the student's section", $r->body['submissions'][0]['student']['section'] === 'BSCS 2A' && $r->body['submissions'][2]['student']['section'] === '');
$subId = $r->body['submissions'][0]['submission']['id'];

check("Score above the points is refused", tc(1, 'faculty')->grade($subId, 120, null)->code === 400);
check("Student can't grade", tc(10, 'student')->grade($subId, 100, null)->code === 403);
$r = tc(1, 'faculty')->grade($subId, 80, 'Nice work');
check("Faculty grades 80/100", $r->code === 200 && $r->body['submission']['score_label'] === '80/100' && $r->body['submission']['feedback'] === 'Nice work');
check("Student is told about the grade", inbox(10) === ['New task', 'New task', 'Task graded']);
check("Graded work can't be removed", tc(10, 'student')->unsubmit($photo)->code === 409);

$r = tc(10, 'student')->list(100);
$mine = array_column($r->body['tasks'], null, 'id');
check("Student list: graded task shows score", $mine[$photo]['remark'] === 'graded' && $mine[$photo]['my_submission']['score_label'] === '80/100');
check("Student list: other task is pending", $mine[$figma]['remark'] === 'pending' && $mine[$figma]['my_submission'] === null);

$r = tc(11, 'student')->submit($figma, [fakeUpload('v1.pdf')]);
$first = $pdo->query("SELECT stored_name FROM task_submissions WHERE student_id = 11")->fetchColumn();
$r = tc(11, 'student')->submit($figma, [fakeUpload('v2.pdf')]);
check("Handing in again replaces the file", $r->message === 'Your file was replaced.' && $r->body['my_submission']['name'] === 'v2.pdf' && !is_file("$dir/$first"));
$r = tc(11, 'student')->unsubmit($figma);
check("Student removes ungraded work", $r->code === 200 && $r->body['remark'] === 'pending');

// after the deadline
$late = '2026-11-15 09:00:00';
check("After the deadline the task is closed", tc(1, 'faculty', $late)->show($photo)->body['task']['status'] === 'closed');
check("After the deadline students can't hand in", tc(11, 'student', $late)->submit($photo, [fakeUpload('late.pdf')])->code === 409);
check("Missing work shows as missing", tc(11, 'student', $late)->show($photo)->body['remark'] === 'missing');

$r = tc(1, 'faculty')->update($figma, ['is_closed' => '1'], []);
check("Faculty closes a task early", $r->code === 200 && $r->body['task']['status'] === 'closed');
check("Closed task refuses work", tc(12, 'student')->submit($figma, [fakeUpload('a.pdf')])->code === 409);
$r = tc(1, 'faculty')->update($figma, ['is_closed' => '0', 'title' => 'Figma Prototype'], [], true);
check("Faculty reopens, renames and removes the attachment", $r->body['task']['status'] === 'active' && $r->body['task']['title'] === 'Figma Prototype' && $r->body['task']['attachment'] === null);

$f = tc(10, 'student')->file($subId, 'submission', false);
check("Student downloads their own work", is_array($f) && $f['name'] === 'Esguerra_Photoshop.zip');
check("Other student can't download it", tc(11, 'student')->file($subId, 'submission', false) instanceof ApiResponse);
check("ZIP can't be previewed", tc(1, 'faculty')->file($subId, 'submission', true) instanceof ApiResponse);

$filesBefore = count(glob("$dir/*"));
$r = tc(1, 'faculty')->delete($photo);
check("Deleting a task deletes its submissions and files", $r->code === 200 && (int) $pdo->query("SELECT COUNT(*) FROM task_submissions WHERE task_id = $photo")->fetchColumn() === 0 && count(glob("$dir/*")) === $filesBefore - 1);

echo "\nRICH TEXT\n";
$clean = RichText::clean('<p onclick="x()">Hi <b>bold</b><script>alert(1)</script><a href="javascript:alert(1)">bad</a> <a href="https://example.com">ok</a> <span style="color:#2563eb;position:fixed">blue</span><img src=x onerror=alert(1)></p>');
check("Scripts and event handlers are removed", !str_contains($clean, 'script') && !str_contains($clean, 'onclick') && !str_contains($clean, 'onerror') && !str_contains($clean, '<img'));
check("javascript: links lose their href", !str_contains($clean, 'javascript'));
check("Safe links open in a new tab", str_contains($clean, '<a href="https://example.com" target="_blank" rel="noopener noreferrer">ok</a>'));
check("Only colour styles survive", str_contains($clean, 'style="color: #2563eb"') && !str_contains($clean, 'position'));
check("Plain text keeps its line breaks, escaped", RichText::html("a < b\nnext") === "a &lt; b<br>\nnext");
check("Plain text for notifications", RichText::plain('<p>Hello <b>there</b></p><ul><li>one</li></ul>') === 'Hello there one');

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
