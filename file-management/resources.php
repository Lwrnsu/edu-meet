<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && faculty() && isset($_POST['action'])) {
    $id = (int)($_POST['id'] ?? 0);
    $get = function ($id) use ($pdo) { $s = $pdo->prepare('SELECT * FROM files WHERE id = ?'); $s->execute([$id]); return $s->fetch(); };

    if ($_POST['action'] === 'upload') {
        $n = 0;
        foreach (store_uploads('files') as [$name, $stored, $size]) {
            $pdo->prepare('INSERT INTO files (title, file_name, file_path, file_size, uploaded_by) VALUES (?,?,?,?,?)')
                ->execute([pathinfo($name, PATHINFO_FILENAME), $name, $stored, $size, $me['id']]);
            $n++;
        }
        flash($n ? "$n file" . ($n > 1 ? 's' : '') . ' posted.' : 'Nothing was uploaded. Use pdf, docx, pptx, xlsx, png, jpg, txt or zip up to 30 MB each.');
    } elseif ($_POST['action'] === 'edit' && ($r = $get($id)) && trim($_POST['title']) !== '') {
        $up = store_upload('file');
        if ($up) {
            remove_upload($r['file_path']);
            $pdo->prepare('UPDATE files SET title=?, file_name=?, file_path=?, file_size=? WHERE id=?')
                ->execute([trim($_POST['title']), $up[0], $up[1], $up[2], $id]);
        } else {
            $pdo->prepare('UPDATE files SET title=? WHERE id=?')->execute([trim($_POST['title']), $id]);
        }
        flash('Resource updated.');
    } elseif ($_POST['action'] === 'delete' && ($r = $get($id))) {
        remove_upload($r['file_path']);
        $pdo->prepare('DELETE FROM files WHERE id = ?')->execute([$id]);
        flash('Resource deleted.');
    }
    redirect('resources.php');
}

$files = $pdo->query('SELECT f.*, u.name AS uploader FROM files f JOIN ' . U() . ' u ON u.id = f.uploaded_by ORDER BY f.created_at DESC, f.id DESC')->fetchAll();
$types = array_unique(array_map(fn($f) => ext($f['file_name']), $files));
sort($types);

top('resources');
?>
<section class="panel">
  <div class="ptop">
    <h2>Class Resources</h2>
    <div class="toolbar">
      <div class="search"><?= icon('search') ?><input id="q" type="search" placeholder="Search" aria-label="Search resources"></div>
      <select id="tf" aria-label="File type">
        <option value="">File Type</option>
        <?php foreach ($types as $t): ?><option value="<?= h($t) ?>"><?= strtoupper(h($t)) ?></option><?php endforeach; ?>
      </select>
      <?php if (faculty()): ?><button class="btn-p" id="new"><?= icon('upload') ?> Upload Resources</button><?php endif; ?>
    </div>
  </div>

  <?php if (!$files): ?>
    <div class="empty"><?= faculty() ? 'No resources yet. Select “Upload Resources” to share lessons and modules.' : 'Your teacher hasn’t shared any resources yet.' ?></div>
  <?php else: ?>
  <div class="tablewrap">
  <table>
    <thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Date Uploaded</th><th class="nosort">Actions</th></tr></thead>
    <tbody>
    <?php foreach ($files as $f): ?>
      <tr data-name="<?= h(strtolower($f['title'])) ?>" data-type="<?= h(ext($f['file_name'])) ?>">
        <td><?= h($f['title']) ?><span class="sub">Uploaded by <?= h($f['uploader']) ?></span></td>
        <td><?= badge($f['file_name']) ?></td>
        <td data-v="<?= (int)$f['file_size'] ?>"><?= size_fmt($f['file_size']) ?></td>
        <td data-v="<?= strtotime($f['created_at']) ?>"><?= dd($f['created_at']) ?></td>
        <td class="actions-col">
          <?php if (viewable($f['file_name'])): ?>
            <a class="iconbtn" title="View" aria-label="View" href="download.php?type=file&id=<?= $f['id'] ?>&view=1" target="_blank"><?= icon('eye') ?></a>
          <?php endif; ?>
          <a class="iconbtn dl" title="Download" aria-label="Download" href="download.php?type=file&id=<?= $f['id'] ?>"><?= icon('download') ?></a>
          <?php if (faculty()): ?>
            <button class="iconbtn edit" title="Edit" aria-label="Edit" data-edit="<?= h(json_encode(['id' => $f['id'], 'title' => $f['title']])) ?>"><?= icon('edit') ?></button>
            <form method="post" onsubmit="return confirm('Delete this resource?')">
              <input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $f['id'] ?>">
              <button class="iconbtn del" title="Delete" aria-label="Delete"><?= icon('trash') ?></button>
            </form>
          <?php endif; ?>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <div class="empty" id="nomatch" hidden>No resources match your search.</div>
  </div>
  <?php endif; ?>
</section>

<?php if (faculty()): ?>
<dialog id="up">
  <form method="post" enctype="multipart/form-data">
    <div class="mhead">Upload Resources <button type="button" class="iconbtn" data-close aria-label="Close">&times;</button></div>
    <input type="hidden" name="action" value="upload">
    <p class="lbl">Files</p>
    <?= dropzone('files') ?>
    <div class="actions">
      <button type="button" class="btn-o" data-close>Cancel</button>
      <button class="btn-p" id="postBtn" disabled>Post</button>
    </div>
  </form>
</dialog>

<dialog id="ed">
  <form method="post" enctype="multipart/form-data">
    <div class="mhead">Edit Resource <button type="button" class="iconbtn" data-close aria-label="Close">&times;</button></div>
    <input type="hidden" name="action" value="edit"><input type="hidden" name="id" id="e_id">
    <label>File name<input name="title" id="e_title" required></label>
    <label>Replace file (optional)<input type="file" name="file" accept=".<?= implode(',.', ALLOWED) ?>"></label>
    <div class="actions">
      <button type="button" class="btn-o" data-close>Cancel</button>
      <button class="btn-p">Save changes</button>
    </div>
  </form>
</dialog>
<script>
addEventListener('DOMContentLoaded', () => {
  $('#new').onclick = () => $('#up').showModal();
  $('#up .dz').addEventListener('filechange', e => $('#postBtn').disabled = !e.detail);
  $$('[data-edit]').forEach(b => b.onclick = () => {
    const r = JSON.parse(b.dataset.edit);
    $('#e_id').value = r.id; $('#e_title').value = r.title;
    $('#ed').showModal();
  });
});
</script>
<?php endif; ?>
<?php bottom();
