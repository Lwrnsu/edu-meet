<?php
session_start();

const DB_HOST = 'localhost';
const DB_NAME = 'edumeet';
const DB_USER = 'root';
const DB_PASS = '';

const LOGIN_URL       = '../login.php';
const SESSION_USER_ID = 'user_id';

const DEV_MODE = true;

const USERS_TABLE   = 'users';
const U_ID          = 'id';
const U_NAME_SQL    = '`name`';
const U_ROLE        = 'role';
const FACULTY_ROLES = ['faculty', 'teacher', 'instructor'];
const STUDENT_ROLES = ['student'];

$CLASS = ['name' => 'Graphics and Visual Computing (LEC)', 'code' => '45573 - CSP215A', 'time' => 'T-6:00 PM - 8:00 PM'];

$pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

function U() {
    $in = fn($a) => implode(',', array_map(fn($v) => "'" . addslashes(strtolower($v)) . "'", $a));
    return '(SELECT `' . U_ID . '` AS id, ' . U_NAME_SQL . ' AS name, CASE'
        . ' WHEN LOWER(`' . U_ROLE . '`) IN (' . $in(FACULTY_ROLES) . ") THEN 'faculty'"
        . ' WHEN LOWER(`' . U_ROLE . '`) IN (' . $in(STUDENT_ROLES) . ") THEN 'student' END AS role"
        . ' FROM `' . USERS_TABLE . '`)';
}

function class_students() {
    global $pdo;
    return $pdo->query('SELECT * FROM ' . U() . " u WHERE role = 'student' ORDER BY name")->fetchAll();
}

$DEV_SWITCH = DEV_MODE && !isset($_SESSION[SESSION_USER_ID]);
if ($DEV_SWITCH && isset($_POST['switch_role'])) {
    $_SESSION['dev_role'] = $_POST['switch_role'] === 'student' ? 'student' : 'faculty';
    header('Location: ' . $_SERVER['REQUEST_URI']);
    exit;
}
$me = null;
if ($DEV_SWITCH) {
    $st = $pdo->prepare('SELECT * FROM ' . U() . ' u WHERE role = ? ORDER BY id LIMIT 1');
    $st->execute([$_SESSION['dev_role'] ?? 'faculty']);
    $me = $st->fetch();
} elseif (!empty($_SESSION[SESSION_USER_ID])) {
    $st = $pdo->prepare('SELECT * FROM ' . U() . ' u WHERE id = ?');
    $st->execute([$_SESSION[SESSION_USER_ID]]);
    $me = $st->fetch();
}
if (!$me || !$me['role']) { header('Location: ' . LOGIN_URL); exit; }

const ALLOWED = ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','png','jpg','jpeg','zip'];
const VIEWABLE = ['pdf','png','jpg','jpeg','txt'];
const MAX_BYTES = 30 * 1024 * 1024;

function faculty() { global $me; return $me['role'] === 'faculty'; }
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function redirect($u) { header("Location: $u"); exit; }
function flash($m) { $_SESSION['flash'] = $m; }
function d($s) { return $s ? date('M j, Y | g:i A', strtotime($s)) : '—'; }
function dd($s) { return $s ? date('M j, Y', strtotime($s)) : '—'; }
function fmt($n) { return rtrim(rtrim(number_format((float)$n, 2, '.', ''), '0'), '.'); }
function ext($name) { return strtolower(pathinfo($name, PATHINFO_EXTENSION)); }
function viewable($name) { return in_array(ext($name), VIEWABLE); }
function size_fmt($n) { return $n >= 1048576 ? round($n / 1048576, 1) . ' MB' : ($n >= 1024 ? round($n / 1024) . ' KB' : $n . ' B'); }
function is_late($t, $at) { return $t['due_date'] && $at && strtotime($at) > strtotime($t['due_date']); }
function badge($name) { $e = ext($name); return '<span class="badge b-' . h($e) . '">' . strtoupper(h($e)) . '</span>'; }
function ini_bytes($v) {
    $v = trim((string)$v); $n = (float)$v;
    switch (strtolower(substr($v, -1))) { case 'g': $n *= 1024; case 'm': $n *= 1024; case 'k': $n *= 1024; }
    return (int)$n;
}

function icon($n) {
    $p = [
        'eye' => '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
        'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
        'trash' => '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
        'download' => '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
        'upload' => '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
        'search' => '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        'clip' => '<path d="M21.4 11.1l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5"/>',
        'zip' => '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    ][$n];
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}

function store_uploads($key) {
    $out = [];
    if (empty($_FILES[$key]['name'])) return $out;
    $f = $_FILES[$key];
    $multi = is_array($f['name']);
    $n = $multi ? count($f['name']) : 1;
    for ($i = 0; $i < $n; $i++) {
        $name = basename($multi ? $f['name'][$i] : $f['name']);
        $tmp = $multi ? $f['tmp_name'][$i] : $f['tmp_name'];
        $err = $multi ? $f['error'][$i] : $f['error'];
        $size = $multi ? $f['size'][$i] : $f['size'];
        if ($err !== UPLOAD_ERR_OK || $size > MAX_BYTES || !in_array(ext($name), ALLOWED)) continue;
        $mimes = ['pdf' => ['application/pdf'], 'png' => ['image/png'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg']];
        if (isset($mimes[ext($name)]) && function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            if (!in_array(finfo_file($fi, $tmp), $mimes[ext($name)])) continue;
        }
        $stored = bin2hex(random_bytes(8)) . '.' . ext($name);
        if (move_uploaded_file($tmp, __DIR__ . '/uploads/' . $stored)) $out[] = [$name, $stored, $size];
    }
    return $out;
}
function store_upload($key) { return store_uploads($key)[0] ?? null; }
function remove_upload($path) {
    $f = __DIR__ . '/uploads/' . basename($path);
    if (is_file($f)) unlink($f);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$_POST && !$_FILES && ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    flash('Upload too large. The maximum file size is 30 MB.');
    redirect($_SERVER['REQUEST_URI']);
}

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
    http_response_code(419);
    exit('Your session expired. Go back, refresh the page, and try again.');
}

function dropzone($name) {
    $mb = MAX_BYTES / 1048576;
    return '<div class="dz"><div class="drop" tabindex="0" role="button" data-ok="' . implode(',', ALLOWED) . '" data-max="' . $mb . '">'
        . icon('upload') . '<span>Drag files here or <b>browse</b></span>'
        . '<small>PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP · max ' . $mb . ' MB each</small></div>'
        . '<input type="file" name="' . h($name) . '[]" multiple hidden accept=".' . implode(',.', ALLOWED) . '">'
        . '<p class="dnote" role="alert"></p><ul class="flist"></ul></div>';
}

function top($active) {
    global $pdo, $me, $CLASS, $DEV_SWITCH;
    ?><!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf" content="<?= h($_SESSION['csrf']) ?>">
<title><?= h($CLASS['name']) ?> | EduMeet</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<script src="app.js" defer></script>
</head><body>
<aside class="side">
  <div class="logo">EduMeet</div>
  <?php if ($DEV_SWITCH): ?>
  <form method="post" class="switch">
    <label for="su">Viewing as</label>
    <select name="switch_role" id="su" onchange="this.form.submit()">
      <option value="faculty" <?= $me['role'] === 'faculty' ? 'selected' : '' ?>>Faculty</option>
      <option value="student" <?= $me['role'] === 'student' ? 'selected' : '' ?>>Student</option>
    </select>
    <div style="margin-top:6px"><?= h($me['name']) ?></div>
  </form>
  <?php else: ?>
  <div class="switch">Signed in as<br><b style="color:var(--ink)"><?= h($me['name']) ?></b> (<?= h($me['role']) ?>)</div>
  <?php endif; ?>
</aside>
<main>
  <header class="banner">
    <div class="bt"><h1><?= h($CLASS['name']) ?></h1><div class="info"><?= h($CLASS['code']) ?><br><?= h($CLASS['time']) ?></div></div>
    <a class="pillbtn" href="#">&lsaquo; Back to Classes</a>
  </header>
  <nav class="tabs">
    <a href="tasks.php" class="<?= $active === 'tasks' ? 'on' : '' ?>">Tasks</a>
    <a href="resources.php" class="<?= $active === 'resources' ? 'on' : '' ?>">Resources</a>
  </nav>
  <?php if (!empty($_SESSION['flash'])): ?>
    <div class="flash" role="status"><?= h($_SESSION['flash']) ?></div>
  <?php unset($_SESSION['flash']); endif;
}
function bottom() { echo '</main></body></html>'; }
