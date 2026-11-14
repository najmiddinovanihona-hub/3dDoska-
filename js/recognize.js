// ===== Qo‘lda chizilgan chiziqni tanib, toza shaklga aylantirish =====
// Kirish: ekran koordinatalaridagi nuqtalar [[x,y], ...]
// Chiqish: {type:'line'|'poly'|'ellipse'|'arc'|'curve'|'dot', name, ...}
(function () {
  const H = Math.hypot, PI = Math.PI;
  const d = (a, b) => H(a[0] - b[0], a[1] - b[1]);

  function pathLen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += d(p[i], p[i - 1]); return s; }
  function bbox(p) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  function resample(p, n) {
    const L = pathLen(p); if (L === 0) return Array(n).fill(p[0]);
    const step = L / (n - 1), out = [p[0].slice()];
    let acc = 0, prev = p[0];
    for (let i = 1; i < p.length; i++) {
      const cur = p[i]; let seg = d(prev, cur);
      while (acc + seg >= step && seg > 0) {
        const t = (step - acc) / seg, q = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t];
        out.push(q); prev = q; seg = d(prev, cur); acc = 0;
      }
      acc += seg; prev = cur;
    }
    while (out.length < n) out.push(p[p.length - 1].slice());
    return out.slice(0, n);
  }
  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
    return H(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function rdp(p, eps) {
    if (p.length < 3) return p.slice();
    let idx = 0, max = 0;
    for (let i = 1; i < p.length - 1; i++) { const v = distSeg(p[i], p[0], p[p.length - 1]); if (v > max) { max = v; idx = i; } }
    if (max > eps) { const l = rdp(p.slice(0, idx + 1), eps), r = rdp(p.slice(idx), eps); return l.slice(0, -1).concat(r); }
    return [p[0], p[p.length - 1]];
  }
  function rdpClosed(p, eps) {
    let k = 0, m = 0;
    for (let i = 1; i < p.length; i++) { const v = d(p[0], p[i]); if (v > m) { m = v; k = i; } }
    const a = rdp(p.slice(0, k + 1), eps), b = rdp(p.slice(k).concat([p[0]]), eps);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }
  function angleAt(a, b, c) {
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const den = H(...v1) * H(...v2) || 1;
    return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / den))) * 180 / PI;
  }
  function cleanVerts(v, minD, closed) {
    const out = v.slice(); let changed = true;
    while (changed && out.length > 2) {
      changed = false;
      for (let i = 0; i < out.length; i++) {
        const n = out.length;
        if (!closed && (i === 0 || i === n - 1)) continue;
        const a = out[(i - 1 + n) % n], b = out[i], c = out[(i + 1) % n];
        if (d(a, b) < minD || angleAt(a, b, c) > 155) { out.splice(i, 1); changed = true; break; }
      }
    }
    return out;
  }
  function polyErr(S, v, closed, useMax) {
    let s = 0, mx = 0; const n = v.length, m = closed ? n : n - 1;
    for (const q of S) { let best = Infinity; for (let i = 0; i < m; i++) best = Math.min(best, distSeg(q, v[i], v[(i + 1) % n])); s += best; mx = Math.max(mx, best); }
    return useMax ? mx : s / S.length;
  }
  function centroid(v) { return [v.reduce((s, q) => s + q[0], 0) / v.length, v.reduce((s, q) => s + q[1], 0) / v.length]; }
  function fitCircle(S) {
    // Kasa usuli: x²+y²+Dx+Ey+F=0
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = S.length;
    for (const [x, y] of S) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
    const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [-sxz, -syz, -sz];
    const sol = solve3(A, b); if (!sol) return null;
    const [D, E, F] = sol, cx = -D / 2, cy = -E / 2, r2 = cx * cx + cy * cy - F;
    if (!(r2 > 0)) return null;
    const r = Math.sqrt(r2); let err = 0;
    for (const q of S) err += Math.abs(d(q, [cx, cy]) - r);
    return { c: [cx, cy], r, err: err / n };
  }
  function solve3(A, b) {
    const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(A); if (Math.abs(D) < 1e-9) return null;
    return [0, 1, 2].map(k => det(A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))) / D);
  }
  function snapAngle(a, b, tolDeg = 6) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), deg = ang * 180 / PI, s = Math.round(deg / 45) * 45;
    if (Math.abs(deg - s) > tolDeg) return b;
    const L = d(a, b), r = s * PI / 180;
    return [a[0] + Math.cos(r) * L, a[1] + Math.sin(r) * L];
  }
  function snapEdges(v, closed) {
    const out = v.map(q => q.slice()), n = out.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = out[i], b = out[(i + 1) % n], deg = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / PI);
      if (deg < 7 || deg > 173) { const y = (a[1] + b[1]) / 2; a[1] = b[1] = y; }
      else if (Math.abs(deg - 90) < 7) { const x = (a[0] + b[0]) / 2; a[0] = b[0] = x; }
    }
    return out;
  }
  function fitRect(v) {
    const c = centroid(v); let best = 0, ang = 0;
    for (let i = 0; i < 4; i++) { const a = v[i], b = v[(i + 1) % 4], L = d(a, b); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    const deg = ang * 180 / PI, s = Math.round(deg / 90) * 90;
    if (Math.abs(deg - s) < 10) ang = s * PI / 180;
    const u = [Math.cos(ang), Math.sin(ang)], w = [-Math.sin(ang), Math.cos(ang)];
    const pu = v.map(q => (q[0] - c[0]) * u[0] + (q[1] - c[1]) * u[1]), pw = v.map(q => (q[0] - c[0]) * w[0] + (q[1] - c[1]) * w[1]);
    // qarama-qarshi tomonlarning o‘rtachasi
    const su = [...pu].sort((a, b) => a - b), sw = [...pw].sort((a, b) => a - b);
    let minU = (su[0] + su[1]) / 2, maxU = (su[2] + su[3]) / 2, minW = (sw[0] + sw[1]) / 2, maxW = (sw[2] + sw[3]) / 2;
    let W = maxU - minU, Hh = maxW - minW, name = 'rect';
    if (Math.abs(W - Hh) / Math.max(W, Hh) < 0.15) { const s2 = (W + Hh) / 2; W = Hh = s2; name = 'square'; }
    const mu = (minU + maxU) / 2, mw = (minW + maxW) / 2, cc = [c[0] + u[0] * mu + w[0] * mw, c[1] + u[1] * mu + w[1] * mw];
    const P = (su2, sw2) => [cc[0] + u[0] * su2 * W / 2 + w[0] * sw2 * Hh / 2, cc[1] + u[1] * su2 * W / 2 + w[1] * sw2 * Hh / 2];
    return { pts: [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], name };
  }
  function regularize(v) {
    const n = v.length, sides = v.map((q, i) => d(q, v[(i + 1) % n])), avg = sides.reduce((a, b) => a + b) / n;
    const angs = v.map((q, i) => angleAt(v[(i - 1 + n) % n], q, v[(i + 1) % n])), ideal = 180 * (n - 2) / n;
    const regular = sides.every(s => Math.abs(s - avg) / avg < 0.18) && angs.every(a => Math.abs(a - ideal) < 14);
    if (!regular) return null;
    const c = centroid(v), R = avg / (2 * Math.sin(PI / n));
    let a0 = Math.atan2(v[0][1] - c[1], v[0][0] - c[0]);
    // bitta tomon gorizontal bo‘lishiga yaqin bo‘lsa — tekislaymiz
    const step = 2 * PI / n, flat = PI / 2 + step / 2;
    const k = Math.round((a0 - flat) / step), cand = flat + k * step;
    if (Math.abs(a0 - cand) < 0.12) a0 = cand;
    const sign = signedArea(v) > 0 ? 1 : -1;
    return Array.from({ length: n }, (_, i) => [c[0] + R * Math.cos(a0 + sign * i * step), c[1] + R * Math.sin(a0 + sign * i * step)]);
  }
  function signedArea(v) { let s = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function chaikin(p, iter, closed) {
    let pts = p;
    for (let k = 0; k < iter; k++) {
      const out = closed ? [] : [pts[0]], n = pts.length, m = closed ? n : n - 1;
      for (let i = 0; i < m; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) out.push(pts[n - 1]);
      pts = out;
    }
    return pts;
  }
  function smooth(p, closed) {
    // sirpanuvchi o‘rtacha — qo‘l titrashini yo‘qotadi
    const n = p.length, k = 3, avg = p.map((q, i) => {
      let sx = 0, sy = 0, c = 0;
      for (let j = -k; j <= k; j++) { let idx = i + j; if (closed) idx = (idx + n) % n; else if (idx < 0 || idx >= n) continue; sx += p[idx][0]; sy += p[idx][1]; c++; }
      return [sx / c, sy / c];
    });
    if (!closed) { avg[0] = p[0]; avg[n - 1] = p[n - 1]; }
    return chaikin(rdp(avg, 2), 3, closed);
  }
  const POLY_NAMES = { 3: 'triangle', 4: 'quad', 5: 'pentagon', 6: 'hexagon' };

  function recognize(raw) {
    const p = raw.filter((q, i) => i === 0 || d(q, raw[i - 1]) > 0.5);
    if (p.length < 2) return { type: 'dot', p: raw[0].slice(), name: 'dot' };
    const len = pathLen(p), bb = bbox(p), diag = Math.max(H(bb.w, bb.h), 1);
    if (len < 7) return { type: 'dot', p: p[0].slice(), name: 'dot' };
    const first = p[0], last = p[p.length - 1], chord = d(first, last);
    const S = resample(p, 72);
    const closed = chord < 0.22 * diag && len > 1.7 * diag;

    if (!closed) {
      let maxDev = 0; for (const q of S) maxDev = Math.max(maxDev, distSeg(q, first, last));
      if (maxDev < Math.max(5, 0.04 * chord)) return { type: 'line', a: first.slice(), b: snapAngle(first, last), name: 'line' };
      const circ = fitCircle(S);
      if (circ && circ.err < 0.045 * circ.r && circ.r < 3 * diag) {
        // yoy: boshlanish, oxir va yo‘nalish
        const ang = q => Math.atan2(q[1] - circ.c[1], q[0] - circ.c[0]);
        let a0 = ang(first), total = 0, prev = a0;
        for (const q of S) { let a = ang(q), da = a - prev; while (da > PI) da -= 2 * PI; while (da < -PI) da += 2 * PI; total += da; prev = a; }
        const pts = Array.from({ length: 64 }, (_, i) => { const a = a0 + total * i / 63; return [circ.c[0] + circ.r * Math.cos(a), circ.c[1] + circ.r * Math.sin(a)]; });
        return { type: 'arc', c: circ.c, r: circ.r, sweep: Math.abs(total), pts, name: 'arc' };
      }
      const v = cleanVerts(rdp(S, Math.max(6, 0.05 * len)), 0.07 * len, false);
      const sharp = v.slice(1, -1).every((q, i) => angleAt(v[i], q, v[i + 2]) < 140);
      if (v.length <= 5 && sharp && polyErr(S, v, false, true) < Math.max(6, 0.022 * len)) {
        const pts = [v[0]]; for (let i = 1; i < v.length; i++) pts.push(snapAngle(pts[i - 1], v[i], 5));
        return { type: 'poly', pts, closed: false, name: 'polyline' };
      }
      return { type: 'curve', pts: smooth(p, false), closed: false, name: 'curve' };
    }

    // ---- yopiq shakllar ----
    const v = cleanVerts(rdpClosed(S, Math.max(6, 0.055 * diag)), 0.1 * diag, true);
    const pe = v.length >= 3 ? polyErr(S, v, true) / diag : 1;
    const circ = fitCircle(S), ce = circ ? circ.err / circ.r : 1;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rx = bb.w / 2 || 1, ry = bb.h / 2 || 1;
    let ee = 0; for (const q of S) ee += Math.abs(H((q[0] - cx) / rx, (q[1] - cy) / ry) - 1); ee /= S.length;

    const asPoly = () => {
      const n = v.length;
      if (n === 4) {
        const angs = v.map((q, i) => angleAt(v[(i + 3) % 4], q, v[(i + 1) % 4]));
        if (angs.every(a => Math.abs(a - 90) < 20)) { const r = fitRect(v); return { type: 'poly', closed: true, pts: r.pts, name: r.name }; }
      }
      if (n >= 3) {
        const reg = regularize(v);
        if (reg) return { type: 'poly', closed: true, pts: reg, name: n === 4 ? 'square' : POLY_NAMES[n] || 'polygon', regular: true };
      }
      return { type: 'poly', closed: true, pts: snapEdges(v, true), name: POLY_NAMES[n] || 'polygon' };
    };
    if (v.length >= 3 && v.length <= 4 && pe < 0.032) return asPoly();
    // ko‘pburchak aylanadan ancha yaxshi mos kelsa — ko‘pburchak
    const roundErr = Math.min(circ ? circ.err : Infinity, ee * (rx + ry) / 2);
    if (v.length >= 5 && v.length <= 8 && pe * diag < 0.75 * roundErr && pe < 0.03) return asPoly();
    if (ce < 0.075) return { type: 'ellipse', c: circ.c, rx: circ.r, ry: circ.r, name: 'circle' };
    if (ee < 0.1) {
      if (Math.max(rx, ry) / Math.min(rx, ry) < 1.2) { const r = (rx + ry) / 2; return { type: 'ellipse', c: [cx, cy], rx: r, ry: r, name: 'circle' }; }
      return { type: 'ellipse', c: [cx, cy], rx, ry, name: 'ellipse' };
    }
    if (v.length >= 3 && v.length <= 8 && pe < 0.028) return asPoly();
    return { type: 'curve', pts: smooth(p, true), closed: true, name: 'curve' };
  }

  window.Recognizer = { recognize, smooth, signedArea, centroid };
})();
