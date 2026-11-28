<?php
/*
    Tests for the Files & Blogs module.

    Uses a throwaway SQLite database and a temp upload folder, so it never
    touches your real data. Run inside Docker from the project folder:

        docker compose exec app php tests/files_blogs_test.php
*/
require_once __DIR__ . "/../controllers/ResourceController.php";
require_once __DIR__ . "/../controllers/PostController.php";
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
    INSERT INTO programs VALUES (8, 3, 'Bachelor of Science in Computer Science', 'BSCS'), (10, 3, 'Bachelor of Science in Information Technology', 'BSIT'), (16, 4, 'Bachelor of Secondary Education major in English', 'BSEd-Eng');
    -- 1 = BSCS 2A, 2 = BSCS 2B, 3 = BSIT 2B, 4 = BSEd-Eng 1A (all in the class), 9 = BSIT 3A (not in the class)
    INSERT INTO blocks VALUES (1, 8, '2A', 2), (2, 8, '2B', 2), (3, 10, '2B', 2), (4, 16, '1A', 1), (9, 10, '3A', 3);
");
foreach ([[1, 'Maria', 'Santos', 'faculty', 3], [2, 'Jose', 'Reyes', 'faculty', 4],
          [10, 'Aiden', 'Esguerra', 'student', 3], [11, 'Bianca', 'Bautista', 'student', 3],
          [12, 'Danica', 'Dela Cruz', 'student', 3], [13, 'Outside', 'Student', 'student', 3],
          [15, 'Ivan', 'Torres', 'student', 3], [16, 'Lea', 'Garcia', 'student', 4],
          [20, 'Dean', 'Cruz', 'college_dean', 3], [21, 'Other', 'Dean', 'college_dean', 4]] as $p) {
    add_person($pdo, ...$p);
}
put_in_blocks($pdo, [1 => 10, 2 => 11, 3 => 15, 4 => 16, 9 => 13]);
add_class($pdo, 100, 'Graphics and Visual Computing', 1, 8, [1, 2, 3, 4], [12]);   // 12 = irregular, no block
add_class($pdo, 101, 'Other Class', 2, 16, []);

$dir = sys_get_temp_dir() . '/edumeet-test-' . bin2hex(random_bytes(4));
$storage = new FileStorage($dir, fn($from, $to) => copy($from, $to));

// A fake upload like an entry of $_FILES
function fakeUpload(string $name, int $bytes = 2048, int $error = UPLOAD_ERR_OK): array {
    $tmp = tempnam(sys_get_temp_dir(), 'up');
    file_put_contents($tmp, str_repeat('x', min($bytes, 4096)));
    return ['name' => $name, 'tmp_name' => $tmp, 'size' => $bytes, 'error' => $error];
}
function u(int $id, string $role): CurrentUser { return new CurrentUser($id, $role); }
function res(CurrentUser $u): ResourceController { global $pdo, $storage; return new ResourceController($pdo, $u, $storage); }
function posts(CurrentUser $u): PostController { global $pdo, $storage; return new PostController($pdo, $u, $storage); }
function names(ApiResponse $r, string $key = 'resources', string $field = 'name'): array {
    return array_column($r->body[$key] ?? [], $field);
}

$faculty  = u(1, 'faculty');
$faculty2 = u(2, 'faculty');
$studentA = u(10, 'student');   // block 2A
$studentB = u(11, 'student');   // block 2B
$irregular = u(12, 'student');  // no block
$outsider = u(13, 'student');   // not enrolled
$dean     = u(20, 'college_dean');      // dean of this class's department
$otherDean = u(21, 'college_dean');

echo "\nFILE MANAGEMENT\n";

$r = res($faculty)->blocks(100);
check("Section list (for the post picker) is sorted Dept → Program → Section", $r->code === 200 && names($r, 'blocks') === ['BSCS 2A', 'BSCS 2B', 'BSIT 2B', 'BSEd-Eng 1A']);
$tree = $r->body['tree'];
check("Section tree groups Department → Program → Section", array_column($tree, 'code') === ['CCS', 'CEAS']
    && array_column($tree[0]['programs'], 'code') === ['BSCS', 'BSIT']
    && array_column($tree[0]['programs'][0]['sections'], 'section') === ['2A', '2B']);
check("Section list is faculty-only", res($studentA)->blocks(100)->code === 403);

$r = res($faculty)->upload(100, [fakeUpload('Lesson 1.pdf', 2516582), fakeUpload('Module 1.docx', 8493466)]);
check("F3 upload two files", $r->code === 201 && names($r) === ['Lesson 1', 'Module 1'], $r->message);
check("F3 upload saves both files to disk", count(glob("$dir/*")) === 2);
$lessonId = $r->body['resources'][0]['id'];
$moduleId = $r->body['resources'][1]['id'];
check("F2 row shows the size label", $r->body['resources'][0]['size_label'] === '2.4 MB');
check("F2 resources have no target audience", !array_key_exists('visible_to', $r->body['resources'][0]) && !array_key_exists('visible_label', $r->body['resources'][0]));

$r = res($faculty)->upload(100, [fakeUpload('Animal Sketches.pptx', 552960)]);
check("F3 single upload message", $r->code === 201 && $r->message === '1 file uploaded.');

$r = res($faculty)->upload(100, [fakeUpload('Notes.pdf'), fakeUpload('virus.exe')]);
check("F3 rejects a disallowed type, saves nothing", $r->code === 400 && count(glob("$dir/*")) === 3, json_encode($r->body));
$r = res($faculty)->upload(100, [fakeUpload('Huge.pdf', 30 * 1024 * 1024)]);
check("F3 rejects files over 25 MB", $r->code === 400 && str_contains($r->body['errors'][0], '25 MB'));
$r = res($faculty)->upload(100, [fakeUpload('Big.pdf', 0, UPLOAD_ERR_INI_SIZE)]);
check("F3 explains PHP's own size limit", $r->code === 400 && str_contains($r->body['errors'][0], '25 MB'));
check("F3 needs at least one file", res($faculty)->upload(100, [])->code === 400);
check("F3 other faculty can't upload", res($faculty2)->upload(100, [fakeUpload('a.pdf')])->code === 403);
check("F3 students can't upload", res($studentA)->upload(100, [fakeUpload('a.pdf')])->code === 403);
check("F3 dean of the department can upload", res($dean)->upload(100, [fakeUpload('Dean Memo.pdf')])->code === 201);

$all = ['Dean Memo', 'Animal Sketches', 'Module 1', 'Lesson 1'];
$r = res($faculty)->list(100);
check("F2 faculty sees every resource, newest first", names($r) === $all && $r->body['can_manage'] === true, implode(',', names($r)));
$r = res($studentA)->list(100);
check("F1 every enrolled student sees every resource (BSCS 2A)", names($r) === $all && $r->body['can_manage'] === false);
check("F1 … BSCS 2B sees the same list", names(res($studentB)->list(100)) === $all);
check("F1 … irregular student sees the same list", names(res($irregular)->list(100)) === $all);
check("F1 non-enrolled student is blocked", res($outsider)->list(100)->code === 403);
check("F1 unknown class is 404", res($faculty)->list(999)->code === 404);
check("F1 search by name", names(res($studentA)->list(100, 'lesson')) === ['Lesson 1']);
check("F1 search treats % literally", names(res($studentA)->list(100, '%')) === []);
check("F1 filter by type", names(res($studentA)->list(100, null, 'slide')) === ['Animal Sketches']);
check("F1 unknown type filter is 400", res($studentA)->list(100, null, 'exe')->code === 400);

$r = res($studentB)->show($lessonId);
check("F6 details for the side card", $r->code === 200 && $r->body['file']['uploaded_by']['name'] === 'Maria Santos' && $r->body['file']['viewable'] === true);
check("F6 non-enrolled student gets 404", res($outsider)->show($lessonId)->code === 404);
$open = res($studentA)->openFile($lessonId, true);
check("F6 view PDF inline", is_array($open) && $open['inline'] === true && $open['mime'] === 'application/pdf' && is_file($open['path']));
$open = res($studentA)->openFile($moduleId, true);
check("F6 DOCX can't be previewed (415)", $open instanceof ApiResponse && $open->code === 415);
$open = res($irregular)->openFile($moduleId, false);
check("F6 any enrolled student can download", is_array($open) && $open['name'] === 'Module 1.docx');
check("F6 download blocked outside the class", res($outsider)->openFile($moduleId, false) instanceof ApiResponse);

$r = res($faculty)->update($lessonId, 'Lesson 1 - Intro');
check("F4 edit renames the file", $r->code === 200 && $r->body['resource']['name'] === 'Lesson 1 - Intro');
check("F4 edit rejects empty name", res($faculty)->update($lessonId, '  ')->code === 400);
check("F4 students can't edit", res($studentA)->update($lessonId, 'x')->code === 403);

$stored = $pdo->query("SELECT stored_name FROM class_files WHERE id = $moduleId")->fetchColumn();
check("F5 students can't delete", res($studentA)->delete($moduleId)->code === 403);
$r = res($faculty)->delete($moduleId);
check("F5 delete removes row and file", $r->code === 200 && !is_file("$dir/$stored") && res($faculty)->show($moduleId)->code === 404);

check("path() refuses ../ names", (function () use ($storage) {
    try { $storage->path('../../secret'); return false; } catch (InvalidArgumentException) { return true; }
})());
check("ids() accepts blocks=1,2 and blocks[]", ResourceController::ids(['1,2', '3', 'x', '-4']) === [1, 2, 3] && ResourceController::ids('5') === [5]);

echo "\nBLOGS & ANNOUNCEMENTS\n";

$r = posts($faculty)->create(100, 'Class Suspension', 'announcement', 'No class this afternoon.', [], [fakeUpload('Make-up-schedule.pdf', 250880)]);
check("B3 announcement is posted", $r->code === 201 && $r->message === 'Announcement posted.' && count($r->body['post']['attachments']) === 1, $r->message);
check("B3 posts have no approval status", !array_key_exists('status', $r->body['post']));
$annId = $r->body['post']['id'];
$attachmentId = $r->body['post']['attachments'][0]['id'];

$r = posts($faculty)->create(100, 'Photoshop Project Tips', 'blog', 'Some tips.', ['2'], []);
check("B3 faculty blog is posted right away (no dean approval)", $r->code === 201 && $r->message === 'Blog posted.');
$blogId = $r->body['post']['id'];

check("B3 title is required", posts($faculty)->create(100, ' ', 'announcement', 'x', [], [])->message === 'A title is required before you can post.');
check("B3 message is required", posts($faculty)->create(100, 'T', 'announcement', '', [], [])->code === 400);
check("B3 type must be announcement or blog", posts($faculty)->create(100, 'T', 'reminder', 'x', [], [])->code === 400);
check("B3 max 5 attachments", posts($faculty)->create(100, 'T', 'announcement', 'x', [], array_map(fn($i) => fakeUpload("f$i.pdf"), range(1, 6)))->code === 400);
check("B3 bad attachment type rejected", posts($faculty)->create(100, 'T', 'announcement', 'x', [], [fakeUpload('run.exe')])->code === 400);
check("B3 students can't post", posts($studentA)->create(100, 'T', 'announcement', 'x', [], [])->code === 403);

$r = posts($faculty)->feed(100);
check("B2 faculty feed shows both posts, newest first", names($r, 'posts', 'title') === ['Photoshop Project Tips', 'Class Suspension'] && $r->body['can_post'] === true);
check("B1 the new blog shows for its section (BSCS 2B) right away", names(posts($studentB)->feed(100), 'posts', 'title') === ['Photoshop Project Tips', 'Class Suspension']);
check("B1 a 2B-only blog is hidden from 2A", names(posts($studentA)->feed(100), 'posts', 'title') === ['Class Suspension']);
check("B1 student can open the announcement", posts($studentA)->show($annId)->code === 200);
check("B1 student in the section can open the blog", posts($studentB)->show($blogId)->code === 200);
check("B1 student outside the section can't open it", posts($studentA)->show($blogId)->code === 404);
check("B1 student can download a post attachment", is_array(res($studentA)->openFile($attachmentId, false)));
check("B1 non-enrolled student blocked", posts($outsider)->feed(100)->code === 403);
check("B3 dean of another department can't post here", posts($otherDean)->create(100, 'T', 'blog', 'x', [], [])->code === 403);

$r = posts($faculty)->update($blogId, 'Photoshop Tips v2', null, null, null);
check("B4 editing a blog just saves it", $r->code === 200 && $r->message === 'Post updated.' && $r->body['post']['title'] === 'Photoshop Tips v2');
check("B4 edited blog stays visible to its section", names(posts($studentB)->feed(100), 'posts', 'title')[0] === 'Photoshop Tips v2');
check("B2 other faculty can't edit", posts($faculty2)->update($blogId, 'x', null, null, null)->code === 404);
$r = posts($faculty)->update($annId, null, null, null, ['1'], [fakeUpload('Memo.docx')], [$attachmentId]);
check("B2 edit audience + swap attachment", $r->code === 200 && $r->body['post']['visible_label'] === 'BSCS 2A'
    && array_column($r->body['post']['attachments'], 'name') === ['Memo']);
check("B2 removed attachment can no longer be opened", res($faculty)->show($attachmentId)->code === 404);
check("B2 students can't edit", posts($studentA)->update($annId, 'x', null, null, null)->code === 403);

$r = posts($dean)->create(100, 'Dean Blog', 'blog', 'From the dean.', [], []);
check("B3 the department's dean can post in its classes", $r->code === 201);

for ($i = 1; $i <= 10; $i++) {
    posts($faculty)->create(100, "Post $i", 'announcement', "Message $i", [], []);
}
$p1 = posts($studentA)->feed(100, 1);
$p2 = posts($studentA)->feed(100, 2);
check("B1 feed pages 10 at a time", count($p1->body['posts']) === 10 && $p1->body['has_more'] === true && $p1->body['posts'][0]['title'] === 'Post 10');
check("B1 page 2 has the rest", count($p2->body['posts']) === 2 && $p2->body['has_more'] === false, (string) count($p2->body['posts']));
check("B1 filter feed by type", names(posts($studentA)->feed(100, 1, 'blog'), 'posts', 'title') === ['Dean Blog']);
$only = posts($faculty)->create(100, 'BSIT Lab Notice', 'announcement', 'For BSIT 2B.', [3], [])->body['post'];
check("B2 faculty can filter the feed by section", in_array('BSIT Lab Notice', names(posts($faculty)->feed(100, 1, null, 3), 'posts', 'title'), true)
    && !in_array('BSIT Lab Notice', names(posts($faculty)->feed(100, 1, null, 1), 'posts', 'title'), true));
posts($faculty)->delete($only['id']);

$memoStored = $pdo->query("SELECT stored_name FROM class_files WHERE post_id = $annId")->fetchColumn();
$r = posts($faculty)->delete($annId);
check("B2 delete post removes its attachments", $r->code === 200 && $r->body['attachments_removed'] === 1 && !is_file("$dir/$memoStored"));
check("B2 deleted post is gone", posts($faculty)->show($annId)->code === 404);
check("B2 dean can delete faculty posts", posts($dean)->delete($blogId)->code === 200);

$r = posts($faculty)->create(100, '  ', 'announcement', '', [], [fakeUpload('run.exe')]);
check("B3b all form errors come back together", $r->code === 400
    && isset($r->body['fields']['title'], $r->body['fields']['message']) && count($r->body['errors']) === 1, json_encode($r->body));

echo "\nREAD-ONLY VIEW (admins, program chairs)\n";
add_person($pdo, 30, 'Chair', 'Ramos', 'program_chair', 3);
add_person($pdo, 31, 'Other', 'Chair', 'program_chair', 4);
add_person($pdo, 90, 'Raya', 'Manalo', 'college_admin');
$pdo->exec("INSERT INTO program_chair_assignments (membership_id, program_id) VALUES (30, 8), (31, 16)");
$chair = u(30, 'program_chair');       // BSCS: class 100 is a BSCS class
$otherChair = u(31, 'program_chair');  // BSEd-Eng
$admin = u(90, 'college_admin');
$facultyFeed = posts($faculty)->feed(100);
$r = posts($chair)->feed(100);
check("Program chair sees every post of a class in their program", $r->code === 200 && names($r, 'posts', 'id') === names($facultyFeed, 'posts', 'id') && $r->body['can_oversee'] === true);
check("Program chair can't post", $r->body['can_post'] === false && posts($chair)->create(100, 'Hi', 'announcement', 'Hello', [], [])->code === 403);
check("Chair of another program can't see the feed", posts($otherChair)->feed(100)->code === 403);
$r = res($admin)->list(100);
check("Admin sees the resources of any class, read-only", $r->code === 200 && $r->body['can_manage'] === false && $r->body['can_oversee'] === true);
check("Admin can open a resource", $r->body['resources'] !== [] && is_array(res($admin)->openFile($r->body['resources'][0]['id'], false)));
check("Admin can't upload", res($admin)->upload(100, [fakeUpload('x.pdf')])->code === 403);
check("Outside student still can't see the class", res($outsider)->list(100)->code === 403 && posts($outsider)->feed(100)->code === 403);

echo "\nNOTIFICATIONS\n";

$pdo->exec("DELETE FROM notifications");
// [user_id => list of notification types], newest first
function inbox(int $userId): array {
    global $pdo;
    return array_column($pdo->query("SELECT type FROM notifications WHERE user_id = $userId ORDER BY id DESC")->fetchAll(), 'type');
}
function notes(CurrentUser $u): NotificationController { global $pdo; return new NotificationController($pdo, $u); }

res($faculty)->upload(100, [fakeUpload('Lab 5.pdf')]);
check("N · a resource upload tells every enrolled student", inbox(10) === ['resource'] && inbox(11) === ['resource'] && inbox(12) === ['resource']);
check("N · the uploader isn't notified", inbox(1) === []);

posts($faculty)->create(100, 'Exam Room', 'announcement', 'Room 301.', [], []);
check("N · all-sections announcement reaches every student", inbox(10)[0] === 'announcement' && inbox(11)[0] === 'announcement' && inbox(12)[0] === 'announcement');
check("N · students of other classes get nothing", inbox(13) === []);

posts($faculty)->create(100, 'Study Plan', 'blog', 'Tips.', [2], []);
check("N · a new blog reaches its section right away (2B only)", inbox(11)[0] === 'blog' && !in_array('blog', inbox(10), true));
check("N · deans and the author get nothing (no approval step)", inbox(20) === [] && inbox(1) === []);

$list = notes($studentB)->list();
check("N1 · unread count for the badge", $list->body['unread'] === 3 && count($list->body['notifications']) === 3);
check("N2 · newest first with a link", $list->body['notifications'][0]['title'] === 'New blog'
    && str_starts_with($list->body['notifications'][0]['link'], 'feed.php?class_id=100'));
$firstId = $list->body['notifications'][0]['id'];
check("N2 · mark one as read", notes($studentB)->read($firstId)->body['unread'] === 2);
check("N2 · can't mark someone else's", notes($studentA)->read($firstId)->code === 404);
check("N2 · mark all as read", notes($studentB)->readAll()->code === 200 && notes($studentB)->list()->body['unread'] === 0);
check("N3 · empty list", notes($outsider)->list()->body['notifications'] === [] && notes($outsider)->list()->body['unread'] === 0);

// clean up
array_map('unlink', glob("$dir/*"));
@rmdir($dir);

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
