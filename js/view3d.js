// ===== Chizgi — chizmani 3D ga o‘tkazish =====
(function () {
  const PI = Math.PI, R = window.Recognizer;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function formsFor(s) {
    if (s.type === 'ellipse') return s.name === 'circle' ? ['sphere', 'cylinder', 'cone'] : ['ellipsoid', 'cylinder', 'cone'];
    if (s.type === 'poly' && s.closed) return ['prism', 'pyramid'];
    if (s.type === 'curve' && s.closed) return ['prism'];
    if (s.type === 'dot') return ['ball'];
    return ['tube', 'wall'];
  }
  function perimeter(p) { let s = 0; for (let i = 0; i < p.length; i++) s += dist(p[i], p[(i + 1) % p.length]); return s; }
  function pathLen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i], p[i - 1]); return s; }
  function prismHeight(s) {
    const P = s.pts;
    if (s.name === 'square') return dist(P[0], P[1]);
    if (s.name === 'rect') return Math.min(dist(P[0], P[1]), dist(P[1], P[2]));
    if (s.type === 'curve') return Math.sqrt(Math.abs(R.signedArea(P))) * 0.7;
    return perimeter(P) / P.length * 0.85;
  }
  function openPts(s) { return s.type === 'line' ? [s.a, s.b] : s.pts; }

  const V = {
    inited: false, visible: false, objs: [], onSelect: () => {},
    init(wrap) {
      this.wrap = wrap; this.inited = true;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); wrap.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 1000);
      this.controls = new THREE.OrbitControls(this.camera, r.domElement);
      this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.autoRotateSpeed = 1.2;
      this.scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1a1030, 0.8));
      const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(6, 12, 8); this.scene.add(dl);
      const dl2 = new THREE.DirectionalLight(0x8b5cf6, 0.35); dl2.position.set(-8, 5, -6); this.scene.add(dl2);
      this.world = new THREE.Group(); this.scene.add(this.world);
      this.ray = new THREE.Raycaster();
      let down = null;
      r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
      r.domElement.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) this.onClick(e); down = null; });
      r.domElement.addEventListener('pointermove', e => { const h = this.pick(e); r.domElement.style.cursor = h ? 'pointer' : ''; });
      new ResizeObserver(() => this.resize()).observe(wrap);
      const loop = () => {
        requestAnimationFrame(loop); if (!this.visible) return;
        const now = performance.now();
        for (const o of this.objs) if (o.rise < 1) { o.rise = Math.min(1, (now - o.t0) / 700); const k = o.rise <= 0 ? 0.001 : 1 - Math.pow(1 - o.rise, 3); o.group.scale.y = Math.max(0.001, k); }
        this.controls.update(); r.render(this.scene, this.camera);
      };
      loop();
    },
    resize() {
      const w = this.wrap.clientWidth, h = this.wrap.clientHeight; if (!w || !h) return;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    },
    build(shapes) {
      this.world.clear(); this.objs = []; this.selected = null;
      // chegaralar
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of shapes) for (const q of Board.outline(s)) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      if (!shapes.length) { x0 = y0 = -3; x1 = y1 = 3; }
      this.c = [(x0 + x1) / 2, (y0 + y1) / 2];
      const ext = Math.max(x1 - x0, y1 - y0, 4);
      const size = Math.ceil(ext * 1.6 / 2) * 2 + 4;
      const grid = new THREE.GridHelper(size, size, 0x3a4a80, 0x1a2446);
      grid.position.set(Math.round(this.c[0]) - this.c[0], 0, -(Math.round(this.c[1]) - this.c[1]));
      grid.material.transparent = true; grid.material.opacity = 0.75; this.world.add(grid);
      const now = performance.now();
      shapes.forEach((s, i) => {
        const o = { s, group: new THREE.Group(), rise: 0, t0: now + i * 90 };
        o.group.scale.y = 0.001; this.world.add(o.group); this.objs.push(o); this.makeObj(o);
      });
      this.camera.position.set(ext * 0.6, ext * 0.9, ext * 1.35); this.controls.target.set(0, ext * 0.08, 0); this.controls.update();
      this.home = { p: this.camera.position.clone(), t: this.controls.target.clone() };
      this.onSelect(null);
    },
    resetView() { if (!this.home) return; this.camera.position.copy(this.home.p); this.controls.target.copy(this.home.t); this.controls.update(); },
    X(q) { return [q[0] - this.c[0], -(q[1] - this.c[1])]; },
    makeObj(o) {
      const s = o.s, forms = formsFor(s);
      if (s.form3d === undefined || s.form3d >= forms.length) s.form3d = 0;
      const form = forms[s.form3d];
      o.group.clear(); o.form = form;
      const color = new THREE.Color(s.color === '#ffffff' ? '#8fb3ff' : s.color);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.08, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      let geo, pos = [0, 0, 0], scl = [1, 1, 1], st = {};
      const cxz = q => this.X(q);
      if (s.type === 'ellipse') {
        const [x, z] = cxz(s.c), r = Math.min(s.rx, s.ry), circle = s.name === 'circle', hh = 2 * r;
        if (form === 'sphere' || form === 'ellipsoid') {
          geo = new THREE.SphereGeometry(1, 48, 32); scl = [s.rx, r, s.ry]; pos = [x, r, z];
          st = circle ? { V: 4 / 3 * PI * r ** 3, S: 4 * PI * r * r } : { V: 4 / 3 * PI * s.rx * s.ry * r };
        } else if (form === 'cylinder') {
          geo = new THREE.CylinderGeometry(1, 1, hh, 64); scl = [s.rx, 1, s.ry]; pos = [x, hh / 2, z];
          st = circle ? { V: PI * r * r * hh, S: 2 * PI * r * (r + hh) } : { V: PI * s.rx * s.ry * hh };
        } else {
          geo = new THREE.ConeGeometry(1, hh, 64); scl = [s.rx, 1, s.ry]; pos = [x, hh / 2, z];
          const l = Math.hypot(r, hh); st = circle ? { V: PI * r * r * hh / 3, S: PI * r * (r + l) } : { V: PI * s.rx * s.ry * hh / 3 };
        }
      } else if (form === 'prism' || form === 'pyramid') {
        const P = s.pts, A = Math.abs(R.signedArea(P)), h = prismHeight(s);
        if (form === 'prism') {
          const sh = new THREE.Shape(P.map(q => new THREE.Vector2(q[0] - this.c[0], q[1] - this.c[1])));
          geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 }).rotateX(-PI / 2);
          st = { V: A * h, S: 2 * A + perimeter(P) * h };
        } else {
          geo = pyramidGeo(P.map(cxz), cxz(R.centroid(P)), h);
          const c0 = R.centroid(P); let lat = 0;
          for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], e = dist(a, b); lat += 0.5 * e * Math.hypot(h, distLine(c0, a, b)); }
          st = { V: A * h / 3, S: A + lat };
        }
        st.h = h;
      } else if (form === 'ball') {
        const [x, z] = cxz(s.p); geo = new THREE.SphereGeometry(0.15, 24, 16); pos = [x, 0.15, z];
      } else if (form === 'tube') {
        const pts = openPts(s).map(q => { const [x, z] = cxz(q); return new THREE.Vector3(x, 0, z); });
        const rad = Math.max(0.05, s.width * 0.018);
        const curve = pts.length === 2 ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CatmullRomCurve3(pts, false, 'catmullrom', s.type === 'poly' ? 0 : 0.5);
        geo = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 4), rad, 12, false); pos = [0, rad, 0];
        st = { L: pathLen(openPts(s)) };
      } else if (form === 'wall') {
        const P = openPts(s), h = Math.max(1, pathLen(P) * 0.25);
        geo = ribbonGeo(P.map(cxz), h); st = { L: pathLen(P), A: pathLen(P) * h };
      }
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...pos); mesh.scale.set(...scl); mesh.userData.obj = o;
      o.group.add(mesh); o.mesh = mesh; o.stats = st;
      if (['prism', 'pyramid', 'cylinder', 'cone'].includes(form)) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
        e.position.copy(mesh.position); e.scale.copy(mesh.scale); o.group.add(e); o.edges = e;
      }
      // tagidagi 2D shakl izi
      const trace = Board.outline(s).map(q => { const [x, z] = cxz(q); return new THREE.Vector3(x, 0.005, z); });
      if (trace.length > 1) o.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(trace), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })));
      if (this.selected === o) this.highlight(o, true);
    },
    pick(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
      const hits = this.ray.intersectObjects(this.objs.map(o => o.mesh), false);
      return hits.length ? hits[0].object.userData.obj : null;
    },
    onClick(e) {
      const o = this.pick(e);
      if (!o) { this.select(null); return; }
      if (this.selected === o) {
        const forms = formsFor(o.s); o.s.form3d = (o.s.form3d + 1) % forms.length;
        this.makeObj(o); o.rise = 0; o.t0 = performance.now(); o.group.scale.y = 0.001;
      }
      this.select(o);
    },
    select(o) {
      if (this.selected) this.highlight(this.selected, false);
      this.selected = o; if (o) this.highlight(o, true);
      this.onSelect(o);
    },
    highlight(o, on) { if (o.mesh) o.mesh.material.emissive.set(on ? 0x1f2f66 : 0x000000); if (o.edges) o.edges.material.opacity = on ? 0.9 : 0.4; },
    exportPNG() {
      this.renderer.render(this.scene, this.camera);
      const src = this.renderer.domElement, tmp = document.createElement('canvas'); tmp.width = src.width; tmp.height = src.height;
      const x = tmp.getContext('2d'); x.fillStyle = '#070b17'; x.fillRect(0, 0, tmp.width, tmp.height); x.drawImage(src, 0, 0);
      window.chizgiDownload(tmp.toDataURL('image/png'), 'chizgi-3d.png');
    },
    formsFor
  };

  function distLine(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / (Math.hypot(dx, dy) || 1);
  }
  function pyramidGeo(base, apex, h) {
    const pos = [], n = base.length, A = new THREE.Vector3(apex[0], h, apex[1]);
    const v = base.map(q => new THREE.Vector3(q[0], 0, q[1]));
    const tris = THREE.ShapeUtils.triangulateShape(base.map(q => new THREE.Vector2(q[0], q[1])), []);
    for (const [a, b, c] of tris) pos.push(...v[a].toArray(), ...v[b].toArray(), ...v[c].toArray());
    for (let i = 0; i < n; i++) pos.push(...v[i].toArray(), ...v[(i + 1) % n].toArray(), ...A.toArray());
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  function ribbonGeo(P, h) {
    const pos = [];
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, az] = P[i], [bx, bz] = P[i + 1];
      pos.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, 0, az, bx, h, bz, ax, h, az);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  window.View3D = V;
})();
