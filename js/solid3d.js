// ===== Chizgi — doskaning o‘zida 3D jismlar (alohida oyna yo‘q) =====
// Shaffof Three.js qatlami 2D doska ustida turadi va doskaning koordinatalari bilan bir xil ishlaydi.
(function () {
  const PI = Math.PI, R = window.Recognizer;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function convertible(s) { return s.type === 'ellipse' || (s.type === 'poly' && s.closed) || (s.type === 'curve' && s.closed); }
  function formsFor(s) {
    if (s.type === 'ellipse') return s.name === 'circle' ? ['sphere', 'cylinder', 'cone'] : ['ellipsoid', 'cylinder', 'cone'];
    if (s.type === 'curve') return ['prism'];
    return ['prism', 'pyramid'];
  }
  function defaultRot(s, form) {
    if (form === 'pyramid') return [-1.05, 0.35];
    if (form === 'cylinder' || form === 'cone') return [0.38, 0];
    if (form === 'sphere' || form === 'ellipsoid') return [0.35, 0.3];
    return [-0.45, 0.6];
  }
  function perimeter(p) { let s = 0; for (let i = 0; i < p.length; i++) s += dist(p[i], p[(i + 1) % p.length]); return s; }
  function distLine(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / (Math.hypot(dx, dy) || 1); }
  function depthOf(s) {
    const P = s.pts;
    if (s.name === 'square') return dist(P[0], P[1]);
    if (s.name === 'rect') return Math.min(dist(P[0], P[1]), dist(P[1], P[2]));
    if (s.type === 'curve') return Math.sqrt(Math.abs(R.signedArea(P))) * 0.7;
    return perimeter(P) / P.length * 0.85;
  }

  const Solid = {
    objs: new Map(), convertible, formsFor,
    init(stage) {
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setClearColor(0x000000, 0);
      r.domElement.id = 'solids';
      stage.insertBefore(r.domElement, stage.querySelector('#board').nextSibling);
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000); this.camera.position.z = 1000;
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const d1 = new THREE.DirectionalLight(0xffffff, 0.75); d1.position.set(-0.5, 1, 1.2); this.scene.add(d1);
      const d2 = new THREE.DirectionalLight(0x8b5cf6, 0.3); d2.position.set(1, -0.6, 0.6); this.scene.add(d2);
      this.ray = new THREE.Raycaster();
    },
    resize(w, h, dpr) { this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false); },

    // ---- doska bilan sinxronlash; animatsiya davom etsa true qaytaradi ----
    sync(board) {
      const v = board.view, cam = this.camera;
      cam.left = -v.ox / v.scale; cam.right = (board.w - v.ox) / v.scale;
      cam.top = v.oy / v.scale; cam.bottom = (v.oy - board.h) / v.scale; cam.updateProjectionMatrix();
      const live = new Set(), now = performance.now(); let animating = false;
      for (const s of board.shapes) {
        if (!s.d3) continue;
        live.add(s.id);
        let o = this.objs.get(s.id);
        const key = this.keyOf(s);
        if (!o || o.key !== key) { if (o) this.drop(o); o = this.build(s); o.key = key; o.born = now; this.objs.set(s.id, o); }
        o.group.rotation.set(s.d3.rx, (o.form === 'cylinder' || o.form === 'cone') ? 0 : s.d3.ry, 0);
        const k = Math.min(1, (now - o.born) / 450), e = 1 - Math.pow(1 - k, 3);
        o.group.scale.setScalar(Math.max(0.001, e)); if (k < 1) animating = true;
      }
      for (const [id, o] of this.objs) if (!live.has(id)) { this.drop(o); this.objs.delete(id); }
      this.renderer.render(this.scene, cam);
      return animating;
    },
    keyOf(s) { return JSON.stringify([s.type, s.name, s.c, s.rx, s.ry, s.pts && s.pts.length, s.pts && s.pts[0], s.color, s.d3.form]); },
    drop(o) {
      this.scene.remove(o.group);
      o.group.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
    },

    // ---- jism yasash ----
    build(s) {
      const forms = formsFor(s); if (s.d3.form >= forms.length) s.d3.form = 0;
      const form = forms[s.d3.form];
      const group = new THREE.Group(), color = new THREE.Color(s.color === '#ffffff' ? '#8fb3ff' : s.color);
      const ctr = s.type === 'ellipse' ? s.c : R.centroid(s.pts);
      group.position.set(ctr[0], ctr[1], 0);
      let geo, mesh, st = {}, extraLines = [];
      if (s.type === 'ellipse') {
        const r = Math.min(s.rx, s.ry), circle = s.name === 'circle';
        if (form === 'sphere' || form === 'ellipsoid') {
          geo = new THREE.SphereGeometry(1, 48, 32);
          mesh = new THREE.Mesh(geo, fillMat(color, 0.55)); mesh.scale.set(s.rx, s.ry, r);
          extraLines.push(ringLine(s.rx, r, 'xz'), ringLine(r, s.ry, 'zy'));
          st = circle ? { V: 4 / 3 * PI * r ** 3, S: 4 * PI * r * r, r } : { V: 4 / 3 * PI * s.rx * s.ry * r };
        } else {
          const h = 2 * s.ry, rr = s.rx;
          geo = form === 'cylinder' ? new THREE.CylinderGeometry(1, 1, h, 64, 1) : new THREE.ConeGeometry(1, h, 64, 1);
          mesh = new THREE.Mesh(geo, fillMat(color, 0.45)); mesh.scale.set(rr, 1, rr);
          const l = Math.hypot(rr, h);
          st = form === 'cylinder' ? { V: PI * rr * rr * h, S: 2 * PI * rr * (rr + h), r: rr, h } : { V: PI * rr * rr * h / 3, S: PI * rr * (rr + l), r: rr, h };
          // yon sirtning konturi (qirra emas, lekin chizmada kerak)
          extraLines.push(silhouette(form, rr, h));
        }
      } else {
        const P = s.pts.map(q => [q[0] - ctr[0], q[1] - ctr[1]]), A = Math.abs(R.signedArea(s.pts)), d = depthOf(s);
        if (form === 'prism') {
          const sh = new THREE.Shape(P.map(q => new THREE.Vector2(q[0], q[1])));
          geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -d / 2);
          st = { V: A * d, S: 2 * A + perimeter(s.pts) * d, h: d };
        } else {
          geo = pyramidGeo(P, d);
          const c0 = R.centroid(s.pts); let lat = 0;
          for (let i = 0; i < s.pts.length; i++) { const a = s.pts[i], b = s.pts[(i + 1) % s.pts.length]; lat += 0.5 * dist(a, b) * Math.hypot(d, distLine(c0, a, b)); }
          st = { V: A * d / 3, S: A + lat, h: d };
        }
        mesh = new THREE.Mesh(geo, fillMat(color, 0.32));
      }
      mesh.renderOrder = 0; mesh.userData.shapeId = s.id; group.add(mesh);
      // qirralar: ko‘rinadigani uzluksiz, ko‘rinmaydigani punktir
      const edgeGeo = s.type === 'ellipse' ? (form === 'sphere' || form === 'ellipsoid' ? null : new THREE.EdgesGeometry(geo, 30)) : new THREE.EdgesGeometry(geo, 30);
      const lines = [];
      if (edgeGeo) { const ls = new THREE.LineSegments(edgeGeo); ls.scale.copy(mesh.scale); lines.push(ls); }
      lines.push(...extraLines);
      const scaleRef = Math.max(0.2, Math.min(3, (s.rx || Math.sqrt(Math.abs(R.signedArea(s.pts)))) * 0.06));
      for (const ln of lines) {
        const solid = new THREE.LineSegments(ln.geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
        solid.scale.copy(ln.scale); solid.renderOrder = 1;
        const hidden = new THREE.LineSegments(ln.geometry.clone(), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: scaleRef, gapSize: scaleRef * 0.7, transparent: true, opacity: 0.55, depthFunc: THREE.GreaterDepth, depthWrite: false }));
        hidden.scale.copy(ln.scale); hidden.computeLineDistances(); hidden.renderOrder = 2;
        group.add(solid, hidden);
      }
      this.scene.add(group);
      return { group, mesh, form, stats: st, shapeId: s.id };
    },

    // ---- sichqoncha ----
    hit(board, sp) {
      if (!this.objs.size) return null;
      const ndc = new THREE.Vector2(sp[0] / board.w * 2 - 1, -(sp[1] / board.h) * 2 + 1);
      this.ray.setFromCamera(ndc, this.camera);
      const hits = this.ray.intersectObjects([...this.objs.values()].map(o => o.mesh), false);
      return hits.length ? hits[0].object.userData.shapeId : null;
    },
    info(id) { return this.objs.get(id); },
    bottomOf(id) {
      const o = this.objs.get(id); if (!o) return null;
      const b = new THREE.Box3().setFromObject(o.mesh);
      return [(b.min.x + b.max.x) / 2, b.min.y];
    },
    exportOver(ctx, w, h) { this.renderer.render(this.scene, this.camera); ctx.drawImage(this.renderer.domElement, 0, 0, w, h); }
  };

  function fillMat(color, opacity) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  }
  function ringLine(a, b, plane) {
    const pts = [];
    for (let i = 0; i < 96; i++) {
      for (const k of [i, i + 1]) {
        const t = k / 96 * 2 * PI, x = Math.cos(t), y = Math.sin(t);
        pts.push(plane === 'xz' ? new THREE.Vector3(a * x, 0, b * y) : new THREE.Vector3(0, b * y, a * x));
      }
    }
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts));
  }
  function silhouette(form, r, h) {
    // ikkita vertikal (yoki og‘ma) yon chiziq
    const top = form === 'cone' ? [new THREE.Vector3(0, h / 2, 0), new THREE.Vector3(0, h / 2, 0)] : [new THREE.Vector3(-r, h / 2, 0), new THREE.Vector3(r, h / 2, 0)];
    const pts = [new THREE.Vector3(-r, -h / 2, 0), top[0], new THREE.Vector3(r, -h / 2, 0), top[1]];
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts));
  }
  function pyramidGeo(base, h) {
    const pos = [], n = base.length, A = new THREE.Vector3(0, 0, h / 2);
    const v = base.map(q => new THREE.Vector3(q[0], q[1], -h / 2));
    const tris = THREE.ShapeUtils.triangulateShape(base.map(q => new THREE.Vector2(q[0], q[1])), []);
    for (const [a, b, c] of tris) pos.push(...v[a].toArray(), ...v[b].toArray(), ...v[c].toArray());
    for (let i = 0; i < n; i++) pos.push(...v[i].toArray(), ...v[(i + 1) % n].toArray(), ...A.toArray());
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  Solid.defaultRot = defaultRot;
  window.Solid3D = Solid;
})();
