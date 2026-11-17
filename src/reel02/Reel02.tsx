import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import captions from "./captions.json";
import { C, FPS, H, W, glide, lerp, lin, pop, ramp, useT } from "../reel01/lib";

export const DURATION_SEC_02 = 67.23;

// Шрифты выбраны пользователем: жирный узкий заглавными + тонкий курсив (оба с казахскими буквами)
const SUB = { subsets: ["latin", "cyrillic", "cyrillic-ext"] as ("latin" | "cyrillic" | "cyrillic-ext")[] };
const BOLD = loadOswald("normal", { weights: ["700"], ...SUB }).fontFamily;
const THIN = loadLora("italic", { weights: ["500"], ...SUB }).fontFamily;

/* ───────── Планы: клип, момент начала, наезд (0 — общий, 1 — крупный) ───────── */
type Shot = { s: number; clip: string; z: 0 | 1 };
export const SHOTS: Shot[] = [
  { s: 0, clip: "8188", z: 0 },
  { s: 3.7, clip: "8190", z: 0 },
  { s: 7.38, clip: "8190", z: 1 },
  { s: 11.33, clip: "8190", z: 0 },
  { s: 15.84, clip: "8190", z: 1 },
  { s: 20.03, clip: "8190", z: 0 },
  { s: 21.84, clip: "8190", z: 1 },
  { s: 24.43, clip: "8191", z: 1 },
  { s: 27.47, clip: "8192", z: 0 },
  { s: 30.47, clip: "8192", z: 1 },
  { s: 33.39, clip: "8192", z: 0 },
  { s: 37.4, clip: "8192", z: 1 },
  { s: 41.09, clip: "8193", z: 0 },
  { s: 45.71, clip: "8193", z: 1 },
  { s: 50.41, clip: "8194", z: 0 },
  { s: 53.56, clip: "8194", z: 1 },
  { s: 57.03, clip: "8194", z: 0 },
  { s: 61.95, clip: "8194", z: 1 },
  { s: 64.16, clip: "8194", z: 0 },
];
/** Центр лица в каждом клипе, % кадра — точка, в которую идёт наезд. */
const FACE: Record<string, [number, number]> = {
  "8188": [48, 34],
  "8190": [48, 37],
  "8191": [50, 30],
  "8192": [45, 30],
  "8193": [42, 26],
  "8194": [53, 33],
};
const PUNCH = 0.22;

export const Speaker: React.FC<{ t: number }> = ({ t }) => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].s <= t + 1e-6) i = k;
  const cur = SHOTS[i];
  const prev = SHOTS[i - 1];
  const next = SHOTS[i + 1];
  const sameClip = prev && prev.clip === cur.clip;
  // наезд внутри клипа — быстрая пружина с лёгким перелётом
  const z = sameClip ? lerp(prev.z, cur.z, pop(t, cur.s, 230, 17)) : cur.z;
  const drift = 0.04 * lin(t, cur.s, next ? next.s : DURATION_SEC_02);
  // смена клипа: короткий «влёт» — кадр приезжает из увеличения и размытия
  const arrive = !sameClip && i > 0 ? 1 - glide(t, cur.s, 260) : 0;
  // уход перед сменой клипа: лёгкий рывок вперёд
  const leave = next && next.clip !== cur.clip ? ramp(t, next.s - 0.12, next.s) : 0;
  const [fx, fy] = FACE[cur.clip];
  const blur = arrive * 14 + leave * 6;
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile("reel02/cut.mp4")}
        style={{
          width: W,
          height: H,
          transformOrigin: `${fx}% ${fy}%`,
          transform: `scale(${1 + PUNCH * z + drift + arrive * 0.16 + leave * 0.07})`,
          filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
        }}
      />
    </AbsoluteFill>
  );
};

/* ───────── B-roll: стоковые кадры во весь экран ───────── */
const BROLLS: { from: number; to: number; src: string; dy?: number }[] = [
  { from: 7.38, to: 10.7, src: "reel02/broll1.mp4" }, // оқырмандар, клиенттер, маркетинг
  { from: 18.32, to: 20.0, src: "reel02/broll2.mp4" }, // осы құралдарды қолданып
  { from: 34.21, to: 36.2, src: "reel02/broll3.mp4" }, // білім саласына интересі
  { from: 42.23, to: 45.2, src: "reel02/broll4.mp4", dy: -260 }, // подписчиктерді санағанда…
];
export const Brolls: React.FC<{ t: number }> = ({ t }) => (
  <>
    {BROLLS.map((b) => {
      if (t < b.from - 0.02 || t > b.to + 0.2) return null;
      const inP = glide(t, b.from, 240);
      const outP = lin(t, b.to, b.to + 0.16);
      return (
        <AbsoluteFill key={b.src} style={{ background: "#02020a", opacity: Math.min(lin(t, b.from, b.from + 0.1), 1 - outP), filter: inP < 0.95 ? `blur(${(1 - inP) * 12}px)` : undefined }}>
          <Sequence from={Math.round(b.from * FPS)} layout="none">
            <OffthreadVideo
              muted
              src={staticFile(b.src)}
              style={{ width: W, height: H, transform: `translateY(${b.dy ?? 0}px) scale(${1.04 + (1 - inP) * 0.14 + 0.06 * lin(t, b.from, b.to)})` }}
            />
          </Sequence>
        </AbsoluteFill>
      );
    })}
  </>
);

/* ───────── Большая цифра правила ───────── */
const RULES: [number, number, string][] = [
  [27.47, 41.09, "1"],
  [41.09, 50.41, "2"],
  [50.41, 57.03, "3"],
];
const RuleDigit: React.FC<{ t: number }> = ({ t }) => (
  <>
    {RULES.map(([a, b, d]) => {
      if (t < a || t > b + 0.2) return null;
      const s = pop(t, a + 0.05, 170, 11);
      const out = lin(t, b - 0.02, b + 0.15);
      return (
        <div key={d} style={{ position: "absolute", right: 64, top: 170, textAlign: "center", opacity: Math.min(1, s * 2) * (1 - out), transform: `scale(${0.5 + 0.5 * s}) translateY(${-out * 40}px) rotate(${(1 - s) * -14}deg)`, transformOrigin: "right top" }}>
          <div style={{ fontFamily: BOLD, fontWeight: 700, fontSize: 260, lineHeight: 0.95, color: C.accent, textShadow: `0 0 50px ${C.accent}aa, 0 6px 30px rgba(0,0,0,0.6)` }}>{d}</div>
          <div style={{ fontFamily: THIN, fontStyle: "italic", fontWeight: 500, fontSize: 46, color: "#fff", marginTop: -6, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>ереже</div>
        </div>
      );
    })}
  </>
);

/* ───────── Титры: крупное слово — Oswald заглавными, остальное — тонкий курсив Lora ───────── */
type Word = { t: string; s: number; e: number; big: boolean; acc: boolean };
const SMALL = 64;
const MID = 76;
const fitBig = (text: string) => Math.max(96, Math.min(190, 960 / (0.6 * text.length)));

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const now = t + 0.03;
  let cur = captions[0];
  let idx = 0;
  captions.forEach((b, i) => {
    if (b.s <= now) {
      cur = b;
      idx = i;
    }
  });
  if (now < cur.s) return null;
  const words = cur.words as Word[];
  const anyBig = words.some((w) => w.big);
  const lines: Word[][] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && last[0].big === w.big) last.push(w);
    else lines.push([w]);
  }
  const inP = glide(t, cur.s - 0.03, 260);
  const tilt = idx % 2 ? 1 : -1;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        width: W - 80,
        top: 1235,
        transform: `translateY(-50%) translateY(${(1 - inP) * 40}px)`,
        opacity: lin(t, cur.s - 0.04, cur.s + 0.07),
        filter: inP < 0.95 ? `blur(${(1 - inP) * 9}px)` : undefined,
        textAlign: "center",
      }}
    >
      {lines.map((line, li) => {
        const big = line[0].big;
        const txt = line.map((w) => w.t).join(" ");
        const size = big ? fitBig(txt) : anyBig ? SMALL : MID;
        return (
          <div
            key={li}
            style={
              big
                ? { fontFamily: BOLD, fontWeight: 700, fontSize: size, lineHeight: 1.04, textTransform: "uppercase", letterSpacing: "-0.01em", margin: "0 0 4px" }
                : { fontFamily: THIN, fontStyle: "italic", fontWeight: 500, fontSize: size, lineHeight: 1.2 }
            }
          >
            {line.map((w, wi) => {
              const said = now >= w.s;
              const hit = pop(now, w.s, 260, 11);
              let text = w.t;
              if (w.t === "10 000") {
                const n = Math.round(10000 * ramp(now, w.s - 0.25, w.s + 0.45));
                text = n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, "0")}` : String(n);
              }
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    marginLeft: wi === 0 ? 0 : "0.24em",
                    color: said ? (w.acc ? C.accent : "#fff") : big ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.62)",
                    transform: big && said ? `scale(${1.22 - 0.22 * hit}) rotate(${(1 - hit) * 3 * tilt}deg)` : undefined,
                    textShadow:
                      w.acc && said
                        ? `0 0 36px ${C.accent}, 0 4px 18px rgba(0,0,0,0.9), 0 0 3px #000`
                        : "0 4px 22px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.9)",
                  }}
                >
                  {text}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const Reel02: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Speaker t={t} />
      <Brolls t={t} />
      {/* лёгкое затемнение под титрами: рубашка белая, без него белый текст не читается */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.36) 63%, rgba(0,0,0,0.4) 72%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      <RuleDigit t={t} />
      <Captions t={t} />
    </AbsoluteFill>
  );
};
