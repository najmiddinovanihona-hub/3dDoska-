// ===== Chizgi — UI bog‘lovchi =====
(function () {
  const $ = id => document.getElementById(id), t = k => I18N.t(k);
  const fmt = n => (+(+n).toFixed(3)).toString();
  const B = Board2D, S = Scene3D;
  let mode = '2d';

  // ---------- umumiy ----------
  $('lang').value = I18N.lang;
  $('lang').addEventListener('change', e => I18N.set(e.target.value));
  $('panelToggle').addEventListener('click', () => document.body.classList.toggle('panel-open'));
  document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  function setMode(m) {
    mode = m;
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    $('view2d').classList.toggle('active', m === '2d'); $('view3d').classList.toggle('active', m === '3d');
    S.visible = m === '3d';
    if (m === '3d') requestAnimationFrame(() => S.resize()); else requestAnimationFrame(() => B.resize());
    try { history.replaceState(null, '', m === '3d' ? '#3d' : '#2d'); } catch (e) {}
    updateHints();
  }
  function swatches(el, colors, get, set) {
    el.innerHTML = '';
    colors.forEach(c => {
      const b = document.createElement('button'); b.className = 'swatch'; b.style.background = c; b.title = c;
      b.addEventListener('click', () => { set(c); refresh(); }); el.appendChild(b);
    });
    const refresh = () => el.querySelectorAll('.swatch').forEach(b => b.classList.toggle('active', b.title === get()));
    refresh(); return refresh;
  }

  // ---------- 2D ----------
  B.init($('canvas2d'));
  const toolBtns = document.querySelectorAll('#tools2d [data-tool]');
  toolBtns.forEach(b => b.addEventListener('click', () => {
    toolBtns.forEach(x => x.classList.toggle('active', x === b)); B.setTool(b.dataset.tool); updateHints();
  }));
  swatches($('colors2d'), B.COLORS, () => B.color, c => { B.color = c; });
  $('width2d').addEventListener('input', e => { B.width = +e.target.value; });
  $('fill2d').addEventListener('change', e => { B.fill = e.target.checked; });
  $('grid2d').addEventListener('change', e => { B.grid = e.target.checked; B.render(); });
  $('snap2d').addEventListener('change', e => { B.snap = e.target.checked; });
  $('measure2d').addEventListener('change', e => { B.measures = e.target.checked; B.render(); });
  $('undo2d').addEventListener('click', () => B.undo());
  $('redo2d').addEventListener('click', () => B.redo());
  $('clear2d').addEventListener('click', () => { B.clear(); $('pStats').innerHTML = ''; });
  $('png2d').addEventListener('click', () => B.exportPNG());

  function addFn(expr) {
    try { B.addFn(expr); $('fnErr').textContent = ''; $('fnExpr').value = ''; renderFns(); }
    catch (e) { $('fnErr').textContent = t('badExpr') + ': ' + e.message; }
  }
  $('fnAdd').addEventListener('click', () => addFn($('fnExpr').value));
  $('fnExpr').addEventListener('keydown', e => { if (e.key === 'Enter') addFn(e.target.value); });
  $('fnExamples').querySelectorAll('button').forEach(b => b.addEventListener('click', () => addFn(b.textContent)));
  function renderFns() {
    const ul = $('fnList'); ul.innerHTML = '';
    B.fns.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="dot" style="background:${f.color}"></i><span>y = ${esc(f.expr)}</span><button title="×">✕</button>`;
      li.querySelector('button').addEventListener('click', () => { B.removeFn(i); renderFns(); });
      ul.appendChild(li);
    });
  }
  $('pRun').addEventListener('click', () => {
    const r = B.launch(+$('pV').value, +$('pA').value, +$('pG').value, +$('pH').value);
    $('pStats').innerHTML = r ? `${t('range')}: <b>${fmt(r.range)} m</b><br>${t('hmax')}: <b>${fmt(r.hmax)} m</b><br>${t('time')}: <b>${fmt(r.T)} s</b>` : '';
  });
  $('pClear').addEventListener('click', () => { B.clearProj(); $('pStats').innerHTML = ''; });

  // ---------- 3D ----------
  S.init($('canvas3dWrap'));
  document.querySelectorAll('#tools3d [data-solid]').forEach(b => b.addEventListener('click', () => {
    setDraw(false); S.addSolid(b.dataset.solid);
  }));
  function setDraw(on) { S.setDrawMode(on); $('draw3d').classList.toggle('active', on); updateHints(); }
  $('draw3d').addEventListener('click', () => setDraw(!S.drawMode));
  $('reset3d').addEventListener('click', () => S.resetView());
  $('clear3d').addEventListener('click', () => S.clearAll());
  $('png3d').addEventListener('click', () => S.exportPNG());
  $('grid3d').addEventListener('change', e => { S.axes.visible = e.target.checked; });
  $('spin3d').addEventListener('change', e => { S.controls.autoRotate = e.target.checked; });

  const refreshSw3d = swatches($('colors3d'), S.COLORS, () => (S.get(S.selected) || {}).color, c => S.selected && S.update(S.selected, { color: c }));
  ['posX', 'posY', 'posZ'].forEach(id => $(id).addEventListener('input', () => {
    if (!S.selected) return; S.update(S.selected, { pos: [+$('posX').value || 0, +$('posY').value || 0, +$('posZ').value || 0] });
  }));
  $('rotZ').addEventListener('input', e => S.selected && S.update(S.selected, { rot: +e.target.value }));
  $('wire3d').addEventListener('change', e => S.selected && S.update(S.selected, { wire: e.target.checked }));
  $('op3d').addEventListener('input', e => S.selected && S.update(S.selected, { opacity: +e.target.value / 100 }));
  $('selDel').addEventListener('click', () => S.selected && S.remove(S.selected));

  const PARAM_NAMES = { a: 'a', b: 'b', c: 'c', r: 'r', h: 'h', R: 'R' };
  let lastSel = null;
  S.onChange = () => { renderSel(); renderObjList(); renderVecList(); };
  function renderSel() {
    const o = S.get(S.selected);
    $('selEmpty').hidden = !!o; $('selBody').hidden = !o;
    if (!o) { lastSel = null; return; }
    $('selName').textContent = nameOf(o);
    const solid = o.kind in S.SOLIDS;
    ['posX', 'posY', 'posZ', 'rotZ', 'wire3d', 'op3d'].forEach(id => { $(id).closest('label').style.display = solid ? '' : 'none'; });
    $('colors3d').style.display = solid ? '' : 'none';
    if (lastSel !== o.id) {
      lastSel = o.id;
      const box = $('selParams'); box.innerHTML = '';
      if (solid) for (const k in o.params) {
        const l = document.createElement('label'); l.className = 'param';
        l.innerHTML = `<span class="mono">${PARAM_NAMES[k]}</span><input type="number" step="0.1" min="0.1" value="${o.params[k]}">`;
        l.querySelector('input').addEventListener('input', e => { const v = +e.target.value; if (v > 0) S.update(o.id, { params: { [k]: v } }); });
        box.appendChild(l);
      }
      const p = o.group.position;
      $('posX').value = fmt(p.x); $('posY').value = fmt(p.y); $('posZ').value = fmt(p.z);
      $('rotZ').value = Math.round(o.group.rotation.z * 180 / Math.PI);
      $('wire3d').checked = !!o.wire; $('op3d').value = Math.round((o.opacity || 0.85) * 100);
    }
    refreshSw3d();
    const st = S.stats(o);
    let html = '';
    if (st.V !== undefined) html += `${t('volume')}: <b>V = ${fmt(st.V)}</b><br>${t('area')}: <b>S = ${fmt(st.S)}</b>`;
    if (st.l !== undefined) html += `<br>l = ${fmt(st.l)}`;
    if (st.m !== undefined) html += `<br>apofema = ${fmt(st.m)}`;
    if (st.d !== undefined) html += `<br>d = ${fmt(st.d)}`;
    if (st.h !== undefined) html += `<br>${t('height')} = ${fmt(st.h)}`;
    if (st.L !== undefined) html += `${t('length')}: <b>${fmt(st.L)}</b> (${st.n})`;
    if (st.expr !== undefined) html += `z = ${esc(st.expr)}`;
    $('selStats').innerHTML = html;
  }
  function nameOf(o) {
    if (o.kind === 'surface') return 'z = ' + o.expr;
    if (o.kind === 'polyline') return '3D ' + t('length').toLowerCase() + ' · ' + o.pts.length;
    return t('s_' + o.kind);
  }
  function renderObjList() {
    const ul = $('objList'); ul.innerHTML = '';
    S.objects.forEach(o => {
      const li = document.createElement('li'); li.classList.toggle('active', o.id === S.selected);
      li.innerHTML = `<i class="dot" style="background:${o.color}"></i><span>${esc(nameOf(o))}</span><button>✕</button>`;
      li.addEventListener('click', () => S.select(o.id));
      li.querySelector('button').addEventListener('click', ev => { ev.stopPropagation(); S.remove(o.id); });
      ul.appendChild(li);
    });
  }
  function renderVecList() {
    const ul = $('vList'); ul.innerHTML = '';
    S.vectors.forEach(v => {
      const len = Math.hypot(...v.v);
      const li = document.createElement('li');
      li.innerHTML = `<i class="dot" style="background:${v.color}"></i><span>${v.isSum ? 'Σ ' : ''}(${v.v.map(fmt).join(', ')}) · |v|=${fmt(len)}</span><button>✕</button>`;
      li.querySelector('button').addEventListener('click', () => S.removeVector(v.id));
      ul.appendChild(li);
    });
  }
  $('vAdd').addEventListener('click', () => S.addVector([+$('vX').value || 0, +$('vY').value || 0, +$('vZ').value || 0]));
  $('vSum').addEventListener('click', () => S.sumVectors());
  function addSurf(expr) {
    try { S.addSurface(expr); $('sErr').textContent = ''; }
    catch (e) { $('sErr').textContent = t('badExpr') + ': ' + e.message; }
  }
  $('sAdd').addEventListener('click', () => addSurf($('sExpr').value));
  $('sExpr').addEventListener('keydown', e => { if (e.key === 'Enter') addSurf(e.target.value); });
  $('sExamples').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { $('sExpr').value = b.textContent; addSurf(b.textContent); }));

  // ---------- klaviatura ----------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (mode === '2d') {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? B.redo() : B.undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); B.redo(); }
      else if (e.key === 'Escape') B.cancel();
      else if (e.key === 'Enter' && B.tool === 'polygon') B.finishPolygon();
    } else {
      if (e.key === 'Escape') { if (S.drawing) S.finishDrawing(); else setDraw(false); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected) S.remove(S.selected);
    }
  });

  function updateHints() {
    $('hint2d').textContent = t('h_' + B.tool);
    $('hint3d').textContent = S.drawMode ? t('h_draw3d') : '';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  I18N.onChange(() => { updateHints(); lastSel = null; S.onChange(); });
  I18N.apply();

  // boshlang‘ich namunalar
  B.addFn('sin(x) * 2'); renderFns();
  S.addSolid('cube'); S.update(S.objects[0].id, { pos: [-3, -2, 0] });
  S.addSolid('cone'); S.update(S.objects[1].id, { pos: [3, 1, 0] });
  S.addVector([3, 2, 4]);
  S.select(null);
  setMode(location.hash === '#3d' ? '3d' : '2d');
})();
