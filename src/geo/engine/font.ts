import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Шрифт подписей Oswald (тот же, что в подкаст-титрах) из файлов проекта,
 * а не из Google Fonts: рендер не зависит от интернета.
 */
export const FONT = "GeoOswald";

const RANGES: Record<string, string> = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  "cyrillic-ext": "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
};

if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("Шрифт Oswald");
  const faces: FontFace[] = [];
  for (const w of ["500", "700"]) {
    for (const [subset, range] of Object.entries(RANGES)) {
      faces.push(
        new FontFace(FONT, `url(${staticFile(`geo/fonts/oswald-${subset}-${w}-normal.woff2`)}) format('woff2')`, {
          weight: w,
          unicodeRange: range,
        }),
      );
    }
  }
  Promise.all(
    faces.map((f) =>
      f.load().then((ff) => {
        document.fonts.add(ff);
      }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
