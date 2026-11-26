import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MapView, PatchLayer, WaterGlow } from "../engine/MapView";
import {
  BigNumber,
  COL,
  Circle,
  City,
  Counter,
  Dim,
  Drop,
  FlagBadge,
  GeoArea,
  GeoPath,
  IceFloes,
  Label,
  Pulse,
  life,
  popIn,
} from "../engine/overlays";
import { FPS, H, LngLat, W, along, clamp01, easeInOut, easeInOutSine, lerp, prog, smooth } from "../engine/geo";
import { useMap } from "../engine/MapView";
import {
  BORDER_KZ_CN,
  BORDER_KZ_RU,
  F,
  KARA,
  KZ,
  P,
  S,
  ZAISAN,
  camAt,
  drop1,
  drop2,
  drop3,
  esil,
  esilCity,
  irtysh,
  ob,
  obRiver,
  others,
  route,
  tobol,
} from "./plan";

/** Надпись кадра 2 (по сценарию). Ближайшая вода Северного Ледовитого океана — Обская губа, ~1 700 км. */
const DIST_LABEL = "2 000+ км";

export const Reel1: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cam = camAt(t);
  return (
    <AbsoluteFill style={{ background: "#020409" }}>
      <MapView cam={cam} t={t} base={<PatchLayer name="astana" zoomIn={7.9} zoomFull={9.1} />}>
        <Layers t={t} />
      </MapView>
      <Hud t={t} />
    </AbsoluteFill>
  );
};

/* ───────── Слои на карте ───────── */

const Layers: React.FC<{ t: number }> = ({ t }) => {
  return (
    <>
      <Shot1 t={t} />
      <Country t={t} />
      <Ocean t={t} />
      <Rivers t={t} />
      <Shot2 t={t} />
      <Shot3 t={t} />
      <Esil t={t} />
      <Irtysh t={t} />
      <ObLayer t={t} />
      <Compare t={t} />
      <Finale t={t} />
      <Ent t={t} />
    </>
  );
};

/* 1. Хук: Есіл в Астане светится, по нему бежит капля */
const Shot1: React.FC<{ t: number }> = ({ t }) => {
  const glow = smooth(t, 2.2, 2.9) * (1 - smooth(t, S[1] + 0.4, S[1] + 1.2));
  const p = lerp(0.04, 0.78, easeInOutSine(prog(t, 2.55, S[1] + 0.6)));
  const fade = 1 - smooth(t, S[1] + 0.3, S[1] + 0.9);
  return (
    <>
      <WaterGlow name="astana" layer="river" opacity={glow} blur={8} />
      <GeoPath line={esilCity} from={0} to={p} color={COL.waterLight} width={6} glow={7} opacity={fade * smooth(t, 2.5, 2.8)} />
      <Drop at={along(esilCity, p)} t={t} t0={2.55} opacity={fade} size={0.9} />
      <Label at={along(esilCity, 0.5)} text="Есіл" t={t} t0={2.95} t1={S[1] + 0.8} size={92} dy={-150} />
    </>
  );
};

/* Контур Казахстана */
const Country: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[1] + 1.0, S[4] + 1.0, 0.6, 0.8) + 0.6 * life(t, S[10] + 0.4, S[11] + 0.8, 0.6, 0.6);
  return <GeoArea rings={KZ} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.85)" strokeWidth={3} opacity={clamp01(v)} />;
};

/* Океан на севере мигает белым (кадр 2) и льдистое море (кадр 10) */
const Ocean: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, S[1] + 2.0, S[2]);
  const blink2 = t > S[1] + 2.0 && t < S[2] + 0.6 ? 0.12 + 0.38 * Math.abs(Math.sin(a * Math.PI * 2.5)) * (1 - prog(t, S[2], S[2] + 0.6)) : 0;
  const blink10 = life(t, S[9] + 3.9, S[10] + 0.6, 0.3, 0.6) * 0.32;
  const v = Math.max(blink2, blink10);
  const at = blink10 > blink2 ? P.kara : ([68.5, 71.2] as LngLat);
  return <GeoArea rings={KARA} fill="rgba(235,246,255,1)" opacity={v} spot={{ at, r: blink10 > blink2 ? 520 : 460 }} />;
};

/* Реки: тонкая подсветка, пока они «в кадре по сюжету» */
const Rivers: React.FC<{ t: number }> = ({ t }) => {
  const faint = life(t, S[2] + 0.2, S[10] + 0.4, 0.6, 0.5) * (1 - smooth(t, S[8], S[8] + 0.6) + smooth(t, S[9], S[9] + 0.6));
  return (
    <>
      <GeoPath line={esil} color={COL.waterDim} width={3} opacity={faint} />
      <GeoPath line={irtysh} color={COL.waterDim} width={3} opacity={faint} />
      <GeoPath line={ob} color={COL.waterDim} width={3} opacity={faint} />
    </>
  );
};

/* 2. Подъём: до океана далеко */
const Shot2: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const kara = KARA.flat().reduce((best, p) => (dist2(p, P.astana) < dist2(best, P.astana) ? p : best), KARA[0][0]) as LngLat;
  const p = easeInOut(prog(t, S[1] + 1.6, S[1] + 2.8));
  const v = life(t, S[1] + 1.6, S[2] + 0.5, 0.2, 0.5);
  const [ax, ay] = project(P.astana);
  const [bx, by] = project(kara);
  return (
    <>
      <GeoPath line={[P.astana, kara]} to={p} color="#fff" width={5} dash={[16, 14]} opacity={v} />
      <Pulse at={P.astana} t={t} t0={S[1] + 1.4} t1={S[2] + 0.5} r={10} color="#fff" />
      <Label at={[(ax + bx) / 2, (ay + by) / 2]} screen text={DIST_LABEL} t={t} t0={S[1] + 2.3} t1={S[2] + 0.5} size={88} dx={40} align="left" />
    </>
  );
};
const dist2 = (a: LngLat, b: LngLat) => (a[0] - b[0]) ** 2 + ((a[1] - b[1]) * 1.6) ** 2;

/* 3. Обещание: пунктир будущего пути капли */
const Shot3: React.FC<{ t: number }> = ({ t }) => {
  const p = easeInOut(prog(t, S[2] + 0.4, S[2] + 2.6));
  const v = life(t, S[2] + 0.4, S[3] + 0.6, 0.2, 0.6);
  return (
    <>
      <GeoPath line={route} to={p} color="#fff" width={5} dash={[3, 13]} opacity={v} />
      <Pulse at={P.astana} t={t} t0={S[2] + 0.2} t1={S[3] + 0.6} r={10} color={COL.waterLight} />
      <Drop at={along(route, 0)} t={t} t0={S[2] + 0.3} size={0.7} opacity={1 - smooth(t, S[3] + 0.1, S[3] + 0.5)} />
    </>
  );
};

/* 4–5. Капля по Есілю: Петропавл, граница, слияние с Ертісом */
const Esil: React.FC<{ t: number }> = ({ t }) => {
  const f = drop1(t);
  const on = life(t, S[3] + 0.2, S[5] + 0.8, 0.3, 0.6);
  const crossT = S[3] + 3.4; // капля на границе
  const flash = t > crossT - 0.2 ? Math.max(0, 1 - (t - crossT) / 1.2) : 0;
  const irtLit = life(t, S[4] + 1.0, S[5] + 0.8, 0.5, 0.6);
  return (
    <>
      <GeoPath line={BORDER_KZ_RU.flat()} color="#fff" width={3 + flash * 3} glow={flash * 4} opacity={on * (0.3 + 0.6 * flash)} />
      <GeoPath line={esil} from={F.esilAstana} to={f} color={COL.water} width={7} glow={6} opacity={on} />
      {/* Ертіс у слияния: участок вниз по течению загорается, когда капля впадает */}
      <GeoPath line={irtysh} from={F.irtUstIshim - 0.06} to={lerp(F.irtUstIshim, F.irtUstIshim + 0.08, smooth(t, S[4] + 1.2, S[4] + 2.6))} color={COL.water} width={9} glow={7} opacity={irtLit} />
      <Drop at={along(esil, f)} t={t} t0={S[3] + 0.4} opacity={life(t, S[3] + 0.4, S[4] + 2.0, 0.1, 0.4)} />
      <City at={P.petropavl} name="Петропавл" t={t} t0={S[3] + 2.0} t1={S[4] + 0.4} side="r" />
      <Label at={along(esil, lerp(F.esilAstana, F.esilBorder, 0.45))} text="Есіл" t={t} t0={S[3] + 0.6} t1={S[4] + 0.6} size={76} dx={-110} />
      <Circle at={P.ustIshim} t={t} t0={S[4] + 1.5} t1={S[5] + 0.3} r={92} />
      <Label at={P.ustIshim} text="Ертіс" t={t} t0={S[4] + 2.2} t1={S[5] + 0.4} size={84} dy={-170} />
    </>
  );
};

/* 6–7. Ертіс: исток в Китае, Зайсан, капля до Ханты-Мансийска, длина 4 248 км */
const Irtysh: React.FC<{ t: number }> = ({ t }) => {
  const up = easeInOut(prog(t, S[5] + 0.1, S[5] + 2.4)); // подсветка бежит вверх по реке за камерой
  const upV = life(t, S[5], S[5] + 3.3, 0.2, 0.6);
  const f = drop2(t);
  const on = life(t, S[5] + 2.9, S[7] + 4.6, 0.3, 0.6);
  const zais = life(t, S[5] + 2.7, S[6] + 1.6, 0.4, 0.6);
  return (
    <>
      <GeoPath line={irtysh} from={lerp(F.irtUstIshim, 0, up)} to={F.irtUstIshim} color={COL.waterLight} width={5} glow={5} opacity={upV * 0.9} />
      <GeoArea rings={ZAISAN} fill={COL.water} stroke={COL.waterLight} strokeWidth={3} glow={6} opacity={zais * 0.85} />
      <GeoPath line={BORDER_KZ_CN.flat()} color="#fff" width={3} opacity={life(t, S[5] + 2.6, S[6] + 0.8, 0.4, 0.6) * 0.6} />
      <GeoPath line={irtysh} from={0} to={f} color={COL.water} width={8} glow={6} opacity={on} />
      <Pulse at={P.source} t={t} t0={S[5] + 2.5} t1={S[6] + 0.8} r={12} color={COL.waterLight} />
      <FlagBadge at={P.source} kind="cn" t={t} t0={S[5] + 2.7} t1={S[6] + 0.8} dx={-20} dy={-150} />
      <Label at={P.zaisan} text="Қытай → Зайсан" t={t} t0={S[5] + 2.9} t1={S[6] + 1.0} size={70} dy={170} />
      <Drop at={along(irtysh, f)} t={t} t0={S[5] + 3.0} opacity={life(t, S[5] + 3.0, S[7] + 0.6, 0.1, 0.4)} />
      <City at={P.semey} name="Семей" t={t} t0={S[6] + 1.6} t1={S[6] + 4.2} side="r" />
      <City at={P.pavlodar} name="Павлодар" t={t} t0={S[6] + 2.6} t1={S[6] + 5.2} side="r" />
      <City at={P.omsk} name="Омбы" t={t} t0={S[6] + 3.9} t1={S[6] + 6.4} side="r" />
      <City at={P.khm} name="Ханты-Мансийск" t={t} t0={S[6] + 5.6} t1={S[7] + 1.2} side="r" />
    </>
  );
};

/* 8. Обь: тоньше, вливается Ертіс */
const ObLayer: React.FC<{ t: number }> = ({ t }) => {
  const p = easeInOut(prog(t, S[7] + 0.3, S[7] + 2.4));
  const v = life(t, S[7] + 0.2, S[8] + 0.6, 0.3, 0.5);
  const irtV = life(t, S[7], S[8] + 0.6, 0.2, 0.5);
  return (
    <>
      <GeoPath line={irtysh} color={COL.water} width={9} glow={6} opacity={irtV} />
      <GeoPath line={ob} from={0} to={lerp(0, F.obKhm, p)} color={COL.waterLight} width={4} glow={4} opacity={v} />
      <Circle at={P.confIrtOb} t={t} t0={S[7] + 2.3} t1={S[8] + 0.4} r={70} />
      <Label at={along(ob, F.obKhm * 0.45)} text="Обь" t={t} t0={S[7] + 0.9} t1={S[8] + 0.5} size={84} dy={-110} />
      <Label at={along(ob, F.obKhm * 0.45)} text="3 650 км" t={t} t0={S[7] + 2.4} t1={S[8] + 0.5} size={64} weight={500} dy={-40} upper={false} />
      <Label at={along(irtysh, 0.62)} text="Ертіс" t={t} t0={S[7] + 0.6} t1={S[8] + 0.5} size={76} dx={-130} />
    </>
  );
};

/* 9. Две реки выпрямляются в столбики: Ертіс длиннее Обі */
const RES = 140;
const resample = (m: typeof irtysh) => Array.from({ length: RES }, (_, i) => along(m, i / (RES - 1)));
const IRT_PTS = resample(irtysh);
const OB_PTS = resample(obRiver);

const Compare: React.FC<{ t: number }> = ({ t }) => {
  const { project } = useMap();
  const v = life(t, S[8], S[9] + 0.35, 0.3, 0.4);
  if (v <= 0) return null;
  const m = easeInOut(prog(t, S[8] + 0.2, S[8] + 1.5));
  const base = 1420;
  const hI = 880;
  const hO = (hI * 3650) / 4248;
  const bar = (pts: LngLat[], x: number, h: number) =>
    pts.map((p, i) => {
      const [sx, sy] = project(p);
      // исток внизу, устье наверху
      const tx = x;
      const ty = base - (h * i) / (RES - 1);
      return [lerp(sx, tx, m), lerp(sy, ty, m)] as [number, number];
    });
  const d = (pts: [number, number][]) => "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
  const wI = lerp(9, 54, m);
  const wO = lerp(4, 54, m);
  const xI = 390;
  const xO = 690;
  const lab = smooth(t, S[8] + 1.3, S[8] + 1.7);
  return (
    <>
      <Dim v={0.62 * v} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: v }}>
        <path d={d(bar(IRT_PTS, xI, hI))} stroke={COL.water} strokeWidth={wI} fill="none" strokeLinecap="butt" strokeLinejoin="round" />
        <path d={d(bar(OB_PTS, xO, hO))} stroke={COL.waterLight} strokeWidth={wO} fill="none" strokeLinecap="butt" strokeLinejoin="round" />
      </svg>
      <div style={{ opacity: v * lab }}>
        <Label at={[xI, base + 60]} screen text="Ертіс" t={t} t0={S[8] + 1.3} size={64} />
        <Label at={[xO, base + 60]} screen text="Обь" t={t} t0={S[8] + 1.4} size={64} />
        <Label at={[xI, base - hI - 50]} screen text="4 248" t={t} t0={S[8] + 1.5} size={60} weight={500} />
        <Label at={[xO, base - hO - 50]} screen text="3 650" t={t} t0={S[8] + 1.6} size={60} weight={500} />
      </div>
      <SalaLabel t={t} v={v} />
    </>
  );
};

/** «сала > өзен», слово «сала» обводится кругом */
const SalaLabel: React.FC<{ t: number; v: number }> = ({ t, v }) => {
  const y = 330;
  const k = popIn(t, S[8] + 2.6, 190, 14);
  return (
    <div style={{ opacity: v }}>
      <Label at={[W / 2, y]} screen text="сала > өзен" t={t} t0={S[8] + 2.6} size={100} upper={false} />
      {k > 0 ? <Circle at={[W / 2 - 175, y + 4]} screen t={t} t0={S[8] + 3.3} r={84} rx={118} width={7} /> : null}
    </div>
  );
};

/* 10. По Оби в Карское море, отъезд — весь путь от Астаны одной линией */
const Finale: React.FC<{ t: number }> = ({ t }) => {
  const f = drop3(t);
  const on = life(t, S[9] + 0.3, S[10] + 0.6, 0.3, 0.6);
  const full = smooth(t, S[9] + 5.0, S[9] + 6.6);
  return (
    <>
      <GeoPath line={ob} from={F.obKhm} to={f} color={COL.water} width={8} glow={6} opacity={on} />
      <GeoPath line={route} color={COL.waterLight} width={7} glow={8} opacity={on * full} />
      <Drop at={along(ob, f)} t={t} t0={S[9] + 0.4} opacity={life(t, S[9] + 0.4, S[9] + 4.6, 0.1, 0.4)} />
      <IceFloes around={P.kara} t={t} t0={S[9] + 3.9} t1={S[10] + 0.4} spread={170} />
      <Label at={P.kara} text="Мұзды мұхит" t={t} t0={S[9] + 4.1} t1={S[10] + 0.4} size={82} dy={-150} />
      <Pulse at={P.astana} t={t} t0={S[9] + 5.6} t1={S[10] + 0.4} r={10} color="#fff" />
    </>
  );
};

/* 11. ҰБТ: реки по бассейнам — север голубой, остальные серые */
const Ent: React.FC<{ t: number }> = ({ t }) => {
  const v = life(t, S[10] + 0.6, S[11] + 0.6, 0.5, 0.6);
  if (v <= 0) return null;
  const color = smooth(t, S[10] + 2.0, S[10] + 2.8);
  return (
    <>
      {others.map((m, i) => (
        <GeoPath key={`o${i}`} line={m} color="rgba(165,171,182,0.95)" width={7} opacity={v} />
      ))}
      {[irtysh, esil, tobol].map((m, i) => (
        <GeoPath key={`n${i}`} line={m} color={color > 0.5 ? COL.water : "rgba(165,171,182,0.95)"} width={lerp(7, 8, color)} glow={color * 6} opacity={v} />
      ))}
      <Label at={[77.6, 51.6]} text="Ертіс" t={t} t0={S[10] + 5.6} t1={S[11] + 0.5} size={62} dx={70} />
      <Label at={[69.4, 51.55]} text="Есіл" t={t} t0={S[10] + 6.1} t1={S[11] + 0.5} size={62} dy={52} />
      <Label at={[64.6, 54.8]} text="Тобыл" t={t} t0={S[10] + 6.6} t1={S[11] + 0.5} size={62} dx={-34} align="right" />
    </>
  );
};

/* ───────── Экранные элементы ───────── */

const Hud: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Counter t={t} t0={S[2] + 0.8} t1={S[8] + 0.35} steps={[S[3] + 0.3, S[4] + 0.6, S[7] + 0.4]} />
    <BigNumber t={t} t0={S[6] + 0.6} t1={S[7] + 0.2} value={4248} unit="км" count={2.6} y={480} />
    <Label at={[W / 2, 330]} screen text="ҰБТ" t={t} t0={S[10] + 0.3} t1={S[11] + 0.4} size={150} />
  </>
);
