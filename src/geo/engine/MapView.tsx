import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import tilesManifest from "../data/tiles.json";
import patchesJson from "../data/patches.json";
import {
  Cam,
  H,
  LngLat,
  TILE,
  W,
  clamp01,
  projector,
  tileLevel,
  toWorld,
  worldScale,
} from "./geo";

/* ───────── Контекст карты: камера и проекция для слоёв ───────── */

type MapCtxT = { cam: Cam; project: (p: LngLat) => [number, number]; t: number };
const MapCtx = createContext<MapCtxT | null>(null);
/** Камера, если слой внутри карты; null — если снаружи (экранные подписи). */
export const useMapOpt = () => useContext(MapCtx);
export const useMap = () => {
  const c = useContext(MapCtx);
  if (!c) throw new Error("useMap вне MapView");
  return c;
};

/* ───────── Тайлы спутниковой подложки ───────── */

const AVAILABLE = new Set<string>(tilesManifest as string[]);

type Placed = { key: string; l: number; x: number; xi: number; y: number };

const resolveTile = (l: number, xi: number, y: number): Placed | null => {
  let L = l;
  let X = xi;
  let Y = y;
  while (L >= 0) {
    const n = Math.pow(2, L);
    const x = ((X % n) + n) % n;
    const key = `${L}/${x}/${Y}`;
    if (AVAILABLE.has(key)) return { key: `${key}@${X}`, l: L, x, xi: X, y: Y };
    L -= 1;
    X = Math.floor(X / 2);
    Y = Math.floor(Y / 2);
  }
  return null;
};

const TileLayer: React.FC<{ cam: Cam }> = ({ cam }) => {
  const [cx, cy] = toWorld(cam.lon, cam.lat);
  const S = worldScale(cam.zoom);
  // индекс x не сворачиваем: так тайлы склеиваются через 180°
  const l = tileLevel(cam.zoom);
  const n = Math.pow(2, l);
  const ts = S / n;
  const pxc = cx * S;
  const x0 = Math.floor((pxc - W / 2 - 64) / ts);
  const x1 = Math.floor((pxc + W / 2 + 64) / ts);
  const y0 = Math.max(0, Math.floor((cy * S - H / 2 - 64) / ts));
  const y1 = Math.min(n - 1, Math.floor((cy * S + H / 2 + 64) / ts));
  const placed = new Map<string, Placed>();
  for (let y = y0; y <= y1; y++) {
    for (let xi = x0; xi <= x1; xi++) {
      const p = resolveTile(l, xi, y);
      if (p && !placed.has(p.key)) placed.set(p.key, p);
    }
  }
  const list = [...placed.values()].sort((a, b) => a.l - b.l);
  return (
    <>
      {list.map((p) => {
        const nn = Math.pow(2, p.l);
        const sx0 = (p.xi / nn - cx) * S + W / 2;
        const sx1 = ((p.xi + 1) / nn - cx) * S + W / 2;
        const sy0 = (p.y / nn - cy) * S + H / 2;
        const sy1 = ((p.y + 1) / nn - cy) * S + H / 2;
        const left = Math.floor(sx0);
        const top = Math.floor(sy0);
        return (
          <Img
            key={p.key}
            src={staticFile(`geo/tiles/${p.l}/${p.x}/${p.y}.jpg`)}
            style={{
              position: "absolute",
              left,
              top,
              width: Math.ceil(sx1) - left + 1,
              height: Math.ceil(sy1) - top + 1,
            }}
          />
        );
      })}
    </>
  );
};

/* ───────── Детальные снимки Sentinel-2 поверх подложки ───────── */

type Patch = { src: string; bounds: [number, number, number, number]; water?: string; river?: string };
export const PATCHES = patchesJson as unknown as Record<string, Patch>;

const rectOf = (project: (p: LngLat) => [number, number], b: [number, number, number, number]) => {
  const [x0, y0] = project([b[0], b[3]]);
  const [x1, y1] = project([b[2], b[1]]);
  return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
};

const FEATHER =
  "linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)";

/** Снимок появляется плавно, когда камера приближается (zoomIn..zoomFull). */
export const PatchLayer: React.FC<{ name: string; zoomIn?: number; zoomFull?: number }> = ({
  name,
  zoomIn = 8,
  zoomFull = 9.2,
}) => {
  const { cam, project } = useMap();
  const p = PATCHES[name];
  const op = clamp01((cam.zoom - zoomIn) / (zoomFull - zoomIn));
  if (!p || op <= 0) return null;
  const r = rectOf(project, p.bounds);
  if (r.left > W || r.top > H || r.left + r.width < 0 || r.top + r.height < 0) return null;
  return (
    <Img
      src={staticFile(p.src)}
      style={{
        position: "absolute",
        ...r,
        opacity: op,
        maskImage: FEATHER,
        maskComposite: "intersect",
        WebkitMaskImage: FEATHER,
        WebkitMaskComposite: "source-in",
      }}
    />
  );
};

/** Вода со снимка (маска NDWI), подсвеченная цветом. */
export const WaterGlow: React.FC<{ name: string; opacity: number; color?: string; blur?: number; layer?: "water" | "river" }> = ({
  name,
  opacity,
  color = "#3fb6ff",
  blur = 10,
  layer = "water",
}) => {
  const { project } = useMap();
  const p = PATCHES[name];
  const file = p?.[layer];
  if (!file || opacity <= 0) return null;
  const r = rectOf(project, p.bounds);
  const url = `url(${staticFile(file)})`;
  const part = (extra: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        ...r,
        background: color,
        maskImage: url,
        maskSize: "100% 100%",
        WebkitMaskImage: url,
        WebkitMaskSize: "100% 100%",
        ...extra,
      }}
    />
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {part({ filter: `blur(${blur}px)`, opacity: 0.9 })}
      {part({})}
    </div>
  );
};

/* ───────── Сама карта ───────── */

export type MapLook = { brightness: number; saturate: number; contrast: number };
export const DARK: MapLook = { brightness: 0.6, saturate: 0.82, contrast: 1.08 };

/**
 * Карта: космос → спутниковая подложка (затемнена) → детальные снимки (base) → слои поверх (children).
 * Слои-оверлеи получают камеру через useMap().
 */
export const MapView: React.FC<{
  cam: Cam;
  t: number;
  look?: MapLook;
  base?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ cam, t, look = DARK, base, children }) => {
  const project = projector(cam);
  const ctx: MapCtxT = { cam, project, t };
  // чем дальше камера, тем сильнее «космос» по краям
  const space = clamp01((3.2 - cam.zoom) / 2);
  return (
    <MapCtx.Provider value={ctx}>
      <AbsoluteFill style={{ background: "#020409", overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            filter: `brightness(${look.brightness}) saturate(${look.saturate}) contrast(${look.contrast})`,
          }}
        >
          <TileLayer cam={cam} />
          {base}
        </AbsoluteFill>
        {children}
        {/* виньетка: тёмные края, взгляд — в центр */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.55 + space * 0.35}) 100%)`,
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    </MapCtx.Provider>
  );
};

export const TILE_SIZE = TILE;
