<?php
/*
    Tests for the school-wide (dashboard) announcements.

    Uses a throwaway SQLite database and a temp upload folder, so it never
    touches your real data. From the php folder:

        php tests/announcements_test.php
*/
require_once __DIR__ . "/../controllers/AnnouncementController.php";
require_once __DIR__ . "/../controllers/NotificationController.php";

$passed = 0;
$failed = 0;
function check(string $name, bool $ok, string $detail = ''): void {
    global $passed, $failed;
    if ($ok) { $passed++; echo "  ok   $name\n"; }
    else     { $failed++; echo "  FAIL $name" . ($detail !== '' ? " — $detail" : '') . "\n"; }
}

// ---------- test database (same tables as db.sql) ----------
require_once __DIR__ . "/fixtures.php";
$pdo = edumeet_test_db();
$pdo->exec("
    INSERT INTO departments (department_id, name, slug) VALUES (3, 'College of Computer Studies', 'ccs'), (4, 'College of Education, Arts, and Sciences', 'ceas');
    INSERT INTO programs VALUES (8, 3, 'Computer Science', 'BSCS'), (10, 3, 'Information Technology', 'BSIT'), (16, 4, 'Secondary Education', 'BSEd');
    -- 1 = BSCS 2A, 2 = BSCS 2B, 3 = BSIT 2B, 4 = BSEd 1A
    INSERT INTO blocks VALUES (1, 8, '2A', 2), (2, 8, '2B', 2), (3, 10, '2B', 2), (4, 16, '1A', 1);
");
foreach ([[1, 'Maria', 'Santos', 'faculty', 3], [2, 'Jose', 'Reyes', 'faculty', 3],
          [10, 'Aiden', 'Esguerra', 'student', 3], [11, 'Bianca', 'Bautista', 'student', 3],
          [12, 'Carlo', 'Lim', 'student', 3], [13, 'Danica', 'Dela Cruz', 'student', 4], [14, 'Irregular', 'Student', 'student', 3],
          [20, 'Dean', 'Cruz', 'college_dean', 3], [21, 'Other', 'Dean', 'college_dean', 4], [30, 'Chair', 'Ramos', 'program_chair', 3],
          [90, 'School', 'Admin', 'system_admin', null]] as $p) {
    add_person($pdo, ...$p);
}
put_in_blocks($pdo, [1 => 10, 2 => 11, 3 => 12, 4 => 13]);
// faculty 1 teaches BSCS 2A + 2B; faculty 2 teaches nothing
add_class($pdo, 100, 'Graphics', 1, 8, [1, 2], [14]);
add_class($pdo, 101, 'Networks', null, 10, [3]);
add_class($pdo, 102, 'English', null, 16, [4]);
$pdo->exec("INSERT INTO program_chair_assignments (membership_id, program_id) VALUES (30, 8)");

$dir = sys_get_temp_dir() . '/edumeet-ann-' . bin2hex(random_bytes(4));
$storage = new FileStorage($dir, fn($from, $to) => copy($from, $to));

function fakeUpload(string $name, int $bytes = 2048): array {
    $tmp = tempnam(sys_get_temp_dir(), 'up');
    file_put_contents($tmp, str_repeat('x', min($bytes, 4096)));
    return ['name' => $name, 'tmp_name' => $tmp, 'size' => $bytes, 'error' => UPLOAD_ERR_OK];
}
function u(int $id, string $role): CurrentUser { return new CurrentUser($id, $role); }
function ann(CurrentUser $u): AnnouncementController { global $pdo, $storage; return new AnnouncementController($pdo, $u, $storage); }
function post(CurrentUser $u, string $title, array $targets, array $extra = []): ApiResponse {
    return ann($u)->create($title, $extra['body'] ?? 'Details here.', $targets, $extra['pinned'] ?? false,
        $extra['status'] ?? 'published', $extra['files'] ?? []);
}
function titles(CurrentUser $u, int $page = 1, ?string $status = null, bool $mine = false): array {
    return array_column(ann($u)->feed($page, $status, $mine)->body['announcements'] ?? [], 'title');
}
function values(ApiResponse $r): array { return array_column($r->body['options'] ?? [], 'value'); }
function inbox(int $userId): array {
    global $pdo;
    $s = $pdo->prepare("SELECT message FROM notifications WHERE user_id = ? ORDER BY id DESC");
    $s->execute([$userId]);
    return $s->fetchAll(PDO::FETCH_COLUMN);
}
function notifiedIds(): array {
    global $pdo;
    return array_map('intval', $pdo->query("SELECT user_id FROM notifications ORDER BY user_id")->fetchAll(PDO::FETCH_COLUMN));
}
function clearInbox(): void { global $pdo; $pdo->exec("DELETE FROM notifications"); }

$faculty  = u(1, 'faculty');
$faculty2 = u(2, 'faculty');
$s2A = u(10, 'student');   // BSCS 2A
$s2B = u(11, 'student');   // BSCS 2B
$sIT = u(12, 'student');   // BSIT 2B
$sEd = u(13, 'student');   // BSEd 1A (CEAS)
$sNone = u(14, 'student'); // no section
$dean = u(20, 'college_dean');     // CCS
$chair = u(30, 'program_chair'); // BSCS
$admin = u(90, 'system_admin');

echo "\nTARGET AUDIENCE CHOICES\n";
check("Students get no choices (403)", ann($s2A)->targets()->code === 403);
check("Faculty: only the sections they teach", values(ann($faculty)->targets()) === ['SEC:1', 'SEC:2']);
check("Faculty with no classes: nothing", values(ann($faculty2)->targets()) === []);
check("Program chair: own program, its years and sections",
    values(ann($chair)->targets()) === ['PROG:8', 'PROG_YR:8:1', 'PROG_YR:8:2', 'PROG_YR:8:3', 'PROG_YR:8:4', 'SEC:1', 'SEC:2']);
$v = values(ann($dean)->targets());
check("Dean: own department, its programs and sections only",
    in_array('DEPT:3', $v, true) && in_array('DEPT_YR:3:2', $v, true) && in_array('PROG:10', $v, true)
    && in_array('SEC:3', $v, true) && !in_array('DEPT:4', $v, true) && !in_array('SEC:4', $v, true) && !in_array('ALL_STUDENTS', $v, true));
$v = values(ann($admin)->targets());
check("Admin: whole school, year levels, everything", in_array('ALL_STUDENTS', $v, true) && in_array('YR:1', $v, true) && in_array('SEC:4', $v, true) && in_array('DEPT:4', $v, true));
check("Choices have readable labels", array_column(ann($chair)->targets()->body['options'], 'label')[2] === 'BSCS · 2nd Year');

echo "\nPOSTING\n";
check("Students can't post", post($s2A, 'Hi', ['ALL_STUDENTS'])->code === 403);

$r = post($faculty, 'Lab moved', ['SEC:1']);
check("Faculty posts to their section", $r->code === 201 && $r->body['announcement']['target_label'] === 'BSCS 2A', $r->message);
check("… only that section's students are notified", $r->body['notified'] === 1 && notifiedIds() === [10]);
check("… notification links to the announcement", str_starts_with(inbox(10)[0], 'Lab moved · BSCS 2A'));
$labId = $r->body['announcement']['id'];
check("Faculty can't post to a section they don't teach", post($faculty, 'x', ['SEC:3'])->code === 400);
check("Faculty can't post to a whole program", post($faculty, 'x', ['PROG:8'])->code === 400);

clearInbox();
check("Chair can't post to another program", post($chair, 'x', ['PROG:10'])->code === 400);
$r = post($chair, 'BSCS 2nd years meeting', ['PROG_YR:8:2']);
check("Chair posts to a year level of their program", $r->code === 201 && notifiedIds() === [10, 11], json_encode(notifiedIds()));

clearInbox();
check("Dean can't post to another department", post($dean, 'x', ['DEPT:4'])->code === 400);
check("Dean can't post to a section outside the department", post($dean, 'x', ['SEC:4'])->code === 400);
check("Dean can't post to the whole school", post($dean, 'x', ['ALL_STUDENTS'])->code === 400);
$r = post($dean, 'CCS Week', ['DEPT:3']);
check("Dean posts to their department (all CCS students)", $r->code === 201 && notifiedIds() === [10, 11, 12]);
clearInbox();
$r = post($dean, 'CCS 1st years', ['DEPT_YR:3:1']);
check("Department + year with no students notifies nobody", $r->code === 201 && $r->body['notified'] === 0);

clearInbox();
$r = post($admin, 'Class Suspension', ['ALL_STUDENTS'], ['pinned' => true]);
check("Admin posts to the whole school (every student, even with no section)", $r->code === 201 && notifiedIds() === [10, 11, 12, 13, 14]);
check("… and it is pinned", $r->body['announcement']['is_pinned'] === true);
$suspensionId = $r->body['announcement']['id'];
clearInbox();
$r = post($admin, 'Freshmen orientation', ['YR:1']);
check("Admin posts to a year level across programs", notifiedIds() === [13]);
$r = post($admin, 'Two targets', ['SEC:1', ['scope_type' => 'section', 'section_id' => 1], 'SEC:4']);
check("Target objects work and duplicates are dropped", $r->code === 201 && count($r->body['announcement']['targets']) === 2
    && $r->body['announcement']['target_label'] === 'BSCS 2A, BSEd 1A', $r->body['announcement']['target_label'] ?? $r->message);
$twoId = $r->body['announcement']['id'];

$r = ann($faculty)->create('', '  ', [], false, 'published', []);
check("All form errors come back together", $r->code === 400 && count($r->body['errors']) === 3, json_encode($r->body));
check("Unknown target token is rejected", post($admin, 'x', ['EVERYONE!'])->code === 400);
check("Unknown department id is rejected", post($admin, 'x', ['DEPT:99'])->code === 400);
check("Year level out of range is rejected", post($admin, 'x', ['YR:9'])->code === 400);
check("Bad status is rejected", post($admin, 'x', ['ALL_STUDENTS'], ['status' => 'archived'])->code === 400);

echo "\nWHO SEES WHAT\n";
$t = titles($s2A);
check("Pinned comes first", $t[0] === 'Class Suspension', implode(' | ', $t));
check("BSCS 2A sees its section, program-year, department and school posts",
    in_array('Lab moved', $t, true) && in_array('BSCS 2nd years meeting', $t, true) && in_array('CCS Week', $t, true) && in_array('Two targets', $t, true));
check("… but not other year levels", !in_array('Freshmen orientation', $t, true) && !in_array('CCS 1st years', $t, true));
check("BSCS 2B doesn't see the 2A-only post", !in_array('Lab moved', titles($s2B), true));
check("BSEd 1A sees school + its year level, not CCS", titles($sEd) === ['Class Suspension', 'Two targets', 'Freshmen orientation'], implode(' | ', titles($sEd)));
check("Student with no section sees only whole-school posts", titles($sNone) === ['Class Suspension']);
check("Student can't open a post that isn't for them", ann($s2B)->show($labId)->code === 404);
check("Student can open one that is", ann($s2A)->show($labId)->code === 200 && ann($s2A)->show($labId)->body['announcement']['can_edit'] === false);
check("Staff see every published announcement", count(titles($faculty2)) === 7);
check("Feed says who can post", ann($s2A)->feed()->body['can_post'] === false && ann($faculty)->feed()->body['can_post'] === true);

echo "\nDRAFTS, EDITS, PUBLISHING\n";
clearInbox();
$r = post($faculty, 'Quiz next week', ['SEC:2'], ['status' => 'draft']);
$draftId = $r->body['announcement']['id'];
check("Draft saved without notifying anyone", $r->code === 201 && $r->message === 'Draft saved.' && notifiedIds() === []);
check("Students don't see drafts", !in_array('Quiz next week', titles($s2B), true) && ann($s2B)->show($draftId)->code === 404);
check("Other staff don't see someone else's draft", ann($faculty2)->show($draftId)->code === 404);
check("Author sees their draft in 'mine'", titles($faculty, 1, 'draft', true) === ['Quiz next week']);
$r = ann($faculty)->update($draftId, ['status' => 'published']);
check("Publishing a draft notifies its students", $r->code === 200 && $r->body['notified'] === 1 && notifiedIds() === [11]);
check("… and now students see it", in_array('Quiz next week', titles($s2B), true));
$r = ann($faculty)->update($draftId, ['title' => 'Quiz moved']);
check("Editing a published post doesn't notify again", $r->code === 200 && $r->body['notified'] === 0 && $r->body['announcement']['title'] === 'Quiz moved');
check("Edit keeps fields that weren't sent", $r->body['announcement']['body'] === 'Details here.' && $r->body['announcement']['target_label'] === 'BSCS 2B');
check("Author can't move it outside their reach", ann($faculty)->update($draftId, ['targets' => ['SEC:3']])->code === 400);
$r = ann($faculty)->update($draftId, ['targets' => ['SEC:1', 'SEC:2'], 'is_pinned' => true]);
check("Author can change audience and pin", $r->code === 200 && $r->body['announcement']['target_label'] === 'BSCS 2A, BSCS 2B' && $r->body['announcement']['is_pinned'] === true);
check("Other faculty can't edit (403)", ann($faculty2)->update($draftId, ['title' => 'x'])->code === 403);
check("Students can't edit", ann($s2A)->update($draftId, ['title' => 'x'])->code === 403);
check("Admin can edit anyone's", ann($admin)->update($draftId, ['body' => 'Room 301'])->code === 200);
check("Archiving hides it from students", ann($faculty)->update($draftId, ['status' => 'archived'])->code === 200 && !in_array('Quiz moved', titles($s2A), true));

echo "\nATTACHMENTS\n";
$r = post($faculty, 'Memo', ['SEC:1'], ['files' => [fakeUpload('Memo.pdf', 540000)]]);
$memoId = $r->body['announcement']['id'];
$a = $r->body['announcement']['attachment'];
check("Attachment saved with its details", $r->code === 201 && $a['name'] === 'Memo.pdf' && $a['size_label'] === '527 KB' && $a['viewable'] === true && count(glob("$dir/*")) === 1, json_encode($a));
$file = ann($s2A)->attachment($memoId, true);
check("A student it reaches can open it", is_array($file) && is_file($file['path']) && $file['mime'] === 'application/pdf');
check("A student it doesn't reach can't", ann($s2B)->attachment($memoId, false) instanceof ApiResponse);
check("Only one attachment per announcement", post($faculty, 'x', ['SEC:1'], ['files' => [fakeUpload('a.pdf'), fakeUpload('b.pdf')]])->code === 400);
check("Disallowed type is rejected, nothing saved", post($faculty, 'x', ['SEC:1'], ['files' => [fakeUpload('virus.exe')]])->code === 400 && count(glob("$dir/*")) === 1);
$r = ann($faculty)->update($memoId, [], [fakeUpload('Memo v2.docx')]);
check("Replacing the attachment deletes the old file", $r->code === 200 && $r->body['announcement']['attachment']['name'] === 'Memo v2.docx' && count(glob("$dir/*")) === 1);
check("A .docx can't be previewed (download only)", ann($s2A)->attachment($memoId, true)->code === 415 && is_array(ann($s2A)->attachment($memoId, false)));
$r = ann($faculty)->update($memoId, [], [], true);
check("Removing the attachment", $r->code === 200 && $r->body['announcement']['attachment'] === null && count(glob("$dir/*")) === 0);
ann($faculty)->update($memoId, [], [fakeUpload('Again.pdf')]);
$r = ann($faculty)->delete($memoId);
check("Deleting the announcement deletes its file", $r->code === 200 && count(glob("$dir/*")) === 0 && ann($faculty)->show($memoId)->code === 404);
check("Others can't delete", ann($faculty2)->delete($labId)->code === 403);
check("Admin can delete", ann($admin)->delete($twoId)->code === 200);
check("Its targets are gone too", (int) $pdo->query("SELECT COUNT(*) FROM announcement_targets WHERE announcement_id = $twoId")->fetchColumn() === 0);

echo "\nFEED PAGING & BELL\n";
for ($i = 1; $i <= 12; $i++) {
    post($admin, "Bulk $i", ['ALL_STUDENTS']);
}
$p1 = ann($sNone)->feed(1);
$p2 = ann($sNone)->feed(2);
check("Feed pages 10 at a time", count($p1->body['announcements']) === 10 && $p1->body['has_more'] === true);
check("Page 2 has the rest", count($p2->body['announcements']) === 3 && $p2->body['has_more'] === false, (string) count($p2->body['announcements']));
$bell = (new NotificationController($pdo, $sNone))->list();
check("School announcements show on the same bell", $bell->body['notifications'][0]['type'] === 'announcement'
    && str_starts_with($bell->body['notifications'][0]['link'], 'announcements.php?id='));
check("The poster isn't notified", inbox(90) === []);
check("Bad status filter is rejected", ann($admin)->feed(1, 'deleted')->code === 400);

@rmdir($dir);
echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
