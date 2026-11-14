// ===== Chizgi — 3D sahna (matematik koordinatalar: z — yuqoriga) =====
(function () {
  const PI = Math.PI, fmt = n => (+n.toFixed(3)).toString();
  const COLORS = ['#4f8cff', '#8b5cf6', '#22d3ee', '#34d399', '#facc15', '#fb923c', '#ff5c7a', '#e6ebff'];

  const SOLIDS = {
    cube: { params: { a: 2 }, build: p => new THREE.BoxGeometry(p.a, p.a, p.a).translate(0, 0, p.a / 2),
      calc: p => ({ V: p.a ** 3, S: 6 * p.a ** 2 }) },
    cuboid: { params: { a: 3, b: 2, c: 1.5 }, build: p => new THREE.BoxGeometry(p.a, p.b, p.c).translate(0, 0, p.c / 2),
      calc: p => ({ V: p.a * p.b * p.c, S: 2 * (p.a * p.b + p.b * p.c + p.a * p.c), d: Math.hypot(p.a, p.b, p.c) }) },
    sphere: { params: { r: 1.5 }, build: p => new THREE.SphereGeometry(p.r, 48, 32).translate(0, 0, p.r),
      calc: p => ({ V: 4 / 3 * PI * p.r ** 3, S: 4 * PI * p.r ** 2 }) },
    cylinder: { params: { r: 1, h: 3 }, build: p => new THREE.CylinderGeometry(p.r, p.r, p.h, 48).rotateX(PI / 2).translate(0, 0, p.h / 2),
      calc: p => ({ V: PI * p.r ** 2 * p.h, S: 2 * PI * p.r * (p.r + p.h) }) },
    cone: { params: { r: 1.2, h: 3 }, build: p => new THREE.ConeGeometry(p.r, p.h, 48).rotateX(PI / 2).translate(0, 0, p.h / 2),
      calc: p => { const l = Math.hypot(p.r, p.h); return { V: PI * p.r ** 2 * p.h / 3, S: PI * p.r * (p.r + l), l }; } },
    pyramid: { params: { a: 2, h: 3 }, build: p => new THREE.ConeGeometry(p.a / Math.SQRT2, p.h, 4).rotateY(PI / 4).rotateX(PI / 2).translate(0, 0, p.h / 2),
      calc: p => { const m = Math.hypot(p.h, p.a / 2); return { V: p.a ** 2 * p.h / 3, S: p.a ** 2 + 2 * p.a * m, m }; } },
    prism: { params: { a: 2, h: 3 }, build: p => new THREE.CylinderGeometry(p.a / Math.sqrt(3), p.a / Math.sqrt(3), p.h, 3).rotateX(PI / 2).translate(0, 0, p.h / 2),
      calc: p => { const B = Math.sqrt(3) / 4 * p.a ** 2; return { V: B * p.h, S: 2 * B + 3 * p.a * p.h }; } },
    tetra: { params: { a: 2 }, build: p => tetraGeo(p.a),
      calc: p => ({ V: p.a ** 3 / (6 * Math.SQRT2), S: Math.sqrt(3) * p.a ** 2, h: p.a * Math.sqrt(2 / 3) }) },
    torus: { params: { R: 2, r: 0.5 }, build: p => new THREE.TorusGeometry(p.R, p.r, 24, 72).translate(0, 0, p.r),
      calc: p => ({ V: 2 * PI * PI * p.R * p.r ** 2, S: 4 * PI * PI * p.R * p.r }) }
  };
  function tetraGeo(a) {
    const R = a / Math.sqrt(3), h = a * Math.sqrt(2 / 3);
    const v = [0, 1, 2].map(i => [R * Math.cos(PI / 2 + i * 2 * PI / 3), R * Math.sin(PI / 2 + i * 2 * PI / 3), 0]);
    const top = [0, 0, h];
    const faces = [[v[0], v[2], v[1]], [v[0], v[1], top], [v[1], v[2], top], [v[2], v[0], top]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(faces.flat(2), 3));
    g.computeVertexNormals(); return g;
  }

  const Scene = {
    objects: [], vectors: [], selected: null, drawMode: false, drawing: null, uid: 1, onChange: () => {},

    init(wrap) {
      this.wrap = wrap;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      wrap.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
      this.controls = new THREE.OrbitControls(this.camera, r.domElement);
      this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
      this.resetView();

      this.scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1030, 0.75));
      const dl = new THREE.DirectionalLight(0xffffff, 0.85); dl.position.set(8, 14, 6); this.scene.add(dl);
      const dl2 = new THREE.DirectionalLight(0x8b5cf6, 0.35); dl2.position.set(-8, 4, -10); this.scene.add(dl2);

      // root: matematik (x, y, z) -> three (x, z, -y)
      this.root = new THREE.Group(); this.root.rotation.x = -PI / 2; this.scene.add(this.root);
      this.buildAxes();

      this.ray = new THREE.Raycaster();
      this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      let down = null;
      r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
      r.domElement.addEventListener('pointerup', e => {
        if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
        this.onClick(e);
      });
      r.domElement.addEventListener('pointermove', e => this.onHover(e));
      new ResizeObserver(() => this.resize()).observe(wrap);
      this.resize();
      const loop = () => { requestAnimationFrame(loop); if (!this.visible) return; this.controls.update(); r.render(this.scene, this.camera); };
      loop();
    },
    resize() {
      const w = this.wrap.clientWidth, h = this.wrap.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    },
    resetView() { this.camera.position.set(11, 9, 13); this.controls.target.set(0, 1, 0); this.controls.update(); },

    buildAxes() {
      const g = this.axes = new THREE.Group();
      const grid = new THREE.GridHelper(20, 20, 0x3a4a80, 0x1c2648); grid.rotation.x = PI / 2;
      grid.material.transparent = true; grid.material.opacity = 0.8; g.add(grid);
      const fine = new THREE.GridHelper(20, 80, 0x141c38, 0x141c38); fine.rotation.x = PI / 2; fine.position.z = -0.002;
      fine.material.transparent = true; fine.material.opacity = 0.5; g.add(fine);
      const ax = [['x', [1, 0, 0], 0xff6b81], ['y', [0, 1, 0], 0x34d399], ['z', [0, 0, 1], 0x4f8cff]];
      for (const [name, d, col] of ax) {
        const dir = new THREE.Vector3(...d), len = name === 'z' ? 7 : 10.5;
        const mat = new THREE.LineBasicMaterial({ color: col });
        const geo = new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(name === 'z' ? 0 : -10), dir.clone().multiplyScalar(len)]);
        g.add(new THREE.Line(geo, mat));
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), new THREE.MeshBasicMaterial({ color: col }));
        cone.position.copy(dir.clone().multiplyScalar(len));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(cone);
        const lbl = makeLabel(name, '#' + col.toString(16).padStart(6, '0'), 44); lbl.position.copy(dir.clone().multiplyScalar(len + 0.6)); g.add(lbl);
        for (let i = 2; i <= (name === 'z' ? 6 : 10); i += 2) {
          const n = makeLabel(String(i), '#7f8bb8', 26, 0.45); n.position.copy(dir.clone().multiplyScalar(i));
          if (name === 'z') n.position.x = -0.45; else n.position.z = -0.35; g.add(n);
        }
      }
      this.root.add(g);
    },

    // ---- jismlar ----
    addSolid(kind) {
      const def = SOLIDS[kind];
      const color = COLORS[(this.uid - 1) % COLORS.length];
      const o = { id: this.uid++, kind, params: { ...def.params }, color, wire: false, opacity: 0.85, group: new THREE.Group() };
      const n = this.objects.filter(x => x.kind === kind).length;
      o.group.position.set(((n % 3) - 1) * 4 * (n ? 1 : 0), Math.floor(n / 3) * 4 * (n ? 1 : 0), 0);
      this.root.add(o.group); this.objects.push(o);
      this.rebuild(o); this.select(o.id);
      return o;
    },
    rebuild(o) {
      o.group.clear();
      const geo = SOLIDS[o.kind].build(o.params);
      o.mat = new THREE.MeshStandardMaterial({ color: o.color, transparent: true, opacity: o.opacity, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide, depthWrite: o.opacity > 0.95 });
      o.mesh = new THREE.Mesh(geo, o.mat); o.mesh.userData.id = o.id; o.mesh.visible = !o.wire;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: o.wire ? o.color : 0xffffff, transparent: true, opacity: o.wire ? 1 : 0.55 }));
      edges.userData.id = o.id;
      o.edges = edges;
      o.group.add(o.mesh, edges);
      if (this.selected === o.id) this.highlight(o, true);
    },
    update(id, patch) {
      const o = this.get(id); if (!o) return;
      if (patch.params) Object.assign(o.params, patch.params);
      if (patch.color) o.color = patch.color;
      if ('wire' in patch) o.wire = patch.wire;
      if ('opacity' in patch) o.opacity = patch.opacity;
      if (patch.pos) o.group.position.set(...patch.pos);
      if ('rot' in patch) o.group.rotation.z = patch.rot * PI / 180;
      if (patch.params || patch.color || 'wire' in patch || 'opacity' in patch) this.rebuild(o);
      this.onChange();
    },
    get(id) { return this.objects.find(o => o.id === id); },
    select(id) {
      const prev = this.get(this.selected); if (prev) this.highlight(prev, false);
      this.selected = id; const o = this.get(id); if (o) this.highlight(o, true);
      this.onChange();
    },
    highlight(o, on) {
      if (o.mat && o.mat.emissive) o.mat.emissive.set(on ? 0x223366 : 0x000000);
      if (o.edges && !o.wire && o.kind !== 'surface' && o.kind !== 'polyline') { o.edges.material.opacity = on ? 1 : 0.55; o.edges.material.color.set(on ? 0xffffff : 0xffffff); }
    },
    remove(id) {
      const i = this.objects.findIndex(o => o.id === id); if (i < 0) return;
      this.root.remove(this.objects[i].group); dispose(this.objects[i].group); this.objects.splice(i, 1);
      if (this.selected === id) this.selected = null;
      this.onChange();
    },
    stats(o) {
      if (o.kind === 'surface') return { expr: o.expr };
      if (o.kind === 'polyline') return { L: o.length, n: o.pts.length };
      return SOLIDS[o.kind].calc(o.params);
    },

    // ---- vektorlar ----
    addVector(v, color, isSum) {
      const vec = new THREE.Vector3(...v), len = vec.length(); if (len < 1e-9) return;
      color = color || COLORS[(this.vectors.length + 3) % COLORS.length];
      const g = new THREE.Group();
      const head = Math.min(0.5, len * 0.3);
      const arrow = new THREE.ArrowHelper(vec.clone().normalize(), new THREE.Vector3(), len, color, head, head * 0.5);
      arrow.line.material.linewidth = 2; g.add(arrow);
      const lbl = makeLabel(`(${fmt(v[0])}, ${fmt(v[1])}, ${fmt(v[2])})`, color, 30, 0.55); lbl.position.copy(vec).add(new THREE.Vector3(0, 0, 0.4)); g.add(lbl);
      // proyeksiya chiziqlari
      const dash = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.12, transparent: true, opacity: 0.5 });
      const proj = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(v[0], v[1], 0), vec, new THREE.Vector3(v[0], v[1], 0), new THREE.Vector3(v[0], 0, 0), new THREE.Vector3(v[0], v[1], 0), new THREE.Vector3(0, v[1], 0)]), dash);
      proj.computeLineDistances(); g.add(proj);
      this.root.add(g);
      this.vectors.push({ id: this.uid++, v, color, group: g, isSum });
      this.onChange();
    },
    removeVector(id) {
      const i = this.vectors.findIndex(x => x.id === id); if (i < 0) return;
      this.root.remove(this.vectors[i].group); dispose(this.vectors[i].group); this.vectors.splice(i, 1); this.onChange();
    },
    sumVectors() {
      const src = this.vectors.filter(x => !x.isSum); if (src.length < 2) return;
      this.vectors.filter(x => x.isSum).forEach(x => this.removeVector(x.id));
      const s = src.reduce((a, x) => [a[0] + x.v[0], a[1] + x.v[1], a[2] + x.v[2]], [0, 0, 0]);
      this.addVector(s, '#ffffff', true);
    },

    // ---- sirt ----
    addSurface(expr) {
      const f = MathExpr.compile(expr, ['x', 'y']);
      const N = 80, L = 5, pos = [], col = [], idx = [];
      let zmin = Infinity, zmax = -Infinity; const zs = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const x = -L + 2 * L * i / N, y = -L + 2 * L * j / N;
        let z = f(x, y); if (!isFinite(z)) z = 0; z = Math.max(-8, Math.min(8, z));
        zs.push(z); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); pos.push(x, y, z);
      }
      const c1 = new THREE.Color('#4f8cff'), c2 = new THREE.Color('#8b5cf6'), c3 = new THREE.Color('#facc15'), tmp = new THREE.Color();
      for (const z of zs) {
        const t = zmax > zmin ? (z - zmin) / (zmax - zmin) : 0.5;
        if (t < 0.5) tmp.copy(c1).lerp(c2, t * 2); else tmp.copy(c2).lerp(c3, (t - 0.5) * 2);
        col.push(tmp.r, tmp.g, tmp.b);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, d, a, d, c);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx); geo.computeVertexNormals();
      const o = { id: this.uid++, kind: 'surface', expr, color: '#8b5cf6', group: new THREE.Group() };
      o.mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5, transparent: true, opacity: 0.92 });
      o.mesh = new THREE.Mesh(geo, o.mat); o.mesh.userData.id = o.id;
      const wf = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 }));
      o.group.add(o.mesh, wf);
      this.root.add(o.group); this.objects.push(o); this.select(o.id);
    },

    // ---- 3D chiziq ----
    setDrawMode(on) {
      this.drawMode = on;
      if (!on) this.finishDrawing();
    },
    finishDrawing() {
      const d = this.drawing; this.drawing = null;
      if (d && d.pts.length < 2) this.remove(d.id);
      this.onChange();
    },
    addDrawPoint(p) {
      if (!this.drawing) {
        const o = { id: this.uid++, kind: 'polyline', pts: [], length: 0, color: '#facc15', group: new THREE.Group() };
        this.root.add(o.group); this.objects.push(o); this.drawing = o;
      }
      const o = this.drawing; o.pts.push(p);
      o.group.clear();
      const pts = o.pts.map(q => new THREE.Vector3(...q));
      o.length = 0; for (let i = 1; i < pts.length; i++) o.length += pts[i].distanceTo(pts[i - 1]);
      if (pts.length > 1) o.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: o.color })));
      const sg = new THREE.SphereGeometry(0.09, 16, 12), sm = new THREE.MeshBasicMaterial({ color: o.color });
      pts.forEach((q, i) => {
        const s = new THREE.Mesh(sg, sm); s.position.copy(q); s.userData.id = o.id; o.group.add(s);
        const l = makeLabel(String.fromCharCode(65 + (i % 26)), '#facc15', 30, 0.5); l.position.copy(q).add(new THREE.Vector3(0, 0, 0.35)); o.group.add(l);
      });
      o.mesh = o.group.children.find(c => c.isMesh);
      this.onChange();
    },

    // ---- sichqoncha ----
    pointer(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    },
    onClick(e) {
      this.ray.setFromCamera(this.pointer(e), this.camera);
      if (this.drawMode) {
        const hit = new THREE.Vector3();
        if (this.ray.ray.intersectPlane(this.plane, hit)) {
          const l = this.root.worldToLocal(hit.clone());
          const sn = v => Math.round(v * 2) / 2;
          this.addDrawPoint([sn(l.x), sn(l.y), 0]);
        }
        return;
      }
      const hits = this.ray.intersectObjects(this.objects.filter(o => o.mesh).map(o => o.wire ? o.edges : o.mesh), false);
      this.select(hits.length ? hits[0].object.userData.id : null);
    },
    onHover(e) {
      if (!this.drawMode) { this.renderer.domElement.style.cursor = ''; return; }
      this.renderer.domElement.style.cursor = 'crosshair';
    },
    clearAll() {
      [...this.objects].forEach(o => this.remove(o.id));
      [...this.vectors].forEach(v => this.removeVector(v.id));
      this.drawing = null; this.onChange();
    },
    exportPNG() {
      this.renderer.render(this.scene, this.camera);
      const src = this.renderer.domElement, tmp = document.createElement('canvas'); tmp.width = src.width; tmp.height = src.height;
      const x = tmp.getContext('2d'); x.fillStyle = '#070b17'; x.fillRect(0, 0, tmp.width, tmp.height); x.drawImage(src, 0, 0);
      window.chizgiDownload(tmp.toDataURL('image/png'), 'chizgi-3d.png');
    },
    COLORS, SOLIDS
  };

  function makeLabel(text, color, px = 32, size = 0.7) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = `600 ${px}px "IBM Plex Mono", monospace`;
    const w = Math.ceil(x.measureText(text).width) + 16, h = px + 14;
    c.width = w; c.height = h;
    x.font = `600 ${px}px "IBM Plex Mono", monospace`; x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 8, h / 2);
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(size * w / h, size, 1); s.renderOrder = 10;
    return s;
  }
  function dispose(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }
    });
  }
  window.Scene3D = Scene;
})();
