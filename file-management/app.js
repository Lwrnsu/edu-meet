const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const tok = $('meta[name=csrf]')?.content || '';
$$('form[method=post]').forEach(f => {
  const i = document.createElement('input');
  i.type = 'hidden'; i.name = 'csrf'; i.value = tok; f.appendChild(i);
});

$$('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
$$('.flash').forEach(f => setTimeout(() => f.remove(), 4500));

const q = $('#q'), tf = $('#tf');
function applyFilter() {
  const s = (q?.value || '').toLowerCase().trim(), t = tf?.value || '';
  let n = 0;
  $$('tbody tr[data-name]').forEach(r => {
    const ok = r.dataset.name.includes(s) && (!t || r.dataset.type === t);
    r.hidden = !ok; if (ok) n++;
  });
  const e = $('#nomatch'); if (e) e.hidden = n > 0;
}
q?.addEventListener('input', applyFilter);
tf?.addEventListener('change', applyFilter);

function initDrop(box) {
  const drop = $('.drop', box), pick = $('input[type=file]', box), list = $('.flist', box), note = $('.dnote', box);
  const OK = drop.dataset.ok.split(','), MAXMB = +drop.dataset.max, MAX = MAXMB * 1048576, dt = new DataTransfer();
  const sz = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function render() {
    list.innerHTML = '';
    [...dt.files].forEach((f, i) => {
      const e = f.name.split('.').pop().toLowerCase(), li = document.createElement('li');
      li.innerHTML = `<span class="badge b-${e}">${e.toUpperCase()}</span><span class="fn"></span><span class="muted">${sz(f.size)}</span><button type="button" class="iconbtn" aria-label="Remove file">&times;</button>`;
      $('.fn', li).textContent = f.name;
      $('button', li).onclick = () => { dt.items.remove(i); render(); };
      list.appendChild(li);
    });
    pick.files = dt.files;
    box.dispatchEvent(new CustomEvent('filechange', { detail: dt.files.length }));
  }
  function add(files) {
    note.textContent = '';
    for (const f of [...files]) {
      const e = f.name.split('.').pop().toLowerCase();
      if (!OK.includes(e) || f.size > MAX) { note.textContent = `Skipped ${f.name}: unsupported type or over ${MAXMB} MB.`; continue; }
      dt.items.add(f);
    }
    render();
  }
  drop.addEventListener('click', () => pick.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick.click(); } });
  pick.addEventListener('change', () => add(pick.files));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => add(e.dataTransfer.files));
  box.reset = () => { while (dt.items.length) dt.items.remove(0); note.textContent = ''; render(); };
}
$$('.dz').forEach(initDrop);
$$('dialog').forEach(d => d.addEventListener('close', () => $$('.dz', d).forEach(z => z.reset())));

$$('table thead').forEach(thead => {
  $$('th', thead).forEach((th, i) => {
    if (th.classList.contains('nosort')) return;
    th.classList.add('sortable'); th.tabIndex = 0;
    const go = () => {
      const tb = th.closest('table').tBodies[0], asc = th.getAttribute('aria-sort') !== 'ascending';
      $$('th', thead).forEach(o => o.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      const val = r => { const c = r.cells[i]; return c.dataset.v ?? c.textContent.trim().toLowerCase(); };
      [...tb.rows].sort((x, y) => {
        const a = val(x), b = val(y), n = !isNaN(a) && !isNaN(b) && a !== '' && b !== '';
        return (n ? a - b : String(a).localeCompare(String(b))) * (asc ? 1 : -1);
      }).forEach(r => tb.appendChild(r));
    };
    th.addEventListener('click', go);
    th.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });
});
