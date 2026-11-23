<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && faculty() && isset($_POST['action'])) {
    $get = function ($id) use ($pdo) { $s = $pdo->prepare('SELECT * FROM tasks WHERE id = ?'); $s->execute([$id]); return $s->fetch(); };
    $addFiles = function ($taskId) use ($pdo) {
        foreach (store_uploads('attachments') as [$name, $stored, $size]) {
            $pdo->prepare('INSERT INTO task_files (task_id, file_name, file_path, file_size) VALUES (?,?,?,?)')
                ->execute([$taskId, $name, $stored, $size]);
        }
    };

    if ($_POST['action'] === 'save' && trim($_POST['title']) !== '') {
        $due = $_POST['due_date'] ? date('Y-m-d H:i:s', strtotime($_POST['due_date'])) : null;
        $v = [trim($_POST['title']), trim($_POST['description']), $due, max(1, (int)$_POST['max_score']), isset($_POST['allow_late']) ? 1 : 0];
        if (!empty($_POST['id'])) {
            $id = (int)$_POST['id'];
            if ($get($id)) {
                $pdo->prepare('UPDATE tasks SET title=?, description=?, due_date=?, max_score=?, allow_late=? WHERE id=?')->execute([...$v, $id]);
                foreach ((array)($_POST['remove_att'] ?? []) as $aid) {
                    $s = $pdo->prepare('SELECT * FROM task_files WHERE id = ? AND task_id = ?');
                    $s->execute([(int)$aid, $id]);
                    if ($a = $s->fetch()) {
                        remove_upload($a['file_path']);
                        $pdo->prepare('DELETE FROM task_files WHERE id = ?')->execute([$a['id']]);
                    }
                }
                $addFiles($id);
                flash('Task updated.');
            }
        } else {
            $pdo->prepare('INSERT INTO tasks (title, description, due_date, max_score, allow_late, created_by) VALUES (?,?,?,?,?,?)')
                ->execute([...$v, $me['id']]);
            $addFiles((int)$pdo->lastInsertId());
            flash('Task posted.');
        }
    } elseif ($_POST['action'] === 'delete') {
        $id = (int)$_POST['id'];
        if ($get($id)) {
            foreach (['task_files', 'submissions'] as $tbl) {
                $s = $pdo->prepare("SELECT file_path FROM $tbl WHERE task_id = ?");
                $s->execute([$id]);
                foreach ($s->fetchAll() as $r) remove_upload($r['file_path']);
            }
            $pdo->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);
            flash('Task deleted.');
        }
    }
    redirect('tasks.php');
}

$st = $pdo->prepare('SELECT t.*, s.score,
    (SELECT COUNT(*) FROM submissions WHERE task_id = t.id) AS subs
    FROM tasks t LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = ?
    ORDER BY t.created_at DESC, t.id DESC');
$st->execute([$me['id']]);
$tasks = $st->fetchAll();

$atts = [];
foreach ($pdo->query('SELECT * FROM task_files ORDER BY id')->fetchAll() as $a) $atts[$a['task_id']][] = $a;
$total = count(class_students());

top('tasks');
?>
<section class="panel">
  <div class="ptop">
    <h2>Class Tasks</h2>
    <div class="toolbar">
      <div class="search"><?= icon('search') ?><input id="q" type="search" placeholder="Search" aria-label="Search tasks"></div>
      <?php if (faculty()): ?><button class="btn-p" id="new">+ New Task</button><?php endif; ?>
    </div>
  </div>

  <?php if (!$tasks): ?>
    <div class="empty"><?= faculty() ? 'No tasks yet. Select “+ New Task” to post one.' : 'No tasks yet.' ?></div>
  <?php else: ?>
  <div class="tablewrap">
  <table>
    <thead><tr><th>Task</th><th>Due</th><th>Max Score</th><th><?= faculty() ? 'Submitted' : 'My Score' ?></th><th class="nosort">Actions</th></tr></thead>
    <tbody>
    <?php foreach ($tasks as $t): $ta = $atts[$t['id']] ?? []; ?>
      <tr data-name="<?= h(strtolower($t['title'])) ?>">
        <td><?= h($t['title']) ?>
          <?php if ($ta): ?><span class="muted" title="<?= count($ta) ?> attached file(s)"><?= icon('clip') ?> <?= count($ta) ?></span><?php endif; ?></td>
        <td data-v="<?= $t['due_date'] ? strtotime($t['due_date']) : 0 ?>"><?= d($t['due_date']) ?></td>
        <td><?= $t['max_score'] ?></td>
        <td>
          <?php if (faculty()): ?><?= $t['subs'] ?> / <?= $total ?>
          <?php elseif ($t['score'] !== null): ?><span class="pill score"><?= fmt($t['score']) ?> / <?= $t['max_score'] ?></span>
          <?php else: ?>—<?php endif; ?>
        </td>
        <td class="actions-col">
          <a class="iconbtn" title="Open" aria-label="Open task" href="task.php?id=<?= $t['id'] ?>"><?= icon('eye') ?></a>
          <?php if (faculty()): ?>
            <button class="iconbtn edit" title="Edit" aria-label="Edit" data-edit="<?= h(json_encode([
                'id' => $t['id'], 'title' => $t['title'], 'description' => $t['description'],
                'due' => $t['due_date'] ? date('Y-m-d\TH:i', strtotime($t['due_date'])) : '',
                'max' => $t['max_score'], 'late' => (int)$t['allow_late'],
                'atts' => array_map(fn($a) => ['id' => $a['id'], 'name' => $a['file_name']], $ta)])) ?>"><?= icon('edit') ?></button>
            <form method="post" onsubmit="return confirm('Delete this task and all its submissions?')">
              <input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $t['id'] ?>">
              <button class="iconbtn del" title="Delete" aria-label="Delete"><?= icon('trash') ?></button>
            </form>
          <?php endif; ?>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <div class="empty" id="nomatch" hidden>No tasks match your search.</div>
  </div>
  <?php endif; ?>
</section>

<?php if (faculty()): ?>
<dialog id="dlg">
  <form method="post" enctype="multipart/form-data">
    <div class="mhead"><span id="dt">New Task</span> <button type="button" class="iconbtn" data-close aria-label="Close">&times;</button></div>
    <input type="hidden" name="action" value="save"><input type="hidden" name="id" id="f_id">
    <label>Title<input name="title" id="f_title" required></label>
    <label>Instructions<textarea name="description" id="f_desc" rows="3"></textarea></label>
    <div class="row">
      <label>Due date<input type="datetime-local" name="due_date" id="f_due"></label>
      <label>Max score<input type="number" name="max_score" id="f_max" min="1" value="100" required></label>
    </div>
    <label class="check"><input type="checkbox" name="allow_late" id="f_late" checked> Allow late submissions (marked “Late”)</label>
    <p class="lbl" style="margin-top:14px">Attach files (optional)</p>
    <div class="curfiles" id="f_cur"></div>
    <?= dropzone('attachments') ?>
    <div class="actions">
      <button type="button" class="btn-o" data-close>Cancel</button>
      <button class="btn-p">Save task</button>
    </div>
  </form>
</dialog>
<script>
addEventListener('DOMContentLoaded', () => {
  const dlg = $('#dlg');
  function openTask(t) {
    $('#dt').textContent = t ? 'Edit Task' : 'New Task';
    $('#f_id').value = t ? t.id : '';
    $('#f_title').value = t ? t.title : '';
    $('#f_desc').value = t ? t.description : '';
    $('#f_due').value = t ? t.due : '';
    $('#f_max').value = t ? t.max : 100;
    $('#f_late').checked = t ? !!t.late : true;
    const cur = $('#f_cur'); cur.innerHTML = '';
    (t ? t.atts : []).forEach(a => {
      const l = document.createElement('label'), i = document.createElement('input');
      l.className = 'check'; i.type = 'checkbox'; i.name = 'remove_att[]'; i.value = a.id;
      l.append(i, ' Remove: ' + a.name);
      cur.appendChild(l);
    });
    dlg.showModal();
  }
  $('#new').onclick = () => openTask(null);
  $$('[data-edit]').forEach(b => b.onclick = () => openTask(JSON.parse(b.dataset.edit)));
});
</script>
<?php endif; ?>
<?php bottom();
