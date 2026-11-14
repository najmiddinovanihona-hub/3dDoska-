// ===== Chizgi — 2D doska =====
(function () {
  const t = k => I18N.t(k);
  const COLORS = ['#ffffff', '#4f8cff', '#8b5cf6', '#22d3ee', '#34d399', '#facc15', '#fb923c', '#ff5c7a'];
  const fmt = n => (Math.abs(n) < 1e-9 ? 0 : +n.toFixed(2)).toString();

  const Board = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    view: { scale: 40, ox: 0, oy: 0 },
    shapes: [], undoStack: [], redoStack: [], fns: [],
    tool: 'pen', color: COLORS[1], width: 3, fill: false, grid: true, snap: true, measures: true,
    drag: null, temp: null, clicks: [], mouse: null, proj: null, fnColorIdx: 0,

    init(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.resize(true);
      canvas.addEventListener('pointerdown', e => this.onDown(e));
      canvas.addEventListener('pointermove', e => this.onMove(e));
      window.addEventListener('pointerup', e => this.onUp(e));
      canvas.addEventListener('dblclick', e => this.onDbl(e));
      canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('pointerleave', () => { this.mouse = null; this.render(); });
    },
    resize(first) {
      const r = this.canvas.parentElement.getBoundingClientRect();
      if (!r.width) return;
      const prevW = this.w, prevH = this.h;
      this.dpr = window.devicePixelRatio || 1;
      this.w = r.width; this.h = r.height;
      this.canvas.width = r.width * this.dpr; this.canvas.height = r.height * this.dpr;
      if (first || !prevW) { this.view.ox = this.w / 2; this.view.oy = this.h / 2; }
      else { this.view.ox += (this.w - prevW) / 2; this.view.oy += (this.h - prevH) / 2; }
      this.render();
    },

    // ---- koordinatalar ----
    toScreen(p) { return [p[0] * this.view.scale + this.view.ox, -p[1] * this.view.scale + this.view.oy]; },
    toWorld(sx, sy) { return [(sx - this.view.ox) / this.view.scale, -(sy - this.view.oy) / this.view.scale]; },
    gridStep() {
      const target = 50 / this.view.scale, p = Math.pow(10, Math.floor(Math.log10(target)));
      for (const m of [1, 2, 5, 10]) if (m * p >= target) return m * p;
      return 10 * p;
    },
    eventPoint(e, allowSnap = true) {
      const r = this.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      let p = this.toWorld(sx, sy);
      if (!allowSnap || !this.snap) return p;
      // mavjud uchlarga yopishish
      let best = null, bd = 10;
      for (const v of this.vertices()) {
        const s = this.toScreen(v), d = Math.hypot(s[0] - sx, s[1] - sy);
        if (d < bd) { bd = d; best = v; }
      }
      if (best) return [best[0], best[1]];
      const st = this.gridStep() / 2;
      const g = [Math.round(p[0] / st) * st, Math.round(p[1] / st) * st];
      const gs = this.toScreen(g);
      return Math.hypot(gs[0] - sx, gs[1] - sy) < 9 ? g : p;
    },
    vertices() {
      const out = [];
      for (const s of this.shapes) {
        if (s.a) out.push(s.a); if (s.b) out.push(s.b); if (s.c) out.push(s.c); if (s.p && s.type === 'point') out.push(s.p);
        if (s.pts && s.type !== 'pen') out.push(...s.pts);
        if (s.type === 'rect') out.push([s.a[0], s.b[1]], [s.b[0], s.a[1]]);
      }
      return out;
    },

    // ---- tarix ----
    commit(shape) {
      this.undoStack.push(JSON.stringify(this.shapes)); this.redoStack = [];
      if (this.undoStack.length > 200) this.undoStack.shift();
      if (shape) this.shapes.push(shape);
      this.render();
    },
    undo() { if (!this.undoStack.length) return; this.redoStack.push(JSON.stringify(this.shapes)); this.shapes = JSON.parse(this.undoStack.pop()); this.render(); },
    redo() { if (!this.redoStack.length) return; this.undoStack.push(JSON.stringify(this.shapes)); this.shapes = JSON.parse(this.redoStack.pop()); this.render(); },
    clear() { if (!this.shapes.length && !this.fns.length && !this.proj) return; this.commit(); this.shapes = []; this.proj = null; this.render(); },
    base() { return { color: this.color, width: this.width, fill: this.fill }; },
    nextLabel() {
      const used = new Set(this.shapes.filter(s => s.type === 'point').map(s => s.label));
      for (let i = 0; ; i++) {
        const l = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
        if (!used.has(l)) return l;
      }
    },

    setTool(tool) { this.tool = tool; this.clicks = []; this.temp = null; this.render(); },

    // ---- hodisalar ----
    onDown(e) {
      this.canvas.setPointerCapture(e.pointerId);
      const r = this.canvas.getBoundingClientRect();
      if (e.button === 1 || e.button === 2 || this.tool === 'pan') {
        this.drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: this.view.ox, oy: this.view.oy };
        return;
      }
      const p = this.eventPoint(e, this.tool !== 'pen');
      const T = this.tool;
      if (T === 'pen') { this.temp = { type: 'pen', pts: [p], ...this.base() }; this.drag = { draw: true }; }
      else if (['line', 'vector', 'rect', 'ruler'].includes(T)) { this.temp = { type: T, a: p, b: p, ...this.base() }; this.drag = { draw: true }; }
      else if (T === 'circle') { this.temp = { type: 'circle', c: p, r: 0, ...this.base() }; this.drag = { draw: true }; }
      else if (T === 'point') { this.commit({ type: 'point', p, label: this.nextLabel(), ...this.base() }); }
      else if (T === 'triangle' || T === 'angle') {
        this.clicks.push(p);
        if (this.clicks.length === 3) { this.commit({ type: T, pts: this.clicks, ...this.base() }); this.clicks = []; }
        this.render();
      } else if (T === 'polygon') {
        if (this.clicks.length >= 3) {
          const f = this.toScreen(this.clicks[0]);
          if (Math.hypot(f[0] - (e.clientX - r.left), f[1] - (e.clientY - r.top)) < 12) { this.finishPolygon(); return; }
        }
        this.clicks.push(p); this.render();
      } else if (T === 'text') { this.openTextEditor(e.clientX - r.left, e.clientY - r.top, p); }
      else if (T === 'eraser') { this.eraseAt(e.clientX - r.left, e.clientY - r.top); this.drag = { erase: true }; }
    },
    onMove(e) {
      const r = this.canvas.getBoundingClientRect();
      if (this.drag && this.drag.pan) {
        this.view.ox = this.drag.ox + e.clientX - this.drag.sx; this.view.oy = this.drag.oy + e.clientY - this.drag.sy;
        this.render(); return;
      }
      const p = this.eventPoint(e, this.tool !== 'pen');
      this.mouse = p;
      if (this.drag && this.drag.erase) { this.eraseAt(e.clientX - r.left, e.clientY - r.top); return; }
      if (this.drag && this.temp) {
        const s = this.temp;
        if (s.type === 'pen') s.pts.push(p);
        else if (s.type === 'circle') s.r = Math.hypot(p[0] - s.c[0], p[1] - s.c[1]);
        else s.b = p;
      }
      this.render();
    },
    onUp() {
      if (!this.drag) return;
      const s = this.temp;
      if (this.drag.draw && s) {
        const ok = s.type === 'pen' ? s.pts.length > 1 : s.type === 'circle' ? s.r > 1e-6 : (s.a[0] !== s.b[0] || s.a[1] !== s.b[1]);
        if (ok) { if (s.type === 'pen') s.pts = simplify(s.pts, 0.6 / this.view.scale); this.commit(s); }
      }
      this.temp = null; this.drag = null; this.render();
    },
    onDbl() { if (this.tool === 'polygon' && this.clicks.length >= 3) this.finishPolygon(); },
    finishPolygon() {
      // dblclick ikki marta nuqta qo‘shadi — takrorlarni olib tashlaymiz
      const pts = this.clicks.filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      if (pts.length >= 3) this.commit({ type: 'polygon', pts, ...this.base() });
      this.clicks = []; this.render();
    },
    onWheel(e) {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top, before = this.toWorld(sx, sy);
      const k = Math.exp(-e.deltaY * 0.0015);
      this.view.scale = Math.min(2000, Math.max(2, this.view.scale * k));
      this.view.ox = sx - before[0] * this.view.scale; this.view.oy = sy + before[1] * this.view.scale;
      this.render();
    },
    cancel() { this.clicks = []; this.temp = null; this.drag = null; this.render(); },
    openTextEditor(sx, sy, p) {
      const inp = document.createElement('input');
      inp.className = 'text-editor'; inp.style.left = sx + 'px'; inp.style.top = (sy - 14) + 'px';
      this.canvas.parentElement.appendChild(inp); setTimeout(() => inp.focus(), 0);
      let done = false;
      const fin = ok => {
        if (done) return; done = true;
        if (ok && inp.value.trim()) this.commit({ type: 'text', p, text: inp.value.trim(), ...this.base() });
        inp.remove();
      };
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); });
      inp.addEventListener('blur', () => fin(true));
    },
    eraseAt(sx, sy) {
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        if (this.hit(this.shapes[i], sx, sy)) { this.commit(); this.shapes.splice(i, 1); this.render(); return; }
      }
    },
    hit(s, sx, sy) {
      const P = [sx, sy], tol = 8 + (s.width || 2) / 2, S = q => this.toScreen(q);
      const segs = pts => { for (let i = 0; i < pts.length - 1; i++) if (distSeg(P, S(pts[i]), S(pts[i + 1])) < tol) return true; return false; };
      switch (s.type) {
        case 'pen': return segs(s.pts);
        case 'line': case 'vector': case 'ruler': return segs([s.a, s.b]);
        case 'rect': { const c = rectPts(s); return segs([...c, c[0]]) || (s.fill && inPoly(this.toWorld(sx, sy), c)); }
        case 'circle': { const c = S(s.c), d = Math.hypot(c[0] - sx, c[1] - sy), rr = s.r * this.view.scale; return Math.abs(d - rr) < tol || (s.fill && d < rr); }
        case 'triangle': case 'polygon': return segs([...s.pts, s.pts[0]]) || (s.fill && inPoly(this.toWorld(sx, sy), s.pts));
        case 'angle': return segs(s.pts);
        case 'point': { const c = S(s.p); return Math.hypot(c[0] - sx, c[1] - sy) < 12; }
        case 'text': { const c = S(s.p); return sx > c[0] - 4 && sx < c[0] + s.text.length * 10 + 4 && sy > c[1] - 20 && sy < c[1] + 6; }
      }
      return false;
    },

    // ---- funksiyalar ----
    addFn(expr) {
      const fn = MathExpr.compile(expr, ['x']);
      const colors = ['#22d3ee', '#facc15', '#34d399', '#fb923c', '#ff5c7a', '#8b5cf6'];
      this.fns.push({ expr, fn, color: colors[this.fnColorIdx++ % colors.length] });
      this.render();
    },
    removeFn(i) { this.fns.splice(i, 1); this.render(); },

    // ---- fizika ----
    launch(v, deg, g, h0) {
      const a = deg * Math.PI / 180, vx = v * Math.cos(a), vy = v * Math.sin(a);
      const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
      if (!(T > 0) || !isFinite(T)) return null;
      const pts = [];
      for (let i = 0; i <= 200; i++) { const tt = T * i / 200; pts.push([vx * tt, h0 + vy * tt - g * tt * tt / 2]); }
      const range = vx * T, hmax = vy > 0 ? h0 + vy * vy / (2 * g) : h0;
      this.proj = { pts, vx, vy, g, h0, T, start: performance.now(), t: 0 };
      // ko‘rinishga sig‘dirish
      const maxX = Math.max(range, 1), maxY = Math.max(hmax, 1);
      const sc = Math.min((this.w - 120) / maxX, (this.h - 120) / maxY);
      if (sc < this.view.scale || range * this.view.scale + this.view.ox > this.w || this.view.oy - hmax * this.view.scale < 0) {
        this.view.scale = Math.max(2, Math.min(sc, 120));
        this.view.ox = 60; this.view.oy = this.h - 60;
      }
      const step = () => {
        if (!this.proj) return;
        this.proj.t = Math.min(T, (performance.now() - this.proj.start) / 1000);
        this.render();
        if (this.proj.t < T) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return { range, hmax, T };
    },
    clearProj() { this.proj = null; this.render(); },

    // ---- chizish ----
    render() {
      const c = this.ctx; if (!c) return;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      if (this.grid) this.drawGrid();
      for (const f of this.fns) this.drawFn(f);
      if (this.proj) this.drawProj();
      for (const s of this.shapes) this.drawShape(s);
      if (this.temp) this.drawShape(this.temp, true);
      if (this.clicks.length) this.drawClicks();
      this.updateHud();
    },
    drawGrid() {
      const c = this.ctx, st = this.gridStep(), [x0, y1] = this.toWorld(0, 0), [x1, y0] = this.toWorld(this.w, this.h);
      c.lineWidth = 1;
      // mayda to‘r
      c.strokeStyle = 'rgba(120,140,220,0.07)'; c.beginPath();
      const sub = st / 5;
      if (sub * this.view.scale > 6) {
        for (let x = Math.ceil(x0 / sub) * sub; x <= x1; x += sub) { const s = this.toScreen([x, 0])[0]; c.moveTo(s, 0); c.lineTo(s, this.h); }
        for (let y = Math.ceil(y0 / sub) * sub; y <= y1; y += sub) { const s = this.toScreen([0, y])[1]; c.moveTo(0, s); c.lineTo(this.w, s); }
      }
      c.stroke();
      c.strokeStyle = 'rgba(120,140,220,0.16)'; c.beginPath();
      for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) { const s = this.toScreen([x, 0])[0]; c.moveTo(s, 0); c.lineTo(s, this.h); }
      for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) { const s = this.toScreen([0, y])[1]; c.moveTo(0, s); c.lineTo(this.w, s); }
      c.stroke();
      // o‘qlar
      const [ax, ay] = this.toScreen([0, 0]);
      c.strokeStyle = 'rgba(200,210,255,0.55)'; c.lineWidth = 1.4; c.beginPath();
      c.moveTo(0, ay); c.lineTo(this.w, ay); c.moveTo(ax, 0); c.lineTo(ax, this.h); c.stroke();
      c.fillStyle = 'rgba(200,210,255,0.6)';
      arrowHead(c, [this.w - 2, ay], 0, 9); arrowHead(c, [ax, 2], -Math.PI / 2, 9);
      // raqamlar
      c.font = '11px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(160,175,230,0.75)';
      const ly = Math.min(Math.max(ay + 14, 14), this.h - 6), lx = Math.min(Math.max(ax - 6, 30), this.w - 4);
      c.textAlign = 'center';
      for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) if (Math.abs(x) > st / 2) c.fillText(fmt(x), this.toScreen([x, 0])[0], ly);
      c.textAlign = 'right';
      for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) if (Math.abs(y) > st / 2) c.fillText(fmt(y), lx, this.toScreen([0, y])[1] + 4);
      c.fillText('0', ax - 5, ay + 14);
      c.font = 'italic 13px "Space Grotesk"'; c.fillStyle = 'rgba(220,228,255,0.8)';
      c.textAlign = 'right'; c.fillText('x', this.w - 6, ay - 8); c.textAlign = 'left'; c.fillText('y', ax + 8, 14);
    },
    drawFn(f) {
      const c = this.ctx; c.strokeStyle = f.color; c.lineWidth = 2.5; c.beginPath();
      let pen = false, prev = null;
      for (let sx = 0; sx <= this.w; sx += 1) {
        const x = this.toWorld(sx, 0)[0]; let y;
        try { y = f.fn(x); } catch (e) { y = NaN; }
        const sy = -y * this.view.scale + this.view.oy;
        if (!isFinite(y) || (prev !== null && Math.abs(sy - prev) > this.h * 2)) { pen = false; prev = isFinite(y) ? sy : null; continue; }
        if (!pen) { c.moveTo(sx, sy); pen = true; } else c.lineTo(sx, sy);
        prev = sy;
      }
      c.stroke();
    },
    drawProj() {
      const c = this.ctx, P = this.proj, S = q => this.toScreen(q);
      c.save(); c.setLineDash([6, 6]); c.strokeStyle = 'rgba(250,204,21,0.55)'; c.lineWidth = 2; c.beginPath();
      P.pts.forEach((p, i) => { const s = S(p); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.stroke(); c.restore();
      const tt = P.t, pos = [P.vx * tt, P.h0 + P.vy * tt - P.g * tt * tt / 2], vel = [P.vx, P.vy - P.g * tt];
      // bosib o‘tilgan yo‘l
      c.strokeStyle = '#facc15'; c.lineWidth = 3; c.beginPath();
      const n = Math.max(1, Math.round(200 * tt / P.T));
      for (let i = 0; i <= n; i++) { const s = S(P.pts[Math.min(i, 200)]); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }
      c.stroke();
      const s = S(pos), k = 0.25;
      this.drawArrow(s, S([pos[0] + vel[0] * k, pos[1] + vel[1] * k]), '#34d399', 2.5);
      this.drawArrow(s, S([pos[0] + vel[0] * k, pos[1]]), 'rgba(52,211,153,0.5)', 1.5);
      this.drawArrow(s, S([pos[0], pos[1] + vel[1] * k]), 'rgba(52,211,153,0.5)', 1.5);
      c.fillStyle = '#ff5c7a'; c.shadowColor = '#ff5c7a'; c.shadowBlur = 14;
      c.beginPath(); c.arc(s[0], s[1], 7, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      this.label(`t=${tt.toFixed(2)}s  v=${Math.hypot(vel[0], vel[1]).toFixed(2)} m/s`, s[0] + 12, s[1] - 12, '#d1fae5');
    },
    drawArrow(a, b, color, w) {
      const c = this.ctx, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1) return;
      const hs = Math.min(8 + w * 2, len * 0.5);
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.beginPath();
      c.moveTo(a[0], a[1]); c.lineTo(b[0] - Math.cos(ang) * hs * 0.8, b[1] - Math.sin(ang) * hs * 0.8); c.stroke();
      arrowHead(c, b, ang, hs);
    },
    label(txt, x, y, color = '#e6ebff', align = 'left') {
      const c = this.ctx; c.font = '12px "IBM Plex Mono", monospace'; c.textAlign = align;
      const w = c.measureText(txt).width, ox = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
      c.fillStyle = 'rgba(7,11,23,0.78)'; roundRect(c, x + ox - 4, y - 12, w + 8, 17, 4); c.fill();
      c.fillStyle = color; c.fillText(txt, x, y);
    },
    drawShape(s, preview) {
      const c = this.ctx, S = q => this.toScreen(q), sc = this.view.scale;
      c.strokeStyle = s.color; c.fillStyle = s.color; c.lineWidth = s.width; c.lineCap = 'round'; c.lineJoin = 'round';
      const fillPath = () => { if (s.fill) { c.globalAlpha = 0.18; c.fill(); c.globalAlpha = 1; } c.stroke(); };
      const M = this.measures;
      switch (s.type) {
        case 'pen': {
          c.beginPath(); s.pts.forEach((p, i) => { const q = S(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); break;
        }
        case 'line': case 'ruler': {
          const a = S(s.a), b = S(s.b);
          if (s.type === 'ruler') c.setLineDash([8, 6]);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
          for (const q of [a, b]) { c.beginPath(); c.arc(q[0], q[1], s.type === 'ruler' ? 4 : 3, 0, 7); c.fill(); }
          if (M || s.type === 'ruler') { const d = dist(s.a, s.b); this.label((s.type === 'ruler' ? '📏 ' : '') + fmt(d), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8, '#fff', 'center'); }
          break;
        }
        case 'vector': {
          const a = S(s.a), b = S(s.b); this.drawArrow(a, b, s.color, s.width);
          if (M) {
            const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], ang = Math.atan2(dy, dx) * 180 / Math.PI;
            this.label(`(${fmt(dx)}; ${fmt(dy)})  |v|=${fmt(Math.hypot(dx, dy))}  ${fmt(ang)}°`, (a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 10);
          }
          break;
        }
        case 'rect': {
          const pts = rectPts(s).map(S); c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); fillPath();
          if (M) {
            const w = Math.abs(s.b[0] - s.a[0]), h = Math.abs(s.b[1] - s.a[1]), cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2;
            this.label(`${fmt(w)} × ${fmt(h)}`, cx, cy - 4, '#fff', 'center');
            this.label(`S=${fmt(w * h)}  P=${fmt(2 * (w + h))}`, cx, cy + 16, '#b9c4ee', 'center');
          }
          break;
        }
        case 'circle': {
          const q = S(s.c); c.beginPath(); c.arc(q[0], q[1], s.r * sc, 0, Math.PI * 2); fillPath();
          c.beginPath(); c.arc(q[0], q[1], 3, 0, 7); c.fill();
          if (M) {
            c.save(); c.setLineDash([4, 4]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + s.r * sc, q[1]); c.stroke(); c.restore();
            this.label(`r=${fmt(s.r)}`, q[0] + s.r * sc / 2, q[1] - 8, '#fff', 'center');
            this.label(`S=${fmt(Math.PI * s.r * s.r)}  C=${fmt(2 * Math.PI * s.r)}`, q[0], q[1] + 20, '#b9c4ee', 'center');
          }
          break;
        }
        case 'triangle': case 'polygon': {
          const pts = s.pts.map(S); c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); fillPath();
          pts.forEach(q => { c.beginPath(); c.arc(q[0], q[1], 3, 0, 7); c.fill(); });
          if (M) this.polyMeasures(s.pts, s.type === 'triangle');
          break;
        }
        case 'angle': {
          const [A, O, B] = s.pts, a = S(A), o = S(O), b = S(B);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(o[0], o[1]); c.lineTo(b[0], b[1]); c.stroke();
          const a1 = Math.atan2(a[1] - o[1], a[0] - o[0]), a2 = Math.atan2(b[1] - o[1], b[0] - o[0]);
          let d = a2 - a1; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
          c.globalAlpha = 0.25; c.beginPath(); c.moveTo(o[0], o[1]); c.arc(o[0], o[1], 30, a1, a1 + d, d < 0); c.closePath(); c.fill(); c.globalAlpha = 1;
          c.beginPath(); c.arc(o[0], o[1], 30, a1, a1 + d, d < 0); c.stroke();
          const deg = Math.abs(d) * 180 / Math.PI, mid = a1 + d / 2;
          this.label(`${fmt(deg)}°`, o[0] + Math.cos(mid) * 48, o[1] + Math.sin(mid) * 48 + 4, '#fff', 'center');
          break;
        }
        case 'point': {
          const q = S(s.p); c.beginPath(); c.arc(q[0], q[1], 5, 0, 7); c.fill();
          c.font = '600 14px "Space Grotesk"'; c.textAlign = 'left'; c.fillText(s.label, q[0] + 8, q[1] - 8);
          if (M) { c.font = '11px "IBM Plex Mono"'; c.fillStyle = '#8b96bd'; c.fillText(`(${fmt(s.p[0])}; ${fmt(s.p[1])})`, q[0] + 8, q[1] + 16); }
          break;
        }
        case 'text': {
          const q = S(s.p); c.font = `500 ${14 + s.width * 2}px "Space Grotesk"`; c.textAlign = 'left'; c.fillText(s.text, q[0], q[1]); break;
        }
      }
    },
    polyMeasures(P, angles) {
      const S = q => this.toScreen(q), n = P.length;
      let per = 0, area = 0, cx = 0, cy = 0;
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], len = dist(a, b); per += len; area += a[0] * b[1] - b[0] * a[1];
        cx += a[0] / n; cy += a[1] / n;
        const sa = S(a), sb = S(b);
        this.label(fmt(len), (sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2 - 6, '#e6ebff', 'center');
      }
      const ctr = S([cx, cy]);
      if (angles || n <= 6) {
        for (let i = 0; i < n; i++) {
          const o = P[i], a = P[(i + n - 1) % n], b = P[(i + 1) % n];
          const v1 = [a[0] - o[0], a[1] - o[1]], v2 = [b[0] - o[0], b[1] - o[1]];
          const ang = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)))) * 180 / Math.PI;
          const so = S(o), dx = ctr[0] - so[0], dy = ctr[1] - so[1], dl = Math.hypot(dx, dy) || 1;
          this.label(`${fmt(ang)}°`, so[0] + dx / dl * 26, so[1] + dy / dl * 26 + 4, '#c4b5fd', 'center');
        }
      }
      this.label(`S=${fmt(Math.abs(area) / 2)}  P=${fmt(per)}`, ctr[0], ctr[1] + 4, '#facc15', 'center');
    },
    drawClicks() {
      const c = this.ctx, pts = this.clicks.map(q => this.toScreen(q));
      const m = this.mouse ? this.toScreen(this.mouse) : null;
      c.strokeStyle = this.color; c.fillStyle = this.color; c.lineWidth = this.width;
      c.setLineDash([6, 5]); c.beginPath();
      pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]));
      if (m) c.lineTo(m[0], m[1]);
      c.stroke(); c.setLineDash([]);
      pts.forEach(q => { c.beginPath(); c.arc(q[0], q[1], 4, 0, 7); c.fill(); });
    },
    updateHud() {
      const hud = document.getElementById('hud2d');
      if (hud) hud.textContent = this.mouse ? `x: ${fmt(this.mouse[0])}   y: ${fmt(this.mouse[1])}   ·   ${Math.round(this.view.scale)} px/1` : `${Math.round(this.view.scale)} px/1`;
    },
    resetView() { this.view.scale = 40; this.view.ox = this.w / 2; this.view.oy = this.h / 2; this.render(); },
    exportPNG() {
      const tmp = document.createElement('canvas'); tmp.width = this.canvas.width; tmp.height = this.canvas.height;
      const x = tmp.getContext('2d'); x.fillStyle = '#070b17'; x.fillRect(0, 0, tmp.width, tmp.height); x.drawImage(this.canvas, 0, 0);
      download(tmp.toDataURL('image/png'), 'chizgi-2d.png');
    },
    COLORS
  };

  // ---- yordamchilar ----
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function rectPts(s) { return [s.a, [s.b[0], s.a[1]], s.b, [s.a[0], s.b[1]]]; }
  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function inPoly(p, pts) {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  function arrowHead(c, tip, ang, size) {
    c.beginPath(); c.moveTo(tip[0], tip[1]);
    c.lineTo(tip[0] - Math.cos(ang - 0.4) * size, tip[1] - Math.sin(ang - 0.4) * size);
    c.lineTo(tip[0] - Math.cos(ang + 0.4) * size, tip[1] - Math.sin(ang + 0.4) * size);
    c.closePath(); c.fill();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) if (dist(pts[i], out[out.length - 1]) > eps) out.push(pts[i]);
    out.push(pts[pts.length - 1]); return out;
  }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  window.chizgiDownload = download;
  window.Board2D = Board;
})();
