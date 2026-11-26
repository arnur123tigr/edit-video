import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DARK, MapView, PatchLayer, TileLayer, useMap } from "../engine/MapView";
import { COL, Circle, Counter, Dim, GeoArea, GeoPath, Label, Pulse, life, popIn } from "../engine/overlays";
import { FPS, H, LngLat, Line, W, along, clamp01, easeInOut, easeOut, lerp, prog } from "../engine/geo";
import { ADEN, AFRICA, KZ_HERE, NUBIA_BLOCK, P, PLATES, RED_SEA, RIFT, ROAD, S, SOMALI_BLOCK, camAt } from "./plan";

const HOT = COL.hot;
const NUBIA = "#e3b26b";
const SOMALI = "#8fd3c8";

export const Reel3: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  return (
    <AbsoluteFill style={{ background: "#020409" }}>
      <MapView
        cam={cam}
        t={t}
        base={
          <>
            <PatchLayer name="maimahiu" zoomIn={10.6} zoomFull={11.9} />
            <PatchLayer name="afar" zoomIn={9.2} zoomFull={10.4} />
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
    <FutureOcean t={t} />
    <Plates t={t} />
    <Compare t={t} />
    <Crack t={t} />
    <Length t={t} />
    <Kenya t={t} />
    <Afar t={t} />
    <Creep t={t} />
    <RedSea t={t} />
    <World t={t} />
  </>
);

/** Видимость главной трещины по кадрам. */
const crackVis = (t: number) =>
  Math.max(life(t, 1.0, S[5] + 0.6, 0.1, 0.6), life(t, S[7] + 0.6, S[8] + 3.0, 0.4, 1.2) * 0.9, life(t, S[10] + 1.2, S[11] + 0.6, 0.5, 0.5));

/* 1–2. Красная светящаяся трещина бежит по Восточной Африке сверху вниз */
const Crack: React.FC<{ t: number }> = ({ t }) => {
  const p = easeInOut(prog(t, 1.1, 3.2));
  const v = crackVis(t);
  const outline = life(t, S[1] + 1.4, S[2] + 0.3, 0.3, 0.4);
  const flick = 0.85 + 0.15 * Math.sin(t * 11);
  return (
    <>
      <GeoPath line={RIFT} color="#ffffff" width={15} opacity={outline * 0.55} />
      <GeoPath line={RIFT} to={p} color={HOT} width={6} glow={9} opacity={v * flick} />
      {p > 0 && p < 1 ? <Pulse at={along(RIFT, p)} t={t} t0={1.1} t1={3.4} r={9} color="#ffd2a0" /> : null}
    </>
  );
};

/* 2. Линия длины рядом с трещиной */
const Length: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[1] + 1.8, S[2] + 0.3, 0.2, 0.4);
  if (v <= 0) return null;
  const [ax, ay] = project(RIFT.pts[0]);
  const [bx, by] = project(RIFT.pts[RIFT.pts.length - 1]);
  const off = 170;
  const x0 = ax + off;
  const x1 = bx + off;
  const p = easeInOut(prog(t, S[1] + 1.9, S[1] + 3.1));
  const ex = lerp(x0, x1, p);
  const ey = lerp(ay, by, p);
  const tick = (x: number, y: number) => <line x1={x - 18} y1={y} x2={x + 18} y2={y} stroke="#fff" strokeWidth={5} strokeLinecap="round" />;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}>
        {tick(x0, ay)}
        <line x1={x0} y1={ay} x2={ex} y2={ey} stroke="#fff" strokeWidth={4} strokeDasharray="14 10" />
        {p >= 1 ? tick(x1, by) : null}
      </svg>
      <Label at={[(x0 + x1) / 2 + 40, (ay + by) / 2]} screen text="3 000+ км" t={t} t0={S[1] + 2.8} t1={S[2] + 0.3} size={86} align="left" />
    </>
  );
};

/* 3. Африка и Казахстан в одном масштабе */
const Compare: React.FC<{ t: number }> = ({ t }) => {
  const af = life(t, S[2] + 0.2, S[3] + 0.4, 0.4, 0.5);
  const kz = easeOut(prog(t, S[2] + 1.2, S[2] + 2.0));
  const kv = life(t, S[2] + 1.2, S[3] + 0.4, 0.2, 0.5);
  const { project } = useMap();
  const [cx, cy] = project([64.0, -1.0]);
  return (
    <>
      <GeoArea rings={AFRICA} stroke="rgba(255,255,255,0.75)" strokeWidth={3} fill="rgba(255,255,255,0.04)" opacity={af} />
      <div style={{ position: "absolute", inset: 0, opacity: kv, transform: `scale(${0.6 + 0.4 * kz})`, transformOrigin: `${cx}px ${cy}px` }}>
        <GeoArea rings={KZ_HERE} stroke="#ffffff" strokeWidth={4} fill="rgba(56,182,255,0.28)" />
      </div>
      <Label at={[64.0, -1.0]} text="Қазақстан" t={t} t0={S[2] + 1.8} t1={S[3] + 0.4} size={46} weight={500} dy={170} />
    </>
  );
};

/* 4. Две плиты разными цветами и стрелки в разные стороны */
const Plates: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[3] + 0.6, S[4] + 0.6, 0.4, 0.5);
  if (v <= 0) return null;
  const d = (rings: Line[]) => rings.map((r) => "M" + r.map((p) => project(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z").join(" ");
  const arrows = easeOut(prog(t, S[3] + 1.4, S[3] + 2.4));
  const wobble = Math.sin((t - S[3]) * 3) * 6;
  const [lx, ly] = project([31.0, 1.0]);
  const [rx, ry] = project([44.3, 1.5]);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v }}>
      <defs>
        <clipPath id="afClip">
          <path d={d(AFRICA)} />
        </clipPath>
      </defs>
      <g clipPath="url(#afClip)">
        <path d={d([NUBIA_BLOCK])} fill={NUBIA} opacity={0.38} />
        <path d={d([SOMALI_BLOCK])} fill={SOMALI} opacity={0.38} />
      </g>
      {arrows > 0 ? (
        <g opacity={arrows} style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))" }}>
          <BigArrow x={lx - wobble * arrows} y={ly} dir={-1} len={150 * arrows} color={NUBIA} />
          <BigArrow x={rx + wobble * arrows} y={ry} dir={1} len={150 * arrows} color={SOMALI} />
        </g>
      ) : null}
    </svg>
  );
};

/** Толстая стрелка влево (dir=-1) или вправо (dir=1) от точки. */
const BigArrow: React.FC<{ x: number; y: number; dir: 1 | -1; len: number; color: string; w?: number }> = ({ x, y, dir, len, color, w = 22 }) => {
  const head = w * 1.6;
  const tip = x + dir * len;
  const base = tip - dir * head;
  return (
    <path
      d={`M${x},${y - w / 2} L${base},${y - w / 2} L${base},${y - w * 1.25} L${tip},${y} L${base},${y + w * 1.25} L${base},${y + w / 2} L${x},${y + w / 2} Z`}
      fill={color}
      stroke="#fff"
      strokeWidth={3}
      strokeLinejoin="round"
    />
  );
};

/* 6. Кения: дорога и трещина поперёк неё */
const Kenya: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[5] + 1.5, S[6] + 0.5, 0.3, 0.5);
  if (v <= 0) return null;
  const road = easeInOut(prog(t, S[5] + 1.6, S[5] + 2.6));
  const crack = easeOut(prog(t, S[5] + 2.4, S[5] + 3.0));
  const flash = t > S[5] + 2.4 ? 0.65 + 0.35 * Math.abs(Math.sin((t - S[5] - 2.4) * 6)) : 0;
  const [x, y] = project(P.crack2018);
  // зубчатая трещина с севера на юг
  const zig: [number, number][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const yy = y - 330 + 660 * k;
    const xx = x + Math.sin(i * 2.7) * 14 + (k - 0.5) * 40;
    zig.push([xx, yy]);
  }
  const shown = zig.slice(0, Math.max(2, Math.ceil(zig.length * crack)));
  return (
    <>
      <GeoPath line={ROAD} to={road} color="#ffffff" width={7} glow={4} opacity={v * 0.95} />
      {crack > 0 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v }}>
          <defs>
            <filter id="crackGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={9} />
            </filter>
          </defs>
          <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={HOT} strokeWidth={26} opacity={0.6 * flash} filter="url(#crackGlow)" />
          <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={HOT} strokeWidth={9} strokeLinejoin="miter" opacity={flash} />
          <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke="#1a0a05" strokeWidth={3} />
        </svg>
      ) : null}
      <WarnSign x={x + 200} y={y - 300} t={t} t0={S[5] + 2.8} t1={S[6] + 0.5} />
    </>
  );
};

/** Дорожный знак «внимание». */
const WarnSign: React.FC<{ x: number; y: number; t: number; t0: number; t1: number }> = ({ x, y, t, t0, t1 }) => {
  const k = popIn(t, t0, 220, 11);
  const v = life(t, t0, t1, 0.1, 0.3);
  if (k <= 0.01 || v <= 0) return null;
  return (
    <svg width={200} height={180} viewBox="-100 -95 200 180" style={{ position: "absolute", left: x - 100, top: y - 95, transform: `scale(${k})`, opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.6))" }}>
      <path d="M0,-80 L86,70 L-86,70 Z" fill="#f5b82e" stroke="#ffffff" strokeWidth={12} strokeLinejoin="round" />
      <rect x={-9} y={-34} width={18} height={66} rx={8} fill="#1b1b1b" />
      <circle cx={0} cy={50} r={11} fill="#1b1b1b" />
    </svg>
  );
};

/* 7. Афар: вулкан и 60-километровый разлом */
const Afar: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[6] + 2.3, S[7] + 0.5, 0.3, 0.5);
  if (v <= 0) return null;
  const p = easeInOut(prog(t, S[6] + 3.1, S[6] + 4.5));
  const flash = t > S[6] + 3.1 ? 0.7 + 0.3 * Math.abs(Math.sin((t - S[6] - 3.1) * 5)) : 0;
  const mid = project(P.afarFault[3]);
  return (
    <>
      <GeoPath line={P.afarFault} to={p} color={HOT} width={9} glow={10} opacity={v * flash} />
      <Volcano at={project(P.dabbahu)} t={t} t0={S[6] + 2.5} t1={S[7] + 0.5} />
      <Label at={[mid[0] + 90, mid[1]]} screen text="60 км · 2005" t={t} t0={S[6] + 4.2} t1={S[7] + 0.5} size={78} align="left" upper={false} />
    </>
  );
};

/** Иконка вулкана. */
const Volcano: React.FC<{ at: [number, number]; t: number; t0: number; t1: number }> = ({ at, t, t0, t1 }) => {
  const k = popIn(t, t0, 200, 12);
  const v = life(t, t0, t1, 0.1, 0.3);
  if (k <= 0.01 || v <= 0) return null;
  const puff = (t - t0) * 0.6;
  return (
    <svg width={220} height={220} viewBox="-110 -150 220 220" style={{ position: "absolute", left: at[0] - 110, top: at[1] - 150 - 30, transform: `scale(${k})`, transformOrigin: "110px 220px", opacity: v, overflow: "visible", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.6))" }}>
      {[0, 1, 2].map((i) => {
        const ph = (puff + i / 3) % 1;
        return <circle key={i} cx={Math.sin(i * 2 + ph * 3) * 12} cy={-60 - ph * 80} r={14 + ph * 22} fill="#d9dde3" opacity={(1 - ph) * 0.8} />;
      })}
      <path d="M-80,60 L-22,-40 L22,-40 L80,60 Z" fill="#5a4636" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
      <path d="M-22,-40 L22,-40 L12,-12 L4,-26 L-6,-4 L-14,-24 Z" fill={HOT} />
    </svg>
  );
};

/* 8. Плиты ползут медленно: стрелки вдоль рифта */
const Creep: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[7] + 1.6, S[8] + 0.4, 0.4, 0.4);
  if (v <= 0) return null;
  const items: React.ReactNode[] = [];
  [0.12, 0.3, 0.48, 0.66, 0.84].forEach((f, i) => {
    const [x, y] = project(along(RIFT, f));
    const k = popIn(t, S[7] + 1.8 + i * 0.15, 200, 14);
    const creep = ((t - S[7]) * 0.35) % 1;
    const o = 40 + creep * 26;
    items.push(<BigArrow key={`l${i}`} x={x - o} y={y} dir={-1} len={70 * k} w={14} color={NUBIA} />);
    items.push(<BigArrow key={`r${i}`} x={x + o} y={y} dir={1} len={70 * k} w={14} color={SOMALI} />);
  });
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.7))" }}>
      {items}
    </svg>
  );
};

/* 9. Будущее: Сомалийский блок уходит на восток, в щель заходит море */
const toD = (project: (p: LngLat) => [number, number], ring: Line) => "M" + ring.map((p) => project(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";

const FutureOcean: React.FC<{ t: number }> = ({ t }) => {
  const { cam, project } = useMap();
  const on = life(t, S[8] + 0.2, S[9] + 1.2, 0.3, 0.9);
  if (on <= 0) return null;
  const m = easeInOut(prog(t, S[8] + 0.6, S[8] + 4.6));
  const water = easeInOut(prog(t, S[8] + 1.6, S[8] + 5.6));
  const d = toD(project, SOMALI_BLOCK);
  const [px, py] = project([36.5, -17.5]);
  const [, ny] = project([43, 13]);
  const [, sy] = project([35, -18]);
  const front = lerp(ny - 50, sy + 80, water);
  const mask = `linear-gradient(to bottom, black 0px, black ${front - 60}px, transparent ${front + 60}px)`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on }}>
      {/* дно разлома и вода в нём (видно только в щели) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill="#1d150e" />
      </svg>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, maskImage: mask, WebkitMaskImage: mask }}>
        <path d={d} fill="#0f4f8f" />
      </svg>
      {/* сам блок — копия карты, сдвинутая на восток с лёгким поворотом */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `path('${d}')`,
          transform: `translate(${62 * m}px, ${6 * m}px) rotate(${-3.2 * m}deg)`,
          transformOrigin: `${px}px ${py}px`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, filter: `brightness(${DARK.brightness}) saturate(${DARK.saturate}) contrast(${DARK.contrast})` }}>
          <TileLayer cam={cam} />
        </div>
      </div>
      <GeoArea rings={[...RED_SEA, ...ADEN]} fill={COL.water} opacity={0.35 * life(t, S[8] + 1.2, S[9] + 1.0, 0.5, 0.5)} />
    </div>
  );
};

/* 10. Красное море обведено */
const RedSea: React.FC<{ t: number }> = ({ t }) => (
  <>
    <GeoArea rings={RED_SEA} fill={COL.water} stroke={COL.waterLight} strokeWidth={3} opacity={0.45 * life(t, S[9] + 1.0, S[10] + 0.4, 0.5, 0.4)} />
    <Circle at={P.redSea} t={t} t0={S[9] + 1.4} t1={S[10] + 0.4} r={380} rx={130} rot={-30} width={7} dur={0.8} />
    <Label at={P.redSea} text="Қызыл теңіз" t={t} t0={S[9] + 1.9} t1={S[10] + 0.4} size={84} dx={150} dy={60} align="left" />
  </>
);

/* 11. Весь мир: границы плит */
const World: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[10] + 0.8, S[11] + 0.6, 0.6, 0.5);
  if (v <= 0) return null;
  return (
    <>
      {PLATES.map((l, i) => (
        <GeoPath key={i} line={l} color="rgba(255,255,255,0.75)" width={2.4} opacity={v} />
      ))}
    </>
  );
};

/* ───────── Экранные элементы ───────── */

const Hud: React.FC<{ t: number }> = ({ t }) => (
  <>
    <CrustSection t={t} />
    <Counter t={t} t0={S[2] + 1.0} t1={S[10] + 0.2} steps={[S[3] + 0.3, S[6] + 0.4, S[8] + 0.5]} />
    <Label at={[W / 2, 440]} screen text="Нубия ⟷ Сомали" t={t} t0={S[3] + 1.8} t1={S[4] + 0.4} size={84} />
    <Label at={[W / 2, 440]} screen text="Кения · 2018" t={t} t0={S[5] + 2.2} t1={S[6] + 0.5} size={84} />
    <NailNote t={t} />
    <Label at={[W / 2, 440]} screen text="жаңа мұхит" t={t} t0={S[8] + 3.2} t1={S[9] + 0.6} size={92} upper={false} />
    <Label at={[W / 2, 330]} screen text="ҰБТ" t={t} t0={S[10] + 0.3} t1={S[11] + 0.4} size={150} />
    <Label at={[W / 2, 1520]} screen text="дивергентті шекара" t={t} t0={S[10] + 4.9} t1={S[11] + 0.5} size={80} upper={false} />
    <Label at={[W / 2, 1620]} screen text="рифт" t={t} t0={S[10] + 5.7} t1={S[11] + 0.5} size={96} color={HOT} />
  </>
);

/* 8. «~мм / жыл» и ноготь для сравнения */
const NailNote: React.FC<{ t: number }> = ({ t }) => {
  const t0 = S[7] + 3.4;
  const t1 = S[8] + 0.3;
  const k = popIn(t, t0, 200, 13);
  const v = life(t, t0, t1, 0.2, 0.3);
  return (
    <>
      <Label at={[W / 2 + 80, 440]} screen text="~мм / жыл" t={t} t0={S[7] + 2.6} t1={t1} size={92} upper={false} />
      {v > 0 && k > 0.01 ? (
        <svg width={150} height={190} viewBox="-75 -95 150 190" style={{ position: "absolute", left: 250 - 75, top: 440 - 95, transform: `scale(${k})`, opacity: v, overflow: "visible", filter: "drop-shadow(0 5px 10px rgba(0,0,0,0.6))" }}>
          <path d="M-46,95 L-46,-30 C-46,-80 46,-80 46,-30 L46,95 Z" fill="#e2ad8a" stroke="#ffffff" strokeWidth={5} />
          <path d="M-30,-8 L-30,-42 C-30,-70 30,-70 30,-42 L30,-8 C18,0 -18,0 -30,-8 Z" fill="#f8dfd3" stroke="#c98d72" strokeWidth={3} />
          <path d="M-30,-48 C-20,-64 20,-64 30,-48" fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.9} />
        </svg>
      ) : null}
    </>
  );
};

/* 5. Разрез коры: магма поднимается, кора растягивается, середина проседает */
const CrustSection: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[4] + 0.1, S[5] + 0.4, 0.4, 0.4);
  if (v <= 0) return null;
  const mg = easeInOut(prog(t, S[4] + 0.5, S[4] + 2.4));
  const st = easeInOut(prog(t, S[4] + 1.8, S[4] + 4.6));
  const cx = W / 2;
  const top = 800;
  const base = 1060;
  const bot = 1380;
  const x0 = 70;
  const x1 = W - 70;
  const sx = 46 * st;
  const sink = 95 * st;
  const plumeTop = lerp(bot + 20, base + 18 - 40 * st, mg);
  const block = (pts: [number, number][], dx: number, dy: number) => pts.map(([x, y]) => `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`).join(" ");
  const left: [number, number][] = [
    [x0 - 60, top],
    [cx - 110, top],
    [cx - 64, base],
    [x0 - 60, base],
  ];
  const mid: [number, number][] = [
    [cx - 110, top],
    [cx + 110, top],
    [cx + 64, base],
    [cx - 64, base],
  ];
  const right: [number, number][] = [
    [cx + 110, top],
    [x1 + 60, top],
    [x1 + 60, base],
    [cx + 64, base],
  ];
  const strata = (dx: number, dy: number, xa: number, xb: number) =>
    [0.3, 0.55, 0.78].map((f) => <line key={f} x1={xa + dx} x2={xb + dx} y1={top + (base - top) * f + dy} y2={top + (base - top) * f + dy} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />);
  return (
    <>
      <Dim v={0.82 * v} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v }}>
        <defs>
          <clipPath id="secBox">
            <rect x={x0} y={top - 160} width={x1 - x0} height={bot - top + 160} rx={28} />
          </clipPath>
          <linearGradient id="mantle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a2a10" />
            <stop offset="1" stopColor="#3a1206" />
          </linearGradient>
          <radialGradient id="magma" cx="0.5" cy="0.15" r="0.75">
            <stop offset="0" stopColor="#fff1b0" />
            <stop offset="0.35" stopColor="#ffb13b" />
            <stop offset="1" stopColor="#ff5a2a" stopOpacity={0.85} />
          </radialGradient>
          <filter id="magGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={14} />
          </filter>
        </defs>
        <g clipPath="url(#secBox)">
          <rect x={x0} y={base - 30} width={x1 - x0} height={bot - base + 60} fill="url(#mantle)" />
          {/* магма поднимается снизу к коре */}
          <g opacity={mg > 0 ? 1 : 0}>
            <path d={`M${cx - 70},${bot + 20} C${cx - 60},${plumeTop + 120} ${cx - 160},${plumeTop + 40} ${cx - 120},${plumeTop} C${cx - 60},${plumeTop - 30} ${cx + 60},${plumeTop - 30} ${cx + 120},${plumeTop} C${cx + 160},${plumeTop + 40} ${cx + 60},${plumeTop + 120} ${cx + 70},${bot + 20} Z`} fill="#ff7a2a" filter="url(#magGlow)" opacity={0.8} />
            <path d={`M${cx - 70},${bot + 20} C${cx - 60},${plumeTop + 120} ${cx - 160},${plumeTop + 40} ${cx - 120},${plumeTop} C${cx - 60},${plumeTop - 30} ${cx + 60},${plumeTop - 30} ${cx + 120},${plumeTop} C${cx + 160},${plumeTop + 40} ${cx + 60},${plumeTop + 120} ${cx + 70},${bot + 20} Z`} fill="url(#magma)" />
          </g>
          {/* кора: три блока, средний проседает */}
          <polygon points={block(left, -sx, 0)} fill="#8a6a4a" stroke="#f1e6d6" strokeWidth={3} />
          {strata(-sx, 0, x0 - 60, cx - 90)}
          <polygon points={block(right, sx, 0)} fill="#8a6a4a" stroke="#f1e6d6" strokeWidth={3} />
          {strata(sx, 0, cx + 90, x1 + 60)}
          <polygon points={block(mid, 0, sink)} fill="#7b5c3f" stroke="#f1e6d6" strokeWidth={3} />
          {strata(0, sink, cx - 100, cx + 100)}
          {/* поверхность: тонкая полоса почвы */}
          <rect x={x0 - 60 - sx} y={top - 10} width={cx - 110 - (x0 - 60)} height={12} fill="#c9a27a" />
          <rect x={cx + 110 + sx} y={top - 10} width={x1 + 60 - (cx + 110)} height={12} fill="#c9a27a" />
          <rect x={cx - 110} y={top - 10 + sink} width={220} height={12} fill="#b5916b" />
        </g>
        <rect x={x0} y={top - 160} width={x1 - x0} height={bot - top + 160} rx={28} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        {st > 0 ? (
          <g opacity={clamp01(st * 3)} style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.6))" }}>
            <BigArrow x={cx - 210} y={top - 80} dir={-1} len={130} w={18} color={NUBIA} />
            <BigArrow x={cx + 210} y={top - 80} dir={1} len={130} w={18} color={SOMALI} />
          </g>
        ) : null}
      </svg>
      <Label at={[cx, top - 80 + sink * 0.6]} screen text="рифт" t={t} t0={S[4] + 3.6} t1={S[5] + 0.4} size={86} />
      <Label at={[cx, bot - 60]} screen text="магма" t={t} t0={S[4] + 1.4} t1={S[5] + 0.4} size={54} weight={500} color="#fff1b0" />
    </>
  );
};

