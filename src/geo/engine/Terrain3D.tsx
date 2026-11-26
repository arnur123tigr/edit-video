import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PATCHES, DARK, MapLook, OVERLAYS } from "./MapView";
import { Cam, H, LngLat, W, toWorld, worldScale } from "./geo";

/**
 * 3D-рельеф: снимок Sentinel-2 натянут на высоты Copernicus DEM.
 * Единица сцены = 1 пиксель карты при зуме cam2d.zoom, поэтому сверху (pitch 0, dist 1)
 * кадр совпадает с 2D-картой — переход между ними незаметен.
 * Вокруг снимка — плоская подложка Blue Marble, чтобы при наклоне за краем была земля.
 */

export { OVERLAYS };

export const FOV = 36;
const D0 = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
const BG = 0x05080d;

export type TerrainView = {
  /** 2D-камера, с которой совпадает вид сверху (центр = точка, куда смотрим) */
  cam2d: Cam;
  /** наклон от вертикали, градусы (0 — сверху) */
  pitch: number;
  /** поворот вокруг вертикали, градусы (0 — север вверху) */
  bearing: number;
  /** расстояние: 1 — как у 2D-карты */
  dist: number;
  /** вертикальное преувеличение (0 — плоско, 1 — реальный масштаб) */
  exag: number;
  /** высота (м), которая лежит на уровне точки взгляда; для гор — середина склона */
  base?: number;
};

/** Пикселей карты на метр высоты в точке камеры. */
const pxPerMeter = (cam: Cam) => worldScale(cam.zoom) / (40075016.686 * Math.cos((cam.lat * Math.PI) / 180));

/** Перевод долготы/широты/высоты в координаты сцены. */
export const sceneXY = (view: TerrainView, p: LngLat): [number, number] => {
  const [cx, cy] = toWorld(view.cam2d.lon, view.cam2d.lat);
  const [x, y] = toWorld(p[0], p[1]);
  const S = worldScale(view.cam2d.zoom);
  return [(x - cx) * S, -(y - cy) * S];
};
export const sceneZ = (view: TerrainView, meters: number) => (meters - (view.base ?? 0)) * pxPerMeter(view.cam2d) * view.exag;

const placeCamera = (cam: THREE.PerspectiveCamera, view: TerrainView) => {
  const p = (view.pitch * Math.PI) / 180;
  const b = (view.bearing * Math.PI) / 180;
  const r = D0 * view.dist;
  cam.fov = FOV;
  cam.aspect = W / H;
  cam.position.set(-r * Math.sin(p) * Math.sin(b), -r * Math.sin(p) * Math.cos(b), r * Math.cos(p));
  cam.up.set(Math.sin(b), Math.cos(b), 0);
  cam.lookAt(0, 0, 0);
  cam.near = Math.max(2, r * 0.02);
  cam.far = r * 8;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
};

/** Камера three.js для вида (используется и внутри, и снаружи холста для подписей). */
export const makeCamera = (view: TerrainView) => {
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 5, D0 * 8);
  placeCamera(cam, view);
  return cam;
};

/** Где на экране окажется точка (lon, lat, высота в метрах). */
export const project3D = (view: TerrainView, p: LngLat, meters: number): [number, number] => {
  const cam = makeCamera(view);
  const [x, y] = sceneXY(view, p);
  const v = new THREE.Vector3(x, y, sceneZ(view, meters)).project(cam);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
};

/* ───────── Внутри холста ───────── */

const Rig: React.FC<{ view: TerrainView }> = ({ view }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    placeCamera(camera, view);
    const r = D0 * view.dist;
    scene.fog = new THREE.Fog(BG, r * 1.1, r * 3.2);
  }, [camera, scene, view]);
  return null;
};

/** Маска прозрачности: края снимка плавно уходят в подложку. */
const featherTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const n = 256;
    const cv = document.createElement("canvas");
    cv.width = n;
    cv.height = n;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const e = Math.min(x, y, n - 1 - x, n - 1 - y) / (n * 0.13);
        const a = Math.max(0, Math.min(1, e));
        const v = Math.round(a * a * (3 - 2 * a) * 255);
        const o = (y * n + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    tex = new THREE.CanvasTexture(cv);
    return tex;
  };
})();

type Grid = { geo: THREE.BufferGeometry; heights: Float32Array; edge: Float32Array; edgeH: number };

const useGrid = (heightName: string, view: TerrainView, seg: number): Grid => {
  const hm = OVERLAYS[heightName];
  const img = useLoader(THREE.ImageLoader, staticFile(hm.src));
  return useMemo(() => {
    const [w, h] = hm.size ?? [img.width, img.height];
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    const nx = Math.max(2, Math.round(w / seg));
    const ny = Math.max(2, Math.round(h / seg));
    const [x0, y1] = sceneXY(view, [hm.bounds[0], hm.bounds[1]]);
    const [x1, y0] = sceneXY(view, [hm.bounds[2], hm.bounds[3]]);
    const pos = new Float32Array(nx * ny * 3);
    const uv = new Float32Array(nx * ny * 2);
    const heights = new Float32Array(nx * ny);
    const edge = new Float32Array(nx * ny);
    const lo = hm.min ?? 0;
    const hi = hm.max ?? 1;
    const border: number[] = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const u = i / (nx - 1);
        const v = j / (ny - 1);
        const sx = Math.min(w - 1, Math.round(u * (w - 1)));
        const sy = Math.min(h - 1, Math.round(v * (h - 1)));
        const o = (sy * w + sx) * 4;
        heights[k] = lo + ((px[o] * 256 + px[o + 1]) / 65535) * (hi - lo);
        // 0 на краю снимка → 1 внутри: рельеф у края опускается к подложке
        const d = Math.min(u, v, 1 - u, 1 - v) / 0.12;
        const c = Math.max(0, Math.min(1, d));
        edge[k] = c * c * (3 - 2 * c);
        if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) border.push(heights[k]);
        pos[k * 3] = x0 + (x1 - x0) * u;
        pos[k * 3 + 1] = y0 + (y1 - y0) * v;
        pos[k * 3 + 2] = 0;
        uv[k * 2] = u;
        uv[k * 2 + 1] = 1 - v;
      }
    }
    border.sort((a, b) => a - b);
    const edgeH = border[Math.floor(border.length / 2)] ?? 0;
    const idx: number[] = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return { geo, heights, edge, edgeH };
    // геометрия строится один раз: view здесь только для привязки координат
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, hm, seg, view.cam2d.lon, view.cam2d.lat, view.cam2d.zoom]);
};

const useSrgb = (...texs: THREE.Texture[]) =>
  useMemo(() => {
    for (const t of texs) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, texs);

const TerrainMesh: React.FC<{
  view: TerrainView;
  patch: string;
  heightName: string;
  ground?: string;
  tint?: { name: string; opacity: number };
  seg: number;
}> = ({ view, patch, heightName, ground, tint, seg }) => {
  const grid = useGrid(heightName, view, seg);
  const tex = useLoader(THREE.TextureLoader, staticFile(PATCHES[patch].src));
  const tintTex = useLoader(THREE.TextureLoader, staticFile(tint ? OVERLAYS[tint.name].src : PATCHES[patch].src));
  const groundTex = useLoader(THREE.TextureLoader, staticFile(ground ? OVERLAYS[ground].src : PATCHES[patch].src));
  useSrgb(tex, tintTex, groundTex);
  const k = sceneZ(view, 1) - sceneZ(view, 0);
  const base = view.base ?? 0;
  useLayoutEffect(() => {
    const pos = grid.geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < grid.heights.length; i++) {
      const hh = grid.edgeH + (grid.heights[i] - grid.edgeH) * grid.edge[i];
      pos.setZ(i, (hh - base) * k);
    }
    pos.needsUpdate = true;
    grid.geo.computeVertexNormals();
    grid.geo.computeBoundingSphere();
  }, [grid, k, base]);
  const gz = (grid.edgeH - base) * k - 0.6;
  const gb = ground ? OVERLAYS[ground].bounds : null;
  const g0 = gb ? sceneXY(view, [gb[0], gb[1]]) : [0, 0];
  const g1 = gb ? sceneXY(view, [gb[2], gb[3]]) : [0, 0];
  return (
    <>
      {gb ? (
        // подложка рисуется первой и не пишет глубину: рельеф всегда ложится поверх неё
        <mesh position={[(g0[0] + g1[0]) / 2, (g0[1] + g1[1]) / 2, gz]} renderOrder={-1}>
          <planeGeometry args={[Math.abs(g1[0] - g0[0]), Math.abs(g1[1] - g0[1])]} />
          <meshLambertMaterial map={groundTex} depthWrite={false} />
        </mesh>
      ) : null}
      <mesh geometry={grid.geo} renderOrder={1}>
        <meshLambertMaterial map={tex} alphaMap={featherTexture()} transparent />
      </mesh>
      {tint && tint.opacity > 0 ? (
        <mesh geometry={grid.geo} renderOrder={2}>
          <meshBasicMaterial map={tintTex} transparent opacity={tint.opacity} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ) : null}
    </>
  );
};

/** Горизонтальная полупрозрачная плоскость (например, уровень моря) с пунктирным краем. */
const LevelPlane: React.FC<{ view: TerrainView; bounds: [number, number, number, number]; meters: number; opacity: number; color: string }> = ({
  view,
  bounds,
  meters,
  opacity,
  color,
}) => {
  const [x0, y0] = sceneXY(view, [bounds[0], bounds[1]]);
  const [x1, y1] = sceneXY(view, [bounds[2], bounds[3]]);
  const z = sceneZ(view, meters);
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ].map(([x, y]) => new THREE.Vector3(x, y, z + 0.5)),
    );
    const m = new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 26, gapSize: 18, transparent: true, depthTest: false });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    l.renderOrder = 4;
    return l;
  }, [x0, y0, x1, y1, z]);
  (line.material as THREE.LineDashedMaterial).opacity = opacity * 0.95;
  if (opacity <= 0) return null;
  return (
    <>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z]} renderOrder={3}>
        <planeGeometry args={[Math.abs(x1 - x0), Math.abs(y1 - y0)]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.4} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <primitive object={line} />
    </>
  );
};

/** Полный 3D-кадр поверх карты. */
export const Terrain3D: React.FC<{
  view: TerrainView;
  patch: string;
  heightName: string;
  opacity: number;
  ground?: string;
  tint?: { name: string; opacity: number };
  level?: { bounds: [number, number, number, number]; meters: number; opacity: number; color?: string };
  seg?: number;
  look?: MapLook;
  /** направление света (откуда светит), в координатах сцены: x — восток, y — север, z — вверх */
  sun?: [number, number, number];
}> = ({ view, patch, heightName, opacity, ground, tint, level, seg = 2, look = DARK, sun = [-1, 0.7, 0.8] }) => {
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: "#05080d",
        filter: `brightness(${look.brightness}) saturate(${look.saturate}) contrast(${look.contrast})`,
      }}
    >
      <ThreeCanvas width={W} height={H} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: FOV, position: [0, 0, D0] }}>
        <Rig view={view} />
        <ambientLight intensity={1.7} />
        <directionalLight position={sun} intensity={2.2} />
        <TerrainMesh view={view} patch={patch} heightName={heightName} ground={ground} tint={tint} seg={seg} />
        {level ? <LevelPlane view={view} bounds={level.bounds} meters={level.meters} opacity={level.opacity} color={level.color ?? "#3aa0ff"} /> : null}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
