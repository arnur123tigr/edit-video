import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont as loadMont } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadRubik } from "@remotion/google-fonts/Rubik";
import captions from "./captions.json";
import { W, glide, lin, useT } from "../reel01/lib";
import { Brolls, DURATION_SEC_02, SHOTS, Speaker } from "./Reel02";

/**
 * Ролик 02 в стиле «Сюжет-скетч» (референс r11).
 * v4 по правкам пользователя:
 *  - все слова строчными (и в крупных титрах, и в субтитре);
 *  - каждое слово появляется плавно: всплытие снизу + проявление из размытия ~0,35 с;
 *  - белый субтитр ниже (≈83% высоты) и тоньше;
 *  - цвет крупных титров и шрифты — по выбору пользователя (настройки ниже).
 */
const SUBSETS = { subsets: ["latin", "cyrillic", "cyrillic-ext"] as ("latin" | "cyrillic" | "cyrillic-ext")[] };

// ── НАСТРОЙКИ (меняются после выбора пользователя) ──────────────────────────
// Выбор пользователя 2026-11-16: цвет 5 «голубой», жирный 2 «Rubik Black», тонкий 2 «Montserrat Regular»
const BIG_FONT = loadRubik("normal", { weights: ["900"], ...SUBSETS }).fontFamily;
const BIG_WEIGHT = 900;
const BIG_COLOR = "#63C6FF";
const SUB_FONT = loadMont("normal", { weights: ["400"], ...SUBSETS }).fontFamily;
const SUB_WEIGHT = 400;
// ────────────────────────────────────────────────────────────────────────────

const DARK_TEXT = parseInt(BIG_COLOR.slice(1, 3), 16) < 110; // тёмный цвет → светлое свечение
const BIG_SHADOW = DARK_TEXT
  ? "0 0 24px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.9)"
  : "0 2px 5px rgba(0,25,60,0.45)"; // по просьбе: без свечения вокруг букв, только лёгкая тень для читаемости

type W0 = { t: string; s: number; e: number };
const raw: W0[] = (captions as { words: W0[] }[]).flatMap((b) => b.words);
// «Jas Education» не разрываем: склеиваем в одно слово
const words: W0[] = [];
for (const w of raw) {
  const prev = words[words.length - 1];
  if (prev && prev.t === "Jas" && w.t.startsWith("Education")) prev.t = `Jas ${w.t}`, (prev.e = w.e);
  else words.push({ ...w });
}

// ── предложения: граница — слово с точкой, вопросом или двоеточием
const sentences: W0[][] = [];
{
  let cur: W0[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.?:]$/.test(w.t)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);
}

const clean = (s: string) => s.replace(/[.,?:—]+$/g, "").replace(/\s+—$/, "");
const low = (s: string) => s.toLowerCase();

// ── строки крупных титров: 1–2 слова, не длиннее 14 знаков; у каждого слова своё время
type LW = { t: string; s: number };
type Line = { words: LW[]; s: number; sent: number; len: number };
const lines: Line[] = [];
sentences.forEach((sent, si) => {
  let buf: W0[] = [];
  const flush = () => {
    if (!buf.length) return;
    const ws = buf.map((w) => ({ t: low(clean(w.t)), s: w.s }));
    lines.push({ words: ws, s: ws[0].s, sent: si, len: ws.map((w) => w.t).join(" ").length });
    buf = [];
  };
  for (const w of sent) {
    const len = buf.reduce((a, x) => a + clean(x.t).length + 1, 0) + clean(w.t).length;
    if (buf.length >= 2 || (buf.length && len > 14)) flush();
    buf.push(w);
    if (/[,—]$/.test(w.t)) flush();
  }
  flush();
});

// ── субтитры: фраза до запятой (или до ~6 слов), строчными
type Sub = { text: string; s: number; e: number };
const subs: Sub[] = [];
for (const sent of sentences) {
  let buf: W0[] = [];
  const flush = () => {
    if (!buf.length) return;
    subs.push({ text: low(buf.map((w) => w.t).join(" ")), s: buf[0].s, e: buf[buf.length - 1].e });
    buf = [];
  };
  for (const w of sent) {
    buf.push(w);
    const chars = buf.reduce((a, x) => a + x.t.length + 1, 0);
    if ((/[,—]$/.test(w.t) && buf.length >= 3) || buf.length >= 6 || chars > 34) flush();
  }
  flush();
}
subs.forEach((s, i) => {
  s.e = subs[i + 1] ? subs[i + 1].s : DURATION_SEC_02;
});

const MAX_LINES = 3;
const LINE_H = 78;
const APPEAR = 0.32; // длительность появления слова, сек

/** Плавное появление слова: подъём, проявление и уход размытия. */
const wordStyle = (now: number, s: number): React.CSSProperties => {
  const p = glide(now, s - 0.04, 150); // мягкая пружина без перелёта
  const o = lin(now, s - 0.04, s - 0.04 + APPEAR * 0.7);
  return {
    display: "inline-block",
    opacity: o,
    transform: `translateY(${(1 - p) * 26}px)`,
    filter: p < 0.97 ? `blur(${(1 - p) * 10}px)` : undefined,
  };
};

const BigCaptions: React.FC<{ t: number }> = ({ t }) => {
  const now = t + 0.03;
  let last = -1;
  lines.forEach((l, i) => {
    if (l.s - 0.04 <= now) last = i;
  });
  if (last < 0) return null;
  const sent = lines[last].sent;
  const idxs: number[] = [];
  for (let i = last; i >= 0 && lines[i].sent === sent && idxs.length < MAX_LINES; i--) idxs.unshift(i);
  // выход предложения: вся стопка плавно гаснет перед следующим
  const nextSent = lines.find((l) => l.sent > sent);
  const out = nextSent ? lin(now, nextSent.s - 0.16, nextSent.s - 0.02) : 0;
  let shot = SHOTS[0];
  for (const s of SHOTS) if (s.s <= t + 1e-6) shot = s;
  const left = shot.z === 1;
  // стопка плавно подтягивается вверх, когда добавляется строка
  const shift = idxs.length >= 2 ? (1 - glide(now, lines[last].s, 140)) * LINE_H * 0.5 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: left ? 96 : 60,
        width: left ? W - 160 : W - 120,
        top: 1128 - (idxs.length * LINE_H) / 2 + shift,
        textAlign: left ? "left" : "center",
        fontFamily: BIG_FONT,
        fontWeight: BIG_WEIGHT,
        fontSize: 84,
        lineHeight: `${LINE_H}px`,
        letterSpacing: "-0.045em",
        color: BIG_COLOR,
        textShadow: BIG_SHADOW,
        opacity: 1 - out,
        filter: out > 0.02 ? `blur(${out * 8}px)` : undefined,
      }}
    >
      {idxs.map((i) => {
        const l = lines[i];
        return (
          <div key={i} style={{ fontSize: Math.round(84 * Math.min(1, 15 / l.len)) }}>
            {l.words.map((w, wi) => (
              <span key={wi} style={{ ...wordStyle(now, w.s), marginLeft: wi === 0 ? 0 : "0.24em" }}>
                {w.t}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const Subtitle: React.FC<{ t: number }> = ({ t }) => {
  const now = t + 0.03;
  const i = subs.findIndex((x) => x.s - 0.05 <= now && now < x.e);
  if (i < 0) return null;
  const s = subs[i];
  const inP = glide(now, s.s - 0.05, 160);
  const out = lin(now, s.e - 0.12, s.e);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        width: W - 140,
        top: 1590,
        textAlign: "center",
        fontFamily: SUB_FONT,
        fontWeight: SUB_WEIGHT,
        fontSize: 34,
        lineHeight: 1.25,
        color: "#fff",
        opacity: Math.min(lin(now, s.s - 0.05, s.s + 0.15), 1 - out * 0.9),
        transform: `translateY(${(1 - inP) * 10}px)`,
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
      }}
    >
      {s.text}
    </div>
  );
};

export const Reel02Sketch: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Speaker t={t} />
      <Brolls t={t} />
      <BigCaptions t={t} />
      <Subtitle t={t} />
    </AbsoluteFill>
  );
};
