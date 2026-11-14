// ===== Chizgi — yagona doska =====
(function () {
  const R = window.Recognizer, t = k => I18N.t(k);
  const fmt = n => (Math.abs(n) < 1e-9 ? 0 : +n.toFixed(2)).toString();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const B = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    view: { scale: 40, ox: 0, oy: 0 },
    shapes: [], undoS: [], redoS: [], anims: [],
    tool: 'pen', color: '#ffffff', width: 3, auto: true, grid: false, measures: false,
    stroke: null, drag: null, uid: 1, animating: false, onChange: () => {},

    init(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.resize(true);
      canvas.addEventListener('pointerdown', e => this.onDown(e));
      canvas.addEventListener('pointermove', e => this.onMove(e));
      window.addEventListener('pointerup', e => this.onUp(e));
      window.addEventListener('pointercancel', () => { this.stroke = null; this.drag = null; this.render(); });
      canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
    },
    resize(first) {
      const r = this.canvas.parentElement.getBoundingClientRect(); if (!r.width) return;
      const pw = this.w, ph = this.h;
      this.dpr = window.devicePixelRatio || 1; this.w = r.width; this.h = r.height;
      this.canvas.width = r.width * this.dpr; this.canvas.height = r.height * this.dpr;
      if (first || !pw) { this.view.ox = this.w / 2; this.view.oy = this.h / 2; }
      else { this.view.ox += (this.w - pw) / 2; this.view.oy += (this.h - ph) / 2; }
      this.render();
    },
    toScreen(p) { return [p[0] * this.view.scale + this.view.ox, -p[1] * this.view.scale + this.view.oy]; },
    toWorld(p) { return [(p[0] - this.view.ox) / this.view.scale, -(p[1] - this.view.oy) / this.view.scale]; },
    sp(e) { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; },

    // ---- tarix ----
    snapshot() { this.undoS.push(JSON.stringify(this.shapes)); this.redoS = []; if (this.undoS.length > 200) this.undoS.shift(); },
    undo() { if (!this.undoS.length) return; this.redoS.push(JSON.stringify(this.shapes)); this.shapes = JSON.parse(this.undoS.pop()); this.anims = []; this.changed(); },
    redo() { if (!this.redoS.length) return; this.undoS.push(JSON.stringify(this.shapes)); this.shapes = JSON.parse(this.redoS.pop()); this.anims = []; this.changed(); },
    clear() { if (!this.shapes.length) return; this.snapshot(); this.shapes = []; this.anims = []; this.changed(); },
    changed() { this.render(); this.onChange(); },

    // ---- sichqoncha / sensor ----
    onDown(e) {
      this.canvas.setPointerCapture(e.pointerId);
      const sp = this.sp(e);
      if (e.button === 1 || e.button === 2 || this.tool === 'hand') {
        this.drag = { pan: true, sx: sp[0], sy: sp[1], ox: this.view.ox, oy: this.view.oy }; return;
      }
      if (this.tool === 'eraser') { this.drag = { erase: true, snap: false }; this.eraseAt(sp); return; }
      this.stroke = { pts: [sp] }; this.drag = { draw: true };
    },
    onMove(e) {
      if (!this.drag) return;
      const sp = this.sp(e);
      if (this.drag.pan) { this.view.ox = this.drag.ox + sp[0] - this.drag.sx; this.view.oy = this.drag.oy + sp[1] - this.drag.sy; this.render(); return; }
      if (this.drag.erase) { this.eraseAt(sp); return; }
      if (this.stroke) {
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of evs) { const q = this.sp(ev), l = this.stroke.pts[this.stroke.pts.length - 1]; if (dist(q, l) > 1) this.stroke.pts.push(q); }
        this.render();
      }
    },
    onUp() {
      if (!this.drag) return;
      if (this.drag.draw && this.stroke) this.finishStroke(this.stroke.pts);
      this.stroke = null; this.drag = null; this.render();
    },
    onWheel(e) {
      e.preventDefault();
      const sp = this.sp(e), before = this.toWorld(sp);
      this.view.scale = Math.min(1500, Math.max(4, this.view.scale * Math.exp(-e.deltaY * 0.0015)));
      this.view.ox = sp[0] - before[0] * this.view.scale; this.view.oy = sp[1] + before[1] * this.view.scale;
      this.render();
    },

    // ---- chiziqni shaklga aylantirish ----
    finishStroke(sp) {
      let s;
      if (this.auto) s = R.recognize(sp);
      else s = sp.length < 3 ? { type: 'dot', p: sp[0], name: 'dot' } : { type: 'curve', pts: R.smooth(sp, false), closed: false, name: 'curve' };
      s = this.toWorldShape(s);
      if (this.auto) this.snapToVertices(s);
      Object.assign(s, { id: this.uid++, color: this.color, width: this.width });
      this.snapshot(); this.shapes.push(s);
      if (this.auto) { this.anims.push({ id: s.id, raw: sp.map(q => this.toWorld(q)), t0: performance.now(), name: s.name }); this.loop(); }
      this.changed();
    },
    toWorldShape(s) {
      const W = q => this.toWorld(q), k = 1 / this.view.scale, o = { ...s };
      ['a', 'b', 'p', 'c'].forEach(f => { if (s[f]) o[f] = W(s[f]); });
      if (s.pts) o.pts = s.pts.map(W);
      ['r', 'rx', 'ry'].forEach(f => { if (s[f] !== undefined) o[f] = s[f] * k; });
      return o;
    },
    vertices(except) {
      const out = [];
      for (const s of this.shapes) {
        if (s === except) continue;
        if (s.type === 'line') out.push(s.a, s.b);
        else if (s.type === 'poly') out.push(...s.pts);
        else if (s.type === 'ellipse') out.push(s.c);
        else if (s.type === 'arc') out.push(s.c, s.pts[0], s.pts[s.pts.length - 1]);
        else if (s.type === 'dot') out.push(s.p);
      }
      return out;
    },
    snapToVertices(s) {
      const V = this.vertices(s), tol = 14 / this.view.scale;
      const snap = q => { let best = null, bd = tol; for (const v of V) { const dd = dist(v, q); if (dd < bd) { bd = dd; best = v; } } return best ? best.slice() : q; };
      if (s.type === 'line') { s.a = snap(s.a); s.b = snap(s.b); }
      else if (s.type === 'poly' && !s.closed) { s.pts[0] = snap(s.pts[0]); s.pts[s.pts.length - 1] = snap(s.pts[s.pts.length - 1]); }
      else if (s.type === 'poly' && s.name === 'triangle') s.pts = s.pts.map(snap);
      else if (s.type === 'dot') s.p = snap(s.p);
    },
    outline(s) {
      if (s.type === 'line') return [s.a, s.b];
      if (s.type === 'poly') return s.closed ? [...s.pts, s.pts[0]] : s.pts;
      if (s.type === 'ellipse') return Array.from({ length: 65 }, (_, i) => { const a = i / 64 * Math.PI * 2; return [s.c[0] + s.rx * Math.cos(a), s.c[1] + s.ry * Math.sin(a)]; });
      if (s.type === 'curve') return s.closed ? [...s.pts, s.pts[0]] : s.pts;
      if (s.type === 'arc') return s.pts;
      if (s.type === 'dot') return [s.p, s.p];
      return [];
    },
    eraseAt(sp) {
      const tol = 10;
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        const o = this.outline(this.shapes[i]).map(q => this.toScreen(q));
        let hit = false;
        for (let j = 0; j < o.length - 1 && !hit; j++) if (distSeg(sp, o[j], o[j + 1]) < tol + this.shapes[i].width / 2) hit = true;
        if (hit) { if (!this.drag.snap) { this.snapshot(); this.drag.snap = true; } this.shapes.splice(i, 1); this.changed(); return; }
      }
    },

    // ---- animatsiya ----
    loop() {
      if (this.animating) return; this.animating = true;
      const step = () => {
        const now = performance.now();
        this.anims = this.anims.filter(a => now - a.t0 < 1200);
        this.render();
        if (this.anims.length) requestAnimationFrame(step); else this.animating = false;
      };
      requestAnimationFrame(step);
    },

    // ---- chizish ----
    render() {
      const c = this.ctx; if (!c) return;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
      if (this.grid) this.drawGrid();
      const now = performance.now();
      for (const s of this.shapes) {
        const an = this.anims.find(a => a.id === s.id);
        let k = 1;
        if (an) {
          const tt = Math.min(1, (now - an.t0) / 260); k = 1 - Math.pow(1 - tt, 3);
          if (k < 1) this.drawRaw(an.raw, s.color, s.width, 1 - k);
        }
        c.globalAlpha = k; this.drawShape(s); c.globalAlpha = 1;
        if (an) this.drawBadge(s, an, now);
      }
      if (this.stroke) {
        c.strokeStyle = this.color; c.lineWidth = this.width; c.lineCap = c.lineJoin = 'round'; c.beginPath();
        this.stroke.pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
      }
    },
    drawRaw(pts, color, w, alpha) {
      const c = this.ctx; c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = w; c.lineCap = c.lineJoin = 'round'; c.beginPath();
      pts.forEach((p, i) => { const q = this.toScreen(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); c.globalAlpha = 1;
    },
    center(s) {
      if (s.type === 'line') return [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];
      if (s.type === 'ellipse') return s.c;
      if (s.type === 'dot') return s.p;
      return R.centroid(s.pts);
    },
    drawBadge(s, an, now) {
      const age = now - an.t0; if (age > 1200) return;
      const a = age < 150 ? age / 150 : age > 900 ? (1200 - age) / 300 : 1;
      const p = this.toScreen(this.center(s)), c = this.ctx, txt = '✓ ' + t('n_' + s.name);
      c.globalAlpha = a; c.font = '600 13px "Space Grotesk", sans-serif'; c.textAlign = 'center';
      const w = c.measureText(txt).width + 18, y = p[1] - (s.type === 'line' ? 18 : 0);
      c.fillStyle = 'rgba(79,140,255,0.92)'; roundRect(c, p[0] - w / 2, y - 13, w, 24, 12); c.fill();
      c.fillStyle = '#fff'; c.fillText(txt, p[0], y + 4); c.globalAlpha = 1;
    },
    drawShape(s) {
      const c = this.ctx, S = q => this.toScreen(q), sc = this.view.scale, M = this.measures;
      c.strokeStyle = s.color; c.fillStyle = s.color; c.lineWidth = s.width; c.lineCap = c.lineJoin = 'round';
      const path = (pts, closed) => { c.beginPath(); pts.forEach((p, i) => { const q = S(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); if (closed) c.closePath(); c.stroke(); };
      switch (s.type) {
        case 'dot': { const q = S(s.p); c.beginPath(); c.arc(q[0], q[1], Math.max(3, s.width * 1.3), 0, 7); c.fill(); break; }
        case 'line': {
          path([s.a, s.b]);
          if (M) { const m = S(this.center(s)); this.label(fmt(dist(s.a, s.b)), m[0], m[1] - 10); }
          break;
        }
        case 'poly': {
          path(s.pts, s.closed);
          if (M) this.polyMeasures(s);
          break;
        }
        case 'ellipse': {
          const q = S(s.c); c.beginPath(); c.ellipse(q[0], q[1], s.rx * sc, s.ry * sc, 0, 0, Math.PI * 2); c.stroke();
          if (M) {
            c.beginPath(); c.arc(q[0], q[1], 2.5, 0, 7); c.fill();
            if (s.name === 'circle') {
              c.save(); c.setLineDash([4, 4]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + s.rx * sc, q[1]); c.stroke(); c.restore();
              this.label('r = ' + fmt(s.rx), q[0] + s.rx * sc / 2, q[1] - 10);
              this.label('S = ' + fmt(Math.PI * s.rx * s.rx), q[0], q[1] + 22, '#facc15');
            } else this.label(`a = ${fmt(s.rx)}, b = ${fmt(s.ry)}`, q[0], q[1] + 4);
          }
          break;
        }
        case 'arc': {
          path(s.pts);
          if (M) { const m = S(s.pts[32]); this.label(`r = ${fmt(s.r)}, ${fmt(s.sweep * 180 / Math.PI)}°`, m[0], m[1] - 12); }
          break;
        }
        case 'curve': {
          path(s.pts, s.closed); break;
        }
      }
    },
    polyMeasures(s) {
      const P = s.pts, n = P.length, S = q => this.toScreen(q), m = s.closed ? n : n - 1;
      const ctr = S(R.centroid(P));
      if (s.name === 'rect' || s.name === 'square') {
        const w = dist(P[0], P[1]), h = dist(P[1], P[2]);
        this.label(s.name === 'square' ? `a = ${fmt(w)}` : `${fmt(w)} × ${fmt(h)}`, ctr[0], ctr[1] - 4);
        this.label(`S = ${fmt(w * h)}`, ctr[0], ctr[1] + 18, '#facc15'); return;
      }
      for (let i = 0; i < m; i++) { const a = S(P[i]), b = S(P[(i + 1) % n]); this.label(fmt(dist(P[i], P[(i + 1) % n])), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 6); }
      for (let i = 0; i < n; i++) {
        if (!s.closed && (i === 0 || i === n - 1)) continue;
        const o = P[i], a = P[(i + n - 1) % n], b = P[(i + 1) % n];
        const v1 = [a[0] - o[0], a[1] - o[1]], v2 = [b[0] - o[0], b[1] - o[1]];
        const ang = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)))) * 180 / Math.PI;
        const so = S(o), dx = ctr[0] - so[0], dy = ctr[1] - so[1], dl = Math.hypot(dx, dy) || 1;
        this.label(`${fmt(ang)}°`, so[0] + dx / dl * 28, so[1] + dy / dl * 28 + 4, '#c4b5fd');
      }
      if (s.closed) this.label(`S = ${fmt(Math.abs(R.signedArea(P)))}`, ctr[0], ctr[1] + 4, '#facc15');
    },
    label(txt, x, y, color = '#e6ebff') {
      const c = this.ctx; c.font = '12px "IBM Plex Mono", monospace'; c.textAlign = 'center';
      const w = c.measureText(txt).width;
      c.fillStyle = 'rgba(7,11,23,0.8)'; roundRect(c, x - w / 2 - 4, y - 12, w + 8, 17, 4); c.fill();
      c.fillStyle = color; c.fillText(txt, x, y);
    },
    gridStep() { const tg = 50 / this.view.scale, p = Math.pow(10, Math.floor(Math.log10(tg))); for (const m of [1, 2, 5, 10]) if (m * p >= tg) return m * p; return 10 * p; },
    drawGrid() {
      const c = this.ctx, st = this.gridStep(), [x0, y1] = this.toWorld([0, 0]), [x1, y0] = this.toWorld([this.w, this.h]);
      c.lineWidth = 1; c.strokeStyle = 'rgba(120,140,220,0.13)'; c.beginPath();
      for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) { const s = this.toScreen([x, 0])[0]; c.moveTo(s, 0); c.lineTo(s, this.h); }
      for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) { const s = this.toScreen([0, y])[1]; c.moveTo(0, s); c.lineTo(this.w, s); }
      c.stroke();
      const [ax, ay] = this.toScreen([0, 0]);
      c.strokeStyle = 'rgba(200,210,255,0.45)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, ay); c.lineTo(this.w, ay); c.moveTo(ax, 0); c.lineTo(ax, this.h); c.stroke();
      c.font = '11px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(160,175,230,0.7)';
      const ly = Math.min(Math.max(ay + 14, 14), this.h - 6), lx = Math.min(Math.max(ax - 6, 30), this.w - 4);
      c.textAlign = 'center'; for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) if (Math.abs(x) > st / 2) c.fillText(fmt(x), this.toScreen([x, 0])[0], ly);
      c.textAlign = 'right'; for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) if (Math.abs(y) > st / 2) c.fillText(fmt(y), lx, this.toScreen([0, y])[1] + 4);
    },
    exportPNG() {
      const tmp = document.createElement('canvas'); tmp.width = this.canvas.width; tmp.height = this.canvas.height;
      const x = tmp.getContext('2d'); x.fillStyle = '#070b17'; x.fillRect(0, 0, tmp.width, tmp.height); x.drawImage(this.canvas, 0, 0);
      download(tmp.toDataURL('image/png'), 'chizgi.png');
    }
  };

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    let tt = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; tt = Math.max(0, Math.min(1, tt));
    return Math.hypot(p[0] - a[0] - tt * dx, p[1] - a[1] - tt * dy);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  window.chizgiDownload = download;
  window.Board = B;
})();
