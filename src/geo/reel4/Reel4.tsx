import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GeoImage, MapView, PatchLayer, useMap } from "../engine/MapView";
import { COL, Circle, Counter, FONT, GeoArea, GeoPath, Label, Pulse, TEXT_SHADOW, life, popIn } from "../engine/overlays";
import { FPS, H, LngLat, Line, W, clamp01, easeInOut, easeOut, inRing, lerp, prog } from "../engine/geo";
import {
  BALTIC,
  BALTIC_RIVERS,
  CASPIAN,
  DEAD,
  DESERTS,
  KOKARAL,
  MED,
  NORTH_ARAL,
  P,
  RED_SEA,
  S,
  SOUTH_ARAL,
  WADIS,
  camAt,
} from "./plan";

const SAND = "#e8913a";
const PALE = "#bfe6ff";
const SALT = "#ffffff";
/** Высота верхних подписей (под счётчиком «1 / 3»). */
const TOP = 480;

export const Reel4: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  return (
    <AbsoluteFill style={{ background: "#020409" }}>
      <MapView
        cam={cam}
        t={t}
        base={
          <>
            <PatchLayer name="deadsea" zoomIn={7.6} zoomFull={8.6} />
            <PatchLayer name="aral" zoomIn={3.4} zoomFull={4.4} feather={20} />
          </>
        }
      >
        <Layers t={t} />
      </MapView>
      <Hud t={t} />
    </AbsoluteFill>
  );
};

/* ───────── Слои на карте ───────── */

const Layers: React.FC<{ t: number }> = ({ t }) => (
  <>
    <DeadSea t={t} />
    <ThreeSeas t={t} />
    <Baltic t={t} />
    <RedSea t={t} />
    <Caspian t={t} />
    <Aral t={t} />
    <World t={t} />
  </>
);

/** Точка на экране со сдвигом от точки карты. */
const useAt = (p: LngLat, dx = 0, dy = 0): [number, number] => {
  const { project } = useMap();
  const [x, y] = project(p);
  return [x + dx, y + dy];
};

/* 1–2. Мёртвое море: вода подсвечена, солонка; при отъезде видно, что вокруг суша */
const DeadSea: React.FC<{ t: number }> = ({ t }) => {
  const water = life(t, 1.6, S[2] + 0.6, 0.5, 0.5);
  const seas = life(t, S[1] + 2.6, S[2] + 0.5, 0.5, 0.4);
  const [sx, sy] = useAt(P.dead, 250, -190);
  return (
    <>
      <GeoArea rings={[...MED, ...RED_SEA]} fill={COL.water} opacity={0.22 * seas} />
      <GeoArea rings={DEAD} fill={COL.water} stroke={COL.waterLight} strokeWidth={3} opacity={water * lerp(0.35, 0.8, prog(t, S[1] + 0.6, S[1] + 2.0))} />
      <SaltShaker x={sx} y={sy} t={t} t0={1.9} t1={S[1] + 1.8} />
      <Circle at={P.dead} t={t} t0={S[1] + 2.1} t1={S[2] + 0.4} r={92} rx={70} width={6} dur={0.7} />
      <NoLink from={P.dead} to={[34.42, 31.62]} t={t} t0={S[1] + 3.0} t1={S[2] + 0.4} />
      <NoLink from={P.dead} to={[35.0, 29.65]} t={t} t0={S[1] + 3.3} t1={S[2] + 0.4} />
    </>
  );
};

/** Солонка, которая трясётся над картой и сыплет соль. */
const SaltShaker: React.FC<{ x: number; y: number; t: number; t0: number; t1: number }> = ({ x, y, t, t0, t1 }) => {
  const k = popIn(t, t0, 200, 12);
  const v = life(t, t0, t1, 0.1, 0.35);
  if (k <= 0.01 || v <= 0) return null;
  const shake = Math.sin((t - t0) * 16) * 7 * clamp01((t - t0) / 0.3);
  const grains = Array.from({ length: 14 }, (_, i) => {
    const ph = ((t - t0) * 1.6 + i / 14) % 1;
    const gx = -58 + Math.sin(i * 12.9) * 22 - ph * 30;
    const gy = -40 + ph * 170;
    return <rect key={i} x={gx} y={gy} width={6} height={6} rx={1} fill="#fff" opacity={(1 - ph) * 0.95} transform={`rotate(${i * 37} ${gx + 3} ${gy + 3})`} />;
  });
  return (
    <svg
      width={300}
      height={340}
      viewBox="-150 -170 300 340"
      style={{ position: "absolute", left: x - 150, top: y - 170, transform: `scale(${k})`, opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.65))" }}
    >
      {grains}
      <g transform={`rotate(${-38 + shake})`}>
        {/* стекло */}
        <path d="M-48,-70 L48,-70 L58,90 C58,104 -58,104 -58,90 Z" fill="rgba(230,240,248,0.92)" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
        <path d="M-50,10 L50,10 L58,90 C58,104 -58,104 -58,90 Z" fill="#ffffff" />
        <path d="M-30,-55 L-36,70" stroke="rgba(255,255,255,0.9)" strokeWidth={8} strokeLinecap="round" />
        {/* металлическая крышка с дырочками */}
        <path d="M-52,-70 L52,-70 L46,-118 C40,-138 -40,-138 -46,-118 Z" fill="#9aa4b1" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
        {[-22, 0, 22].map((dx) => (
          <circle key={dx} cx={dx} cy={-112} r={5} fill="#3a4250" />
        ))}
        {[-11, 11].map((dx) => (
          <circle key={dx} cx={dx} cy={-96} r={5} fill="#3a4250" />
        ))}
      </g>
    </svg>
  );
};

/** Пунктир «нет связи» между двумя точками с крестиком посередине. */
const NoLink: React.FC<{ from: LngLat; to: LngLat; t: number; t0: number; t1: number }> = ({ from, to, t, t0, t1 }) => {
  const { project } = useMap();
  const v = life(t, t0, t1, 0.15, 0.35);
  if (v <= 0) return null;
  const [ax, ay] = project(from);
  const [bx, by] = project(to);
  const p = easeOut(prog(t, t0, t0 + 0.45));
  const ex = lerp(ax, bx, p);
  const ey = lerp(ay, by, p);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const xk = popIn(t, t0 + 0.4, 260, 12);
  const s = 16 * xk;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.75))" }}>
      <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="#fff" strokeWidth={4} strokeDasharray="10 9" strokeLinecap="round" />
      {xk > 0.01 ? (
        <g stroke="#fff" strokeWidth={7} strokeLinecap="round">
          <line x1={mx - s} y1={my - s} x2={mx + s} y2={my + s} />
          <line x1={mx - s} y1={my + s} x2={mx + s} y2={my - s} />
        </g>
      ) : null}
    </svg>
  );
};

/* 3. Весь мир: мигают три моря */
const blink = (t: number, t0: number) => life(t, t0, S[3] + 0.3, 0.15, 0.4) * (0.6 + 0.4 * Math.cos((t - t0) * 9));

const ThreeSeas: React.FC<{ t: number }> = ({ t }) => {
  const aralBoost = 1 + 0.6 * life(t, S[2] + 4.6, S[3], 0.3, 0.4);
  return (
    <>
      <GeoArea rings={BALTIC} fill={COL.water} stroke={COL.waterLight} strokeWidth={2} opacity={0.8 * blink(t, S[2] + 1.9)} />
      <GeoArea rings={RED_SEA} fill={COL.water} stroke={COL.waterLight} strokeWidth={2} opacity={0.8 * blink(t, S[2] + 2.4)} />
      <GeoArea rings={[...SOUTH_ARAL, ...NORTH_ARAL]} fill={COL.water} stroke={COL.waterLight} strokeWidth={2} opacity={Math.min(1, 0.8 * aralBoost * blink(t, S[2] + 2.9))} />
      <Pulse at={P.baltic} t={t} t0={S[2] + 1.9} t1={S[3]} r={14} color="#ffffff" />
      <Pulse at={P.redSea} t={t} t0={S[2] + 2.4} t1={S[3]} r={14} color="#ffffff" />
      <Pulse at={P.southAral} t={t} t0={S[2] + 2.9} t1={S[3]} r={14} color="#ffffff" />
    </>
  );
};

/** Стрелка-поток по карте: от a к b, растёт, по ней бегут штрихи. */
const FlowArrow: React.FC<{ line: Line; t: number; t0: number; t1: number; color?: string; width?: number; head?: number }> = ({
  line,
  t,
  t0,
  t1,
  color = COL.waterLight,
  width = 6,
  head = 18,
}) => {
  const { project } = useMap();
  const v = life(t, t0, t1, 0.15, 0.4);
  if (v <= 0) return null;
  const pts = line.map(project);
  // длина ломаной на экране
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const p = easeOut(prog(t, t0, t0 + 0.7));
  let left = total * p;
  const shown: [number, number][] = [pts[0]];
  for (let i = 0; i < seg.length && left > 0; i++) {
    const k = Math.min(1, left / seg[i]);
    shown.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]);
    left -= seg[i];
  }
  const [ex, ey] = shown[shown.length - 1];
  const [qx, qy] = shown.length > 1 ? shown[shown.length - 2] : pts[0];
  const ang = Math.atan2(ey - qy, ex - qx);
  const d = "M" + shown.map((q) => q.map((n) => n.toFixed(1)).join(",")).join("L");
  const hx = (a: number) => `${ex + Math.cos(ang + a) * head},${ey + Math.sin(ang + a) * head}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.7))" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={width * 0.55} strokeLinecap="round" strokeDasharray="10 16" strokeDashoffset={-(t - t0) * 60} />
      {total * p > head ? <path d={`M${hx(Math.PI * 0.8)} L${ex},${ey} L${hx(-Math.PI * 0.8)}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
};

/* 5. Балтика: бледно-голубая, в неё впадают реки */
const Baltic: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[4] + 1.5, S[5] + 0.5, 0.5, 0.5);
  return (
    <>
      <GeoArea rings={BALTIC} fill={PALE} stroke={PALE} strokeWidth={3} opacity={0.42 * v} />
      {BALTIC_RIVERS.map((r, i) => (
        <FlowArrow key={i} line={r} t={t} t0={S[4] + 2.2 + i * 0.16} t1={S[5] + 0.4} width={7} head={20} />
      ))}
    </>
  );
};

/* Точки внутри Красного моря для кристаллов соли (детерминированно). */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const SALT_PTS: LngLat[] = (() => {
  const out: LngLat[] = [];
  for (let i = 0; out.length < 46 && i < 4000; i++) {
    const p: LngLat = [33.8 + rand(i) * 9.8, 12.6 + rand(i + 999) * 15.4];
    if (inRing(p, RED_SEA[0])) out.push(p);
  }
  return out;
})();

/** Точки вдоль оси моря, откуда поднимается пар. */
const STEAM: LngLat[] = [
  [34.9, 27.2],
  [36.2, 25.2],
  [37.5, 23.1],
  [38.8, 20.9],
  [40.2, 18.5],
  [41.5, 16.3],
];

/* 6–7. Красное море: пустыни, сухие русла, испарение, соль, связь с океаном */
const RedSea: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const sea = life(t, S[5] + 1.0, S[7] + 0.6, 0.5, 0.5);
  const desert = life(t, S[5] + 2.1, S[7] + 0.4, 0.6, 0.5);
  const north = life(t, S[6] + 3.0, S[7] + 0.3, 0.8, 0.4);
  return (
    <>
      <GeoArea rings={DESERTS} fill={SAND} opacity={0.42 * desert} spot={{ at: P.redSea, r: 560 }} />
      <GeoArea rings={RED_SEA} fill={COL.water} stroke={COL.waterLight} strokeWidth={3} opacity={0.42 * sea} />
      <GeoArea rings={RED_SEA} fill={SALT} opacity={0.55 * north} spot={{ at: P.redNorth, r: 330 }} />
      {WADIS.map((w, i) => (
        <Wadi key={i} line={w} t={t} t0={S[5] + 3.3 + i * 0.14} t1={S[6] + 0.6} />
      ))}
      <Steam t={t} t0={S[6] + 0.2} t1={S[6] + 6.4} />
      <SaltCrystals t={t} t0={S[6] + 1.9} t1={S[7] + 0.3} project={project} />
      <FlowArrow
        line={[
          [47.6, 12.35],
          [45.3, 11.95],
          [43.45, 12.6],
          [42.3, 14.4],
        ]}
        t={t}
        t0={S[6] + 5.9}
        t1={S[7] + 0.3}
        width={8}
        head={22}
      />
      <Pulse at={[43.42, 12.62]} t={t} t0={S[6] + 6.3} t1={S[7] + 0.3} r={12} color="#ffffff" />
      <Label at={[47.0, 10.6]} text="мұхит" t={t} t0={S[6] + 6.2} t1={S[7] + 0.3} size={50} weight={500} upper={false} />
    </>
  );
};

/** Сухое русло: синий пунктир, потом крестик. */
const Wadi: React.FC<{ line: Line; t: number; t0: number; t1: number }> = ({ line, t, t0, t1 }) => {
  const { project } = useMap();
  const v = life(t, t0, t1, 0.15, 0.4);
  if (v <= 0) return null;
  const [ax, ay] = project(line[0]);
  const [bx, by] = project(line[1]);
  const p = easeOut(prog(t, t0, t0 + 0.5));
  const xk = popIn(t, t0 + 1.0, 260, 12);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const s = 20 * xk;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.75))" }}>
      <line x1={ax} y1={ay} x2={lerp(ax, bx, p)} y2={lerp(ay, by, p)} stroke={COL.water} strokeWidth={9} strokeLinecap="round" strokeDasharray="16 11" opacity={lerp(1, 0.55, xk)} />
      {xk > 0.01 ? (
        <g stroke="#fff" strokeWidth={7} strokeLinecap="round">
          <line x1={mx - s} y1={my - s} x2={mx + s} y2={my + s} />
          <line x1={mx - s} y1={my + s} x2={mx + s} y2={my - s} />
        </g>
      ) : null}
    </svg>
  );
};

/** Пар: волнистые стрелки поднимаются над морем. */
const Steam: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const { project } = useMap();
  const v = life(t, t0, t1, 0.4, 0.6);
  if (v <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
      {STEAM.map((p, i) => {
        const [x, y] = project(p);
        const ph = ((t - t0) * 0.5 + i * 0.37) % 1;
        const yy = y - 30 - ph * 200;
        const o = Math.sin(ph * Math.PI);
        const d = `M${x},${yy + 110} C${x - 26},${yy + 82} ${x + 26},${yy + 54} ${x},${yy + 26} L${x},${yy}`;
        return (
          <g key={i} opacity={o} stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={d} />
            <path d={`M${x - 18},${yy + 18} L${x},${yy} L${x + 18},${yy + 18}`} />
          </g>
        );
      })}
    </svg>
  );
};

/** Белые кристаллы соли на воде. */
const SaltCrystals: React.FC<{ t: number; t0: number; t1: number; project: (p: LngLat) => [number, number] }> = ({ t, t0, t1, project }) => {
  const v = life(t, t0, t1, 0.2, 0.4);
  if (v <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))" }}>
      {SALT_PTS.map((p, i) => {
        const k = popIn(t, t0 + rand(i + 55) * 1.4, 240, 12);
        if (k <= 0.01) return null;
        const [x, y] = project(p);
        const s = (3.5 + rand(i + 7) * 3.5) * k;
        return <rect key={i} x={x - s} y={y - s} width={s * 2} height={s * 2} fill="#fff" transform={`rotate(45 ${x} ${y})`} />;
      })}
    </svg>
  );
};

/* 8. Каспий */
const Caspian: React.FC<{ t: number }> = ({ t }) => (
  <GeoArea rings={CASPIAN} fill={COL.water} stroke={COL.waterLight} strokeWidth={3} opacity={0.38 * life(t, S[7] + 0.9, S[8] + 0.8, 0.5, 0.5)} />
);

/* 9–10. Арал: южный белый от соли, северный голубеет, плотина Көкарал */
const Aral: React.FC<{ t: number }> = ({ t }) => {
  const south = life(t, S[8] + 1.9, S[9] + 1.4, 0.6, 0.8);
  const north = easeInOut(prog(t, S[9] + 0.5, S[9] + 2.4)) * life(t, S[9], S[10] + 0.6, 0.1, 0.5);
  const dam = easeOut(prog(t, S[9] + 1.0, S[9] + 1.5));
  const mid: LngLat = [(KOKARAL[0][0] + KOKARAL[1][0]) / 2, (KOKARAL[0][1] + KOKARAL[1][1]) / 2];
  return (
    <>
      {/* вода по свежему снимку: южный Арал белеет от соли, северный голубеет */}
      <GeoImage name="aral_south" opacity={0.92 * south} />
      <Circle at={[58.45, 45.05]} t={t} t0={S[8] + 2.3} t1={S[9] + 0.6} r={230} rx={95} rot={8} width={6} dur={0.7} />
      <GeoImage name="aral_north" opacity={0.85 * north} />
      <GeoPath line={KOKARAL} to={dam} color="#ffffff" width={11} opacity={life(t, S[9] + 1.0, S[10] + 0.5, 0.1, 0.4)} />
      <Circle at={mid} t={t} t0={S[9] + 1.4} t1={S[10] + 0.4} r={70} rx={88} width={6} dur={0.6} />
      <Label at={mid} text="Көкарал" t={t} t0={S[9] + 1.7} t1={S[10] + 0.4} size={70} dy={120} />
    </>
  );
};

/* 11. Мир: Балтика и Красное море рядом */
const World: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[10] + 0.9, S[11] + 0.6, 0.5, 0.5);
  const ans = life(t, S[10] + 5.0, S[11] + 0.6, 0.4, 0.5);
  return (
    <>
      <GeoArea rings={BALTIC} fill={PALE} stroke={PALE} strokeWidth={2} opacity={v * lerp(0.6, 0.35, ans)} />
      <GeoArea rings={RED_SEA} fill={COL.water} stroke={COL.waterLight} strokeWidth={2} opacity={v * lerp(0.6, 1, ans)} />
      <Label at={P.baltic} text="7 ‰" t={t} t0={S[10] + 1.5} t1={S[11] + 0.5} size={54} weight={500} dx={64} align="left" />
      <Label at={P.redSea} text="41 ‰" t={t} t0={S[10] + 1.8} t1={S[11] + 0.5} size={54} weight={500} dx={58} align="left" />
      <Circle at={P.redSea} t={t} t0={S[10] + 5.4} t1={S[11] + 0.5} r={95} rx={44} rot={-28} width={6} dur={0.7} />
    </>
  );
};

/* ───────── Экранные элементы ───────── */

const Hud: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Title t={t} />
    <Counter t={t} t0={S[2] + 1.2} t1={S[10] + 0.2} steps={[S[4] + 0.4, S[5] + 0.4, S[8] + 0.4]} />
    <Glass t={t} />
    <CountLabel t={t} t0={S[3] + 2.6} t1={S[4] + 0.3} to={35} dur={0.9} suffix=" ‰" size={120} />
    <Label at={[W / 2, 1360]} screen text="1 л · 35 г" t={t} t0={S[3] + 3.0} t1={S[4] + 0.3} size={72} upper={false} />
    <Label at={[W / 2, TOP]} screen text="~7 ‰" t={t} t0={S[4] + 4.8} t1={S[5] + 0.3} size={110} upper={false} />
    <Sun t={t} t0={S[5] + 2.5} t1={S[7] + 0.2} />
    <Label at={[W / 2, TOP]} screen text="0 өзен" t={t} t0={S[5] + 4.5} t1={S[6] + 0.4} size={100} upper={false} />
    <Label at={[W / 2, TOP]} screen text="41 ‰" t={t} t0={S[6] + 4.0} t1={S[7] + 0.3} size={110} upper={false} />
    <Label at={[W / 2, TOP]} screen text="Каспий ~13 ‰" t={t} t0={S[7] + 1.5} t1={S[8] + 0.3} size={96} upper={false} />
    <CountLabel t={t} t0={S[8] + 2.8} t1={S[9] + 0.3} to={100} dur={1.5} suffix="+ ‰" size={120} />
    <Label at={[W / 2 + 300, TOP + 15]} screen text="41 ‰" t={t} t0={S[8] + 5.0} t1={S[9] + 0.3} size={60} weight={500} upper={false} color="rgba(255,255,255,0.72)" />
    <Label at={[W / 2, 330]} screen text="ҰБТ" t={t} t0={S[10] + 0.3} t1={S[11] + 0.4} size={150} />
    <Label at={[W / 2, 1430]} screen text="‰ · Қызыл теңіз" t={t} t0={S[10] + 5.0} t1={S[11] + 0.5} size={84} upper={false} />
  </>
);

/** Цифра, которая растёт от 0 (с подписью «‰»). */
const CountLabel: React.FC<{ t: number; t0: number; t1: number; to: number; dur: number; suffix: string; size: number; y?: number }> = ({
  t,
  t0,
  t1,
  to,
  dur,
  suffix,
  size,
  y = TOP,
}) => {
  const n = Math.round(to * easeOut(prog(t, t0, t0 + dur)));
  return <Label at={[W / 2, y]} screen text={`${n}${suffix}`} t={t} t0={t0} t1={t1} size={size} upper={false} />;
};

/* 1–2. «Өлі теңіз»: «теңіз» зачёркивается, рядом появляется «көл» */
const Title: React.FC<{ t: number }> = ({ t }) => {
  const t0 = 1.7;
  const t1 = S[2] + 0.3;
  const v = life(t, t0, t1, 0.2, 0.3);
  if (v <= 0) return null;
  const k = popIn(t, t0, 190, 15);
  const strike = easeOut(prog(t, 2.55, 2.9));
  const dimSea = lerp(1, 0.55, prog(t, S[2] - 1.4, S[2] - 1.1));
  const lake = easeOut(prog(t, S[2] - 1.2, S[2] - 0.8));
  const lakePop = popIn(t, S[2] - 1.15, 230, 12);
  const size = 104;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 440,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `translateY(-50%) translateY(${(1 - k) * 18}px) scale(${0.9 + 0.1 * k})`,
        opacity: v * clamp01(k * 1.4),
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        textTransform: "uppercase",
        color: COL.ink,
        whiteSpace: "nowrap",
        textShadow: TEXT_SHADOW,
      }}
    >
      <span>Өлі</span>
      <span style={{ position: "relative", marginLeft: "0.25em", opacity: dimSea }}>
        теңіз
        <span
          style={{
            position: "absolute",
            left: "-0.06em",
            top: "50%",
            height: "0.09em",
            width: `calc(${strike} * (100% + 0.12em))`,
            background: "#ffffff",
            borderRadius: "0.05em",
            boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}
        />
      </span>
      <span
        style={{
          display: "inline-block",
          overflow: "hidden",
          maxWidth: `${lake * 2.4}em`,
          marginLeft: `${lake * 0.25}em`,
          color: COL.waterLight,
          transform: `scale(${0.6 + 0.4 * lakePop})`,
          opacity: clamp01(lakePop * 1.5),
        }}
      >
        көл
      </span>
    </div>
  );
};

/* 4. Стакан океанской воды, в него сыплется соль; рядом ложка с горкой соли */
const Glass: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[3] + 1.9;
  const t1 = S[4] + 0.3;
  const k = popIn(t, t0, 190, 13);
  const v = life(t, t0, t1, 0.15, 0.35);
  if (k <= 0.01 || v <= 0) return null;
  const heap = easeOut(prog(t, t0 + 0.4, t0 + 2.0));
  const falling = life(t, t0 + 0.3, t0 + 2.1, 0.1, 0.3);
  const spoonK = popIn(t, S[3] + 4.2, 200, 12);
  const cx = 420;
  const cy = 1010;
  const grains = Array.from({ length: 18 }, (_, i) => {
    const ph = ((t - t0) * 1.3 + i / 18) % 1;
    const gx = Math.sin(i * 7.3) * 34;
    const gy = -250 + ph * 330;
    return <rect key={i} x={gx - 3} y={gy - 3} width={6} height={6} fill="#fff" opacity={falling * (1 - ph * 0.6)} transform={`rotate(${i * 41} ${gx} ${gy})`} />;
  });
  const hh = 60 * heap;
  return (
    <>
      <svg
        width={360}
        height={520}
        viewBox="-180 -300 360 520"
        style={{ position: "absolute", left: cx - 180, top: cy - 300, transform: `scale(${k})`, transformOrigin: "180px 400px", opacity: v, overflow: "visible", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}
      >
        <defs>
          <clipPath id="glassIn">
            <path d="M-112,-150 L112,-150 L90,180 L-90,180 Z" />
          </clipPath>
        </defs>
        {grains}
        <g clipPath="url(#glassIn)">
          <rect x={-130} y={-90} width={260} height={290} fill="#3aa6e8" opacity={0.55} />
          <path d={`M-100,180 Q0,${180 - hh * 2} 100,180 Z`} fill="#ffffff" />
          <rect x={-130} y={-96} width={260} height={10} fill="#bfe6ff" opacity={0.8} />
        </g>
        <path d="M-118,-160 L118,-160 L94,186 C92,198 -92,198 -94,186 Z" fill="rgba(255,255,255,0.08)" stroke="#ffffff" strokeWidth={7} strokeLinejoin="round" />
        <path d="M-82,-130 L-66,150" stroke="rgba(255,255,255,0.55)" strokeWidth={9} strokeLinecap="round" />
      </svg>
      {spoonK > 0.01 ? (
        <svg
          width={300}
          height={200}
          viewBox="-150 -100 300 200"
          style={{ position: "absolute", left: 770 - 150, top: 1120 - 100, transform: `scale(${spoonK}) rotate(-18deg)`, opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.6))" }}
        >
          <path d="M10,6 L140,-14" stroke="#c9d2dc" strokeWidth={18} strokeLinecap="round" />
          <ellipse cx={-50} cy={14} rx={74} ry={44} fill="#c9d2dc" stroke="#ffffff" strokeWidth={6} />
          <path d="M-112,12 Q-50,-62 12,12 Z" fill="#ffffff" />
        </svg>
      ) : null}
    </>
  );
};

/* 6–7. Солнце над пустыней */
const Sun: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const k = popIn(t, t0, 180, 12);
  const v = life(t, t0, t1, 0.15, 0.4);
  if (k <= 0.01 || v <= 0) return null;
  const rot = (t - t0) * 18;
  return (
    <svg
      width={260}
      height={260}
      viewBox="-130 -130 260 260"
      style={{ position: "absolute", left: 860 - 130, top: 650 - 130, transform: `scale(${k})`, opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.55))" }}
    >
      <g transform={`rotate(${rot})`} stroke="#ffc83d" strokeWidth={12} strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r0 = 70;
          const r1 = i % 2 ? 100 : 112;
          return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} />;
        })}
      </g>
      <circle r={54} fill="#ffc83d" stroke="#ffffff" strokeWidth={6} />
    </svg>
  );
};
