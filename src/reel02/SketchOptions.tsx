import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as fMont } from "@remotion/google-fonts/Montserrat";
import { loadFont as fRubik } from "@remotion/google-fonts/Rubik";
import { loadFont as fInter } from "@remotion/google-fonts/InterTight";
import { loadFont as fOnest } from "@remotion/google-fonts/Onest";
import { loadFont as fGolos } from "@remotion/google-fonts/GolosText";
import { loadFont as fNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as fManrope } from "@remotion/google-fonts/Manrope";


/** Листы с вариантами для ролика 02 (стиль «сюжет-скетч»): цвета крупных титров, жирные шрифты, тонкие шрифты субтитра. */
type Sub = ("latin" | "cyrillic" | "cyrillic-ext")[];
const S = { subsets: ["latin", "cyrillic", "cyrillic-ext"] as Sub };
const MONT = fMont("normal", { weights: ["400", "500", "600", "900"], ...S }).fontFamily;
const RUBIK = fRubik("normal", { weights: ["900"], ...S }).fontFamily;
const INTER = fInter("normal", { weights: ["400", "900"], ...S }).fontFamily;
const ONEST = fOnest("normal", { weights: ["400", "900"], ...S }).fontFamily;
const GOLOS = fGolos("normal", { weights: ["400", "900"], ...S }).fontFamily;
const NUNITO = fNunito("normal", { weights: ["900"], ...S }).fontFamily;
const MANROPE = fManrope("normal", { weights: ["500"], ...S }).fontFamily;


const K = 2 / 3; // панель 720×1280 = кадр 1080×1920 × 2/3
const PW = 720;
const PH = 1280;
const BIG = ["бір айдың ішінде", "10 000 оқырманды", "жинаймыз"];
const SUBTXT = "бір айдың ішінде 10 000 оқырманды жинаймыз";

type Big = { family: string; weight: number; color: string; shadow: string };
const lightShadow = "0 0 30px rgba(30,20,0,0.75), 0 3px 12px rgba(0,0,0,0.55), 0 0 4px rgba(0,0,0,0.35)";
const darkShadow = "0 0 24px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.9)";

const Label: React.FC<{ n: string; title: string; note?: string }> = ({ n, title, note }) => (
  <div style={{ position: "absolute", left: 16, top: 16, right: 16 }}>
    <div style={{ display: "inline-block", background: "#000", color: "#fff", fontFamily: MONT, fontWeight: 900, fontSize: 30, padding: "6px 16px", borderRadius: 10 }}>
      {n}. {title}
    </div>
    {note ? (
      <div style={{ display: "inline-block", marginTop: 8, background: "rgba(0,0,0,0.72)", color: "#fff", fontFamily: MONT, fontWeight: 500, fontSize: 20, padding: "4px 12px", borderRadius: 8 }}>
        {note}
      </div>
    ) : null}
  </div>
);

const Frame: React.FC<{ src: string; children: React.ReactNode }> = ({ src, children }) => (
  <div style={{ position: "relative", width: PW, height: PH, overflow: "hidden" }}>
    <Img src={staticFile(src)} style={{ position: "absolute", width: PW, height: PH }} />
    {children}
  </div>
);

const BigStack: React.FC<{ b: Big; lines?: string[] }> = ({ b, lines = BIG }) => (
  <div style={{ position: "absolute", left: 40, right: 40, top: 1128 * K - (lines.length * 78 * K) / 2, textAlign: "center", fontFamily: b.family, fontWeight: b.weight, fontSize: 84 * K, lineHeight: `${78 * K}px`, letterSpacing: "-0.04em", color: b.color, textShadow: b.shadow }}>
    {lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </div>
);

const SubLine: React.FC<{ family: string; weight: number }> = ({ family, weight }) => (
  <div style={{ position: "absolute", left: 50, right: 50, top: 1590 * K, textAlign: "center", fontFamily: family, fontWeight: weight, fontSize: 34 * K, lineHeight: 1.25, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.85)" }}>
    {SUBTXT}
  </div>
);

const COLORS: [string, string, string, string][] = [
  ["1", "Кремовый (сейчас)", "#FAEFBC", lightShadow],
  ["2", "Белый", "#FFFFFF", lightShadow],
  ["3", "Ледяной голубой", "#DDF4FF", lightShadow],
  ["4", "Бирюзовый, как стена", "#8DEFF5", lightShadow],
  ["5", "Голубой", "#63C6FF", lightShadow],
  ["6", "Тёмно-синий", "#0D2F66", darkShadow],
];

const BOLDS: [string, string, string, number][] = [
  ["1", "Montserrat Black (сейчас)", MONT, 900],
  ["2", "Rubik Black", RUBIK, 900],
  ["3", "Inter Tight Black", INTER, 900],
  ["4", "Onest Black", ONEST, 900],
  ["5", "Golos Text Black", GOLOS, 900],
  ["6", "Nunito Black", NUNITO, 900],
];

const THINS: [string, string, string, number][] = [
  ["1", "Montserrat SemiBold (сейчас)", MONT, 600],
  ["2", "Montserrat Regular", MONT, 400],
  ["3", "Inter Tight Regular", INTER, 400],
  ["4", "Onest Regular", ONEST, 400],
  ["5", "Golos Text Regular", GOLOS, 400],
  ["6", "Manrope — нет казахских букв ✕", MANROPE, 500],
];

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#1c1c1c", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 }}>{children}</AbsoluteFill>
);

export const SketchColors: React.FC = () => (
  <Grid>
    {COLORS.map(([n, name, color, shadow]) => (
      <Frame key={n} src="reel02/opt_262.jpg">
        <Label n={n} title={name} note={color} />
        <BigStack b={{ family: MONT, weight: 900, color, shadow }} />
        <SubLine family={MONT} weight={500} />
      </Frame>
    ))}
  </Grid>
);

export const SketchBold: React.FC = () => (
  <Grid>
    {BOLDS.map(([n, name, family, weight]) => (
      <Frame key={n} src="reel02/opt_132.jpg">
        <Label n={n} title={name} />
        <BigStack b={{ family, weight, color: "#FFFFFF", shadow: lightShadow }} lines={["бір айдың ішінде", "10 000 оқырманды", "әңгіме ғылым үшін", "өте құрал һәм"]} />
        <SubLine family={MONT} weight={500} />
      </Frame>
    ))}
  </Grid>
);

export const SketchThin: React.FC = () => (
  <Grid>
    {THINS.map(([n, name, family, weight]) => (
      <Frame key={n} src="reel02/opt_306.jpg">
        <Label n={n} title={name} />
        {/* увеличенный образец, чтобы разглядеть буквы */}
        <div style={{ position: "absolute", left: 24, right: 24, top: 120, padding: "14px 18px", borderRadius: 14, background: "rgba(0,0,0,0.62)", color: "#fff", fontFamily: family, fontWeight: weight, fontSize: 36, lineHeight: 1.3 }}>
          <div style={{ fontFamily: MONT, fontWeight: 600, fontSize: 16, opacity: 0.7, marginBottom: 4 }}>увеличено ×2</div>
          егер осы челлендж сіздерге қызық болса, әңгіме ғылым үшін өте құрал һәм
        </div>
        <SubLine family={family} weight={weight} />
      </Frame>
    ))}
  </Grid>
);
