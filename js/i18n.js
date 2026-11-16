(function () {
  const D = {
    uz: {
      emptyTitle: 'Chizishni boshlang', emptySub: 'Qo‘lda chizgan chizig‘ingiz shu zahoti to‘g‘rilanadi. «3D» ni yoqsangiz — aylana, kvadrat, uchburchak shu yerning o‘zida shar, kub, prizmaga aylanadi.',
      to3d: '3D', t_3d: '3D rejim: chizgan shakllar doskaning o‘zida 3D jismga aylanadi', on3d: '🧊 3D yoqildi — shakllar shu joyda 3D bo‘ldi. Tortib aylantiring, bosib shaklini almashtiring', off3d: '3D o‘chirildi — shakllar yana tekis',
      t_pen: 'Qalam', t_eraser: 'O‘chirg‘ich', t_hand: 'Surish (g‘ildirak — masshtab)', t_auto: 'Avto to‘g‘rilash',
      undo: 'Bekor qilish (Ctrl+Z)', redo: 'Qaytarish (Ctrl+Y)', clear: 'Doskani tozalash', grid: 'Koordinata to‘ri', measures: 'O‘lchamlar', export: 'PNG saqlash',
      resetView: 'Ko‘rinishni tiklash', autoRotate: 'Avto aylanish',
      autoOn: '✨ Avto to‘g‘rilash yoqildi', autoOff: 'Erkin chizish: chiziqlar to‘g‘rilanmaydi',
      empty3d: 'Avval doskaga biror shakl chizing', hint3d: 'Tortib aylantiring · bosing — boshqa jism',
      volume: 'Hajm', area: 'Sirt yuzi', length: 'Uzunlik', height: 'Balandlik', wallArea: 'Yuza', again: 'Yana bosing — boshqa ko‘rinish',
      n_line: 'Kesma', n_polyline: 'Siniq chiziq', n_triangle: 'Uchburchak', n_square: 'Kvadrat', n_rect: 'To‘g‘ri to‘rtburchak', n_quad: 'To‘rtburchak',
      n_pentagon: 'Beshburchak', n_hexagon: 'Oltiburchak', n_polygon: 'Ko‘pburchak', n_circle: 'Aylana', n_ellipse: 'Ellips', n_arc: 'Yoy', n_curve: 'Egri chiziq', n_dot: 'Nuqta',
      f_sphere: 'Shar', f_ellipsoid: 'Ellipsoid', f_cylinder: 'Silindr', f_cone: 'Konus', f_prism: 'Prizma', f_pyramid: 'Piramida', f_tube: 'Sterjen', f_wall: 'Sirt (devor)', f_ball: 'Sharcha',
      f_cube: 'Kub', f_cuboid: 'Parallelepiped'
    },
    ru: {
      emptyTitle: 'Начните рисовать', emptySub: 'Линия от руки сразу выпрямляется. Включите «3D» — окружность, квадрат, треугольник станут шаром, кубом, призмой прямо на доске.',
      to3d: '3D', t_3d: '3D-режим: фигуры превращаются в тела прямо на доске', on3d: '🧊 3D включён — фигуры стали объёмными на месте. Тяните, чтобы вращать, кликните — сменить тело', off3d: '3D выключен — фигуры снова плоские',
      t_pen: 'Карандаш', t_eraser: 'Ластик', t_hand: 'Перемещение (колесо — масштаб)', t_auto: 'Автовыпрямление',
      undo: 'Отменить (Ctrl+Z)', redo: 'Повторить (Ctrl+Y)', clear: 'Очистить доску', grid: 'Координатная сетка', measures: 'Размеры', export: 'Сохранить PNG',
      resetView: 'Сбросить вид', autoRotate: 'Автовращение',
      autoOn: '✨ Автовыпрямление включено', autoOff: 'Свободное рисование: линии не выпрямляются',
      empty3d: 'Сначала нарисуйте фигуру на доске', hint3d: 'Тяните — вращение · клик — другое тело',
      volume: 'Объём', area: 'Площадь поверхности', length: 'Длина', height: 'Высота', wallArea: 'Площадь', again: 'Кликните ещё раз — другой вид',
      n_line: 'Отрезок', n_polyline: 'Ломаная', n_triangle: 'Треугольник', n_square: 'Квадрат', n_rect: 'Прямоугольник', n_quad: 'Четырёхугольник',
      n_pentagon: 'Пятиугольник', n_hexagon: 'Шестиугольник', n_polygon: 'Многоугольник', n_circle: 'Окружность', n_ellipse: 'Эллипс', n_arc: 'Дуга', n_curve: 'Кривая', n_dot: 'Точка',
      f_sphere: 'Шар', f_ellipsoid: 'Эллипсоид', f_cylinder: 'Цилиндр', f_cone: 'Конус', f_prism: 'Призма', f_pyramid: 'Пирамида', f_tube: 'Стержень', f_wall: 'Поверхность (стена)', f_ball: 'Шарик',
      f_cube: 'Куб', f_cuboid: 'Параллелепипед'
    },
    en: {
      emptyTitle: 'Start drawing', emptySub: 'Hand-drawn strokes snap into clean shapes. Turn on “3D” and circles, squares, triangles become spheres, cubes, prisms right on the board.',
      to3d: '3D', t_3d: '3D mode: shapes become solids right on the board', on3d: '🧊 3D on — shapes turned into solids in place. Drag to rotate, click to change the solid', off3d: '3D off — shapes are flat again',
      t_pen: 'Pen', t_eraser: 'Eraser', t_hand: 'Pan (wheel — zoom)', t_auto: 'Auto-correct',
      undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Y)', clear: 'Clear board', grid: 'Coordinate grid', measures: 'Measurements', export: 'Save PNG',
      resetView: 'Reset view', autoRotate: 'Auto-rotate',
      autoOn: '✨ Auto-correct on', autoOff: 'Free drawing: strokes are not corrected',
      empty3d: 'Draw a shape on the board first', hint3d: 'Drag to rotate · click — another solid',
      volume: 'Volume', area: 'Surface area', length: 'Length', height: 'Height', wallArea: 'Area', again: 'Click again — another form',
      n_line: 'Segment', n_polyline: 'Polyline', n_triangle: 'Triangle', n_square: 'Square', n_rect: 'Rectangle', n_quad: 'Quadrilateral',
      n_pentagon: 'Pentagon', n_hexagon: 'Hexagon', n_polygon: 'Polygon', n_circle: 'Circle', n_ellipse: 'Ellipse', n_arc: 'Arc', n_curve: 'Curve', n_dot: 'Point',
      f_sphere: 'Sphere', f_ellipsoid: 'Ellipsoid', f_cylinder: 'Cylinder', f_cone: 'Cone', f_prism: 'Prism', f_pyramid: 'Pyramid', f_tube: 'Rod', f_wall: 'Surface (wall)', f_ball: 'Ball',
      f_cube: 'Cube', f_cuboid: 'Cuboid'
    }
  };
  let lang = 'uz';
  try { lang = localStorage.getItem('chizgi-lang') || 'uz'; } catch (e) {}
  if (!D[lang]) lang = 'uz';
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
