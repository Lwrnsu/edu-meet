<?php
class ExportController extends Controller
{
    /** GET exports.scores&id=TASK_ID : CSV of scores (faculty). */
    public function scores()
    {
        $this->requireFaculty();

        $id = Request::int('id');
        $t = $this->find('tasks', $id);
        if (!$t) Http::fail('Task not found.', 404);

        $q = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ?');
        $q->execute([$id]);
        $subs = [];
        foreach ($q->fetchAll() as $r) $subs[$r['student_id']] = $r;

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="scores-task-' . $id . '.csv"');
        echo "\xEF\xBB\xBF";
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Student', 'Submitted', 'Score', 'Max score', 'Late', 'Feedback']);
        foreach (Db::students() as $s) {
            $r = $subs[$s['id']] ?? null;
            fputcsv($out, [
                $s['name'],
                $r ? $r['submitted_at'] : 'Not submitted',
                $r && $r['score'] !== null ? Util::fmt($r['score']) : '',
                $t['max_score'],
                $r && Util::isLate($t, $r['submitted_at']) ? 'Yes' : '',
                $r ? $r['feedback'] : '',
            ]);
        }
        fclose($out);
        exit;
    }

    /** GET exports.submissionsZip&id=TASK_ID : ZIP of all submitted files (faculty). */
    public function submissionsZip()
    {
        $this->requireFaculty();

        $id = Request::int('id');
        if (!$this->find('tasks', $id)) Http::fail('Task not found.', 404);
        if (!class_exists('ZipArchive')) {
            Http::fail('ZIP is not enabled on the server. Enable extension=zip in php.ini and restart Apache.', 500);
        }

        $q = $this->pdo->prepare('SELECT u.name, s.file_name, s.file_path FROM submissions s
            JOIN ' . Db::users() . ' u ON u.id = s.student_id WHERE s.task_id = ? ORDER BY u.name');
        $q->execute([$id]);

        $tmp = tempnam(sys_get_temp_dir(), 'zip');
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($q->fetchAll() as $r) {
            $full = UPLOAD_DIR . basename($r['file_path']);
            if (!is_file($full)) continue;
            $zip->addFile($full, preg_replace('/[\\\\\/:*?"<>|]/', '', $r['name'] . ' - ' . $r['file_name']));
        }
        if (!$zip->numFiles) {
            $zip->close();
            unlink($tmp);
            Http::fail('No submissions to download yet.', 404);
        }
        $zip->close();

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="submissions-task-' . $id . '.zip"');
        header('Content-Length: ' . filesize($tmp));
        readfile($tmp);
        unlink($tmp);
        exit;
    }
}
