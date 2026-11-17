import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import captions from "./captions.json";
import { C, H, W, base, glide, lerp, lin, pop, useT } from "./lib";
import { Scenes } from "./scenes";

export const DURATION_SEC = 44.64;

/** Интервалы (сек), когда спикер во весь экран. Остальное время — сплит. */
const FACE: [number, number][] = [
  [4.6, 5.9],
  [10.2, 11.2],
  [17.8, 18.47],
  [32.6, 35.5],
];

/** 0 = сплит, 1 = лицо во весь экран; плюс медленный «наезд», пока лицо в кадре. */
const faceState = (t: number) => {
  let p = 0;
  let push = 0;
  for (const [a, b] of FACE) {
    const v = glide(t, a, 210) * (1 - glide(t, b, 210));
    if (v > p) {
      p = v;
      push = lin(t, a, b);
    }
  }
  return { p, push };
};

// Карточка спикера в сплите. shiftY подобран так, чтобы макушка выступала над карточкой.
const CARD = { left: 70, top: 1340, width: 940, height: 640, radius: 46, shiftY: -400 };
const POP_H = 240; // на сколько пикселей над карточкой может выступать голова
const ALPHA_H = 1152; // высота файла с вырезанным спикером (верхняя часть кадра)

const Speaker: React.FC<{ p: number; push: number }> = ({ p, push }) => {
  const width = lerp(CARD.width, W, p);
  const left = lerp(CARD.left, 0, p);
  const top = lerp(CARD.top, 0, p);
  const shift = lerp(CARD.shiftY, 0, p);
  const zoom = 1 + (0.1 + 0.1 * push) * p;
  const cut = Math.max(0, 1 - p * 4); // вырезанная голова видна только в сплите
  return (
    <>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width,
          height: lerp(CARD.height, H, p),
          borderRadius: lerp(CARD.radius, 0, p),
          overflow: "hidden",
          background: "#111",
          boxShadow: `0 -10px 60px rgba(0,0,0,${0.6 * (1 - p)})`,
        }}
      >
        <OffthreadVideo
          src={staticFile("reel01/cut.mp4")}
          style={{
            position: "absolute",
            left: 0,
            top: shift,
            width,
            height: (width * 16) / 9,
            transformOrigin: "50% 30%",
            transform: `scale(${zoom})`,
          }}
        />
      </div>
      {cut > 0 && (
        <div
          style={{
            position: "absolute",
            left,
            top: top - POP_H,
            width,
            height: POP_H + 40,
            overflow: "hidden",
            opacity: cut,
          }}
        >
          <OffthreadVideo
            transparent
            muted
            src={staticFile("reel01/cut_alpha.webm")}
            style={{
              position: "absolute",
              left: 0,
              top: shift + POP_H,
              width,
              height: (width * ALPHA_H) / W,
            }}
          />
        </div>
      )}
    </>
  );
};

const Captions: React.FC<{ t: number; p: number }> = ({ t, p }) => {
  // слово-удар в сцене 4 заменяет титр
  if (t >= 10.7 && t < 11.2) return null;
  let cur = captions[0];
  for (const ch of captions) if (ch.s <= t + 0.02) cur = ch;
  if (t + 0.02 < cur.s) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: W,
        top: lerp(1138, 1090, p),
        textAlign: "center",
        ...base,
        fontSize: 78,
        lineHeight: 1.1,
        textShadow: `0 4px 26px rgba(0,0,0,${0.5 + 0.4 * p}), 0 0 4px rgba(0,0,0,${0.4 + 0.4 * p})`,
      }}
    >
      {cur.words.map((w, i) => {
        const prev = cur.words[i - 1];
        const glue = prev && prev.t.endsWith("-");
        const s = pop(t + 0.02, w.s, 320, 17);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(1, s * 2.2),
              transform: `translateY(${(1 - s) * 16}px) scale(${0.86 + 0.14 * s})`,
              marginLeft: i === 0 || glue ? 0 : "0.22em",
              color: w.t === "«пак»" ? C.accent : undefined,
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

const BigWord: React.FC<{ t: number }> = ({ t }) => {
  if (t < 10.7 || t > 11.3) return null;
  const s = pop(t, 10.72, 200, 12);
  const out = lin(t, 11.18, 11.3);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: W,
        top: 900,
        textAlign: "center",
        ...base,
        fontSize: 210,
        lineHeight: 0.88,
        letterSpacing: "-0.06em",
        transform: `scale(${0.6 + 0.4 * s + 0.04 * lin(t, 10.72, 11.3)})`,
        opacity: Math.min(1, s * 1.6) * (1 - out),
        filter: s < 0.9 ? `blur(${(1 - s) * 18}px)` : undefined,
        textShadow: "0 10px 60px rgba(0,0,0,0.6)",
      }}
    >
      ҚАЖЕТІ
      <br />
      <span style={{ color: C.accent, textShadow: `0 0 50px ${C.accent}` }}>ЖОҚ</span>
    </div>
  );
};

export const Reel01: React.FC = () => {
  const t = useT();
  const { p, push } = faceState(t);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* едва заметная сетка, медленно плывёт */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `0px ${-t * 14}px`,
        }}
      />
      {/* мягкое акцентное свечение сверху */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 38% at 50% 0%, ${C.accent}33, transparent 70%)`,
          opacity: 0.7 + 0.3 * Math.sin(t * 1.3),
        }}
      />
      <Scenes t={t} />
      <Speaker p={p} push={push} />
      <BigWord t={t} />
      <Captions t={t} p={p} />
    </AbsoluteFill>
  );
};
