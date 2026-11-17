import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as fInter } from "@remotion/google-fonts/InterTight";
import { loadFont as fSofia } from "@remotion/google-fonts/SofiaSansExtraCondensed";
import { loadFont as fOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as fMont } from "@remotion/google-fonts/Montserrat";
import { loadFont as fUnb } from "@remotion/google-fonts/Unbounded";
import { loadFont as fRubik } from "@remotion/google-fonts/Rubik";
import { loadFont as fCorm } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as fLora } from "@remotion/google-fonts/Lora";
import { loadFont as fPT } from "@remotion/google-fonts/PTSerif";

const SUB = { subsets: ["latin", "cyrillic", "cyrillic-ext"] as ("latin" | "cyrillic" | "cyrillic-ext")[] };
const inter = fInter("normal", { weights: ["500", "900"], ...SUB }).fontFamily;
const sofia = fSofia("normal", { weights: ["900"], ...SUB }).fontFamily;
const oswald = fOswald("normal", { weights: ["700"], ...SUB }).fontFamily;
const mont = fMont("normal", { weights: ["900"], ...SUB }).fontFamily;
const unb = fUnb("normal", { weights: ["900"], ...SUB }).fontFamily;
const rubik = fRubik("normal", { weights: ["900"], ...SUB }).fontFamily;
const corm = fCorm("italic", { weights: ["500"], ...SUB }).fontFamily;
const lora = fLora("italic", { weights: ["500"], ...SUB }).fontFamily;
const pt = fPT("italic", { weights: ["400"], ...SUB }).fontFamily;

type Opt = {
  n: number;
  name: string;
  big: React.CSSProperties;
  small: React.CSSProperties;
  caps?: boolean;
};
const OPTS: Opt[] = [
  { n: 1, name: "Inter Tight Black (как сейчас)", big: { fontFamily: inter, fontWeight: 900, letterSpacing: "-0.05em", fontSize: 84 }, small: { fontFamily: inter, fontWeight: 900, letterSpacing: "-0.03em", fontSize: 30 } },
  { n: 2, name: "Sofia Sans Extra Condensed + Cormorant", big: { fontFamily: sofia, fontWeight: 900, fontSize: 132, lineHeight: 0.9 }, small: { fontFamily: corm, fontStyle: "italic", fontWeight: 500, fontSize: 40 }, caps: true },
  { n: 3, name: "Oswald Bold + Lora", big: { fontFamily: oswald, fontWeight: 700, fontSize: 100, lineHeight: 1 }, small: { fontFamily: lora, fontStyle: "italic", fontWeight: 500, fontSize: 32 }, caps: true },
  { n: 4, name: "Montserrat Black + PT Serif", big: { fontFamily: mont, fontWeight: 900, letterSpacing: "-0.04em", fontSize: 74 }, small: { fontFamily: pt, fontStyle: "italic", fontSize: 32 } },
  { n: 5, name: "Unbounded Black + Inter Tight", big: { fontFamily: unb, fontWeight: 900, letterSpacing: "-0.04em", fontSize: 62 }, small: { fontFamily: inter, fontWeight: 500, fontSize: 30 } },
  { n: 6, name: "Rubik Black + Cormorant", big: { fontFamily: rubik, fontWeight: 900, letterSpacing: "-0.03em", fontSize: 78 }, small: { fontFamily: corm, fontStyle: "italic", fontWeight: 500, fontSize: 40 } },
];

const shadow = "0 3px 16px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)";

const Panel: React.FC<{ o: Opt }> = ({ o }) => (
  <div style={{ position: "relative", width: 540, height: 960, overflow: "hidden" }}>
    <Img src={staticFile("reel02/frame_a.jpg")} style={{ position: "absolute", width: 540, height: 960 }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.42) 62%, rgba(0,0,0,0.35) 100%)" }} />
    <div style={{ position: "absolute", left: 14, top: 14, background: "#000", color: "#fff", fontFamily: inter, fontWeight: 900, fontSize: 24, padding: "6px 14px", borderRadius: 8 }}>
      {o.n}. {o.name}
    </div>
    <div style={{ position: "absolute", left: 16, width: 508, top: 610, transform: "translateY(-50%)", textAlign: "center", color: "#fff", textShadow: shadow }}>
      <div style={{ ...o.small }}>бір айдың ішінде</div>
      <div style={{ ...o.big, margin: "4px 0" }}>
        <span style={{ color: "#D0000C", textShadow: "0 0 24px #D0000C, 0 3px 12px rgba(0,0,0,0.9)" }}>10 000</span>{" "}
        {o.caps ? "ОҚЫРМАН" : "оқырман"}
      </div>
      <div style={{ ...o.small }}>өте мықты құрал · әңгіме, ғылым үшін</div>
      <div style={{ ...o.big, fontSize: (o.big.fontSize as number) * 0.8, marginTop: 14 }}>{o.caps ? "ЧЕЛЛЕНДЖДІ" : "челленджді"}</div>
      <div style={{ ...o.small }}>бастағымыз келіп тұр</div>
    </div>
  </div>
);

export const FontTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#222", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6 }}>
    {OPTS.map((o) => (
      <Panel key={o.n} o={o} />
    ))}
  </AbsoluteFill>
);
