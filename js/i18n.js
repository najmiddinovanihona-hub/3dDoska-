(function () {
  const D = {
    uz: {
      slogan: 'Matematika · Fizika · Geometriya', style: 'Uslub', width: 'Qalinlik', fill: 'Bo‘yash (to‘ldirish)',
      grid: 'Koordinata to‘ri', snap: 'To‘rga yopishish', measures: 'O‘lchamlarni ko‘rsatish',
      functions: 'Funksiya grafigi', physics: 'Fizika: burchak ostida otish', launch: 'Otish ▶', remove: 'O‘chirish',
      t_pan: 'Surish (sichqoncha g‘ildiragi — masshtab)', t_pen: 'Qalam', t_line: 'Kesma', t_vector: 'Vektor',
      t_rect: 'To‘rtburchak', t_circle: 'Aylana', t_triangle: 'Uchburchak (3 ta nuqta)', t_polygon: 'Ko‘pburchak',
      t_point: 'Nuqta', t_angle: 'Burchak o‘lchash', t_ruler: 'Chizg‘ich', t_text: 'Matn', t_eraser: 'O‘chirg‘ich',
      undo: 'Bekor qilish (Ctrl+Z)', redo: 'Qaytarish (Ctrl+Y)', clear: 'Hammasini tozalash', export: 'PNG saqlash',
      s_cube: 'Kub', s_cuboid: 'To‘g‘ri burchakli parallelepiped', s_sphere: 'Shar', s_cylinder: 'Silindr',
      s_cone: 'Konus', s_pyramid: 'Piramida (kvadrat asosli)', s_prism: 'Uchburchakli prizma', s_tetra: 'Tetraedr', s_torus: 'Tor',
      t_draw3d: '3D chiziq chizish (tekislikka bosing)', resetView: 'Ko‘rinishni tiklash',
      selected: 'Tanlangan jism', selectHint: 'Chapdagi paneldan jism qo‘shing yoki sahnadagi jism ustiga bosing.',
      rotate: 'Burish', wire: 'Karkas (faqat qirralar)', opacity: 'Shaffoflik', vectors: 'Vektorlar',
      addVector: 'Vektor qo‘shish', sum: 'Yig‘indi', surface: 'Sirt: z = f(x, y)', scene: 'Sahna', autoRotate: 'Avto aylanish',
      volume: 'Hajm', area: 'Sirt yuzi', length: 'Uzunlik', perimeter: 'Perimetr', areaS: 'Yuza',
      range: 'Uchish masofasi', hmax: 'Maks. balandlik', time: 'Uchish vaqti',
      h_pen: 'Erkin chizing', h_line: 'Bosib torting — kesma', h_vector: 'Bosib torting — vektor (uzunligi va burchagi ko‘rinadi)',
      h_rect: 'Bosib torting — to‘rtburchak', h_circle: 'Markazdan torting — aylana', h_triangle: '3 ta uchini bosing',
      h_polygon: 'Uchlarini bosing, 1-nuqtaga yoki 2 marta bosib yakunlang', h_point: 'Nuqta qo‘ying (A, B, C...)',
      h_angle: '3 ta nuqta: tomon — uch — tomon', h_ruler: 'Bosib torting — masofa', h_text: 'Matn joyiga bosing',
      h_eraser: 'O‘chirish uchun shaklga bosing', h_pan: 'Torting — surish, g‘ildirak — masshtab',
      h_draw3d: 'z = 0 tekislikka bosib nuqtalar qo‘ying. Esc — yakunlash', badExpr: 'Ifoda noto‘g‘ri',
      edges: 'qirra', radius: 'radius', side: 'tomon', height: 'balandlik'
    },
    ru: {
      slogan: 'Математика · Физика · Геометрия', style: 'Стиль', width: 'Толщина', fill: 'Заливка',
      grid: 'Координатная сетка', snap: 'Привязка к сетке', measures: 'Показывать размеры',
      functions: 'График функции', physics: 'Физика: бросок под углом', launch: 'Бросить ▶', remove: 'Удалить',
      t_pan: 'Перемещение (колесо — масштаб)', t_pen: 'Карандаш', t_line: 'Отрезок', t_vector: 'Вектор',
      t_rect: 'Прямоугольник', t_circle: 'Окружность', t_triangle: 'Треугольник (3 точки)', t_polygon: 'Многоугольник',
      t_point: 'Точка', t_angle: 'Измерить угол', t_ruler: 'Линейка', t_text: 'Текст', t_eraser: 'Ластик',
      undo: 'Отменить (Ctrl+Z)', redo: 'Повторить (Ctrl+Y)', clear: 'Очистить всё', export: 'Сохранить PNG',
      s_cube: 'Куб', s_cuboid: 'Прямоугольный параллелепипед', s_sphere: 'Шар', s_cylinder: 'Цилиндр',
      s_cone: 'Конус', s_pyramid: 'Пирамида (квадратное основание)', s_prism: 'Треугольная призма', s_tetra: 'Тетраэдр', s_torus: 'Тор',
      t_draw3d: '3D-линия (клик по плоскости)', resetView: 'Сбросить вид',
      selected: 'Выбранное тело', selectHint: 'Добавьте тело слева или кликните по телу в сцене.',
      rotate: 'Поворот', wire: 'Каркас (только рёбра)', opacity: 'Прозрачность', vectors: 'Векторы',
      addVector: 'Добавить вектор', sum: 'Сумма', surface: 'Поверхность: z = f(x, y)', scene: 'Сцена', autoRotate: 'Автовращение',
      volume: 'Объём', area: 'Площадь поверхности', length: 'Длина', perimeter: 'Периметр', areaS: 'Площадь',
      range: 'Дальность', hmax: 'Макс. высота', time: 'Время полёта',
      h_pen: 'Рисуйте свободно', h_line: 'Потяните — отрезок', h_vector: 'Потяните — вектор (видны длина и угол)',
      h_rect: 'Потяните — прямоугольник', h_circle: 'Тяните от центра — окружность', h_triangle: 'Кликните 3 вершины',
      h_polygon: 'Кликайте вершины, завершите кликом по 1-й или двойным кликом', h_point: 'Поставьте точку (A, B, C...)',
      h_angle: '3 точки: сторона — вершина — сторона', h_ruler: 'Потяните — расстояние', h_text: 'Кликните место для текста',
      h_eraser: 'Кликните по фигуре, чтобы удалить', h_pan: 'Тяните — перемещение, колесо — масштаб',
      h_draw3d: 'Кликайте по плоскости z = 0. Esc — завершить', badExpr: 'Неверное выражение',
      edges: 'ребро', radius: 'радиус', side: 'сторона', height: 'высота'
    },
    en: {
      slogan: 'Math · Physics · Geometry', style: 'Style', width: 'Width', fill: 'Fill',
      grid: 'Coordinate grid', snap: 'Snap to grid', measures: 'Show measurements',
      functions: 'Function graph', physics: 'Physics: projectile motion', launch: 'Launch ▶', remove: 'Remove',
      t_pan: 'Pan (wheel — zoom)', t_pen: 'Pen', t_line: 'Segment', t_vector: 'Vector',
      t_rect: 'Rectangle', t_circle: 'Circle', t_triangle: 'Triangle (3 points)', t_polygon: 'Polygon',
      t_point: 'Point', t_angle: 'Measure angle', t_ruler: 'Ruler', t_text: 'Text', t_eraser: 'Eraser',
      undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Y)', clear: 'Clear all', export: 'Save PNG',
      s_cube: 'Cube', s_cuboid: 'Cuboid', s_sphere: 'Sphere', s_cylinder: 'Cylinder',
      s_cone: 'Cone', s_pyramid: 'Square pyramid', s_prism: 'Triangular prism', s_tetra: 'Tetrahedron', s_torus: 'Torus',
      t_draw3d: '3D polyline (click the plane)', resetView: 'Reset view',
      selected: 'Selected solid', selectHint: 'Add a solid from the left or click one in the scene.',
      rotate: 'Rotate', wire: 'Wireframe (edges only)', opacity: 'Opacity', vectors: 'Vectors',
      addVector: 'Add vector', sum: 'Sum', surface: 'Surface: z = f(x, y)', scene: 'Scene', autoRotate: 'Auto-rotate',
      volume: 'Volume', area: 'Surface area', length: 'Length', perimeter: 'Perimeter', areaS: 'Area',
      range: 'Range', hmax: 'Max height', time: 'Flight time',
      h_pen: 'Draw freely', h_line: 'Drag — segment', h_vector: 'Drag — vector (length and angle shown)',
      h_rect: 'Drag — rectangle', h_circle: 'Drag from center — circle', h_triangle: 'Click 3 vertices',
      h_polygon: 'Click vertices, finish on the 1st point or double-click', h_point: 'Place a point (A, B, C...)',
      h_angle: '3 points: side — vertex — side', h_ruler: 'Drag — distance', h_text: 'Click where the text goes',
      h_eraser: 'Click a shape to delete it', h_pan: 'Drag — pan, wheel — zoom',
      h_draw3d: 'Click on the z = 0 plane to add points. Esc — finish', badExpr: 'Invalid expression',
      edges: 'edge', radius: 'radius', side: 'side', height: 'height'
    }
  };
  let lang = 'uz';
  try { lang = localStorage.getItem('chizgi-lang') || 'uz'; } catch (e) {}
  const listeners = [];
  function t(k) { return (D[lang] && D[lang][k]) || D.uz[k] || k; }
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    listeners.forEach(f => f());
  }
  function set(l) { lang = D[l] ? l : 'uz'; try { localStorage.setItem('chizgi-lang', lang); } catch (e) {} apply(); }
  window.I18N = { t, set, apply, get lang() { return lang; }, onChange: f => listeners.push(f) };
})();
