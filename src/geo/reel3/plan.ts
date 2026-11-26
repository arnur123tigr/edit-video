/**
 * Ролик 3 «Африка екіге бөлініп жатыр»: тайминг, линии и путь камеры.
 * Без React — этот файл читает и скрипт, который скачивает нужные тайлы.
 */
import data from "../data/reel3.json";
import data1 from "../data/reel1.json";
import { CamPath, LngLat, Line, easeInOut, easeInOutSine, measure, relocate, timings } from "../engine/geo";

/* ───────── Тайминг: длительность каждого кадра сценария (сек) ───────── */
export const DURS = [3.5, 6.8, 5.1, 4.3, 6.6, 4.3, 7.4, 7.0, 7.0, 4.5, 7.6, 3.1];
export const SHOT = timings(DURS);
export const S = SHOT.map((x) => x.s);
export const DURATION = SHOT[SHOT.length - 1].e + 0.4;

/* ───────── География ───────── */

export const AFRICA = data.africa as unknown as Line[];
export const RED_SEA = data.redSea as unknown as Line[];
export const ADEN = data.gulfAden as unknown as Line[];
export const PLATES = data.plates as unknown as Line[];
export const ROAD = measure(data.road as unknown as Line);
/** Восточно-Африканский рифт (≈3 500 км по линии). */
export const RIFT = measure(data.rift as unknown as Line);

export { relocate };
export const KZ_HERE = relocate(data1.kz as unknown as Line[], [67.0, 48.0], [64.0, -1.0]);

export const P = {
  maiMahiu: [36.42, -1.03] as LngLat,
  crack2018: [36.4125, -1.0348] as LngLat,
  dabbahu: [40.48, 12.595] as LngLat,
  afarFault: [
    [40.47, 12.585],
    [40.52, 12.47],
    [40.585, 12.36],
    [40.63, 12.25],
    [40.69, 12.14],
    [40.73, 12.075],
  ] as Line,
  redSea: [38.6, 20.0] as LngLat,
};

/** Сомалийский блок: всё восточнее рифта (с запасом в океан). */
export const SOMALI_BLOCK: Line = [...(data.rift as unknown as Line), [37.2, -17.9], [40.0, -50.0], [80.0, -50.0], [80.0, 12.1], [44.0, 12.1]];
/** Нубийская сторона: западнее рифта. */
export const NUBIA_BLOCK: Line = [...(data.rift as unknown as Line), [37.2, -17.9], [40.0, -50.0], [-30.0, -50.0], [-30.0, 40.0], [43.0, 40.0]];

/* ───────── Камера ───────── */

export const CAM = {
  space: { lon: 24, lat: 4, zoom: 1.3 },
  africa: { lon: 20, lat: 5, zoom: 2.55 },
  east: { lon: 37.2, lat: -2.6, zoom: 4.12 },
  compare: { lon: 31, lat: 2, zoom: 2.62 },
  plates: { lon: 37.3, lat: 1.5, zoom: 4.3 },
  section: { lon: 36.4, lat: -0.9, zoom: 6.4 },
  kenya: { lon: 36.415, lat: -1.035, zoom: 12.7 },
  afar: { lon: 40.59, lat: 12.36, zoom: 10.85 },
  slow: { lon: 37.6, lat: 0.5, zoom: 4.05 },
  future: { lon: 41.5, lat: 2.5, zoom: 3.75 },
  redSea: { lon: 38.8, lat: 19.6, zoom: 4.35 },
  world: { lon: 22, lat: 16, zoom: 1.72 },
  end: { lon: 24, lat: 2, zoom: 2.3 },
};

const path = new CamPath(CAM.space)
  // 1. Африка из космоса
  .fly(0, 2.2, CAM.africa, easeInOut)
  .hold(2.2, S[1], 0.04)
  // 2. Ближе к Восточной Африке
  .fly(S[1], S[1] + 1.8, CAM.east, easeInOut)
  .hold(S[1] + 1.8, S[2], 0.05)
  // 3. Африка и Казахстан в одном масштабе
  .ease(S[2], S[2] + 1.5, CAM.compare)
  .hold(S[2] + 1.5, S[3], 0.03)
  // 4. Две плиты
  .ease(S[3], S[3] + 1.4, CAM.plates)
  .hold(S[3] + 1.4, S[4], 0.05)
  // 5. Разрез коры (карта медленно приближается к Кении)
  .ease(S[4], S[5], CAM.section, easeInOutSine)
  // 6. Кения: трещина поперёк дороги
  .fly(S[5], S[5] + 2.0, CAM.kenya, easeInOut)
  .hold(S[5] + 2.0, S[6], 0.08)
  // 7. Афар
  .fly(S[6], S[6] + 2.4, CAM.afar, easeInOut, 1.3)
  .hold(S[6] + 2.4, S[7], 0.08)
  // 8. Плиты ползут медленно
  .fly(S[7], S[7] + 2.0, CAM.slow, easeInOut)
  .hold(S[7] + 2.0, S[8], 0.04)
  // 9. Будущее: новый океан
  .ease(S[8], S[8] + 1.2, CAM.future)
  .hold(S[8] + 1.2, S[9], 0.05)
  // 10. Красное море
  .ease(S[9], S[9] + 1.5, CAM.redSea)
  .hold(S[9] + 1.5, S[10], 0.05)
  // 11. Весь мир с границами плит
  .fly(S[10], S[10] + 2.0, CAM.world, easeInOut)
  .hold(S[10] + 2.0, S[11], 0.04)
  // 12. CTA
  .ease(S[11], DURATION, CAM.end, easeInOutSine);

export const camAt = path.at;
