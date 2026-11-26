import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MapView, PatchLayer, useMap } from "../engine/MapView";
import { COL, Circle, Counter, FONT, GeoArea, Label, Pulse, TEXT_SHADOW, life, popIn } from "../engine/overlays";
import { Terrain3D, project3D } from "../engine/Terrain3D";
import { FPS, H, LngLat, W, clamp01, easeInOut, easeOut, inRing, lerp, measure, prog, slice } from "../engine/geo";
import { A3D, ATACAMA, CLOUDS, CURRENTS, OCEAN_ARICA, P, PAVLODAR, PAV_TO, ROVER, S, andesOpacity, andesView, camAt } from "./plan";

const SAND = "#e3b26b";
const MARS = "#c4501f";
const COLD = "#5cc8ff";
const TOP = 480;

export const Reel5: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  return (
    <AbsoluteFill style={{ background: "#020409" }}>
      <MapView cam={cam} t={t} base={<PatchLayer name="arica" zoomIn={8.6} zoomFull={9.8} feather={14} />}>
        <Layers t={t} />
      </MapView>
      <Andes3D t={t} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};

/* ───────── Слои на карте ───────── */

const Layers: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Arica t={t} />
    <Desert t={t} />
    <Current t={t} />
    <Rover t={t} />
    <Compare t={t} />
    <Flowers t={t} />
    <World t={t} />
  </>
);

/* 1–2, 10. Арика: город в круге, рядом океан */
const Arica: React.FC<{ t: number }> = ({ t }) => {
  const ocean = life(t, S[1] + 1.1, S[2] + 0.5, 0.6, 0.5);
  return (
    <>
      <Circle at={P.arica} t={t} t0={2.7} t1={S[2] + 0.3} r={190} rx={170} width={7} dur={0.7} />
      <GeoArea rings={OCEAN_ARICA} fill={COL.water} opacity={0.45 * ocean} spot={{ at: P.arica, r: 620 }} />
      <Label at={P.ocean} text="Тынық мұхиты" t={t} t0={S[1] + 1.9} t1={S[2] + 0.4} size={64} upper={false} />
      <Circle at={P.arica} t={t} t0={S[9] + 2.0} t1={S[10] + 0.4} r={120} rx={110} width={7} dur={0.6} />
    </>
  );
};

/** Цвет пустыни по кадрам: песок → «Марс» → песок. */
const Desert: React.FC<{ t: number }> = ({ t }) => {
  const v = Math.max(life(t, S[2] + 2.1, S[5] + 0.2, 0.7, 0.4), life(t, A3D.out - 0.1, S[9] + 0.5, 0.4, 0.6));
  const mars = life(t, S[6] + 1.0, S[7] + 1.0, 1.2, 0.8);
  const edge = life(t, S[2] + 2.1, S[4] + 0.3, 0.7, 0.5);
  return (
    <>
      <GeoArea rings={ATACAMA} fill={SAND} stroke={SAND} strokeWidth={3} opacity={0.62 * v * (1 - mars)} />
      <GeoArea rings={ATACAMA} fill={MARS} stroke={MARS} strokeWidth={3} opacity={0.72 * mars} />
      <GeoArea rings={ATACAMA} stroke="#ffffff" strokeWidth={3} opacity={0.8 * edge} />
      <Label at={P.atacama} text="Атакама" t={t} t0={S[2] + 2.6} t1={S[3] + 0.4} size={62} dx={-120} align="right" />
    </>
  );
};

/* 4. Холодное Перуанское течение: синяя стрелка с юга на север */
const Current: React.FC<{ t: number }> = ({ t }) => (
  <CurrentArrow line={CURRENTS.peru} t={t} t0={S[3] + 1.5} t1={S[4] + 0.3} dur={1.8} width={20} />
);

/** Толстая стрелка течения, рисуется от начала к концу, по ней бегут штрихи. */
const CurrentArrow: React.FC<{ line: LngLat[]; t: number; t0: number; t1: number; dur?: number; width?: number; color?: string; opacity?: number }> = ({
  line,
  t,
  t0,
  t1,
  dur = 1.2,
  width = 12,
  color = COLD,
  opacity = 1,
}) => {
  const { project } = useMap();
  const v = life(t, t0, t1, 0.15, 0.4) * opacity;
  if (v <= 0) return null;
  const m = measure(line);
  const p = easeInOut(prog(t, t0, t0 + dur));
  if (p <= 0.01) return null;
  const pts = slice(m, 0, p).map(project);
  const d = "M" + pts.map((q) => q.map((n) => n.toFixed(1)).join(",")).join("L");
  const [ex, ey] = pts[pts.length - 1];
  const [qx, qy] = pts[Math.max(0, pts.length - 3)];
  const a = Math.atan2(ey - qy, ex - qx);
  const hl = width * 2.0;
  const hw = width * 1.5;
  const head = `M${ex + Math.cos(a) * hl * 0.5},${ey + Math.sin(a) * hl * 0.5} L${ex - Math.cos(a) * hl * 0.6 + Math.cos(a + Math.PI / 2) * hw},${ey - Math.sin(a) * hl * 0.6 + Math.sin(a + Math.PI / 2) * hw} L${ex - Math.cos(a) * hl * 0.6 - Math.cos(a + Math.PI / 2) * hw},${ey - Math.sin(a) * hl * 0.6 - Math.sin(a + Math.PI / 2) * hw} Z`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={width * 0.28} strokeLinecap="round" strokeDasharray={`${width * 0.9} ${width * 1.4}`} strokeDashoffset={-(t - t0) * width * 5} opacity={0.9} />
      <path d={head} fill={color} stroke="#ffffff" strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
};

/* 7. Ровер едет по «марсианской» пустыне и оставляет пунктир */
const Rover: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[6] + 1.6, S[7] + 0.4, 0.3, 0.4);
  if (v <= 0) return null;
  const m = measure(ROVER);
  const p = easeInOut(prog(t, S[6] + 1.8, S[7] + 0.2));
  const trail = slice(m, 0, Math.max(0.001, p)).map(project);
  const [x, y] = trail[trail.length - 1];
  const [qx, qy] = trail[Math.max(0, trail.length - 3)];
  const ang = (Math.atan2(y - qy, x - qx) * 180) / Math.PI;
  const k = popIn(t, S[6] + 1.6, 220, 13);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 3px 7px rgba(0,0,0,0.7))" }}>
      <path d={"M" + trail.map((q) => q.map((n) => n.toFixed(1)).join(",")).join("L")} fill="none" stroke="#ffffff" strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" />
      <g transform={`translate(${x},${y}) rotate(${ang - 90}) scale(${k})`}>
        <RoverIcon />
      </g>
    </svg>
  );
};

/** Марсоход сверху-сбоку: корпус, мачта с камерой, шесть колёс. */
const RoverIcon: React.FC = () => (
  <g transform="rotate(90)">
    <rect x={-44} y={-20} width={88} height={30} rx={6} fill="#e9ecef" stroke="#ffffff" strokeWidth={4} />
    <rect x={-36} y={-34} width={44} height={14} rx={3} fill="#3b4b66" stroke="#ffffff" strokeWidth={3} />
    <line x1={26} y1={-20} x2={26} y2={-52} stroke="#ffffff" strokeWidth={5} />
    <rect x={18} y={-62} width={20} height={12} rx={3} fill="#e9ecef" stroke="#ffffff" strokeWidth={3} />
    {[-34, 0, 34].map((wx) => (
      <circle key={wx} cx={wx} cy={18} r={11} fill="#2a2f36" stroke="#ffffff" strokeWidth={4} />
    ))}
  </g>
);

/* 8. Атакама и Павлодарская область рядом, в одном масштабе */
const Compare: React.FC<{ t: number }> = ({ t }) => {
  const at = life(t, S[7] + 0.9, S[8] + 0.4, 0.4, 0.5);
  const pv = life(t, S[7] + 1.3, S[8] + 0.4, 0.3, 0.5);
  const k = easeOut(prog(t, S[7] + 1.3, S[7] + 2.0));
  const { project } = useMap();
  const [cx, cy] = project(PAV_TO);
  return (
    <>
      <GeoArea rings={ATACAMA} stroke="#ffffff" strokeWidth={4} opacity={at} />
      <div style={{ position: "absolute", inset: 0, opacity: pv, transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: `${cx}px ${cy}px` }}>
        <GeoArea rings={PAVLODAR} stroke="#ffffff" strokeWidth={4} fill="rgba(56,182,255,0.3)" />
      </div>
      <Label at={PAV_TO} text="Павлодар облысы" t={t} t0={S[7] + 1.9} t1={S[8] + 0.4} size={44} weight={500} upper={false} />
      <Label at={PAV_TO} text="125 000 км²" t={t} t0={S[7] + 2.2} t1={S[8] + 0.4} size={40} weight={500} dy={52} upper={false} color="rgba(255,255,255,0.8)" />
      <Label at={[-69.6, -21.0]} text="105 000 км²" t={t} t0={S[7] + 2.2} t1={S[8] + 0.4} size={40} weight={500} dx={-70} align="right" upper={false} color="rgba(255,255,255,0.8)" />
    </>
  );
};

/* 9. Дождь — и пустыня в цветах */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const FLOWER_PTS: LngLat[] = (() => {
  const out: LngLat[] = [];
  for (let i = 0; out.length < 170 && i < 20000; i++) {
    const p: LngLat = [-71.3 + rand(i) * 2.2, -23.6 - rand(i + 777) * 5.0];
    if (ATACAMA.some((r) => inRing(p, r))) out.push(p);
  }
  return out;
})();
const PETALS = ["#ff5fb0", "#c86bff", "#ff8ad1", "#9b5cff", "#ff4f9a"];

const Flowers: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const t0 = S[8] + 3.0;
  const v = life(t, t0, S[9] + 1.6, 0.1, 0.8);
  if (v <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible" }}>
      {FLOWER_PTS.map((p, i) => {
        const [x, y] = project(p);
        // волна цветения идёт от точки, куда упал дождь
        const d = Math.hypot(p[0] - P.copiapo[0], (p[1] - P.copiapo[1]) * 0.8);
        const k = popIn(t, t0 + d * 0.32 + rand(i + 3) * 0.25, 240, 11);
        if (k <= 0.01) return null;
        const s = (9 + rand(i + 9) * 8) * k;
        const c = PETALS[i % PETALS.length];
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${rand(i) * 72})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-s * 0.62} rx={s * 0.42} ry={s * 0.62} fill={c} transform={`rotate(${a})`} />
            ))}
            <circle r={s * 0.32} fill="#ffe27a" />
          </g>
        );
      })}
    </svg>
  );
};

/* 11. Мир: холодные течения у западных берегов */
const World: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[10] + 1.0;
  const t1 = S[11] + 0.6;
  const ans = life(t, S[10] + 5.4, t1, 0.4, 0.5);
  return (
    <>
      <CurrentArrow line={CURRENTS.california} t={t} t0={t0 + 0.3} t1={t1} width={9} opacity={1 - 0.5 * ans} />
      <CurrentArrow line={CURRENTS.canary} t={t} t0={t0 + 0.5} t1={t1} width={9} opacity={1 - 0.5 * ans} />
      <CurrentArrow line={CURRENTS.benguela} t={t} t0={t0 + 0.7} t1={t1} width={9} opacity={1 - 0.5 * ans} />
      <CurrentArrow line={CURRENTS.peru} t={t} t0={t0} t1={t1} width={9 + 5 * ans} />
      <Pulse at={P.arica} t={t} t0={S[10] + 5.6} t1={t1} r={12} color="#ffffff" />
    </>
  );
};

/* ───────── 3D: Анды задерживают облака ───────── */

const Andes3D: React.FC<{ t: number }> = ({ t }) => {
  const op = andesOpacity(t);
  if (op <= 0) return null;
  const view = andesView(t);
  return (
    <>
      <Terrain3D view={view} patch="andes" heightName="andes_h" ground="andes_ground" opacity={op} sun={[-0.6, -0.4, 0.8]} seg={2} />
      <div style={{ position: "absolute", inset: 0, opacity: op }}>
        {CLOUDS.map(([from, to], i) => {
          const t0 = S[4] + 2.0 + i * 0.15;
          const p = easeOut(prog(t, t0, t0 + 1.6));
          const at: LngLat = [lerp(from[0], to[0], p), from[1]];
          const [x, y] = project3D(view, at, 6500);
          const [, gy] = project3D(view, [to[0] + 0.25, from[1]], 2600);
          const rain = life(t, t0 + 1.5, A3D.out, 0.3, 0.3);
          const k = popIn(t, t0, 200, 14);
          return (
            <React.Fragment key={i}>
              {rain > 0 ? <Rain x={x} y={y + 20} toY={gy} w={90} t={t} opacity={rain} /> : null}
              <CloudIcon x={x} y={y} s={0.9 * k} opacity={life(t, t0, A3D.out, 0.2, 0.3)} dark={rain} />
            </React.Fragment>
          );
        })}
        <Label at={project3D(view, [-69.9, -21.6], 1500)} screen text="құрғақ" t={t} t0={S[4] + 4.4} t1={A3D.out - 0.2} size={56} weight={500} upper={false} />
      </div>
    </>
  );
};

/** Облако-иконка (dark — насколько оно потемнело перед дождём). */
const CloudIcon: React.FC<{ x: number; y: number; s: number; opacity?: number; dark?: number; crossed?: number }> = ({ x, y, s, opacity = 1, dark = 0, crossed = 0 }) => {
  if (s <= 0.01 || opacity <= 0) return null;
  const fill = `rgb(${Math.round(lerp(245, 170, dark))},${Math.round(lerp(248, 182, dark))},${Math.round(lerp(252, 198, dark))})`;
  return (
    <svg
      width={240}
      height={160}
      viewBox="-120 -90 240 160"
      style={{ position: "absolute", left: x - 120, top: y - 90, transform: `scale(${s})`, opacity, overflow: "visible", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.55))" }}
    >
      <path
        d="M-82,40 C-112,40 -112,2 -86,-4 C-90,-40 -44,-56 -22,-30 C-8,-66 52,-62 54,-18 C90,-22 104,22 80,40 Z"
        fill={fill}
        stroke="#ffffff"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      {crossed > 0 ? <line x1={-96} y1={60} x2={-96 + 196 * crossed} y2={60 - 140 * crossed} stroke="#ffffff" strokeWidth={13} strokeLinecap="round" /> : null}
    </svg>
  );
};

/** Струи дождя под облаком до земли. */
const Rain: React.FC<{ x: number; y: number; toY: number; w: number; t: number; opacity: number }> = ({ x, y, toY, w, t, opacity }) => {
  const len = Math.max(30, toY - y);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      {Array.from({ length: 7 }, (_, i) => {
        const dx = -w / 2 + (w / 6) * i;
        const ph = ((t * 2.2 + rand(i + 31)) % 1) * len;
        return (
          <line key={i} x1={x + dx} y1={y + ph} x2={x + dx - 6} y2={y + ph + 24} stroke="#9fdcff" strokeWidth={5} strokeLinecap="round" opacity={0.9} />
        );
      })}
    </svg>
  );
};

/* ───────── Экранные элементы ───────── */

const Hud: React.FC<{ t: number }> = ({ t }) => (
  <>
    <YearCounter t={t} />
    <NoRainCloud t={t} />
    <Counter t={t} t0={S[2] + 3.0} t1={S[10] + 0.2} steps={[S[3] + 0.4, S[4] + 0.4, S[5] + 0.4]} />
    <Label at={[W / 2, TOP]} screen text="суық ағыс" t={t} t0={S[3] + 2.6} t1={S[4] + 0.3} size={100} upper={false} />
    <ColdCloud t={t} />
    <Label at={[W / 2, TOP]} screen text="Анды" t={t} t0={S[4] + 2.6} t1={A3D.out - 0.1} size={100} />
    <Anticyclone t={t} />
    <Label at={[W / 2, TOP]} screen text="антициклон" t={t} t0={S[5] + 3.6} t1={S[6] + 0.3} size={100} upper={false} />
    <MarsBadge t={t} />
    <Label at={[W / 2, TOP]} screen text="≈ Марс" t={t} t0={S[6] + 1.2} t1={S[7] + 0.3} size={104} />
    <Label at={[W / 2, TOP]} screen text="≈ Павлодар облысы" t={t} t0={S[7] + 1.9} t1={S[8] + 0.3} size={84} upper={false} />
    <RainDrop t={t} />
    <Label at={[W / 2, TOP]} screen text="гүл шөл" t={t} t0={S[8] + 3.8} t1={S[9] + 0.4} size={104} upper={false} />
    <Label at={[W / 2, 330]} screen text="ҰБТ" t={t} t0={S[10] + 0.3} t1={S[11] + 0.4} size={150} />
    <Label at={[W / 2, 1430]} screen text="суық Перу ағысы" t={t} t0={S[10] + 5.4} t1={S[11] + 0.5} size={84} upper={false} />
  </>
);

/* 1, 10. Счётчик лет: быстро бежит до 14, в кадре 10 мигает */
const YearCounter: React.FC<{ t: number }> = ({ t }) => {
  const a = life(t, 2.6, S[1] + 0.6, 0.15, 0.4);
  const b = life(t, S[9] + 2.0, S[10] + 0.3, 0.2, 0.3);
  const v = Math.max(a, b);
  if (v <= 0) return null;
  const n = a > 0 && t < S[1] + 1 ? Math.round(14 * easeOut(prog(t, 2.6, 3.7))) : 14;
  const blink = b > 0 ? 0.55 + 0.45 * Math.cos((t - S[9] - 2.0) * 9) : 1;
  const k = popIn(t, t < S[2] ? 2.6 : S[9] + 2.0, 200, 13);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: TOP,
        textAlign: "center",
        transform: `translateY(-50%) scale(${0.85 + 0.15 * k})`,
        opacity: v * blink,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 120,
        lineHeight: 1,
        color: COL.ink,
        textShadow: TEXT_SHADOW,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {n}
      <span style={{ fontSize: 74, fontWeight: 500 }}> жыл</span>
    </div>
  );
};

/* 1. Перечёркнутая туча у города */
const NoRainCloud: React.FC<{ t: number }> = ({ t }) => {
  const t0 = 3.0;
  const v = life(t, t0, S[1] + 0.8, 0.15, 0.4);
  const k = popIn(t, t0, 200, 12);
  const cross = easeOut(prog(t, t0 + 0.4, t0 + 0.8));
  return <CloudIcon x={800} y={720} s={0.95 * k} opacity={v} crossed={cross} />;
};

/* 4. Над холодной водой облако без дождя */
const ColdCloud: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[3] + 4.2;
  const v = life(t, t0, S[4] + 0.3, 0.2, 0.4);
  const k = popIn(t, t0, 200, 12);
  const cross = easeOut(prog(t, t0 + 0.7, t0 + 1.1));
  return <CloudIcon x={300} y={760} s={0.85 * k} opacity={v} crossed={cross} />;
};

/* 6. Антициклон: большое «В», воздух опускается вниз, вокруг вращение */
const Anticyclone: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[5] + 2.2;
  const v = life(t, t0, S[6] + 0.4, 0.2, 0.4);
  const k = popIn(t, t0, 170, 13);
  if (v <= 0 || k <= 0.01) return null;
  const cx = W / 2;
  const cy = 1060;
  const rot = -(t - t0) * 22; // южное полушарие: против часовой
  const down = life(t, t0 + 0.8, S[6] + 0.4, 0.3, 0.3);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, overflow: "visible", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.65))" }}>
      <g transform={`translate(${cx},${cy}) scale(${k})`}>
        <g transform={`rotate(${rot})`} fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M 0,-235 A 235,235 0 0 0 -203,-118" />
              <path d="M -203,-118 l 4,-30 M -203,-118 l 29,-9" />
            </g>
          ))}
        </g>
        <circle r={150} fill="rgba(10,20,35,0.55)" stroke="#ffffff" strokeWidth={8} />
        <text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={200} fill="#ffffff">
          В
        </text>
      </g>
      {down > 0
        ? [-330, -200, 200, 330].map((dx, i) => {
            const ph = ((t - t0) * 0.7 + i * 0.27) % 1;
            const y0 = cy - 330 + ph * 260;
            return (
              <g key={dx} opacity={down * Math.sin(ph * Math.PI)} stroke="#ffffff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none">
                <line x1={cx + dx} y1={y0} x2={cx + dx} y2={y0 + 120} />
                <path d={`M${cx + dx - 22},${y0 + 98} L${cx + dx},${y0 + 122} L${cx + dx + 22},${y0 + 98}`} />
              </g>
            );
          })
        : null}
    </svg>
  );
};

/* 7. Марс в кружке */
const MarsBadge: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[6] + 0.5;
  const v = life(t, t0, S[7] + 0.3, 0.2, 0.4);
  const k = popIn(t, t0, 190, 12);
  if (v <= 0 || k <= 0.01) return null;
  return (
    <svg
      width={260}
      height={260}
      viewBox="-130 -130 260 260"
      style={{ position: "absolute", left: 830 - 130, top: 770 - 130, transform: `scale(${k})`, opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }}
    >
      <defs>
        <radialGradient id="marsG" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#f08a4b" />
          <stop offset="0.6" stopColor="#c4501f" />
          <stop offset="1" stopColor="#6e2410" />
        </radialGradient>
        <clipPath id="marsC">
          <circle r={96} />
        </clipPath>
      </defs>
      <circle r={110} fill="rgba(10,14,22,0.75)" stroke="#ffffff" strokeWidth={7} />
      <circle r={96} fill="url(#marsG)" />
      <g clipPath="url(#marsC)" fill="#7a2c12" opacity={0.55}>
        <circle cx={-30} cy={-20} r={16} />
        <circle cx={34} cy={18} r={22} />
        <circle cx={-8} cy={52} r={11} />
        <ellipse cx={20} cy={-50} rx={40} ry={9} />
      </g>
    </svg>
  );
};

/* 9. Одна капля-туча: падает дождь, с этого начинается цветение */
const RainDrop: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[8] + 1.9;
  const v = life(t, t0, S[8] + 3.6, 0.2, 0.5);
  if (v <= 0) return null;
  const k = popIn(t, t0, 200, 12);
  const x = W / 2 + 40;
  const y = 700;
  return (
    <>
      <Rain x={x} y={y + 30} toY={y + 360} w={120} t={t} opacity={v * clamp01((t - t0 - 0.3) * 3)} />
      <CloudIcon x={x} y={y} s={1.0 * k} opacity={v} dark={0.6} />
    </>
  );
};
