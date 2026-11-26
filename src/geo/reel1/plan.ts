/**
 * Ролик 1 «Есілдің суы мұхитқа құяды»: тайминг кадров, линии рек и путь камеры.
 * Без React — этот файл читает и скрипт, который скачивает нужные тайлы.
 */
import data from "../data/reel1.json";
import {
  Cam,
  CamPath,
  LngLat,
  Line,
  along,
  easeInOut,
  easeInOutSine,
  easeOut,
  fracNear,
  inRing,
  lerp,
  measure,
  prog,
  slice,
  smoothLine,
  timings,
} from "../engine/geo";

/* ───────── Тайминг: длительность каждого кадра сценария (сек) ─────────
 * Подобрано по длине фраз KZ/RU (~5 слогов в секунду). После записи
 * озвучки достаточно поменять эти числа — вся анимация сдвинется сама. */
export const DURS = [3.9, 4.1, 4.5, 4.3, 4.9, 5.1, 7.3, 5.3, 5.1, 7.7, 8.3, 3.1];
export const SHOT = timings(DURS);
export const S = SHOT.map((x) => x.s);
export const DURATION = SHOT[SHOT.length - 1].e + 0.4;

/* ───────── География ───────── */

const R = data.rivers as unknown as Record<string, Line>;
export const KZ = data.kz as unknown as Line[];
export const BORDER_KZ_RU = data.borderKzRu as unknown as Line[];
export const BORDER_KZ_CN = data.borderKzCn as unknown as Line[];
export const ZAISAN = data.zaisan as unknown as Line[];
export const KARA = data.kara as unknown as Line[];
export const GULF_OB = data.gulfOb as unknown as Line[];

export const esil = measure(R.esil);
export const irtysh = measure(R.irtysh);
export const ob = measure(R.ob);
export const tobol = measure(R.tobol);
export const others = [R.syr, R.ural, R.ile].map(measure);
export const esilCity = measure(data.esilCity as unknown as Line);

export const P = {
  astana: [71.43, 51.16] as LngLat,
  petropavl: [69.16, 54.875] as LngLat,
  pavlodar: [76.95, 52.3] as LngLat,
  semey: [80.25, 50.42] as LngLat,
  oskemen: [82.61, 49.99] as LngLat,
  omsk: [73.37, 54.99] as LngLat,
  khm: [69.02, 61.0] as LngLat,
  ustIshim: R.esil[R.esil.length - 1] as LngLat,
  confIrtOb: R.irtysh[R.irtysh.length - 1] as LngLat,
  source: R.irtysh[0] as LngLat,
  zaisan: [84.0, 48.0] as LngLat,
  kara: [73.9, 73.3] as LngLat,
  baydarata: [68.2, 70.2] as LngLat,
};

/* Доли пути вдоль рек */
export const F = {
  esilAstana: fracNear(esil, P.astana),
  /** последняя точка Есіла внутри Казахстана — здесь он уходит в Россию */
  esilBorder: (() => {
    let last = 0;
    esil.pts.forEach((p, i) => {
      if (KZ.some((ring) => inRing(p, ring))) last = i;
    });
    return esil.cum[Math.min(last + 1, esil.pts.length - 1)] / esil.total;
  })(),
  irtUstIshim: fracNear(irtysh, P.ustIshim),
  irtZaisanOut: fracNear(irtysh, [83.0, 49.75]),
  irtOskemen: fracNear(irtysh, P.oskemen),
  irtSemey: fracNear(irtysh, P.semey),
  irtPavlodar: fracNear(irtysh, P.pavlodar),
  irtOmsk: fracNear(irtysh, P.omsk),
  obKhm: fracNear(ob, P.confIrtOb),
  obGulf: fracNear(ob, [69.0, 66.58]),
};

/** Весь путь капли: Астана → Есіл → Ертіс → Обь → Карское море. */
export const route = measure([
  ...slice(esil, F.esilAstana, 1),
  ...slice(irtysh, F.irtUstIshim, 1),
  ...slice(ob, F.obKhm, 1),
] as Line);

/** Ертіс от истока до Обі и Обь целиком до губы — для сравнения длин. */
export const obRiver = measure(slice(ob, 0, F.obGulf));

/* ───────── Капли ───────── */

/** Капля №1 — из Астаны по Есілю до Ертіса. Доля пути по Есілю. */
export const drop1 = (t: number) => {
  if (t < S[3] + 0.3) return F.esilAstana;
  if (t < S[3] + 3.4) return lerp(F.esilAstana, F.esilBorder, easeInOutSine(prog(t, S[3] + 0.3, S[3] + 3.4)));
  return lerp(F.esilBorder, 1, easeOut(prog(t, S[3] + 3.4, S[4] + 1.6)));
};

/** Капля №2 — от истока в Китае по Ертісу до Обі. Доля пути по Ертісу. */
export const drop2 = (t: number) => {
  if (t < S[5] + 3.0) return 0;
  if (t < S[6]) return lerp(0, F.irtZaisanOut, easeInOutSine(prog(t, S[5] + 3.0, S[6])));
  return lerp(F.irtZaisanOut, 1, easeInOutSine(prog(t, S[6], S[6] + 6.6)));
};

/** Капля №3 — по Оби от Ханты-Мансийска до Карского моря. Доля пути по Оби. */
export const drop3 = (t: number) => lerp(F.obKhm, 1, easeInOutSine(prog(t, S[9] + 0.4, S[9] + 4.2)));

/* ───────── Камера ───────── */

const sm = (m: ReturnType<typeof measure>, k: number) => measure(smoothLine(m.pts, k));
const esilCam = sm(esil, 18);
const irtCam = sm(irtysh, 22);
const obCam = sm(ob, 22);
const follow = (m: ReturnType<typeof measure>, frac: number, zoom: number): Cam => {
  const [lon, lat] = along(m, frac);
  return { lon, lat, zoom };
};

export const CAM = {
  space: { lon: 66, lat: 47, zoom: 1.35 },
  astana: { lon: 71.45, lat: 51.15, zoom: 11.15 },
  wide: { lon: 69.5, lat: 61.6, zoom: 3.68 },
  route: { lon: 71.5, lat: 61.2, zoom: 3.72 },
  confluence: { lon: P.ustIshim[0], lat: P.ustIshim[1] - 0.1, zoom: 6.5 },
  source: { lon: 86.4, lat: 48.7, zoom: 5.45 },
  ob: { lon: 76.2, lat: 57.4, zoom: 4.3 },
  all: { lon: 72.3, lat: 62.3, zoom: 3.55 },
  kz: { lon: 67.6, lat: 50.0, zoom: 4.02 },
  astanaEnd: { lon: 71.45, lat: 51.15, zoom: 10.95 },
};

const path = new CamPath(CAM.space)
  // 1. Падение из космоса на Астану
  .fly(0, 2.75, CAM.astana, easeInOut)
  .hold(2.75, S[1], 0.1)
  // 2. Подъём: весь Казахстан и Северный Ледовитый океан
  .fly(S[1], S[1] + 2.4, CAM.wide, easeInOut)
  .hold(S[1] + 2.4, S[2], 0.04)
  // 3. Маршрут капли
  .ease(S[2], S[3], CAM.route, easeInOutSine)
  // 4. Подлёт к Есілю у Астаны и полёт за каплей
  .fly(S[3], S[3] + 0.9, follow(esilCam, drop1(S[3] + 0.9), 6.0))
  .custom(S[3] + 0.9, S[4] + 1.6, (p) => {
    const t = lerp(S[3] + 0.9, S[4] + 1.6, p);
    return follow(esilCam, drop1(t), lerp(6.0, 6.3, p));
  })
  // 5. Слияние с Ертісом
  .ease(S[4] + 1.6, S[4] + 2.6, CAM.confluence)
  .hold(S[4] + 2.6, S[5], 0.12)
  // 6. Вверх по Ертісу в горы Китая
  .fly(S[5], S[5] + 2.5, CAM.source, easeInOut, 1.2)
  .hold(S[5] + 2.5, S[5] + 3.0, 0.04)
  .custom(S[5] + 3.0, S[6] + 6.6, (p) => {
    const t = lerp(S[5] + 3.0, S[6] + 6.6, p);
    const f = drop2(t);
    // сначала мягко переходим из общего плана к полёту за каплей
    const k = easeInOut(prog(t, S[5] + 3.0, S[6] + 0.6));
    const target = follow(irtCam, Math.min(f + 0.015, 1), lerp(5.35, 5.0, prog(t, S[6], S[6] + 6.6)));
    return {
      lon: lerp(CAM.source.lon, target.lon, k),
      lat: lerp(CAM.source.lat, target.lat, k),
      zoom: lerp(CAM.source.zoom + 0.04, target.zoom, k),
    };
  })
  // 8. Ертіс и Обь целиком
  .ease(S[6] + 6.6, S[7] + 1.0, CAM.ob)
  .hold(S[7] + 1.0, S[9], 0.1)
  // 10. По Оби к Карскому морю, затем отъезд — весь путь одной линией
  .ease(S[9], S[9] + 0.5, follow(obCam, drop3(S[9] + 0.5), 4.7), easeInOutSine)
  .custom(S[9] + 0.5, S[9] + 4.2, (p) => follow(obCam, drop3(lerp(S[9] + 0.5, S[9] + 4.2, p)), lerp(4.7, 5.0, p)))
  .hold(S[9] + 4.2, S[9] + 5.0, 0.1)
  .fly(S[9] + 5.0, S[9] + 7.2, CAM.all, easeInOut)
  .hold(S[9] + 7.2, S[10], 0.03)
  // 11. ҰБТ — весь Казахстан
  .ease(S[10], S[10] + 1.2, CAM.kz)
  .hold(S[10] + 1.2, S[11], 0.12)
  // 12. Обратно в Астану
  .fly(S[11], S[11] + 2.4, CAM.astanaEnd, easeInOut)
  .hold(S[11] + 2.4, DURATION, 0.08);

export const camAt = path.at;
