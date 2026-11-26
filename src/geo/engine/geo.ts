/**
 * Математика карты без React: проекция Web Mercator, камера, тайлы, линии.
 * Используется и в ролике, и в скрипте, который считает нужные тайлы.
 */

export type LngLat = [number, number];
export type Line = LngLat[];

/** Камера: центр кадра и масштаб (как в MapLibre: мир = 512·2^zoom px). */
export type Cam = { lon: number; lat: number; zoom: number };

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const TILE = 512;
/** Самый подробный уровень тайлов Blue Marble (512-px пирамида). */
export const MAX_TILE_LEVEL = 8;

/* ───────── Проекция ───────── */

export const toWorld = (lon: number, lat: number): [number, number] => {
  const la = Math.max(-85.05, Math.min(85.05, lat));
  return [(lon + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + (la * Math.PI) / 360)) / Math.PI) / 2];
};

export const fromWorld = (x: number, y: number): LngLat => [
  x * 360 - 180,
  ((2 * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - Math.PI / 2) * 180) / Math.PI,
];

export const worldScale = (zoom: number) => TILE * Math.pow(2, zoom);

/** Точка → пиксели кадра. */
export const projector = (cam: Cam) => {
  const [cx, cy] = toWorld(cam.lon, cam.lat);
  const S = worldScale(cam.zoom);
  return (p: LngLat): [number, number] => {
    const [x, y] = toWorld(p[0], p[1]);
    return [(x - cx) * S + W / 2, (y - cy) * S + H / 2];
  };
};

/** Пиксели кадра → долгота/широта. */
export const unprojector = (cam: Cam) => {
  const [cx, cy] = toWorld(cam.lon, cam.lat);
  const S = worldScale(cam.zoom);
  return (sx: number, sy: number): LngLat => fromWorld(cx + (sx - W / 2) / S, cy + (sy - H / 2) / S);
};

/** Метров в одном пикселе кадра на широте камеры. */
export const metersPerPx = (cam: Cam) =>
  (40075016.686 * Math.cos((cam.lat * Math.PI) / 180)) / worldScale(cam.zoom);

/** Пикселей кадра на километр в точке. */
export const pxPerKm = (cam: Cam, lat = cam.lat) =>
  worldScale(cam.zoom) / (40075.016686 * Math.cos((lat * Math.PI) / 180));

/* ───────── Тайлы ───────── */

export type TileId = { l: number; x: number; y: number };
export const tileKey = (t: TileId) => `${t.l}/${t.x}/${t.y}`;

export const tileLevel = (zoom: number) =>
  Math.max(0, Math.min(MAX_TILE_LEVEL, Math.ceil(zoom - 0.25)));

/** Тайлы, которые видны в кадре (с запасом margin пикселей). */
export const visibleTiles = (cam: Cam, margin = 64): TileId[] => {
  const l = tileLevel(cam.zoom);
  const n = Math.pow(2, l);
  const ts = TILE * Math.pow(2, cam.zoom - l);
  const [cx, cy] = toWorld(cam.lon, cam.lat);
  const px = cx * n * ts;
  const py = cy * n * ts;
  const x0 = Math.floor((px - W / 2 - margin) / ts);
  const x1 = Math.floor((px + W / 2 + margin) / ts);
  const y0 = Math.max(0, Math.floor((py - H / 2 - margin) / ts));
  const y1 = Math.min(n - 1, Math.floor((py + H / 2 + margin) / ts));
  const out: TileId[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      out.push({ l, x: ((x % n) + n) % n, y });
    }
  }
  return out;
};

/* ───────── Плавность ───────── */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeIn = (p: number) => p * p * p;
export const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
/** Плавное 0→1 между a и b (сек) с S-кривой. */
export const smooth = (t: number, a: number, b: number) => easeInOut(prog(t, a, b));

/* ───────── Камера ───────── */

/** Простая плавная интерполяция двух камер (для коротких сдвигов). */
export const easeCam = (a: Cam, b: Cam, p: number): Cam => {
  const [ax, ay] = toWorld(a.lon, a.lat);
  const [bx, by] = toWorld(b.lon, b.lat);
  const [lon, lat] = fromWorld(lerp(ax, bx, p), lerp(ay, by, p));
  return { lon, lat, zoom: lerp(a.zoom, b.zoom, p) };
};

/**
 * «Полёт» как в Google Earth (алгоритм van Wijk & Nuij, тот же, что flyTo в MapLibre):
 * при больших расстояниях камера сначала поднимается, потом снижается.
 */
export const flyCam = (a: Cam, b: Cam, p: number, rho = 1.42): Cam => {
  const [ax, ay] = toWorld(a.lon, a.lat);
  const [bx, by] = toWorld(b.lon, b.lat);
  const S0 = worldScale(a.zoom);
  const dx = (bx - ax) * S0;
  const dy = (by - ay) * S0;
  const u1 = Math.hypot(dx, dy);
  const w0 = Math.max(W, H);
  const w1 = w0 / Math.pow(2, b.zoom - a.zoom);
  const rho2 = rho * rho;
  const r = (i: 0 | 1) => {
    const bb = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
    return Math.log(Math.sqrt(bb * bb + 1) - bb);
  };
  let wf: (s: number) => number;
  let uf: (s: number) => number;
  let S: number;
  if (u1 < 1e-6) {
    if (Math.abs(w0 - w1) < 1e-6) return easeCam(a, b, p);
    const k = w1 < w0 ? -1 : 1;
    S = Math.abs(Math.log(w1 / w0)) / rho;
    uf = () => 0;
    wf = (s) => Math.exp(k * rho * s);
  } else {
    const r0 = r(0);
    S = (r(1) - r0) / rho;
    wf = (s) => Math.cosh(r0) / Math.cosh(r0 + rho * s);
    uf = (s) => (w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2)) / u1;
  }
  const s = p * S;
  const scale = 1 / wf(s);
  const u = p >= 1 ? 1 : uf(s);
  const [lon, lat] = fromWorld(lerp(ax, bx, u), lerp(ay, by, u));
  return { lon, lat, zoom: p >= 1 ? b.zoom : a.zoom + Math.log2(scale) };
};

/** Отрезок движения камеры: с момента t0 до t1 функция f(p) даёт камеру. */
export type CamSeg = { t0: number; t1: number; at: (p: number) => Cam };

/** Камера во времени по списку отрезков; между отрезками — стоп на последнем кадре. */
export const camTimeline = (segs: CamSeg[]) => (t: number): Cam => {
  let cur = segs[0].at(0);
  for (const s of segs) {
    if (t < s.t0) break;
    cur = s.at(clamp01((t - s.t0) / (s.t1 - s.t0)));
  }
  return cur;
};

/** Добавить лёгкий «дрейф» — камера никогда не стоит совсем на месте. */
export const drift = (c: Cam, t: number, amt = 0.012): Cam => ({ ...c, zoom: c.zoom + amt * t });

/* ───────── Линии ───────── */

const R_KM = 6371.0088;
export const distKm = (a: LngLat, b: LngLat) => {
  const toR = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toR;
  const dLon = (b[0] - a[0]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
};

export type Measured = { pts: Line; cum: number[]; total: number };

export const measure = (pts: Line): Measured => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distKm(pts[i - 1], pts[i]));
  return { pts, cum, total: cum[cum.length - 1] };
};

/** Точка на линии на доле пути p (0..1). */
export const along = (m: Measured, p: number): LngLat => {
  const d = clamp01(p) * m.total;
  let lo = 0;
  let hi = m.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (m.cum[mid] < d) lo = mid;
    else hi = mid;
  }
  const seg = m.cum[hi] - m.cum[lo] || 1;
  const k = (d - m.cum[lo]) / seg;
  return [lerp(m.pts[lo][0], m.pts[hi][0], k), lerp(m.pts[lo][1], m.pts[hi][1], k)];
};

/** Часть линии между долями a и b. */
export const slice = (m: Measured, a: number, b: number): Line => {
  const da = clamp01(a) * m.total;
  const db = clamp01(b) * m.total;
  if (db <= da) return [];
  const out: Line = [along(m, a)];
  for (let i = 0; i < m.pts.length; i++) {
    if (m.cum[i] > da && m.cum[i] < db) out.push(m.pts[i]);
  }
  out.push(along(m, b));
  return out;
};

/** Доля пути ближайшей к точке вершины линии. */
export const fracNear = (m: Measured, p: LngLat) => {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < m.pts.length; i++) {
    const d = (m.pts[i][0] - p[0]) ** 2 + (m.pts[i][1] - p[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return m.cum[best] / m.total;
};

/** Сгладить линию скользящим средним (для пути камеры). */
export const smoothLine = (pts: Line, k = 6): Line =>
  pts.map((_, i) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(pts.length - 1, i + k); j++) {
      sx += pts[j][0];
      sy += pts[j][1];
      n++;
    }
    return [sx / n, sy / n] as LngLat;
  });

/* ───────── Тайминг кадров сценария ───────── */

export type ShotTiming = { s: number; e: number };
/** Из длительностей кадров — моменты начала/конца. */
export const timings = (durs: number[]): ShotTiming[] => {
  let t = 0;
  return durs.map((d) => {
    const r = { s: t, e: t + d };
    t += d;
    return r;
  });
};

/* ───────── Построитель пути камеры ───────── */

/**
 * Последовательность движений камеры. Каждое движение начинается там,
 * где закончилось предыдущее, поэтому склеек и рывков нет.
 */
export class CamPath {
  segs: CamSeg[] = [];
  last: Cam;
  constructor(start: Cam) {
    this.last = start;
  }
  private push(t0: number, t1: number, at: (p: number) => Cam) {
    this.segs.push({ t0, t1, at });
    this.last = at(1);
    return this;
  }
  /** Полёт с подъёмом (для дальних перелётов). */
  fly(t0: number, t1: number, to: Cam, ease: (p: number) => number = easeInOut, rho = 1.42) {
    const from = this.last;
    return this.push(t0, t1, (p) => flyCam(from, to, ease(p), rho));
  }
  /** Плавный сдвиг без подъёма. */
  ease(t0: number, t1: number, to: Cam, ease: (p: number) => number = easeInOut) {
    const from = this.last;
    return this.push(t0, t1, (p) => easeCam(from, to, ease(p)));
  }
  /** Почти стоим: лёгкий наезд, чтобы кадр жил. */
  hold(t0: number, t1: number, dz = 0.08) {
    const from = this.last;
    return this.push(t0, t1, (p) => ({ ...from, zoom: from.zoom + dz * p }));
  }
  /** Своя функция (например, камера едет за каплей). */
  custom(t0: number, t1: number, f: (p: number) => Cam) {
    return this.push(t0, t1, f);
  }
  /** Камера в момент t. */
  at = (t: number): Cam => camTimeline(this.segs)(t);
}

/** Точка внутри многоугольника (по кольцу координат). */
export const inRing = (p: LngLat, ring: Line) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** Склеить несколько кусков линий в одну. */
export const joinLines = (...parts: Line[]): Line => parts.flat();

/**
 * Перенос контура в другое место без искажения масштаба:
 * километры от центра остаются километрами (на Меркаторе север растягивается, поэтому так честнее).
 */
export const relocate = (rings: Line[], from: LngLat, to: LngLat): Line[] =>
  rings.map((ring) =>
    ring.map(([lon, lat]) => {
      const dx = (lon - from[0]) * 111.32 * Math.cos((lat * Math.PI) / 180);
      const dy = (lat - from[1]) * 110.57;
      const nlat = to[1] + dy / 110.57;
      return [to[0] + dx / (111.32 * Math.cos((nlat * Math.PI) / 180)), nlat] as LngLat;
    }),
  );
