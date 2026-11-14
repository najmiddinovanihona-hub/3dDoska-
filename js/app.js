// ===== Chizgi — UI =====
(function () {
  const $ = id => document.getElementById(id), t = k => I18N.t(k);
  const fmt = n => (+(+n).toFixed(3)).toString();
  const B = Board, V = View3D;
  let is3d = false, toastTimer = null;

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

  // ---- 3D ----
  $('toggle3d').addEventListener('click', () => set3d(!is3d));
  function set3d(on) {
    if (on && !B.shapes.length) { toast(t('empty3d')); return; }
    is3d = on;
    if (on && !V.inited) {
      V.init($('view3d'));
      V.onSelect = showInfo;
    }
    $('view3d').hidden = !on; $('board').hidden = on;
    $('dock2d').hidden = on; $('dock3d').hidden = !on;
    $('toggle3d').classList.toggle('back', on);
    $('toggle3dText').dataset.i18n = on ? 'to2d' : 'to3d'; $('toggle3dText').textContent = t($('toggle3dText').dataset.i18n);
    $('toggle3d').querySelector('.cube').textContent = on ? '←' : '⬢';
    $('emptyHint').classList.toggle('gone', on || B.shapes.length > 0);
    V.visible = on;
    if (on) { requestAnimationFrame(() => { V.resize(); V.build(B.shapes); }); toast(t('hint3d')); }
    else { $('info3d').hidden = true; requestAnimationFrame(() => B.resize()); }
  }
  function formLabel(o) {
    const s = o.s;
    if (o.form === 'prism' && s.name === 'square') return t('f_cube');
    if (o.form === 'prism' && s.name === 'rect') return t('f_cuboid');
    return t('f_' + o.form);
  }
  function showInfo(o) {
    const el = $('info3d');
    if (!o) { el.hidden = true; return; }
    const st = o.stats; let rows = [];
    if (st.V !== undefined) rows.push(`${t('volume')}: V = ${fmt(st.V)}`);
    if (st.S !== undefined) rows.push(`${t('area')}: S = ${fmt(st.S)}`);
    if (st.h !== undefined) rows.push(`${t('height')}: h = ${fmt(st.h)}`);
    if (st.L !== undefined) rows.push(`${t('length')}: L = ${fmt(st.L)}`);
    if (st.A !== undefined) rows.push(`${t('wallArea')}: ${fmt(st.A)}`);
    const n = V.formsFor(o.s).length;
    el.innerHTML = `<b>${t('n_' + o.s.name)} → ${formLabel(o)}</b><br><span class="mono">${rows.join('<br>')}</span>${n > 1 ? `<br><small>${t('again')} (${o.s.form3d + 1}/${n})</small>` : ''}`;
    el.hidden = false;
  }
  $('reset3d').addEventListener('click', () => V.resetView());
  $('spin3d').addEventListener('click', () => { V.controls.autoRotate = !V.controls.autoRotate; $('spin3d').classList.toggle('on', V.controls.autoRotate); });
  $('png3d').addEventListener('click', () => V.exportPNG());

  // ---- klaviatura ----
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (!is3d && (e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? B.redo() : B.undo(); }
    else if (!is3d && (e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); B.redo(); }
    else if (e.key === 'Escape' && is3d) set3d(false);
  });

  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  I18N.onChange(() => { if (is3d && V.selected) showInfo(V.selected); B.render(); });
  I18N.apply();
})();
