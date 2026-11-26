/**
 * Ролик 4 «Ең тұзды теңіз — Өлі теңіз емес»: тайминг, водоёмы и путь камеры.
 * Без React — этот файл читает и скрипт, который скачивает нужные тайлы.
 */
import data from "../data/reel4.json";
import { CamPath, LngLat, Line, easeInOut, easeInOutSine, timings } from "../engine/geo";

/* ───────── Тайминг: длительность каждого кадра сценария (сек) ─────────
 * Текст этого ролика длиннее остальных; после записи озвучки поменяйте числа. */
export const DURS = [3.4, 5.4, 6.2, 5.5, 7.0, 6.5, 9.2, 3.6, 7.2, 4.2, 8.0, 3.1];
export const SHOT = timings(DURS);
export const S = SHOT.map((x) => x.s);
export const DURATION = SHOT[SHOT.length - 1].e + 0.4;

/* ───────── География ───────── */

export const DEAD = data.deadSea as unknown as Line[];
export const BALTIC = data.baltic as unknown as Line[];
export const RED_SEA = data.redSea as unknown as Line[];
export const CASPIAN = data.caspian as unknown as Line[];
export const NORTH_ARAL = data.northAral as unknown as Line[];
export const SOUTH_ARAL = data.southAral as unknown as Line[];
export const DESERTS = data.deserts as unknown as Line[];
export const MED = data.med as unknown as Line[];

export const P = {
  dead: [35.5, 31.5] as LngLat,
  baltic: [19.5, 57.6] as LngLat,
  redSea: [38.4, 20.6] as LngLat,
  redNorth: [35.4, 26.6] as LngLat,
  caspian: [50.6, 42.0] as LngLat,
  southAral: [58.75, 45.25] as LngLat,
  northAral: [60.9, 46.45] as LngLat,
  ocean: [-35.0, 24.0] as LngLat,
};

/** Плотина Көкарал: перекрывает пролив Берга на юге Малого Арала. */
export const KOKARAL: Line = [
  [60.72, 46.105],
  [60.885, 46.07],
];

/** Реки, впадающие в Балтику: [точка вглубь суши, устье]. */
export const BALTIC_RIVERS: [LngLat, LngLat][] = [
  [[31.6, 60.0], [30.3, 59.93]], // Нева
  [[19.3, 52.9], [18.95, 54.3]], // Висла
  [[14.6, 52.6], [14.3, 53.8]], // Одра
  [[25.6, 56.4], [24.1, 57.0]], // Даугава
  [[23.0, 54.95], [21.3, 55.3]], // Неман
  [[26.4, 66.6], [24.6, 65.75]], // Кемийоки
  [[23.1, 66.9], [24.1, 65.85]], // Торнио
  [[16.4, 63.6], [17.6, 62.75]], // Ангерманэльвен
];

/** Сухие русла у Красного моря (вади): воды в них нет. */
export const WADIS: [LngLat, LngLat][] = [
  [[32.75, 26.95], [33.95, 26.6]], // Египет, у Сафаги
  [[34.2, 21.5], [36.9, 21.6]], // Судан
  [[37.9, 16.4], [39.4, 15.7]], // Эритрея
  [[44.0, 19.9], [41.15, 19.2]], // Аравия, Эль-Кунфуда
  [[41.4, 24.9], [38.25, 24.05]], // Аравия, Янбу
  [[44.2, 15.6], [42.85, 15.3]], // Йемен
]

/* ───────── Камера ───────── */

export const CAM = {
  space: { lon: 38, lat: 30, zoom: 1.4 },
  dead: { lon: 35.49, lat: 31.43, zoom: 9.55 },
  deadWide: { lon: 35.2, lat: 31.0, zoom: 6.35 },
  three: { lon: 39.5, lat: 40.5, zoom: 2.85 },
  ocean: { lon: -35, lat: 24, zoom: 4.3 },
  baltic: { lon: 20.8, lat: 59.6, zoom: 4.45 },
  redSea: { lon: 38.4, lat: 21.6, zoom: 4.35 },
  redNorth: { lon: 36.8, lat: 23.6, zoom: 4.75 },
  caspian: { lon: 50.6, lat: 42.0, zoom: 4.75 },
  aral: { lon: 59.7, lat: 45.5, zoom: 6.85 },
  northAral: { lon: 60.85, lat: 46.35, zoom: 7.75 },
  world: { lon: 30, lat: 42, zoom: 2.6 },
  end: { lon: 59.8, lat: 45.7, zoom: 6.4 },
};

const path = new CamPath(CAM.space)
  // 1. Полёт к Мёртвому морю
  .fly(0, 2.6, CAM.dead, easeInOut)
  .hold(2.6, S[1], 0.06)
  // 2. Отъезд: вокруг только суша
  .fly(S[1], S[1] + 2.0, CAM.deadWide, easeInOut)
  .hold(S[1] + 2.0, S[2], 0.04)
  // 3. Три моря
  .fly(S[2], S[2] + 1.8, CAM.three, easeInOut)
  .hold(S[2] + 1.8, S[3], 0.03)
  // 4. Открытый океан
  .fly(S[3], S[3] + 2.0, CAM.ocean, easeInOut)
  .hold(S[3] + 2.0, S[4], 0.05)
  // 5. Балтика
  .fly(S[4], S[4] + 2.2, CAM.baltic, easeInOut)
  .hold(S[4] + 2.2, S[5], 0.05)
  // 6. Красное море и пустыни
  .fly(S[5], S[5] + 2.2, CAM.redSea, easeInOut)
  .hold(S[5] + 2.2, S[6], 0.04)
  // 7. Испарение, север моря
  .ease(S[6], S[6] + 1.6, CAM.redNorth, easeInOutSine)
  .hold(S[6] + 1.6, S[7], 0.06)
  // 8. Каспий
  .fly(S[7], S[7] + 1.8, CAM.caspian, easeInOut)
  .hold(S[7] + 1.8, S[8], 0.04)
  // 9. Арал: Большой (южный)
  .fly(S[8], S[8] + 2.0, CAM.aral, easeInOut)
  .hold(S[8] + 2.0, S[9], 0.06)
  // 10. Малый Арал и Көкарал
  .ease(S[9], S[9] + 1.5, CAM.northAral, easeInOutSine)
  .hold(S[9] + 1.5, S[10], 0.06)
  // 11. ҰБТ — мир
  .fly(S[10], S[10] + 2.0, CAM.world, easeInOut)
  .hold(S[10] + 2.0, S[11], 0.03)
  // 12. CTA — обратно к Аралу
  .fly(S[11], DURATION, CAM.end, easeInOut);

export const camAt = path.at;
