// ===== Chizgi — UI =====
(function () {
  const $ = id => document.getElementById(id), t = k => I18N.t(k);
  const fmt = n => (+(+n).toFixed(3)).toString();
  const B = Board;
  let toastTimer = null;

  B.init($('board'));
  B.onChange = () => { $('emptyHint').classList.toggle('gone', B.shapes.length > 0); };

  // ---- til ----
  $('lang').value = I18N.lang;
  $('lang').addEventListener('change', e => I18N.set(e.target.value));

  // ---- asboblar ----
  const toolBtns = document.querySelectorAll('#dock2d [data-tool]');
  toolBtns.forEach(b => b.addEventListener('click', () => {
    B.tool = b.dataset.tool; toolBtns.forEach(x => x.classList.toggle('active', x === b));
    $('board').style.cursor = B.tool === 'hand' ? 'grab' : B.tool === 'eraser' ? 'cell' : 'crosshair';
  }));
  $('board').style.cursor = 'crosshair';
  $('autoBtn').addEventListener('click', () => {
    B.auto = !B.auto; $('autoBtn').classList.toggle('on', B.auto); toast(t(B.auto ? 'autoOn' : 'autoOff'));
  });
  const COLORS = ['#ffffff', '#4f8cff', '#8b5cf6', '#22d3ee', '#34d399', '#facc15', '#ff5c7a'];
  COLORS.forEach(c => {
    const b = document.createElement('button'); b.className = 'swatch'; b.style.background = c; b.dataset.c = c;
    b.addEventListener('click', () => { B.color = c; refreshSw(); }); $('swatches').appendChild(b);
  });
  const refreshSw = () => document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('active', b.dataset.c === B.color));
  refreshSw();
  [2, 4, 7].forEach(w => {
    const b = document.createElement('button'); b.className = 'wbtn'; b.dataset.w = w; b.innerHTML = `<i style="width:${w + 3}px;height:${w + 3}px"></i>`;
    b.addEventListener('click', () => { B.width = w; refreshW(); }); $('widths').appendChild(b);
  });
  B.width = 4;
  const refreshW = () => document.querySelectorAll('.wbtn').forEach(b => b.classList.toggle('active', +b.dataset.w === B.width));
  refreshW();
  $('undo').addEventListener('click', () => B.undo());
  $('redo').addEventListener('click', () => B.redo());
  $('clear').addEventListener('click', () => B.clear());
  $('gridBtn').addEventListener('click', () => { B.grid = !B.grid; $('gridBtn').classList.toggle('on', B.grid); B.render(); });
  $('measureBtn').addEventListener('click', () => { B.measures = !B.measures; $('measureBtn').classList.toggle('on', B.measures); B.render(); });
  $('png').addEventListener('click', () => B.exportPNG());

  // ---- 3D (doskaning o‘zida) ----
  Solid3D.init($('stage'));
  B.resize();
  $('toggle3d').addEventListener('click', () => {
    B.set3d(!B.mode3d);
    $('toggle3d').classList.toggle('on', B.mode3d); $('pill3d').textContent = B.mode3d ? 'ON' : 'OFF';
    toast(t(B.mode3d ? 'on3d' : 'off3d'));
  });
  function formLabel(o, s) {
    if (o.form === 'prism' && s.name === 'square') return t('f_cube');
    if (o.form === 'prism' && s.name === 'rect') return t('f_cuboid');
    return t('f_' + o.form);
  }
  B.onPick = id => {
    const el = $('info3d'), s = B.shapes.find(x => x.id === id), o = id !== null && Solid3D.info(id);
    if (!s || !o) { el.hidden = true; return; }
    const st = o.stats, rows = [];
    if (st.V !== undefined) rows.push(`${t('volume')}: V = ${fmt(st.V)}`);
    if (st.S !== undefined) rows.push(`${t('area')}: S = ${fmt(st.S)}`);
    if (st.r !== undefined) rows.push(`r = ${fmt(st.r)}`);
    if (st.h !== undefined) rows.push(`${t('height')}: h = ${fmt(st.h)}`);
    const n = Solid3D.formsFor(s).length;
    el.innerHTML = `<b>${t('n_' + s.name)} → ${formLabel(o, s)}</b><br><span class="mono">${rows.join('<br>')}</span><br><small>${t('hint3d')}${n > 1 ? ` (${s.d3.form + 1}/${n})` : ''}</small>`;
    el.hidden = false;
  };

  // ---- klaviatura ----
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? B.redo() : B.undo(); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); B.redo(); }
  });

  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  I18N.onChange(() => { $('info3d').hidden = true; B.render(); });
  I18N.apply();
})();
