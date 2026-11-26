/**
 * Ролик 2 «Қазақстан теңізден төмен»: тайминг, точки, путь камеры и 3D-виды.
 * Без React — этот файл читает и скрипт, который скачивает нужные тайлы.
 */
import data1 from "../data/reel1.json";
import overlays from "../data/overlays.json";
import { CamPath, LngLat, Line, easeInOut, easeInOutSine, lerp, prog, smooth, timings } from "../engine/geo";

/* ───────── Тайминг: длительность каждого кадра сценария (сек) ─────────
 * Подобрано по длине фраз KZ/RU (~5 слогов в секунду). После записи
 * озвучки достаточно поменять эти числа — вся анимация сдвинется сама. */
export const DURS = [4.5, 3.5, 6.3, 5.7, 4.3, 4.9, 6.5, 5.1, 6.1, 4.3, 8.1, 3.1];
export const SHOT = timings(DURS);
export const S = SHOT.map((x) => x.s);
export const DURATION = SHOT[SHOT.length - 1].e + 0.4;

/* ───────── География ───────── */

export const KZ = data1.kz as unknown as Line[];

export const P = {
  karagiye: [51.62, 43.47] as LngLat,
  atyrau: [51.92, 47.11] as LngLat,
  khanTengri: [80.175, 42.211] as LngLat,
  caspian: [50.6, 45.6] as LngLat,
};

/** Самые глубокие впадины суши (м ниже уровня моря). */
export const DEPRESSIONS: { name: string; at: LngLat; depth: number }[] = [
  { name: "Өлі теңіз", at: [35.5, 31.5], depth: -430 },
  { name: "Ассаль", at: [42.42, 11.62], depth: -155 },
  { name: "Тұрпан", at: [89.25, 42.65], depth: -154 },
  { name: "Каттара", at: [27.0, 29.8], depth: -133 },
  { name: "Қарақия", at: P.karagiye, depth: -132 },
];

/** Разрез рельефа от Қарақии до Хан Тәңірі: [км, м]. Края приведены к справочным −132 и 7 010 м. */
const KZP = (overlays as unknown as { kz_profile: { profile: [number, number][]; path: LngLat[] } }).kz_profile;
const RAW = KZP.profile;
/** Линия разреза на карте (ломаная, чтобы идти по территории Казахстана, в обход Иссык-Куля). */
export const TRANSECT = KZP.path;
const RAW_MIN = Math.min(...RAW.map((p) => p[1]));
const RAW_MAX = Math.max(...RAW.map((p) => p[1]));
export const PROFILE: [number, number][] = RAW.map(([km, m]) => [km, m < 0 ? (m / RAW_MIN) * 132 * -1 : (m / RAW_MAX) * 7010]);
export const PROFILE_KM = RAW[RAW.length - 1][0];

/* ───────── Камера ───────── */

export const CAM = {
  space: { lon: 58, lat: 42, zoom: 1.35 },
  kg: { lon: 51.66, lat: 43.52, zoom: 10.0 },
  kz: { lon: 66.4, lat: 46.4, zoom: 4.05 },
  world: { lon: 58, lat: 29, zoom: 3.05 },
  kt: { lon: 80.175, lat: 42.211, zoom: 10.8 },
  caspian: { lon: 50.4, lat: 46.4, zoom: 5.35 },
  atyrau: { lon: 51.905, lat: 47.11, zoom: 11.15 },
  both: { lon: 51.85, lat: 45.3, zoom: 6.9 },
  kgWide: { lon: 51.66, lat: 43.5, zoom: 8.7 },
  end: { lon: 51.6, lat: 43.7, zoom: 8.1 },
};

/* 3D-участки: когда 3D-рельеф виден и как стоит камера */
export const KG3D = { in: S[3] + 2.0, out: S[4] + 0.55 };
export const KT3D = { in: S[5] + 1.9, out: S[6] + 0.45 };

const path = new CamPath(CAM.space)
  // 1. Падение из космоса на Маңғыстау, к Қарақии
  .fly(0, 2.8, CAM.kg, easeInOut)
  .hold(2.8, S[2], 0)
  // 3. Весь Казахстан: три точки
  .fly(S[2], S[2] + 2.0, CAM.kz, easeInOut)
  .hold(S[2] + 2.0, S[3], 0.04)
  // 4. Обратно к впадине — дальше 3D (2D-камера стоит ровно там, где 3D смотрит сверху)
  .fly(S[3], KG3D.in, CAM.kg, easeInOut)
  .hold(KG3D.in, KG3D.out, 0)
  // 5. Весь мир: впадины
  .fly(KG3D.out, S[4] + 2.3, CAM.world, easeInOut, 1.3)
  .hold(S[4] + 2.3, S[5], 0.04)
  // 6. Резко на юго-восток, к Хан Тәңірі — дальше 3D
  .fly(S[5], KT3D.in, CAM.kt, easeInOut, 1.3)
  .hold(KT3D.in, S[6] + 0.25, 0)
  // 7. Разрез через всю страну
  .fly(S[6] + 0.25, S[6] + 1.9, CAM.kz, easeInOut)
  .hold(S[6] + 1.9, S[7], 0.03)
  // 8. Прикаспийская низменность
  .fly(S[7], S[7] + 2.0, CAM.caspian, easeInOut)
  .hold(S[7] + 2.0, S[8], 0.06)
  // 9. Атырау до улиц
  .fly(S[8], S[8] + 2.4, CAM.atyrau, easeInOut)
  .hold(S[8] + 2.4, S[9], 0.06)
  // 10. Отъезд: Атырау и Қарақия вместе
  .fly(S[9], S[9] + 2.0, CAM.both, easeInOut)
  .hold(S[9] + 2.0, S[10], 0.04)
  // 11. ҰБТ — снова Маңғыстау
  .ease(S[10], S[10] + 1.6, CAM.kgWide, easeInOutSine)
  .hold(S[10] + 1.6, S[11], 0.12)
  // 12. CTA — медленный отъезд
  .ease(S[11], DURATION, CAM.end, easeInOutSine);

export const camAt = path.at;

/** 3D-вид Қарақии: наклон сбоку, края поднимаются, дно уходит вниз. */
export const kgView = (t: number) => {
  const up = easeInOut(prog(t, KG3D.in + 0.2, S[4] - 0.25));
  const down = easeInOut(prog(t, S[4] - 0.2, KG3D.out - 0.15));
  const k = up * (1 - down);
  return {
    cam2d: CAM.kg,
    pitch: 60 * k,
    bearing: -28 * k,
    dist: lerp(1, 1.04, k),
    exag: lerp(1, 16, easeInOut(prog(t, KG3D.in + 0.4, S[4] - 0.5))) * (1 - down) + down,
  };
};

/** 3D-вид Хан Тәңірі: гора поднимается, камера облетает её с востока. */
export const ktView = (t: number) => {
  const k = easeInOut(prog(t, KT3D.in + 0.15, S[6] - 0.1));
  return {
    cam2d: CAM.kt,
    pitch: 68 * k,
    bearing: -95 * k - 6 * prog(t, S[6] - 0.1, KT3D.out),
    dist: lerp(1, 0.74, k),
    exag: lerp(1, 2.1, easeInOut(prog(t, KT3D.in + 0.3, S[6] - 0.3))),
    base: 5900,
  };
};

/** Видимость 3D-слоя (перекрёстная смена с 2D-картой). */
export const kgOpacity = (t: number) => smooth(t, KG3D.in, KG3D.in + 0.25) * (1 - smooth(t, KG3D.out - 0.15, KG3D.out));
export const ktOpacity = (t: number) => smooth(t, KT3D.in, KT3D.in + 0.25) * (1 - smooth(t, KT3D.out - 0.45, KT3D.out));
