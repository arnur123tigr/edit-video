import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GeoImage, MapView, PatchLayer } from "../engine/MapView";
import { BigNumber, COL, Circle, Counter, Dim, FONT, GeoArea, GeoPath, Label, Pulse, TEXT_SHADOW, life, popIn } from "../engine/overlays";
import { Terrain3D, project3D } from "../engine/Terrain3D";
import { FPS, H, W, clamp01, easeInOut, easeOut, lerp, projector, prog, smooth } from "../engine/geo";
import {
  DEPRESSIONS,
  KG3D,
  KT3D,
  KZ,
  P,
  PROFILE,
  PROFILE_KM,
  S,
  TRANSECT,
  camAt,
  kgOpacity,
  kgView,
  ktOpacity,
  ktView,
} from "./plan";

export const Reel2: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  return (
    <AbsoluteFill style={{ background: "#020409" }}>
      <MapView
        cam={cam}
        t={t}
        base={
          <>
            <PatchLayer name="karagiye" zoomIn={8.75} zoomFull={9.7} />
            <PatchLayer name="atyrau" zoomIn={9.2} zoomFull={10.5} />
            <PatchLayer name="khantengri" zoomIn={8.8} zoomFull={10.2} />
          </>
        }
      >
        <Layers t={t} />
      </MapView>
      <Karagiye3D t={t} />
      <KhanTengri3D t={t} />
      <Hud t={t} />
    </AbsoluteFill>
  );
};

/* ───────── Слои на карте ───────── */

const Layers: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Depth t={t} />
    <Lowland t={t} />
    <Country t={t} />
    <Three t={t} />
    <World t={t} />
    <Transect t={t} />
    <AtyrauShot t={t} />
    <Link t={t} />
  </>
);

/* Впадина Қарақия окрашена синим: кадр 1, затем кадры 10–12 (в 11 — пульсирует) */
const Depth: React.FC<{ t: number }> = ({ t }) => {
  const a = smooth(t, 2.4, 3.2) * (1 - smooth(t, S[2] + 0.2, S[2] + 1.0));
  const b = smooth(t, S[9] + 1.4, S[9] + 2.2);
  const pulse = t > S[10] && t < S[11] ? 0.25 * (0.5 + 0.5 * Math.sin((t - S[10]) * Math.PI * 1.6)) : 0;
  const v = Math.max(a, b * (0.75 + pulse));
  return <GeoImage name="karagiye_depth" opacity={v} style={{ filter: `drop-shadow(0 0 ${8 + pulse * 40}px rgba(58,160,255,${0.5 + pulse}))` }} />;
};

/* Контур Казахстана — в кадрах 3 и 7 */
const Country: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[2] + 0.8, S[3] + 1.0, 0.6, 0.6) + life(t, S[6] + 0.6, S[7] + 0.8, 0.6, 0.6);
  return <GeoArea rings={KZ} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.8)" strokeWidth={3} opacity={clamp01(v)} />;
};

/* 3. Три точки: запад, город, юго-восток */
const Three: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Pulse at={P.karagiye} t={t} t0={S[2] + 2.3} t1={S[3] + 0.9} r={13} color={COL.waterLight} />
    <Pulse at={P.atyrau} t={t} t0={S[2] + 3.0} t1={S[3] + 0.9} r={13} color="#ffffff" />
    <Pulse at={P.khanTengri} t={t} t0={S[2] + 3.7} t1={S[3] + 0.9} r={13} color={COL.ice} />
  </>
);

/* 5. Весь мир: самые глубокие впадины суши */
const World: React.FC<{ t: number }> = ({ t }) => {
  const t1 = S[5] + 0.5;
  return (
    <>
      {DEPRESSIONS.map((d, i) => {
        const t0 = S[4] + 1.5 + i * 0.32;
        const kg = i === DEPRESSIONS.length - 1;
        return (
          <React.Fragment key={d.name}>
            <Pulse at={d.at} t={t} t0={t0} t1={t1} r={kg ? 13 : 9} color={kg ? COL.water : "#ffffff"} />
            <Label at={d.at} text={String(i + 1)} t={t} t0={t0 + 0.1} t1={t1} size={kg ? 54 : 42} dy={-48} color={kg ? COL.waterLight : COL.ink} />
          </React.Fragment>
        );
      })}
    </>
  );
};

/* 7. Линия разреза на карте: от Қарақии до Хан Тәңірі */
const Transect: React.FC<{ t: number }> = ({ t }) => {
  const p = easeInOut(prog(t, S[6] + 1.0, S[6] + 1.9));
  const v = life(t, S[6] + 0.9, S[7] + 0.4, 0.2, 0.4);
  return (
    <>
      <GeoPath line={TRANSECT} to={p} color="#fff" width={5} dash={[16, 12]} opacity={v} />
      <Pulse at={P.karagiye} t={t} t0={S[6] + 0.9} t1={S[7] + 0.4} r={10} color={COL.waterLight} />
      <Pulse at={P.khanTengri} t={t} t0={S[6] + 1.8} t1={S[7] + 0.4} r={10} color="#fff" />
    </>
  );
};

/* 8. Всё, что ниже уровня моря у Каспия, заливается синим */
const Lowland: React.FC<{ t: number }> = ({ t }) => {
  const reveal = easeInOut(prog(t, S[7] + 1.4, S[7] + 3.4));
  const on = life(t, S[7] + 1.4, S[10] + 0.9, 0.2, 0.7);
  // у Атырау слой почти гасим, чтобы были видны улицы
  const street = smooth(t, S[8] + 1.2, S[8] + 2.2) * (1 - smooth(t, S[9] + 0.2, S[9] + 1.4));
  return <GeoImage name="caspian_low" opacity={on * lerp(0.58, 0.12, street)} reveal={{ at: P.caspian, p: reveal, r: 1500 }} />;
};

/* 9. Атырау: город обведён */
const AtyrauShot: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Circle at={P.atyrau} t={t} t0={S[8] + 2.3} t1={S[9] + 0.6} r={330} rx={300} width={7} dur={0.8} />
    <Label at={P.atyrau} text="Атырау ≈ −20 м" t={t} t0={S[8] + 2.9} t1={S[9] + 0.6} size={92} dy={-420} upper={false} />
  </>
);

/* 10. Атырау и Қарақия на одной карте, соединены линией */
const Link: React.FC<{ t: number }> = ({ t }) => {
  const p = easeInOut(prog(t, S[9] + 1.0, S[9] + 2.3));
  const v = life(t, S[9] + 0.9, S[10] + 0.6, 0.2, 0.5);
  return (
    <>
      <GeoPath line={[P.atyrau, P.karagiye]} to={p} color="#fff" width={5} glow={4} opacity={v} />
      <Pulse at={P.atyrau} t={t} t0={S[9] + 0.7} t1={S[10] + 0.6} r={12} color="#fff" />
      <Pulse at={P.karagiye} t={t} t0={S[9] + 2.0} t1={S[10] + 0.6} r={12} color={COL.waterLight} />
    </>
  );
};

/* ───────── 3D-рельеф ───────── */

const KG_LEVEL: [number, number, number, number] = [51.42, 43.2, 51.96, 43.84];

/* 4. Қарақия в 3D: обрывы поднимаются, дно уходит вниз, уровень моря — пунктир сверху */
const Karagiye3D: React.FC<{ t: number }> = ({ t }) => {
  const op = kgOpacity(t);
  if (op <= 0) return null;
  const view = kgView(t);
  const lvl = smooth(t, KG3D.in + 1.5, KG3D.in + 2.1) * (1 - smooth(t, S[4] - 0.35, S[4] - 0.05));
  const lab = (at: [number, number], m: number) => project3D(view, at, m);
  return (
    <>
      <Terrain3D
        view={view}
        patch="karagiye"
        heightName="karagiye_h"
        ground="karagiye_ground"
        tint={{ name: "karagiye_depth", opacity: 0.55 }}
        level={{ bounds: KG_LEVEL, meters: 0, opacity: lvl }}
        opacity={op}
        sun={[-1, 0.5, 0.75]}
      />
      <div style={{ opacity: op }}>
        <Label at={lab(P.karagiye, -132)} screen text="Қарақия" t={t} t0={KG3D.in + 1.0} t1={S[4] - 0.1} size={96} dy={-40} />
        <Label at={lab([KG_LEVEL[2], 43.32], 0)} screen text="0 м" t={t} t0={KG3D.in + 2.0} t1={S[4] - 0.2} size={52} weight={500} dx={-20} dy={-34} align="right" upper={false} />
        <Label at={lab(P.karagiye, -132)} screen text="−132 м" t={t} t0={KG3D.in + 2.4} t1={S[4] - 0.1} size={60} weight={500} dy={50} upper={false} />
      </div>
    </>
  );
};

/* 6. Хан Тәңірі в 3D: гора поднимается */
const KhanTengri3D: React.FC<{ t: number }> = ({ t }) => {
  const op = ktOpacity(t);
  if (op <= 0) return null;
  const view = ktView(t);
  const [px, py] = project3D(view, P.khanTengri, 6995);
  return (
    <>
      <Terrain3D view={view} patch="khantengri" heightName="khantengri_h" ground="khantengri_ground" opacity={op} sun={[0.7, 1, 0.8]} />
      <div style={{ opacity: op }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: life(t, KT3D.in + 1.6, KT3D.out, 0.3, 0.2) }}>
          <line x1={px} y1={py - 18} x2={px} y2={py - 120} stroke="#fff" strokeWidth={4} />
          <circle cx={px} cy={py} r={9} fill="#fff" stroke="rgba(0,0,0,0.5)" strokeWidth={3} />
        </svg>
        <Label at={[px, py]} screen text="Хан Тәңірі" t={t} t0={KT3D.in + 1.7} t1={KT3D.out} size={78} dy={-160} />
      </div>
    </>
  );
};

/* ───────── Экранные элементы ───────── */

const Hud: React.FC<{ t: number }> = ({ t }) => (
  <>
    <DepthRuler t={t} />
    <Ranking t={t} />
    <HeightRuler t={t} />
    <Section t={t} />
    <Counter t={t} t0={S[2] + 1.2} t1={S[10] + 0.2} steps={[S[4] + 0.3, S[5] + 0.9, S[7] + 0.6]} />
    <Label at={[W / 2, 440]} screen text="№5 әлемде" t={t} t0={S[4] + 3.1} t1={S[5] + 0.4} size={92} upper={false} />
    <Label at={[W / 2, 440]} screen text="0 м-ден төмен" t={t} t0={S[7] + 2.6} t1={S[8] + 0.8} size={88} upper={false} />
    <Label at={[W / 2, 330]} screen text="ҰБТ" t={t} t0={S[10] + 0.3} t1={S[11] + 0.4} size={150} />
    <EntAnswer t={t} />
  </>
);

/* 1–2. Линейка глубины уходит вниз; рядом Бәйтерек целиком помещается в яме */
const RULER = { x: 880, y0: 610, k: 6.6 };
const DepthRuler: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, 2.9, S[2] + 0.6, 0.3, 0.5);
  if (v <= 0) return null;
  const p = easeInOut(prog(t, 3.0, 4.1));
  const { x, y0, k } = RULER;
  const y1 = y0 + 132 * k;
  const tip = y0 + (y1 - y0) * p;
  const ticks = [];
  for (let m = 10; m <= 130; m += 10) {
    const y = y0 + m * k;
    if (y > tip) break;
    ticks.push(<line key={m} x1={x - (m % 50 === 0 ? 26 : 14)} y1={y} x2={x} y2={y} stroke="#fff" strokeWidth={3} opacity={0.85} />);
  }
  const by = popIn(t, S[1] + 0.2, 150, 15);
  const bTop = y1 - 97 * k;
  return (
    <>
      <Dim v={0.3 * v} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))" }}>
        {/* уровень моря */}
        <line x1={60} y1={y0} x2={W - 60} y2={y0} stroke="#fff" strokeWidth={3} strokeDasharray="18 12" opacity={0.8} />
        <line x1={x} y1={y0} x2={x} y2={tip} stroke={COL.waterLight} strokeWidth={8} strokeLinecap="round" />
        {ticks}
        <circle cx={x} cy={tip} r={11} fill={COL.waterLight} stroke="#fff" strokeWidth={3} />
        {/* Бәйтерек дотягивается только до −35 м */}
        {by > 0.02 ? (
          <line x1={640 + 50} y1={bTop} x2={x - 10} y2={bTop} stroke="#fff" strokeWidth={3} strokeDasharray="6 9" opacity={life(t, S[1] + 0.9, 1e9, 0.3) * 0.9} />
        ) : null}
      </svg>
      <Label at={[x + 26, y0 - 44]} screen text="0 м" t={t} t0={3.0} size={50} weight={500} align="right" upper={false} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y1 + 78,
          transform: "translate(-62%, -50%)",
          opacity: v * smooth(t, 3.0, 3.3),
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 100,
          lineHeight: 1,
          color: COL.ink,
          whiteSpace: "nowrap",
          textShadow: TEXT_SHADOW,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        −{Math.round(132 * easeOut(prog(t, 3.0, 4.1)))} м
      </div>
      {by > 0.01 ? (
        <div style={{ position: "absolute", left: 640, top: y1, transform: `translateX(-50%) translateY(${(1 - by) * 60}px)`, opacity: clamp01(by * 1.5) }}>
          <Bayterek h={97 * k} />
        </div>
      ) : null}
      <Label at={[640, bTop - 54]} screen text="Бәйтерек" t={t} t0={S[1] + 0.5} size={78} />
    </>
  );
};

/** Силуэт Бәйтерека: белый ствол, «ветви»-колонны, обнимающие золотой шар. h — высота в px (97 м). */
const Bayterek: React.FC<{ h: number }> = ({ h }) => {
  const w = h * 0.5;
  // ветви: от верха ствола расходятся и загибаются вверх вокруг шара
  const branches = [-15, -12, -8.5, -4.5, 4.5, 8.5, 12, 15];
  return (
    <svg width={w} height={h} viewBox="0 0 50 100" style={{ position: "absolute", left: -w / 2, top: -h, overflow: "visible" }}>
      <defs>
        <radialGradient id="btSphere" cx="0.38" cy="0.35" r="0.72">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="0.5" stopColor="#ecc261" />
          <stop offset="1" stopColor="#a87a2c" />
        </radialGradient>
      </defs>
      <path d="M19,100 L31,100 L28.4,93 L26.2,40 L23.8,40 L21.6,93 Z" fill="#f4f6fa" />
      {branches.map((dx) => (
        <path key={dx} d={`M25,42 C${25 + dx * 0.15},30 ${25 + dx * 1.05},26 ${25 + dx * 0.95},4`} fill="none" stroke="#e9edf4" strokeWidth={1.3} strokeLinecap="round" />
      ))}
      <circle cx={25} cy={14} r={11.3} fill="url(#btSphere)" />
      {[-6, 0, 6].map((dx) => (
        <path key={`f${dx}`} d={`M25,42 C${25 + dx * 0.2},32 ${25 + dx * 1.6},30 ${25 + dx * 1.5},12`} fill="none" stroke="#f4f6fa" strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </svg>
  );
};

/* 5. Рейтинг впадин (без плашек: просто строки) */
const Ranking: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[4] + 1.5, S[5] + 0.4, 0.2, 0.4);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      {DEPRESSIONS.map((d, i) => {
        const kg = i === DEPRESSIONS.length - 1;
        const t0 = S[4] + 1.6 + i * 0.32;
        const k = popIn(t, t0, 200, 15);
        const y = 1330 + i * 84 + (kg ? 14 : 0);
        const size = kg ? 66 : 52;
        const color = kg ? COL.waterLight : COL.ink;
        const style: React.CSSProperties = {
          position: "absolute",
          top: y,
          fontFamily: FONT,
          fontWeight: kg ? 700 : 500,
          fontSize: size,
          lineHeight: 1,
          color,
          whiteSpace: "nowrap",
          textShadow: TEXT_SHADOW,
          opacity: clamp01(k * 1.4) * (kg ? 1 : 0.92),
          transform: `translate(${(1 - k) * -40}px, -50%)`,
        };
        return (
          <React.Fragment key={d.name}>
            <div style={{ ...style, left: 150, width: 60, textAlign: "right" }}>{i + 1}</div>
            <div style={{ ...style, left: 250, textTransform: "uppercase" }}>{d.name}</div>
            <div style={{ ...style, right: 150, fontVariantNumeric: "tabular-nums" }}>{`−${-d.depth} м`}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* 6. Линейка высоты растёт вверх до 7 010 м */
const HeightRuler: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[5] + 2.2, KT3D.out, 0.3, 0.3);
  if (v <= 0) return null;
  const p = easeInOut(prog(t, S[5] + 2.3, S[5] + 4.0));
  const x = 985;
  const y0 = 1560;
  const y1 = 600;
  const tip = lerp(y0, y1, p);
  const ticks = [];
  for (let m = 1000; m <= 7000; m += 1000) {
    const y = lerp(y0, y1, m / 7010);
    if (y < tip) break;
    ticks.push(<line key={m} x1={x - 22} y1={y} x2={x} y2={y} stroke="#fff" strokeWidth={3} opacity={0.85} />);
  }
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))" }}>
        <line x1={x} y1={y0} x2={x} y2={tip} stroke="#fff" strokeWidth={8} strokeLinecap="round" />
        {ticks}
        <circle cx={x} cy={tip} r={11} fill={COL.ice} stroke="#fff" strokeWidth={3} />
      </svg>
      <BigNumber t={t} t0={S[5] + 2.3} t1={KT3D.out} value={7010} unit="м" count={1.7} y={470} />
    </>
  );
};

/* 7. Разрез рельефа запад → восток, перепад 7 142 м и «башня» из Бәйтереков */
const SEC = { x0: 90, x1: 880, top: 720, bottom: 1520 };
const secY = (m: number) => SEC.bottom - ((m + 132) / 7142) * (SEC.bottom - SEC.top);
const SEC_PTS = PROFILE.map(([km, m]) => [SEC.x0 + (km / PROFILE_KM) * (SEC.x1 - SEC.x0), secY(m)] as [number, number]);
const SEC_LINE = "M" + SEC_PTS.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
const SEC_AREA = `${SEC_LINE}L${SEC.x1},${SEC.bottom + 40}L${SEC.x0},${SEC.bottom + 40}Z`;

const Section: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[6] + 1.6, S[7] + 0.5, 0.4, 0.5);
  if (v <= 0) return null;
  const p = easeInOut(prog(t, S[6] + 1.9, S[6] + 3.4));
  const clipX = lerp(SEC.x0 - 10, SEC.x1 + 12, p);
  const arrow = easeOut(prog(t, S[6] + 3.3, S[6] + 3.9));
  const ax = 960;
  const ya = secY(-132);
  const yb = secY(7010);
  const n = 74;
  const stackP = prog(t, S[6] + 4.1, S[6] + 5.6);
  const shown = Math.floor(n * stackP);
  const bh = (ya - yb) / n;
  return (
    <>
      <Dim v={0.8 * v} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v }}>
        <defs>
          <linearGradient id="secFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f4f8" stopOpacity={0.55} />
            <stop offset="0.35" stopColor="#c9a27a" stopOpacity={0.45} />
            <stop offset="1" stopColor="#6b5640" stopOpacity={0.35} />
          </linearGradient>
          <clipPath id="secClip">
            <rect x={0} y={0} width={clipX} height={H} />
          </clipPath>
        </defs>
        {/* уровень моря */}
        <line x1={SEC.x0 - 30} y1={secY(0)} x2={SEC.x1 + 20} y2={secY(0)} stroke={COL.waterLight} strokeWidth={3} strokeDasharray="14 10" opacity={0.9} />
        <g clipPath="url(#secClip)">
          <path d={SEC_AREA} fill="url(#secFill)" />
          <path d={SEC_LINE} fill="none" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
        </g>
        {/* стрелка перепада */}
        {arrow > 0 ? (
          <g opacity={arrow} stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1={ax} y1={ya} x2={ax} y2={lerp(ya, yb, arrow)} />
            <path d={`M${ax - 16},${ya - 20} L${ax},${ya} L${ax + 16},${ya - 20}`} />
            <path d={`M${ax - 16},${lerp(ya, yb, arrow) + 20} L${ax},${lerp(ya, yb, arrow)} L${ax + 16},${lerp(ya, yb, arrow) + 20}`} />
            <line x1={SEC.x0 - 20} y1={ya} x2={ax + 24} y2={ya} strokeWidth={2} strokeDasharray="4 8" opacity={0.7} />
            <line x1={SEC.x1 - 20} y1={yb} x2={ax + 24} y2={yb} strokeWidth={2} strokeDasharray="4 8" opacity={0.7} />
          </g>
        ) : null}
        {/* 74 Бәйтерека друг на друге */}
        {Array.from({ length: shown }).map((_, i) => {
          const yb0 = ya - i * bh;
          const cx = ax + 52;
          return (
            <g key={i}>
              <line x1={cx} y1={yb0} x2={cx} y2={yb0 - bh * 0.55} stroke="#f4f6fa" strokeWidth={3.2} />
              <path d={`M${cx - bh * 0.45},${yb0 - bh * 0.95} Q${cx},${yb0 - bh * 0.35} ${cx + bh * 0.45},${yb0 - bh * 0.95}`} fill="none" stroke="#f4f6fa" strokeWidth={1.6} />
              <circle cx={cx} cy={yb0 - bh * 0.72} r={bh * 0.3} fill="#ecc261" />
            </g>
          );
        })}
      </svg>
      <Label at={[SEC.x0, secY(-132) + 64]} screen text="Қарақия −132" t={t} t0={S[6] + 2.0} t1={S[7] + 0.5} size={50} weight={500} align="left" />
      <Label at={[SEC.x1 - 10, yb - 44]} screen text="Хан Тәңірі 7 010" t={t} t0={S[6] + 3.2} t1={S[7] + 0.5} size={50} weight={500} align="right" />
      <Label at={[SEC.x0 - 20, secY(0) - 34]} screen text="0 м" t={t} t0={S[6] + 2.0} t1={S[7] + 0.5} size={40} weight={500} align="left" upper={false} color={COL.waterLight} />
      <Label at={[W / 2, 450]} screen text="7 142 м" t={t} t0={S[6] + 3.6} t1={S[7] + 0.5} size={130} upper={false} />
      <Label at={[W / 2, 552]} screen text="≈ 70 Бәйтерек" t={t} t0={S[6] + 4.6} t1={S[7] + 0.5} size={62} weight={500} upper={false} />
    </>
  );
};

/* 11. Ответ ҰБТ: Қарақия ойысы, −132 м (подписи привязаны к впадине) */
const EntAnswer: React.FC<{ t: number }> = ({ t }) => {
  if (t < S[10] + 4.4 || t > S[11] + 0.6) return null;
  const [x, y] = projector(camAt(t))(P.karagiye);
  return (
    <>
      <Label at={[x, y - 290]} screen text="Қарақия ойысы" t={t} t0={S[10] + 4.6} t1={S[11] + 0.5} size={84} />
      <Label at={[x, y + 300]} screen text="−132 м" t={t} t0={S[10] + 5.6} t1={S[11] + 0.5} size={120} upper={false} />
    </>
  );
};
