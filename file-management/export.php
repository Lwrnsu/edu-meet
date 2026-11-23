<?php
require 'db.php';
if (!faculty()) { http_response_code(403); exit('Not allowed.'); }

$id = (int)($_GET['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
$st->execute([$id]);
$t = $st->fetch();
if (!$t) { http_response_code(404); exit('Task not found.'); }

$q = $pdo->prepare('SELECT * FROM submissions WHERE task_id = ?');
$q->execute([$id]);
$subs = [];
foreach ($q->fetchAll() as $r) $subs[$r['student_id']] = $r;

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="scores-task-' . $id . '.csv"');
echo "\xEF\xBB\xBF";
$out = fopen('php://output', 'w');
fputcsv($out, ['Student', 'Submitted', 'Score', 'Max score', 'Late', 'Feedback']);
foreach (class_students() as $s) {
    $r = $subs[$s['id']] ?? null;
    fputcsv($out, [$s['name'], $r ? $r['submitted_at'] : 'Not submitted', $r && $r['score'] !== null ? fmt($r['score']) : '',
        $t['max_score'], $r && is_late($t, $r['submitted_at']) ? 'Yes' : '', $r ? $r['feedback'] : '']);
}
