<?php
require 'db.php';

$id = (int)($_GET['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
$st->execute([$id]);
$t = $st->fetch();
if (!$t) redirect('tasks.php');

$ta = $pdo->prepare('SELECT * FROM task_files WHERE task_id = ? ORDER BY id');
$ta->execute([$id]);
$atts = $ta->fetchAll();

$sub = $pdo->prepare('SELECT * FROM submissions WHERE task_id = ? AND student_id = ?');
$sub->execute([$id, $me['id']]);
$mine = $sub->fetch();
$closed = $t['due_date'] && time() > strtotime($t['due_date']) && !$t['allow_late'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'] ?? '';

    if (!faculty() && $act === 'submit' && !$closed && !($mine && $mine['score'] !== null)) {
        $up = store_upload('file');
        if ($up) {
            if ($mine) remove_upload($mine['file_path']);
            $pdo->prepare('INSERT INTO submissions (task_id, student_id, file_name, file_path, file_size) VALUES (?,?,?,?,?)
                ON DUPLICATE KEY UPDATE file_name=VALUES(file_name), file_path=VALUES(file_path), file_size=VALUES(file_size), submitted_at=NOW()')
                ->execute([$id, $me['id'], $up[0], $up[1], $up[2]]);
            flash('Your work was submitted.');
        } else {
            flash('Upload failed. Use pdf, doc(x), ppt(x), xls(x), txt, png, jpg or zip up to 30 MB.');
        }
    }
    if (!faculty() && $act === 'remove' && $mine && $mine['score'] === null) {
        remove_upload($mine['file_path']);
        $pdo->prepare('DELETE FROM submissions WHERE id = ?')->execute([$mine['id']]);
        flash('Submission removed.');
    }
    if (faculty() && $act === 'score') {
        $has = $_POST['score'] !== '';
        $score = max(0, min((float)$_POST['score'], (float)$t['max_score']));
        $pdo->prepare('UPDATE submissions SET score=?, feedback=? WHERE id=? AND task_id=?')
            ->execute([$has ? $score : null, trim($_POST['feedback']), (int)$_POST['sid'], $id]);
        flash('Score saved.');
    }
    redirect("task.php?id=$id");
}

top('tasks');
?>
<section class="panel">
  <a class="back" href="tasks.php">&lsaquo; Back to tasks</a>
  <div class="ptop">
    <h2><?= h($t['title']) ?></h2>
    <?php if (faculty()): ?>
      <div class="toolbar">
        <a class="btn-o" href="download_all.php?id=<?= $id ?>"><?= icon('zip') ?> Download all (ZIP)</a>
        <a class="btn-o" href="export.php?id=<?= $id ?>"><?= icon('download') ?> Export scores (CSV)</a>
      </div>
    <?php endif; ?>
  </div>
  <div class="stats">
    <span class="pill">Due: <?= d($t['due_date']) ?></span>
    <span class="pill">Max score: <?= $t['max_score'] ?></span>
    <span class="pill"><?= $t['allow_late'] ? 'Late submissions allowed' : 'Closes at the due date' ?></span>
  </div>
  <p class="muted" style="white-space:pre-line;margin:0"><?= h($t['description'] ?: 'No instructions provided.') ?></p>
  <?php foreach ($atts as $a): ?>
    <div class="att"><?= badge($a['file_name']) ?> <?= h($a['file_name']) ?> <span class="muted"><?= size_fmt($a['file_size']) ?></span>
      <?php if (viewable($a['file_name'])): ?><a class="iconbtn" title="View" aria-label="View attachment" href="download.php?type=task&id=<?= $a['id'] ?>&view=1" target="_blank"><?= icon('eye') ?></a><?php endif; ?>
      <a class="iconbtn dl" title="Download" aria-label="Download attachment" href="download.php?type=task&id=<?= $a['id'] ?>"><?= icon('download') ?></a>
    </div>
  <?php endforeach; ?>
</section>

<?php if (!faculty()): ?>
  <section class="panel">
    <h2 style="margin:0 0 6px;font-size:18px">Your work</h2>
    <?php if ($mine): ?>
      <div class="filebox">
        <span><?= badge($mine['file_name']) ?> &nbsp;<?= h($mine['file_name']) ?>
          <span class="sub"><?= size_fmt($mine['file_size']) ?> · Submitted <?= d($mine['submitted_at']) ?> <?= is_late($t, $mine['submitted_at']) ? '<span class="late">Late</span>' : '' ?></span></span>
        <span>
          <?php if (viewable($mine['file_name'])): ?>
            <a class="iconbtn" title="View" aria-label="View" href="download.php?type=submission&id=<?= $mine['id'] ?>&view=1" target="_blank"><?= icon('eye') ?></a>
          <?php endif; ?>
          <a class="iconbtn dl" title="Download" aria-label="Download" href="download.php?type=submission&id=<?= $mine['id'] ?>"><?= icon('download') ?></a>
        </span>
      </div>
    <?php endif; ?>

    <?php if ($mine && $mine['score'] !== null): ?>
      <p class="muted" style="margin:14px 0 0">Your score</p>
      <div class="big"><?= fmt($mine['score']) ?> / <?= $t['max_score'] ?></div>
      <?php if ($mine['feedback']): ?><p style="margin:8px 0 0"><?= h($mine['feedback']) ?></p><?php endif; ?>
    <?php elseif ($closed): ?>
      <p class="muted" style="margin:10px 0 0">Submissions closed at the due date.</p>
    <?php else: ?>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="action" value="submit">
        <label><?= $mine ? 'Replace your file' : 'Upload your file' ?> <span class="muted">(max 30 MB)</span>
          <input type="file" name="file" required accept=".<?= implode(',.', ALLOWED) ?>"></label>
        <div class="actions" style="justify-content:flex-start;margin-top:0">
          <button class="btn-p"><?= $mine ? 'Replace file' : 'Submit work' ?></button>
          <?php if ($mine): ?>
            <button class="btn-o" name="action" value="remove" formnovalidate onclick="return confirm('Remove your submission?')">Remove</button>
          <?php endif; ?>
        </div>
      </form>
    <?php endif; ?>
  </section>

<?php else:
  $q = $pdo->prepare('SELECT * FROM submissions WHERE task_id = ?');
  $q->execute([$id]);
  $subs = [];
  foreach ($q->fetchAll() as $r) $subs[$r['student_id']] = $r;
  $rows = array_map(fn($s) => ['name' => $s['name'], 'sub' => $subs[$s['id']] ?? null], class_students());
  $submitted = array_filter($rows, fn($r) => $r['sub']);
  $scored = array_filter($rows, fn($r) => $r['sub'] && $r['sub']['score'] !== null);
  $avg = $scored ? array_sum(array_map(fn($r) => $r['sub']['score'], $scored)) / count($scored) : null; ?>
  <section class="panel">
    <div class="ptop">
      <h2>Student Submissions</h2>
      <div class="stats" style="margin:0">
        <span class="pill"><?= count($submitted) ?> of <?= count($rows) ?> submitted</span>
        <span class="pill"><?= count($scored) ?> scored</span>
        <?php if ($avg !== null): ?><span class="pill score">Average: <?= fmt($avg) ?> / <?= $t['max_score'] ?></span><?php endif; ?>
      </div>
    </div>
    <div class="tablewrap">
    <table>
      <thead><tr><th>Student</th><th>Submitted</th><th class="nosort">File</th><th class="nosort">Score (max <?= $t['max_score'] ?>)</th></tr></thead>
      <tbody>
      <?php foreach ($rows as $r): $s = $r['sub']; ?>
      <tr>
        <td><?= h($r['name']) ?></td>
        <td data-v="<?= $s ? strtotime($s['submitted_at']) : 0 ?>"><?= $s ? d($s['submitted_at']) : '—' ?>
          <?= $s && is_late($t, $s['submitted_at']) ? '<span class="late">Late</span>' : '' ?></td>
        <td>
          <?php if ($s): ?>
            <?= badge($s['file_name']) ?>
            <?php if (viewable($s['file_name'])): ?>
              <a class="iconbtn" title="View" aria-label="View" href="download.php?type=submission&id=<?= $s['id'] ?>&view=1" target="_blank"><?= icon('eye') ?></a>
            <?php endif; ?>
            <a class="iconbtn dl" title="Download <?= h($s['file_name']) ?>" aria-label="Download" href="download.php?type=submission&id=<?= $s['id'] ?>"><?= icon('download') ?></a>
            <span class="sub"><?= h($s['file_name']) ?> · <?= size_fmt($s['file_size']) ?></span>
          <?php else: ?>—<?php endif; ?>
        </td>
        <td>
          <?php if ($s): ?>
          <form method="post" class="scoreform">
            <input type="hidden" name="action" value="score"><input type="hidden" name="sid" value="<?= $s['id'] ?>">
            <input type="number" name="score" min="0" max="<?= $t['max_score'] ?>" step="0.01" value="<?= $s['score'] !== null ? fmt($s['score']) : '' ?>" placeholder="Score" aria-label="Score for <?= h($r['name']) ?>">
            <input name="feedback" value="<?= h($s['feedback']) ?>" placeholder="Feedback (optional)" aria-label="Feedback">
            <button class="btn-p">Save</button>
          </form>
          <?php else: ?>—<?php endif; ?>
        </td>
      </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    </div>
  </section>
<?php endif; ?>
<?php bottom();
