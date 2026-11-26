/**
 * Ролик 5 «Он төрт жыл жаңбырсыз» (Атакама): тайминг, точки, путь камеры и 3D-вид Анд.
 * Без React — этот файл читает и скрипт, который скачивает нужные тайлы.
 */
import data from "../data/reel5.json";
import { CamPath, LngLat, Line, easeInOut, easeInOutSine, lerp, prog, relocate, smooth, timings } from "../engine/geo";

/* ───────── Тайминг: длительность каждого кадра сценария (сек) ─────────
 * После записи озвучки достаточно поменять эти числа. */
export const DURS = [4.0, 4.3, 5.4, 7.6, 7.3, 6.9, 5.3, 3.8, 7.0, 4.0, 8.4, 3.1];
export const SHOT = timings(DURS);
export const S = SHOT.map((x) => x.s);
export const DURATION = SHOT[SHOT.length - 1].e + 0.4;

/* ───────── География ───────── */

export const ATACAMA = data.atacama as unknown as Line[];
export const OCEAN_ARICA = data.oceanArica as unknown as Line[];
const PAV_C = data.pavlodarCenter as unknown as LngLat;
/** Павлодарская область рядом с Атакамой, в том же масштабе (км остаются км). */
export const PAV_TO: LngLat = [-63.6, -23.4];
export const PAVLODAR = relocate(data.pavlodar as unknown as Line[], PAV_C, PAV_TO);

export const P = {
  arica: [-70.3, -18.478] as LngLat,
  ocean: [-70.85, -18.64] as LngLat,
  atacama: [-69.9, -23.0] as LngLat,
  copiapo: [-70.33, -27.37] as LngLat,
};

/** Холодные течения у западных берегов (с полюса к экватору). */
export const CURRENTS: Record<string, Line> = {
  peru: [
    [-76.5, -42],
    [-75.2, -33],
    [-72.4, -24],
    [-72.0, -19.5],
    [-75.0, -15.5],
    [-78.6, -10],
    [-82.2, -5],
    [-86, -1.5],
  ],
  california: [
    [-128, 46],
    [-126.2, 40],
    [-122.5, 33],
    [-117.5, 26],
    [-113, 20],
  ],
  canary: [
    [-12.5, 42],
    [-14, 34],
    [-17.2, 27],
    [-19.2, 20],
    [-20, 14],
  ],
  benguela: [
    [17, -35],
    [13.6, -28],
    [11, -20],
    [9.6, -13],
  ],
};

/** Облака с Амазонии: [откуда, где упираются в Анды]. */
export const CLOUDS: [LngLat, LngLat][] = [
  [[-60.6, -17.2], [-65.6, -17.2]],
  [[-60.2, -19.4], [-64.9, -19.4]],
  [[-60.4, -21.6], [-64.4, -21.6]],
  [[-60.8, -23.8], [-65.0, -23.8]],
];

/** Путь ровера по пустыне. */
export const ROVER: Line = [
  [-69.9, -22.3],
  [-70.05, -22.9],
  [-69.85, -23.5],
  [-70.05, -24.1],
  [-69.95, -24.7],
];

/* ───────── Камера ───────── */

export const CAM = {
  space: { lon: -62, lat: -22, zoom: 1.3 },
  arica: { lon: -70.29, lat: -18.48, zoom: 11.2 },
  aricaOcean: { lon: -70.52, lat: -18.5, zoom: 9.4 },
  sa: { lon: -63, lat: -24, zoom: 3.55 },
  current: { lon: -74.0, lat: -21, zoom: 4.4 },
  andes: { lon: -66.8, lat: -20.5, zoom: 6.05 },
  desert: { lon: -69.6, lat: -23.2, zoom: 5.7 },
  mars: { lon: -69.6, lat: -23.5, zoom: 6.4 },
  compare: { lon: -66.2, lat: -23.6, zoom: 4.75 },
  flowers: { lon: -70.4, lat: -26.6, zoom: 7.2 },
  aricaBack: { lon: -70.32, lat: -18.5, zoom: 9.6 },
  world: { lon: -56, lat: 6, zoom: 2.25 },
  end: { lon: -70.3, lat: -18.6, zoom: 8.4 },
};

/* 3D-участок с Андами */
export const A3D = { in: S[4] + 1.6, out: S[5] + 0.45 };

const path = new CamPath(CAM.space)
  // 1. Падение на Арику
  .fly(0, 3.0, CAM.arica, easeInOut)
  .hold(3.0, S[1], 0.05)
  // 2. Немного назад: город у самого океана
  .ease(S[1], S[1] + 1.5, CAM.aricaOcean, easeInOutSine)
  .hold(S[1] + 1.5, S[2], 0.04)
  // 3. Вся Южная Америка
  .fly(S[2], S[2] + 2.0, CAM.sa, easeInOut)
  .hold(S[2] + 2.0, S[3], 0.03)
  // 4. Холодное течение вдоль берега
  .ease(S[3], S[3] + 1.5, CAM.current, easeInOutSine)
  .hold(S[3] + 1.5, S[4], 0.04)
  // 5. Анды — дальше 3D
  .fly(S[4], A3D.in, CAM.andes, easeInOut)
  .hold(A3D.in, A3D.out, 0)
  // 6. Антициклон над пустыней
  .fly(A3D.out, S[5] + 2.2, CAM.desert, easeInOut)
  .hold(S[5] + 2.2, S[6], 0.04)
  // 7. Марс
  .ease(S[6], S[6] + 1.3, CAM.mars, easeInOutSine)
  .hold(S[6] + 1.3, S[7], 0.05)
  // 8. Атакама и Павлодарская область
  .fly(S[7], S[7] + 1.6, CAM.compare, easeInOut)
  .hold(S[7] + 1.6, S[8], 0.03)
  // 9. Цветущая пустыня
  .fly(S[8], S[8] + 1.8, CAM.flowers, easeInOut)
  .hold(S[8] + 1.8, S[9], 0.06)
  // 10. Обратно к Арике
  .fly(S[9], S[9] + 2.0, CAM.aricaBack, easeInOut)
  .hold(S[9] + 2.0, S[10], 0.05)
  // 11. ҰБТ — мир, холодные течения
  .fly(S[10], S[10] + 2.0, CAM.world, easeInOut)
  .hold(S[10] + 2.0, S[11], 0.03)
  // 12. CTA — снова Арика
  .fly(S[11], DURATION, CAM.end, easeInOut);

export const camAt = path.at;

/** 3D-вид Анд: смотрим с юга, океан слева, Амазония справа. */
export const andesView = (t: number) => {
  const up = easeInOut(prog(t, A3D.in + 0.1, A3D.in + 1.5));
  const down = easeInOut(prog(t, S[5] - 0.9, A3D.out - 0.1));
  const k = up * (1 - down);
  return {
    cam2d: CAM.andes,
    pitch: 60 * k,
    bearing: -8 * k,
    dist: lerp(1, 0.9, k),
    exag: lerp(1, 30, easeInOut(prog(t, A3D.in + 0.3, A3D.in + 1.7))) * (1 - down) + down,
    base: 1200,
  };
};

export const andesOpacity = (t: number) => smooth(t, A3D.in, A3D.in + 0.25) * (1 - smooth(t, A3D.out - 0.3, A3D.out));
