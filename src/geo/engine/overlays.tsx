import React from "react";
import { AbsoluteFill, spring } from "remotion";
import { useMap, useMapOpt } from "./MapView";
import { FPS, H, LngLat, Line, Measured, W, clamp01, easeOut, lerp, measure, prog, slice } from "./geo";

/* Шрифт подписей — тот же жирный узкий, что в подкаст-титрах (есть казахские буквы). */
import { FONT } from "./font";
export { FONT };

/** Цвета карты. Бренд-цвета JAS аниматоры ставят сами — здесь только нейтральные. */
export const COL = {
  water: "#38b6ff",
  waterLight: "#9fdcff",
  waterDim: "rgba(120,200,255,0.55)",
  ink: "#ffffff",
  grey: "rgba(200,205,215,0.55)",
  sand: "#e3b26b",
  hot: "#ff5a2a",
  ice: "#eaf6ff",
};

/** Тень под текстом: тёмная, без белого свечения. */
export const TEXT_SHADOW = "0 4px 18px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)";

/** Пружина появления 0→1 (с лёгким перелётом). */
export const popIn = (t: number, t0: number, stiffness = 170, damping = 14) =>
  t < t0 ? 0 : spring({ frame: (t - t0) * FPS, fps: FPS, config: { stiffness, damping, mass: 0.8 } });

/** Видимость элемента: появляется в t0, исчезает к t1 (плавно). */
export const life = (t: number, t0: number, t1 = 1e9, fadeIn = 0.25, fadeOut = 0.3) =>
  Math.min(clamp01((t - t0) / fadeIn), 1 - clamp01((t - (t1 - fadeOut)) / fadeOut));

/* ───────── Линии и области на карте ───────── */

const toPath = (pts: [number, number][]) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  let [lx, ly] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i < pts.length - 1 && Math.abs(x - lx) + Math.abs(y - ly) < 0.8) continue;
    d += `L${x.toFixed(1)},${y.toFixed(1)}`;
    lx = x;
    ly = y;
  }
  return d;
};

let glowId = 0;

/** Линия по координатам; from/to — доли длины (для «прорисовки»). */
export const GeoPath: React.FC<{
  line: Line | Measured;
  from?: number;
  to?: number;
  color?: string;
  width?: number;
  opacity?: number;
  glow?: number;
  dash?: [number, number];
  dashOffset?: number;
}> = ({ line, from = 0, to = 1, color = COL.water, width = 6, opacity = 1, glow = 0, dash, dashOffset = 0 }) => {
  const { project } = useMap();
  if (opacity <= 0 || to <= from) return null;
  const m = "pts" in line ? line : measure(line);
  const pts = from <= 0 && to >= 1 ? m.pts : slice(m, from, to);
  const d = toPath(pts.map(project));
  if (!d) return null;
  const id = `g${glowId++}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      {glow > 0 ? (
        <>
          <defs>
            <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={glow} />
            </filter>
          </defs>
          <path d={d} fill="none" stroke={color} strokeWidth={width * 2.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} filter={`url(#${id})`} />
        </>
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash ? dash.join(" ") : undefined}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};

/** Заливка области (страна, море, озеро). */
export const GeoArea: React.FC<{
  rings: Line[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  glow?: number;
  dash?: [number, number];
  /** мягкое пятно: видна только часть области вокруг точки (радиус в px) */
  spot?: { at: LngLat; r: number };
}> = ({ rings, fill = "none", stroke, strokeWidth = 3, opacity = 1, glow = 0, dash, spot }) => {
  const { project } = useMap();
  if (opacity <= 0) return null;
  const d = rings.map((r) => toPath(r.map(project)) + "Z").join(" ");
  const id = `a${glowId++}`;
  let mask: React.CSSProperties = {};
  if (spot) {
    const [sx, sy] = project(spot.at);
    const g = `radial-gradient(circle ${spot.r}px at ${sx.toFixed(0)}px ${sy.toFixed(0)}px, black 0%, rgba(0,0,0,0.6) 45%, transparent 100%)`;
    mask = { maskImage: g, WebkitMaskImage: g };
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible", ...mask }}>
      {glow > 0 ? (
        <defs>
          <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={glow} />
          </filter>
        </defs>
      ) : null}
      {glow > 0 && stroke ? (
        <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth * 3} opacity={0.7} filter={`url(#${id})`} />
      ) : null}
      <path
        d={d}
        fill={fill}
        fillRule="evenodd"
        stroke={stroke ?? "none"}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeDasharray={dash ? dash.join(" ") : undefined}
      />
    </svg>
  );
};

/* ───────── Значки ───────── */

/** Капля воды (иконка). */
export const Drop: React.FC<{ at: LngLat; t: number; t0: number; size?: number; opacity?: number }> = ({
  at,
  t,
  t0,
  size = 1,
  opacity = 1,
}) => {
  const { project } = useMap();
  const s = popIn(t, t0, 200, 12) * size;
  if (s <= 0.01 || opacity <= 0) return null;
  const [x, y] = project(at);
  const bob = Math.sin((t - t0) * 9) * 2;
  return (
    <svg
      width={120}
      height={140}
      viewBox="-60 -80 120 140"
      style={{
        position: "absolute",
        left: x - 60,
        top: y - 80 + bob - 22 * s,
        transform: `scale(${s})`,
        transformOrigin: "60px 108px",
        opacity,
        overflow: "visible",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))",
      }}
    >
      <defs>
        <linearGradient id="dropG" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset="0.55" stopColor="#38b6ff" />
          <stop offset="1" stopColor="#0a6fd6" />
        </linearGradient>
      </defs>
      <path d="M0,-46 C12,-26 26,-10 26,8 A26,26 0 1 1 -26,8 C-26,-10 -12,-26 0,-46 Z" fill="url(#dropG)" stroke="#e8f7ff" strokeWidth={3} />
      <ellipse cx={-9} cy={4} rx={5} ry={10} fill="rgba(255,255,255,0.75)" transform="rotate(20 -9 4)" />
    </svg>
  );
};

/** Пульсирующая точка (исток, город, событие). */
export const Pulse: React.FC<{ at: LngLat; t: number; t0: number; color?: string; r?: number; t1?: number }> = ({
  at,
  t,
  t0,
  color = COL.waterLight,
  r = 14,
  t1 = 1e9,
}) => {
  const { project } = useMap();
  const vis = life(t, t0, t1, 0.15, 0.3);
  if (vis <= 0) return null;
  const [x, y] = project(at);
  const k = popIn(t, t0, 220, 12);
  const waves = [0, 0.6, 1.2].map((o) => ((t - t0 + o) % 1.8) / 1.8);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: vis, overflow: "visible" }}>
      {waves.map((w, i) => (
        <circle key={i} cx={x} cy={y} r={r + w * r * 4} fill="none" stroke={color} strokeWidth={4 * (1 - w)} opacity={(1 - w) * 0.9} />
      ))}
      <circle cx={x} cy={y} r={r * k} fill={color} stroke="#fff" strokeWidth={3} />
    </svg>
  );
};

/** Круг, который «обводит» место (рисуется по кругу). */
export const Circle: React.FC<{
  at: LngLat | [number, number];
  screen?: boolean;
  t: number;
  t0: number;
  t1?: number;
  r: number;
  /** вытянуть по горизонтали (эллипс) */
  rx?: number;
  color?: string;
  width?: number;
  dur?: number;
  /** поворот эллипса, градусы */
  rot?: number;
}> = ({ at, screen, t, t0, t1 = 1e9, r, rx, color = COL.ink, width = 6, dur = 0.6, rot = 0 }) => {
  const map = useMapOpt();
  const vis = life(t, t0, t1, 0.05, 0.3);
  if (vis <= 0) return null;
  const [x, y] = screen || !map ? (at as [number, number]) : map.project(at as LngLat);
  const p = easeOut(prog(t, t0, t0 + dur));
  const a = rx ?? r;
  const c = Math.PI * (3 * (a + r) - Math.sqrt((3 * a + r) * (a + 3 * r)));
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: vis, overflow: "visible" }}>
      <path
        d={(() => {
          // эллипс как путь: обводка начинается слева сверху, форма не поворачивается вместе со стартом
          const a0 = (-110 * Math.PI) / 180;
          const sx = x + a * Math.cos(a0);
          const sy = y + r * Math.sin(a0);
          const ox = x - a * Math.cos(a0);
          const oy = y - r * Math.sin(a0);
          return `M${sx},${sy} A${a},${r} 0 1 1 ${ox},${oy} A${a},${r} 0 1 1 ${sx},${sy}`;
        })()}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}
      />
    </svg>
  );
};

/* ───────── Текст на карте ───────── */

/** Подпись, привязанная к точке карты (или к точке экрана при screen). */
export const Label: React.FC<{
  at: LngLat | [number, number];
  screen?: boolean;
  text: string;
  t: number;
  t0: number;
  t1?: number;
  size?: number;
  dx?: number;
  dy?: number;
  align?: "center" | "left" | "right";
  weight?: 500 | 700;
  color?: string;
  upper?: boolean;
}> = ({ at, screen, text, t, t0, t1 = 1e9, size = 56, dx = 0, dy = 0, align = "center", weight = 700, color = COL.ink, upper = true }) => {
  const map = useMapOpt();
  const vis = life(t, t0, t1, 0.18, 0.3);
  if (vis <= 0) return null;
  const k = popIn(t, t0, 190, 15);
  const [x, y] = screen || !map ? (at as [number, number]) : map.project(at as LngLat);
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0%";
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        transform: `translate(${tx}, -50%) translateY(${(1 - k) * 18}px) scale(${0.9 + 0.1 * k})`,
        opacity: vis * clamp01(k * 1.4),
        fontFamily: FONT,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "0.01em",
        textTransform: upper ? "uppercase" : "none",
        color,
        whiteSpace: "nowrap",
        textShadow: TEXT_SHADOW,
      }}
    >
      {withArrows(text, size)}
    </div>
  );
};

/** «→», «≈» и «⟷» рисуем сами: в шрифте Oswald этих знаков нет. */
const SYMBOLS: Record<string, { w: number; d: string }> = {
  "→": { w: 62, d: "M2 25 H54 M36 7 L56 25 L36 43" },
  "⟷": { w: 96, d: "M8 25 H88 M26 7 L6 25 L26 43 M70 7 L90 25 L70 43" },
  "≈": { w: 54, d: "M4 18 C14 8 22 8 27 14 C32 20 40 20 50 10 M4 38 C14 28 22 28 27 34 C32 40 40 40 50 30" },
};
const withArrows = (text: string, size: number) => {
  const parts = text.split(/([→⟷≈])/);
  if (parts.length === 1) return text;
  return parts.map((p, i) => {
    const sym = SYMBOLS[p];
    if (!sym) return p.trim() ? <span key={i}>{p.trim()}</span> : null;
    return (
      <svg
        key={i}
        width={(size * sym.w) / 100}
        height={size * 0.5}
        viewBox={`0 0 ${sym.w} 50`}
        style={{ margin: `0 ${size * 0.14}px`, verticalAlign: "middle", overflow: "visible", position: "relative", top: -size * 0.04 }}
      >
        <path d={sym.d} fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  });
};

/** Точка города + название. */
export const City: React.FC<{ at: LngLat; name: string; t: number; t0: number; t1?: number; side?: "l" | "r"; size?: number }> = ({
  at,
  name,
  t,
  t0,
  t1,
  side = "r",
  size = 40,
}) => {
  const { project } = useMap();
  const vis = life(t, t0, t1, 0.18, 0.3);
  if (vis <= 0) return null;
  const [x, y] = project(at);
  const k = popIn(t, t0, 220, 14);
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: vis, overflow: "visible" }}>
        <circle cx={x} cy={y} r={9 * k} fill="#fff" stroke="rgba(0,0,0,0.6)" strokeWidth={3} />
      </svg>
      <Label at={at} text={name} t={t} t0={t0 + 0.05} t1={t1} size={size} dx={side === "r" ? 22 : -22} align={side === "r" ? "left" : "right"} weight={500} />
    </>
  );
};

/* ───────── Экранные элементы (поверх карты) ───────── */

/** Счётчик пунктов «1 / 3». */
export const Counter: React.FC<{ t: number; steps: number[]; total?: number; t0: number; t1?: number; y?: number }> = ({
  t,
  steps,
  total = 3,
  t0,
  t1 = 1e9,
  y = 300,
}) => {
  const vis = life(t, t0, t1, 0.2, 0.3);
  if (vis <= 0) return null;
  // steps[i] — момент, когда счётчик становится i+1
  let n = 0;
  let last = t0;
  steps.forEach((s, i) => {
    if (t >= s) {
      n = i + 1;
      last = s;
    }
  });
  const bump = n > 0 ? popIn(t, last, 260, 11) : popIn(t, t0, 200, 14);
  const scale = n > 0 ? 1 + 0.25 * Math.sin(Math.min(1, bump) * Math.PI) * (1 - clamp01((t - last) / 0.5)) : 0.85 + 0.15 * bump;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        textAlign: "center",
        opacity: vis,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 96,
        lineHeight: 1,
        color: COL.ink,
        textShadow: TEXT_SHADOW,
        transform: `scale(${scale})`,
      }}
    >
      {n}
      <span style={{ fontWeight: 500, opacity: 0.6, fontSize: 70 }}> / {total}</span>
    </div>
  );
};

/** Крупная цифра (с отсчётом от 0 при count). */
export const BigNumber: React.FC<{
  t: number;
  t0: number;
  t1?: number;
  value: number;
  unit?: string;
  prefix?: string;
  count?: number;
  x?: number;
  y?: number;
  size?: number;
}> = ({ t, t0, t1 = 1e9, value, unit = "", prefix = "", count = 0, x = W / 2, y = 470, size = 150 }) => {
  const vis = life(t, t0, t1, 0.2, 0.3);
  if (vis <= 0) return null;
  const k = popIn(t, t0, 180, 13);
  const v = count > 0 ? Math.round(value * easeOut(prog(t, t0, t0 + count))) : value;
  const txt = v.toLocaleString("ru-RU").replace(/ /g, " ");
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * k})`,
        opacity: vis,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color: COL.ink,
        whiteSpace: "nowrap",
        textShadow: TEXT_SHADOW,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}
      {txt}
      {unit ? <span style={{ fontSize: size * 0.55, fontWeight: 500 }}> {unit}</span> : null}
    </div>
  );
};

/** Затемнение карты (для сравнений и вставок). */
export const Dim: React.FC<{ v: number }> = ({ v }) =>
  v > 0 ? <AbsoluteFill style={{ background: `rgba(2,4,9,${v})` }} /> : null;

/** Флаг в кружке. kind: "cn" — Китай. */
export const FlagBadge: React.FC<{ at: LngLat; t: number; t0: number; t1?: number; kind: "cn"; dx?: number; dy?: number; r?: number }> = ({
  at,
  t,
  t0,
  t1 = 1e9,
  dx = 0,
  dy = -90,
  r = 46,
}) => {
  const { project } = useMap();
  const vis = life(t, t0, t1, 0.15, 0.3);
  if (vis <= 0) return null;
  const k = popIn(t, t0, 220, 12);
  const [x, y] = project(at);
  const star = (cx: number, cy: number, s: number, rot = 0) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2 + rot;
      const rr = i % 2 === 0 ? s : s * 0.4;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return <polygon points={pts.join(" ")} fill="#FFDE00" />;
  };
  return (
    <svg
      width={r * 2 + 12}
      height={r * 2 + 12}
      viewBox={`${-r - 6} ${-r - 6} ${r * 2 + 12} ${r * 2 + 12}`}
      style={{
        position: "absolute",
        left: x + dx - r - 6,
        top: y + dy - r - 6,
        transform: `scale(${k})`,
        opacity: vis,
        overflow: "visible",
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
      }}
    >
      <defs>
        <clipPath id="flagClip">
          <circle r={r} />
        </clipPath>
      </defs>
      <g clipPath="url(#flagClip)">
        <rect x={-r * 1.6} y={-r} width={r * 3.2} height={r * 2} fill="#DE2910" />
        {star(-r * 0.42, -r * 0.3, r * 0.42)}
        {star(r * 0.1, -r * 0.68, r * 0.13, 0.5)}
        {star(r * 0.3, -r * 0.42, r * 0.13, 0.9)}
        {star(r * 0.3, -r * 0.08, r * 0.13, 0.2)}
        {star(r * 0.1, r * 0.18, r * 0.13, 0.6)}
      </g>
      <circle r={r} fill="none" stroke="#fff" strokeWidth={4} />
    </svg>
  );
};

/** Льдины — белые многоугольники, всплывающие в точках. */
export const IceFloes: React.FC<{ around: LngLat; t: number; t0: number; t1?: number; count?: number; spread?: number }> = ({
  around,
  t,
  t0,
  t1 = 1e9,
  count = 16,
  spread = 240,
}) => {
  const { project } = useMap();
  const vis = life(t, t0, t1, 0.1, 0.4);
  if (vis <= 0) return null;
  const [cx, cy] = project(around);
  const rnd = (i: number) => {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: vis, overflow: "visible" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const d = (0.25 + rnd(i + 50) * 0.75) * spread;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * 0.8;
        const k = popIn(t, t0 + i * 0.07, 240, 11);
        const sz = (10 + rnd(i + 99) * 16) * k;
        const pts = Array.from({ length: 6 })
          .map((__, j) => {
            const aa = (Math.PI * 2 * j) / 6 + rnd(i * 7 + j);
            const rr = sz * (0.65 + rnd(i * 13 + j) * 0.5);
            return `${(x + Math.cos(aa) * rr).toFixed(1)},${(y + Math.sin(aa) * rr).toFixed(1)}`;
          })
          .join(" ");
        return <polygon key={i} points={pts} fill={COL.ice} stroke="#a9dcff" strokeWidth={1.5} opacity={0.88} />;
      })}
    </svg>
  );
};

export { lerp };
