import React from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/InterTight";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
/** Высота зоны графики в режиме «сплит». */
export const GH = 1130;

export const C = {
  bg: "#000000",
  ink: "#FFFFFF",
  accent: "#D0000C",
  grey: "#3A3A3E",
  panel: "#151517",
  dim: "#8C8C92",
  ok: "#3DDC84",
};

export const SANS = loadInter("normal", {
  weights: ["700", "900"],
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
}).fontFamily;

/** Текущее время в секундах. */
export const useT = () => useCurrentFrame() / FPS;

/** Мягкая пружина 0→1 с лёгким перелётом, начиная с t0 (сек). */
export const pop = (t: number, t0: number, stiff = 150, damp = 13) =>
  t < t0
    ? 0
    : spring({
        frame: (t - t0) * FPS,
        fps: FPS,
        config: { stiffness: stiff, damping: damp, mass: 0.8 },
      });

/** Пружина без перелёта (для движения по месту). */
export const glide = (t: number, t0: number, stiff = 120) =>
  t < t0
    ? 0
    : spring({
        frame: (t - t0) * FPS,
        fps: FPS,
        config: { stiffness: stiff, damping: 22, mass: 0.9 },
      });

/** Плавный переход 0→1 между a и b (сек). */
export const ramp = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

export const lin = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const base: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 900,
  letterSpacing: "-0.045em",
  color: C.ink,
};

/** Появление «всплытием»: поднимается снизу, проявляется из размытия. */
export const riseStyle = (t: number, at: number, dy = 46, blur = 14): React.CSSProperties => {
  const p = glide(t, at, 170);
  return {
    opacity: lin(t, at, at + 0.14),
    transform: `translateY(${(1 - p) * dy}px)`,
    filter: p < 0.97 ? `blur(${(1 - p) * blur}px)` : undefined,
  };
};

export const Rise: React.FC<{
  t: number;
  at: number;
  dy?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ t, at, dy, style, children }) => (
  <div style={{ ...style, ...riseStyle(t, at, dy) }}>{children}</div>
);

/** Текст, проявляющийся по словам. times — момент появления каждого слова (или шаг от at). */
export const Words: React.FC<{
  t: number;
  at: number;
  step?: number;
  text: string;
  accent?: string[];
}> = ({ t, at, step = 0.09, text, accent = [] }) => (
  <>
    {text.split(" ").map((w, i) => (
      <span
        key={i}
        style={{
          display: "inline-block",
          marginRight: "0.22em",
          color: accent.includes(w) ? C.accent : undefined,
          ...riseStyle(t, at + i * step, 30, 12),
        }}
      >
        {w}
      </span>
    ))}
  </>
);

/** Акцентная плашка: проезжает слева направо, по ней пробегает блик. */
export const Plate: React.FC<{
  t: number;
  at: number;
  children: React.ReactNode;
  color?: string;
}> = ({ t, at, children, color = C.accent }) => {
  const p = ramp(t, at, at + 0.32);
  const sheen = lin(t, at + 0.25, at + 0.9);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 0.2em" }}>
      <span
        style={{
          position: "absolute",
          inset: "0.07em 0",
          background: color,
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          borderRadius: 8,
          boxShadow: `0 0 ${46 * p}px ${color}aa`,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "40%",
            left: `${-40 + 150 * sheen}%`,
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)",
          }}
        />
      </span>
      <span style={{ position: "relative", display: "inline-block", ...riseStyle(t, at + 0.1, 18, 8) }}>
        {children}
      </span>
    </span>
  );
};

/**
 * Обёртка сцены: въезжает снизу из размытия, уезжает вверх, всё время медленно «наезжает».
 */
export const Scene: React.FC<{
  t: number;
  from: number;
  to: number;
  children: React.ReactNode;
}> = ({ t, from, to, children }) => {
  if (t < from - 0.02 || t > to + 0.22) return null;
  const inP = glide(t, from, 200);
  const outP = ramp(t, to, to + 0.2);
  const zoom = 1 + 0.05 * lin(t, from, to + 0.2);
  const blur = (1 - inP) * 10 + outP * 14;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: GH,
        opacity: Math.min(lin(t, from, from + 0.1), 1 - outP),
        transform: `translateY(${(1 - inP) * 60 - outP * 70}px) scale(${zoom})`,
        transformOrigin: "50% 45%",
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};
