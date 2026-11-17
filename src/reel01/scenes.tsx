import React from "react";
import { C, GH, Plate, Rise, Scene, W, Words, base, glide, lerp, lin, pop, ramp, riseStyle } from "./lib";

const center: React.CSSProperties = { position: "absolute", left: 0, width: W, textAlign: "center" };
const title: React.CSSProperties = { ...center, ...base, fontSize: 88, lineHeight: 1.06 };

/** Появление «пружинкой»: масштаб + подъём + проявление из размытия. */
const popStyle = (t: number, at: number, dy = 40): React.CSSProperties => {
  const s = pop(t, at);
  return {
    transform: `translateY(${(1 - s) * dy}px) scale(${0.7 + 0.3 * s})`,
    opacity: Math.min(1, s * 2),
    filter: s < 0.9 ? `blur(${(1 - s) * 10}px)` : undefined,
  };
};

/* ───────── 1. Хук: заголовок + «запинки» + карточки дублей ───────── */
const TakeCard: React.FC<{ n: number; w?: number; style?: React.CSSProperties }> = ({ n, w = 210, style }) => (
  <div
    style={{
      width: w,
      height: w * 0.56,
      borderRadius: 16,
      background: "linear-gradient(180deg, #4a4a50, #2e2e33)",
      overflow: "hidden",
      boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
      ...style,
    }}
  >
    <div style={{ height: "26%", background: "repeating-linear-gradient(115deg, #fff 0 16px, #111 16px 32px)" }} />
    <div style={{ ...base, fontSize: w * 0.18, textAlign: "center", marginTop: w * 0.06 }}>Дубль {n}</div>
  </div>
);

const S1: React.FC<{ t: number }> = ({ t }) => (
  <Scene t={t} from={0} to={4.6}>
    <div style={{ ...title, top: 110 }}>
      <Words t={t} at={0.02} text="Видеода" />
      <Plate t={t} at={0.14}>
        запинка
      </Plate>
      <br />
      <Words t={t} at={0.3} text="жасайсыз ба?" />
    </div>
    <div style={{ position: "absolute", left: 70, top: 368, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ ...base, fontSize: 40, display: "flex", alignItems: "center", gap: 14, background: C.panel, border: "2px solid #2a2a2e", borderRadius: 40, padding: "12px 26px", ...popStyle(t, 0.5) }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: C.accent, opacity: 0.45 + 0.55 * Math.abs(Math.sin(t * 5)), boxShadow: `0 0 14px ${C.accent}` }} />
        REC
      </div>
      {(
        [
          ["ээ…", 1.46],
          ["ммм…", 1.72],
          ["яғни…", 2.06],
          ["тағы да…", 2.4],
        ] as [string, number][]
      ).map(([w, at], i) => (
        <div key={w} style={{ ...base, fontSize: 40, border: `3px solid ${C.accent}`, borderRadius: 40, padding: "9px 22px", boxShadow: `0 0 22px ${C.accent}77`, ...popStyle(t, at), transform: `${popStyle(t, at).transform} rotate(${Math.sin(t * 3 + i) * 2}deg)` }}>
          {w}
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 78, top: 520, width: 924, display: "grid", gridTemplateColumns: "repeat(4, 210px)", gap: 28 }}>
      {Array.from({ length: 12 }, (_, i) => {
        const at = 2.76 + i * 0.13;
        const s = pop(t, at, 170, 12);
        return (
          <TakeCard
            key={i}
            n={i + 1}
            style={{
              transform: `translateY(${(1 - s) * 70}px) rotate(${(1 - s) * (i % 2 ? 10 : -10)}deg) scale(${0.6 + 0.4 * s})`,
              opacity: Math.min(1, s * 2),
            }}
          />
        );
      })}
    </div>
  </Scene>
);

/* ───────── 3. Мобилограф, видеограф и петля «с начала» ───────── */
const Role: React.FC<{ label: string; kind: "phone" | "cam"; style: React.CSSProperties }> = ({ label, kind, style }) => (
  <div
    style={{
      width: 420,
      height: 270,
      borderRadius: 30,
      background: "linear-gradient(180deg, #1d1d20, #111113)",
      border: "2px solid #2e2e33",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 22,
      boxShadow: "0 16px 50px rgba(0,0,0,0.6)",
      ...style,
    }}
  >
    {kind === "phone" ? (
      <div style={{ width: 66, height: 112, borderRadius: 16, border: "7px solid #fff" }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: C.accent, margin: "10px auto" }} />
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 118, height: 84, borderRadius: 14, border: "7px solid #fff" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: C.accent, margin: "10px 12px" }} />
        </div>
        <div style={{ width: 0, height: 0, borderTop: "32px solid transparent", borderBottom: "32px solid transparent", borderRight: "42px solid #fff", marginLeft: 6 }} />
      </div>
    )}
    <div style={{ ...base, fontSize: 54 }}>{label}</div>
  </div>
);

const S3: React.FC<{ t: number }> = ({ t }) => {
  const draw = ramp(t, 8.63, 9.25);
  const R = 150;
  const len = 2 * Math.PI * R * 0.82;
  // вращение разгоняется плавно
  const spin = t > 8.63 ? 360 * Math.pow(Math.max(0, t - 8.63), 1.5) * 0.55 : 0;
  const cf = Math.max(0, (t - 8.95) / 0.17);
  const count = Math.min(9, 1 + Math.floor(cf));
  const tick = 1 - (cf % 1);
  return (
    <Scene t={t} from={5.9} to={10.2}>
      <div style={{ position: "absolute", left: 100, top: 120, display: "flex", gap: 40 }}>
        <Role label="мобилограф" kind="phone" style={popStyle(t, 6.73, 60)} />
        <Role label="видеограф" kind="cam" style={popStyle(t, 7.53, 60)} />
      </div>
      <svg width={420} height={420} viewBox="-210 -210 420 420" style={{ position: "absolute", left: 330, top: 470, opacity: lin(t, 8.63, 8.75) }}>
        <g transform={`rotate(${-spin})`}>
          <circle r={R} fill="none" stroke={C.accent} strokeWidth={18} strokeLinecap="round" strokeDasharray={`${len * draw} 9999`} transform="rotate(-70)" style={{ filter: `drop-shadow(0 0 18px ${C.accent})` }} />
          <polygon points="0,-36 46,0 0,36" fill={C.accent} transform={`rotate(-70) translate(${R},0) rotate(-98)`} opacity={draw} />
        </g>
      </svg>
      <div style={{ ...center, ...base, top: 612, fontSize: 116, opacity: lin(t, 8.9, 9.0), transform: `scale(${1 + 0.18 * tick * tick})` }}>×{count}</div>
      <Rise t={t} at={8.7} style={{ ...center, ...base, top: 930, fontSize: 68 }}>
        басынан түсіру
      </Rise>
    </Scene>
  );
};

/* ───────── 5. Claude / CapCut + дорожка, из которой вырезают ошибки ───────── */
const BARS = Array.from({ length: 56 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45 + 1)));
const ERR: [number, number, number, string][] = [
  [12, 19, 14.55, "запинка"],
  [36, 42, 15.43, "қате"],
];

const S5: React.FC<{ t: number }> = ({ t }) => {
  const cut = glide(t, 16.55, 110);
  const bw = 11;
  const gap = 5;
  let x = 0;
  const items = BARS.map((h, i) => {
    const e = ERR.find(([a, b]) => i >= a && i <= b);
    const red = e ? lin(t, e[2], e[2] + 0.18) : 0;
    const k = e ? 1 - cut : 1;
    // дорожка «дышит», как живой звук
    const live = 0.82 + 0.18 * Math.sin(t * 9 + i * 0.9);
    const grow = glide(t, 11.3 + i * 0.012, 160);
    const item = { x, h: h * grow * live, red, k, e, i };
    x += (bw + gap) * k;
    return item;
  });
  const total = x;
  const left = (W - total) / 2;
  return (
    <Scene t={t} from={11.2} to={17.8}>
      <div style={{ ...center, top: 130, display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
        <div style={{ ...base, fontSize: 82, color: "#000", background: "#fff", borderRadius: 18, padding: "8px 36px", ...popStyle(t, 12.61, 50) }}>Claude</div>
        <span style={{ ...base, fontSize: 44, color: C.dim, ...riseStyle(t, 13.35, 20) }}>немесе</span>
        <div style={{ ...base, fontSize: 82, color: "#000", background: "#fff", borderRadius: 18, padding: "8px 36px", ...popStyle(t, 13.61, 50) }}>CapCut</div>
      </div>
      <div style={{ position: "absolute", left, top: 480, height: 320, width: total }}>
        {items.map((b) => (
          <div
            key={b.i}
            style={{
              position: "absolute",
              left: b.x,
              top: 160 - 140 * b.h * b.k,
              width: bw * b.k,
              height: 280 * b.h * b.k,
              borderRadius: 6,
              background: b.red > 0 ? `rgb(${lerp(255, 208, b.red)}, ${lerp(255, 0, b.red)}, ${lerp(255, 12, b.red)})` : "#fff",
              opacity: b.e ? lerp(1, 0, cut) : 1,
              boxShadow: b.red > 0 ? `0 0 ${20 * b.red}px ${C.accent}` : "none",
            }}
          />
        ))}
        {ERR.map(([a, b, at, label]) => {
          const xa = items[a].x;
          const xb = items[b].x + bw;
          return (
            <div key={label} style={{ position: "absolute", left: (xa + xb) / 2 - 170, width: 340, top: -86, textAlign: "center", opacity: 1 - cut }}>
              <span style={{ ...base, display: "inline-block", fontSize: 46, background: C.accent, borderRadius: 12, padding: "6px 22px", boxShadow: `0 0 30px ${C.accent}`, ...popStyle(t, at, 30) }}>{label}</span>
            </div>
          );
        })}
      </div>
      <Rise t={t} at={16.8} style={{ ...center, ...base, top: 890, fontSize: 72 }}>
        <span style={{ color: C.accent }}>✂</span> кесіп тастаймыз
      </Rise>
    </Scene>
  );
};

/* ───────── 6–7. Окно чата: запрос печатается, отправляется, приходит результат ───────── */
const PROMPT = "Қате кеткен жерлерді кесіп, видеоны жасап бер";

const S67: React.FC<{ t: number }> = ({ t }) => {
  const chars = Math.max(0, Math.min(PROMPT.length, Math.round(lin(t, 20.05, 22.2) * PROMPT.length)));
  const sent = glide(t, 22.39, 190);
  const done = pop(t, 22.7, 170, 12);
  const cursor = Math.sin(t * 9) > 0;
  return (
    <Scene t={t} from={18.47} to={23.05}>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 130,
          width: 920,
          height: 900,
          borderRadius: 40,
          background: "linear-gradient(180deg, #1a1a1d, #121214)",
          border: "2px solid #2e2e33",
          overflow: "hidden",
          boxShadow: "0 30px 90px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ ...base, fontSize: 46, padding: "30px 40px", borderBottom: "2px solid #26262a", display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ width: 24, height: 24, borderRadius: 12, background: C.accent, boxShadow: `0 0 ${14 + 8 * Math.sin(t * 4)}px ${C.accent}` }} />
          Жасанды интеллект
        </div>
        <div
          style={{
            ...base,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            position: "absolute",
            right: 40,
            top: lerp(650, 150, sent),
            width: 660,
            fontSize: 48,
            lineHeight: 1.2,
            background: C.accent,
            borderRadius: 30,
            padding: "24px 32px",
            opacity: lin(t, 22.39, 22.45),
            boxShadow: `0 10px 40px ${C.accent}66`,
          }}
        >
          {PROMPT}
        </div>
        <div style={{ position: "absolute", left: 40, top: 430, width: 480, height: 270, borderRadius: 30, background: "#232327", transform: `scale(${done}) translateY(${(1 - done) * 40}px)`, transformOrigin: "left top", opacity: Math.min(1, done * 2), display: "flex", alignItems: "center", gap: 26, padding: 30 }}>
          <div style={{ width: 104, height: 184, borderRadius: 16, background: "linear-gradient(180deg,#55555c,#333338)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, color: "#fff" }}>▶</div>
          <div style={{ ...base, fontSize: 52, lineHeight: 1.08 }}>
            дайын
            <br />
            видео <span style={{ color: C.ok }}>✓</span>
          </div>
        </div>
        <div style={{ ...base, fontWeight: 700, letterSpacing: "-0.02em", position: "absolute", left: 40, right: 40, bottom: 40, minHeight: 140, borderRadius: 30, background: "#232327", padding: "26px 140px 26px 36px", fontSize: 46, lineHeight: 1.2, display: "flex", alignItems: "center" }}>
          <span style={{ opacity: 1 - lin(t, 22.39, 22.45) }}>
            {PROMPT.slice(0, chars)}
            <span style={{ opacity: cursor ? 1 : 0, color: C.accent }}>|</span>
          </span>
          <div style={{ ...base, position: "absolute", right: 26, top: "50%", marginTop: -44, width: 88, height: 88, borderRadius: 44, background: chars >= PROMPT.length ? C.accent : "#3c3c42", boxShadow: chars >= PROMPT.length ? `0 0 30px ${C.accent}` : "none", textAlign: "center", lineHeight: "86px", fontSize: 48, transform: `scale(${1 + 0.3 * Math.sin(Math.PI * lin(t, 22.3, 22.6))})` }}>↑</div>
        </div>
      </div>
    </Scene>
  );
};

/* ───────── 8. Шкала «Бұрын / Қазір» ───────── */
const S8: React.FC<{ t: number }> = ({ t }) => {
  const rows: [string, number, number, string][] = [
    ["Бұрын", 23.3, 860, "linear-gradient(90deg,#77777f,#55555c)"],
    ["Қазір", 24.62, 250, C.accent],
  ];
  return (
    <Scene t={t} from={23.05} to={26.2}>
      <div style={{ ...title, top: 110 }}>
        <Words t={t} at={23.1} text="Монтажға кететін" />
        <br />
        <span style={{ fontSize: 120 }}>
          <Words t={t} at={23.3} text="уақыт" accent={["уақыт"]} />
        </span>
      </div>
      {rows.map(([label, at, w, bg], i) => (
        <div key={label} style={{ position: "absolute", left: 110, top: 440 + i * 270 }}>
          <Rise t={t} at={at - 0.05} dy={24} style={{ ...base, fontSize: 56, marginBottom: 14 }}>
            {label}
          </Rise>
          <div style={{ width: w * glide(t, at, 90), height: 130, borderRadius: 14, background: bg, boxShadow: i === 1 ? `0 0 ${40 + 14 * Math.sin(t * 5)}px ${C.accent}aa` : "none" }} />
        </div>
      ))}
      <div style={{ ...base, position: "absolute", left: 400, top: 800, fontSize: 64, opacity: lin(t, 25.6, 25.75) }}>
        <span style={{ display: "inline-block", transform: `translateX(${Math.sin(t * 6) * 8}px)`, color: C.accent }}>←</span> үнемдейсіз
      </div>
    </Scene>
  );
};

/* ───────── 9. Стопка дублей → один дубль ───────── */
const S9: React.FC<{ t: number }> = ({ t }) => {
  const merge = glide(t, 27.58, 150);
  const bump = pop(t, 27.58, 170, 11);
  const strike = ramp(t, 27.2, 27.48);
  return (
    <Scene t={t} from={26.2} to={28.3}>
      <div style={{ ...title, top: 110, opacity: 1 - merge, transform: `translateY(${-merge * 40}px)` }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          <Words t={t} at={26.22} text="Ондаған дубль" />
          <span style={{ position: "absolute", left: "-3%", top: "50%", height: 12, width: `${104 * strike}%`, background: C.accent, borderRadius: 6, boxShadow: `0 0 24px ${C.accent}` }} />
        </span>
      </div>
      {Array.from({ length: 7 }, (_, i) => {
        const s = pop(t, 26.26 + i * 0.06, 170, 12);
        const dx = (i - 3) * 122;
        const rot = (i - 3) * 6 + Math.sin(t * 2.5 + i) * 1.5;
        const last = i === 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: W / 2 - 150 + dx * (1 - merge),
              top: 400 + Math.abs(i - 3) * 18 * (1 - merge) + (1 - s) * 80,
              transform: `rotate(${rot * (1 - merge)}deg) scale(${(last ? 1 + 0.75 * bump : 1) * (0.6 + 0.4 * s)})`,
              opacity: (last ? 1 : 1 - merge) * Math.min(1, s * 2),
              zIndex: last ? 2 : 1,
            }}
          >
            <TakeCard n={last && merge > 0.4 ? 1 : i + 4} w={300} />
          </div>
        );
      })}
      <div style={{ ...center, ...base, top: 800, fontSize: 150, transform: `scale(${bump})`, opacity: Math.min(1, bump * 2) }}>
        <span style={{ color: C.accent }}>1</span> дубль
      </div>
    </Scene>
  );
};

/* ───────── 10. Схема: ошибся → повторил с начала → продолжил → готово ───────── */
const S10: React.FC<{ t: number }> = ({ t }) => {
  const x0 = 100;
  const xe = 520;
  const xb = 300;
  const x1 = 960;
  const y = 640;
  const a = ramp(t, 28.3, 28.8);
  const loop = glide(t, 29.16, 60);
  const b = ramp(t, 29.96, 30.95);
  const arc = `M ${xe} ${y} C ${xe} ${y - 250}, ${xb} ${y - 250}, ${xb} ${y}`;
  const arcLen = 560;
  let dot = { x: lerp(x0, xe, a), y };
  if (loop > 0) {
    const bz = (p: number, p0: number, p1: number, p2: number, p3: number) =>
      (1 - p) ** 3 * p0 + 3 * (1 - p) ** 2 * p * p1 + 3 * (1 - p) * p * p * p2 + p ** 3 * p3;
    dot = { x: bz(loop, xe, xe, xb, xb), y: bz(loop, y, y - 250, y - 250, y) };
  }
  if (b > 0) dot = { x: lerp(xb, x1, b), y };
  const ok = pop(t, 31.0, 170, 11);
  const pulse = 18 + 5 * Math.sin(t * 10);
  return (
    <Scene t={t} from={28.3} to={32.6}>
      <div style={{ ...title, top: 110 }}>
        <Words t={t} at={28.32} text="Бір дубльмен түсіру" accent={["дубльмен"]} />
      </div>
      <svg width={W} height={GH} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke="#2c2c30" strokeWidth={12} strokeLinecap="round" />
        <line x1={x0} y1={y} x2={lerp(x0, xe, a)} y2={y} stroke="#fff" strokeWidth={12} strokeLinecap="round" />
        <path d={arc} fill="none" stroke={C.accent} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${arcLen * loop} 9999`} style={{ filter: `drop-shadow(0 0 14px ${C.accent})` }} />
        {b > 0 && <line x1={xb} y1={y + 0.01} x2={lerp(xb, x1, b)} y2={y} stroke={C.ok} strokeWidth={12} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${C.ok})` }} />}
        <circle cx={dot.x} cy={dot.y} r={pulse} fill="#fff" style={{ filter: "drop-shadow(0 0 22px #fff)" }} />
      </svg>
      <div style={{ position: "absolute", left: xe - 48, top: y - 48, width: 96, height: 96, borderRadius: 48, background: C.accent, ...base, fontSize: 60, textAlign: "center", lineHeight: "94px", transform: `scale(${pop(t, 28.76, 200, 10)})`, boxShadow: `0 0 34px ${C.accent}` }}>✕</div>
      <Rise t={t} at={28.82} dy={-20} style={{ ...base, position: "absolute", left: xe - 150, width: 300, textAlign: "center", top: y + 70, fontSize: 54 }}>
        қате
      </Rise>
      <Rise t={t} at={29.3} dy={24} style={{ ...base, position: "absolute", left: xb - 80, width: 460, textAlign: "center", top: y - 320, fontSize: 60, color: C.accent }}>
        басынан айт
      </Rise>
      <Rise t={t} at={30.1} dy={-20} style={{ ...base, position: "absolute", left: 610, width: 340, textAlign: "center", top: y + 70, fontSize: 54, color: C.ok }}>
        жалғастыр
      </Rise>
      <div style={{ position: "absolute", left: x1 - 54, top: y - 54, width: 108, height: 108, borderRadius: 54, background: C.ok, ...base, color: "#000", fontSize: 66, textAlign: "center", lineHeight: "108px", transform: `scale(${ok})`, boxShadow: `0 0 40px ${C.ok}` }}>✓</div>
      <div style={{ ...center, ...base, top: 880, fontSize: 96, transform: `scale(${ok})`, opacity: Math.min(1, ok * 2) }}>дайын видео</div>
    </Scene>
  );
};

/* ───────── 12–13. ПАК + страницы, затем плеер «тегін» ───────── */
const Page: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div style={{ width: 260, height: 300, borderRadius: 16, background: "#f4f4f4", padding: 24, boxShadow: "0 16px 50px rgba(0,0,0,0.7)", ...style }}>
    <div style={{ height: 24, width: "70%", background: C.accent, borderRadius: 5, marginBottom: 22 }} />
    {[100, 88, 94, 60, 100, 82, 90].map((w, i) => (
      <div key={i} style={{ height: 12, width: `${w}%`, background: "#c9c9cc", borderRadius: 4, marginBottom: 15 }} />
    ))}
  </div>
);

const S12: React.FC<{ t: number }> = ({ t }) => (
  <Scene t={t} from={35.5} to={39.2}>
    <div style={{ ...title, top: 80 }}>
      <Words t={t} at={35.62} step={0.16} text="Claude + монтаж" />
      <br />
      <span style={{ fontSize: 124, opacity: t >= 37.5 ? 1 : 0 }}>
        <Plate t={t} at={37.55}>
          ПАК
        </Plate>
      </span>
    </div>
    <div style={{ position: "absolute", left: 110, top: 400, display: "grid", gridTemplateColumns: "repeat(3, 260px)", gap: 40 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const s = pop(t, 37.85 + i * 0.13, 170, 12);
        return (
          <Page
            key={i}
            style={{
              transform: `translateY(${(1 - s) * 90 + Math.sin(t * 2 + i) * 6}px) rotate(${(1 - s) * (i % 2 ? 8 : -8) + Math.sin(t * 1.6 + i * 2) * 1.2}deg) scale(${0.6 + 0.4 * s})`,
              opacity: Math.min(1, s * 2),
            }}
          />
        );
      })}
    </div>
  </Scene>
);

const S13: React.FC<{ t: number }> = ({ t }) => {
  const s = pop(t, 39.25, 160, 13);
  const beat = 1 + 0.06 * Math.sin(t * 8);
  return (
    <Scene t={t} from={39.2} to={40.9}>
      <div style={{ position: "absolute", left: 100, top: 230, width: 880, height: 495, borderRadius: 34, background: "linear-gradient(180deg,#1d1d20,#101012)", border: "2px solid #2e2e33", transform: `scale(${0.8 + 0.2 * s}) translateY(${(1 - s) * 60}px)`, opacity: Math.min(1, s * 2), boxShadow: "0 30px 90px rgba(0,0,0,0.7)" }}>
        <div style={{ position: "absolute", left: 345, top: 170, width: 190, height: 134, borderRadius: 36, background: C.accent, boxShadow: `0 0 60px ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${beat})` }}>
          <div style={{ width: 0, height: 0, borderTop: "30px solid transparent", borderBottom: "30px solid transparent", borderLeft: "50px solid #fff", marginLeft: 10 }} />
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 34, height: 12, borderRadius: 6, background: "#333" }}>
          <div style={{ width: `${40 * lin(t, 39.4, 40.9)}%`, height: "100%", borderRadius: 6, background: C.accent }} />
        </div>
      </div>
      <div style={{ ...base, position: "absolute", left: 730, top: 170, fontSize: 68, background: "#fff", color: "#000", borderRadius: 16, padding: "6px 30px", transform: `rotate(${6 + Math.sin(t * 5) * 2}deg) scale(${pop(t, 39.57, 190, 10)})`, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>тегін</div>
      <Rise t={t} at={39.85} style={{ ...center, ...base, top: 800, fontSize: 84 }}>
        YouTube-тағы видео
      </Rise>
    </Scene>
  );
};

/* ───────── 14. Призыв: комментарий «пак» ───────── */
const S14: React.FC<{ t: number }> = ({ t }) => {
  const word = "пак";
  const chars = Math.max(0, Math.min(word.length, Math.floor((t - 43.5) / 0.12) + 1));
  const active = t >= 43.5;
  const bounce = Math.abs(Math.sin(t * 5)) * 26;
  const fs = pop(t, 42.19, 160, 13);
  return (
    <Scene t={t} from={40.9} to={45}>
      <div style={{ ...title, top: 120, fontSize: 92 }}>
        <Words t={t} at={41.0} text="Комментарийге" />
        <br />
        <span style={{ fontSize: 120 }}>
          <Plate t={t} at={41.3}>
            «пак»
          </Plate>
        </span>{" "}
        <Words t={t} at={41.5} text="деп жаз" />
      </div>
      <div style={{ position: "absolute", left: 100, top: 540, width: 880, height: 160, borderRadius: 80, background: C.panel, border: `4px solid ${active ? C.accent : "#2e2e33"}`, boxShadow: active ? `0 0 ${50 + 16 * Math.sin(t * 6)}px ${C.accent}99` : "0 20px 60px rgba(0,0,0,0.6)", transform: `translateY(${(1 - fs) * 60}px) scale(${0.8 + 0.2 * fs})`, opacity: Math.min(1, fs * 2), display: "flex", alignItems: "center", padding: "0 30px 0 54px" }}>
        <div style={{ ...base, fontSize: 68, flex: 1, color: chars > 0 ? "#fff" : C.dim, fontWeight: chars > 0 ? 900 : 700 }}>
          {chars > 0 ? word.slice(0, chars) : "Комментарий жазу…"}
          {t >= 43.4 && <span style={{ color: C.accent, opacity: Math.sin(t * 9) > 0 ? 1 : 0 }}>|</span>}
        </div>
        <div style={{ width: 104, height: 104, borderRadius: 52, background: chars >= 3 ? C.accent : "#3c3c42", ...base, fontSize: 56, textAlign: "center", lineHeight: "102px" }}>↑</div>
      </div>
      <div style={{ ...center, ...base, top: 750 + bounce, fontSize: 150, color: C.accent, opacity: lin(t, 42.19, 42.35), textShadow: `0 0 36px ${C.accent}` }}>↓</div>
    </Scene>
  );
};

export const Scenes: React.FC<{ t: number }> = ({ t }) => (
  <>
    <S1 t={t} />
    <S3 t={t} />
    <S5 t={t} />
    <S67 t={t} />
    <S8 t={t} />
    <S9 t={t} />
    <S10 t={t} />
    <S12 t={t} />
    <S13 t={t} />
    <S14 t={t} />
  </>
);
