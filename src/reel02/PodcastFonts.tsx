import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as fInter } from "@remotion/google-fonts/InterTight";
import { loadFont as fGolos } from "@remotion/google-fonts/GolosText";
import { loadFont as fOnest } from "@remotion/google-fonts/Onest";
import { loadFont as fGeo } from "@remotion/google-fonts/Geologica";
import { loadFont as fMont } from "@remotion/google-fonts/Montserrat";

/**
 * Образцы шрифтов для формата «Подкаст-титры» (вариант A) рядом с настоящим кадром референса r01.
 * Раскладка как в референсе: мелкая строка, под ней ключевое слово вдвое крупнее, ещё не сказанное — серым.
 * Всё строчными, белым, без плашек и цветных акцентов.
 */
type Sub = ("latin" | "cyrillic" | "cyrillic-ext")[];
const S = { subsets: ["latin", "cyrillic", "cyrillic-ext"] as Sub };
const INTER = fInter("normal", { weights: ["700", "900"], ...S }).fontFamily;
const GOLOS = fGolos("normal", { weights: ["700"], ...S }).fontFamily;
const ONEST = fOnest("normal", { weights: ["700"], ...S }).fontFamily;
const GEO = fGeo("normal", { weights: ["700"], ...S }).fontFamily;
const MONT = fMont("normal", { weights: ["700"], ...S }).fontFamily;

const PW = 720;
const PH = 1280;

const OPTS: [string, string, string, number, string][] = [
  ["1", "Inter Tight Bold", INTER, 700, "-0.04em"],
  ["2", "Golos Text Bold", GOLOS, 700, "-0.035em"],
  ["3", "Onest Bold", ONEST, 700, "-0.035em"],
  ["4", "Geologica Bold", GEO, 700, "-0.04em"],
  ["5", "Montserrat Bold", MONT, 700, "-0.045em"],
];

const Label: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <div style={{ position: "absolute", left: 16, top: 16, background: dark ? "#C4000A" : "#000", color: "#fff", fontFamily: INTER, fontWeight: 900, fontSize: 30, padding: "6px 16px", borderRadius: 10 }}>{text}</div>
);

const Panel: React.FC<{ n: string; name: string; family: string; weight: number; track: string }> = ({ n, name, family, weight, track }) => (
  <div style={{ position: "relative", width: PW, height: PH, overflow: "hidden" }}>
    <Img src={staticFile("reel02/opt_306.jpg")} style={{ position: "absolute", width: PW, height: PH }} />
    <Label text={`${n}. ${name}`} />
    <div style={{ position: "absolute", left: 30, right: 30, top: 640, textAlign: "center", color: "#fff", fontFamily: family, fontWeight: weight, letterSpacing: track, textShadow: "0 2px 14px rgba(0,0,0,0.35)" }}>
      <div style={{ fontSize: 58, lineHeight: 1 }}>бір айда 10 000</div>
      <div style={{ fontSize: 124, lineHeight: 0.95 }}>оқырман</div>
      <div style={{ fontSize: 58, lineHeight: 1.05, color: "rgba(255,255,255,0.5)" }}>жинаймыз</div>
    </div>
    <div style={{ position: "absolute", left: 30, right: 30, bottom: 34, textAlign: "center", color: "#fff", fontFamily: family, fontWeight: weight, fontSize: 30, letterSpacing: "-0.02em", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
      ә ғ қ ң ө ұ ү һ і · әңгіме ғылым үшін
    </div>
  </div>
);

export const PodcastFonts: React.FC = () => (
  <AbsoluteFill style={{ background: "#1c1c1c", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 }}>
    <div style={{ position: "relative", width: PW, height: PH, overflow: "hidden" }}>
      <Img src={staticFile("reel02/ref_r01b.jpg")} style={{ position: "absolute", width: PW, height: PH }} />
      <Label text="Референс r01 (оригинал)" dark />
    </div>
    {OPTS.map(([n, name, family, weight, track]) => (
      <Panel key={n} n={n} name={name} family={family} weight={weight} track={track} />
    ))}
  </AbsoluteFill>
);
