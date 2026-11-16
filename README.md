# Chizgi — aqlli doska

Matematika, fizika va geometriya uchun bo‘sh virtual doska. Qo‘lda chizgan chizig‘ingiz qo‘lni qo‘yib yuborishingiz bilan **toza shaklga aylanadi**, bitta tugma bilan esa butun chizma **3D ga o‘tadi**.

**Demo:** https://najmiddinovanihona-hub.github.io/3dDoska-/

## Avto to‘g‘rilash
Qo‘lda chizilgan chiziq quyidagilardan biriga aylanadi:
kesma · siniq chiziq · yoy · aylana · ellips · uchburchak · kvadrat · to‘g‘ri to‘rtburchak · muntazam ko‘pburchak · silliq egri chiziq · nuqta.
Deyarli gorizontal/vertikal chiziqlar tekislanadi, uchlar mavjud nuqtalarga yopishadi. ✨ tugmasi bilan erkin chizishga o‘tish mumkin.

## 3D — doskaning o‘zida
O‘ng yuqoridagi **3D** tugmasi yoqilsa, yopiq shakllar alohida oynada emas, **chizilgan joyining o‘zida** 3D jismga aylanadi (yangi chizilganlari ham). Jismlar darslikdagidek chiziladi: ko‘rinadigan qirralar uzluksiz, orqadagilari punktir.
Jismni tortib aylantirasiz, bosganda shakli almashadi:

| 2D shakl | 3D jism |
|---|---|
| Aylana | shar → silindr → konus |
| Ellips | ellipsoid → silindr → konus |
| Kvadrat / to‘rtburchak | kub / parallelepiped → piramida |
| Uchburchak, ko‘pburchak | prizma → piramida |

Har bir jism uchun hajm, sirt yuzi va balandlik ko‘rsatiladi.

Qo‘shimcha: o‘chirg‘ich, surish va masshtab, bekor qilish/qaytarish, koordinata to‘ri, o‘lchamlar (uzunlik, burchak, yuza), PNG saqlash. Tillar: o‘zbek, rus, ingliz.

## Ishga tushirish
```bash
python -m http.server 8790
```
Texnologiyalar: vanilla JS, Canvas 2D, Three.js r128.
