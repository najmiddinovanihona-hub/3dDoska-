# Chizgi — virtual 2D / 3D doska

Matematika, fizika va geometriya darslari uchun brauzerda ishlaydigan interaktiv chizma doskasi. O‘rnatish shart emas — `index.html` ni oching yoki GitHub Pages orqali foydalaning.

**Demo:** https://najmiddinovanihona-hub.github.io/3dDoska-/

## 2D rejim
- Qalam, kesma, vektor, to‘rtburchak, aylana, uchburchak, ko‘pburchak, nuqta, matn, o‘chirg‘ich
- Avtomatik o‘lchamlar: tomon uzunliklari, burchaklar, yuza, perimetr, vektor komponentalari
- Burchak o‘lchagich va chizg‘ich, to‘rga va uchlarga yopishish
- Funksiya grafiklari: `y = sin(x)`, `x^2 - 3`, `1/x` ...
- Fizika: gorizontga burchak ostida otilgan jism — trayektoriya, tezlik vektori, masofa, balandlik, vaqt
- Masshtab (g‘ildirak), surish, bekor qilish/qaytarish, PNG eksport

## 3D rejim
- Jismlar: kub, parallelepiped, shar, silindr, konus, piramida, prizma, tetraedr, tor
- Parametrlarni o‘zgartirish va **hajm / sirt yuzini** avtomatik hisoblash
- 3D vektorlar va ularning yig‘indisi, proyeksiyalari bilan
- Sirt grafiklari: `z = f(x, y)`
- Tekislikda 3D siniq chiziq chizish va uzunligini o‘lchash
- Aylantirish, karkas rejimi, shaffoflik, PNG eksport

Tillar: o‘zbek (asosiy), rus, ingliz.

## Ishga tushirish
```bash
python -m http.server 8790
```
so‘ng http://localhost:8790 ni oching.

Texnologiyalar: vanilla JS, Canvas 2D, Three.js r128.
