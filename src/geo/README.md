# Гео-карты (ролики-карты 9:16, всё на коде)

Один полёт камеры над тёмной спутниковой картой. Подложка — NASA Blue Marble,
крупные планы — снимки Sentinel-2 (10 м), реки и границы — Natural Earth,
рельеф — Copernicus DEM. Всё открытое и лежит в проекте, интернет при рендере не нужен.

## Рендер

```bash
npm i
npx remotion studio src/geo/index.ts            # посмотреть и покрутить
npx remotion render src/geo/index.ts Geo1-Esil out/geo1-esil.mp4
```

Ролики: `Geo1-Esil` (Есілдің суы мұхитқа құяды).

## Как подогнать под озвучку

В `src/geo/reelN/plan.ts` массив `DURS` — длительность каждого кадра сценария (сек).
Поменяйте числа под реальную озвучку — камера, капли и подписи сдвинутся сами.

Цвета и логотип JAS сюда не входят — их добавляют аниматоры.
Подписи — шрифт Oswald, белые, с тёмной тенью, без плашек.

## Данные

- `scripts/geo/fetch_tiles.py` + `scripts/geo/needed-tiles.ts` — тайлы Blue Marble ровно под путь камеры.
- `scripts/geo/s2_patch.py` — фрагмент Sentinel-2 (сам выбирает безоблачную дату).
- `scripts/geo/vectors.py` — реки, границы, озёра из Natural Earth 10m.
- `scripts/geo/dem.py` — впадины, зоны ниже уровня моря, разрезы рельефа.
- Русло Есіла в Астане (`esilCity` в `reel1.json`) обведено вручную по снимку Sentinel-2 от 28.06.2022.
