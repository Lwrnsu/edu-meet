<?php
require 'db.php';
if (!faculty()) { http_response_code(403); exit('Not allowed.'); }

$id = (int)($_GET['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
$st->execute([$id]);
if (!$st->fetch()) { http_response_code(404); exit('Task not found.'); }
if (!class_exists('ZipArchive')) { flash('ZIP is not enabled. Enable extension=zip in php.ini and restart Apache.'); redirect("task.php?id=$id"); }

$q = $pdo->prepare('SELECT u.name, s.file_name, s.file_path FROM submissions s
    JOIN ' . U() . ' u ON u.id = s.student_id WHERE s.task_id = ? ORDER BY u.name');
$q->execute([$id]);

$tmp = tempnam(sys_get_temp_dir(), 'zip');
$zip = new ZipArchive();
$zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);
foreach ($q->fetchAll() as $r) {
    $full = __DIR__ . '/uploads/' . basename($r['file_path']);
    if (!is_file($full)) continue;
    $zip->addFile($full, preg_replace('/[\\\\\/:*?"<>|]/', '', $r['name'] . ' - ' . $r['file_name']));
}
if (!$zip->numFiles) { $zip->close(); unlink($tmp); flash('No submissions to download yet.'); redirect("task.php?id=$id"); }
$zip->close();

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="submissions-task-' . $id . '.zip"');
header('Content-Length: ' . filesize($tmp));
readfile($tmp);
unlink($tmp);
