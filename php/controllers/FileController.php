<?php
class FileController extends Controller
{
    /**
     * GET files.download&type=file|task|submission&id=N[&view=1]
     * Streams the file (this is the one endpoint that does not return JSON on success).
     */
    public function download()
    {
        $id   = Request::int('id');
        $type = Request::str('type');

        if ($type === 'task') {
            $r = $this->find('task_files', $id);
        } elseif ($type === 'submission') {
            $r = $this->find('submissions', $id);
            if ($r && !$this->isFaculty() && (int) $r['student_id'] !== (int) $this->me['id']) {
                Http::fail('Not allowed.', 403);
            }
        } else {
            $r = $this->find('files', $id);
        }

        $full = $r ? UPLOAD_DIR . basename($r['file_path']) : '';
        if (!$r || !is_file($full)) Http::fail('File not found.', 404);

        $mimes = ['pdf' => 'application/pdf', 'png' => 'image/png', 'jpg' => 'image/jpeg',
                  'jpeg' => 'image/jpeg', 'txt' => 'text/plain; charset=utf-8'];
        $e      = Util::ext($r['file_name']);
        $inline = Request::get('view') !== null && Util::viewable($r['file_name']);
        $name   = ($type === '' || $type === 'file') && !empty($r['title']) ? $r['title'] . '.' . $e : $r['file_name'];

        header('Content-Type: ' . ($mimes[$e] ?? 'application/octet-stream'));
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename*=UTF-8''" . rawurlencode($name));
        header('Content-Length: ' . filesize($full));
        header('X-Content-Type-Options: nosniff');
        readfile($full);
        exit;
    }
}
