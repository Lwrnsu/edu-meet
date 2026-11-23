<?php
require 'db.php';
$id = (int)($_GET['id'] ?? 0);
$type = $_GET['type'] ?? '';

if ($type === 'task') {
    $st = $pdo->prepare('SELECT * FROM task_files WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
} elseif ($type === 'submission') {
    $st = $pdo->prepare('SELECT * FROM submissions WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if ($r && !faculty() && $r['student_id'] != $me['id']) { http_response_code(403); exit('Not allowed.'); }
} else {
    $st = $pdo->prepare('SELECT * FROM files WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
}
$full = $r ? __DIR__ . '/uploads/' . basename($r['file_path']) : '';
if (!$r || !is_file($full)) { http_response_code(404); exit('File not found.'); }

$mimes = ['pdf' => 'application/pdf', 'png' => 'image/png', 'jpg' => 'image/jpeg',
          'jpeg' => 'image/jpeg', 'txt' => 'text/plain; charset=utf-8'];
$e = ext($r['file_name']);
$inline = isset($_GET['view']) && viewable($r['file_name']);
$name = ($type === '' || $type === 'file') && !empty($r['title']) ? $r['title'] . '.' . $e : $r['file_name'];

header('Content-Type: ' . ($mimes[$e] ?? 'application/octet-stream'));
header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename*=UTF-8''" . rawurlencode($name));
header('Content-Length: ' . filesize($full));
header('X-Content-Type-Options: nosniff');
readfile($full);
