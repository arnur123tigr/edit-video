"""Вырезает фрагмент снимка Sentinel-2 (10 м) из открытого архива AWS (sentinel-cogs)
и сохраняет его в проекции Web Mercator для движка гео-карт.

Пример:
  python scripts/geo/s2_patch.py astana 71.43 51.15 40 60 --months 6,7,8 --water
Результат: public/geo/s2/<name>.jpg (+ <name>_water.png) и запись в src/geo/data/patches.json
"""
import argparse, json, math, os, re, sys, urllib.request
import numpy as np
import mgrs
import rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from PIL import Image

BUCKET = "https://sentinel-cogs.s3.us-west-2.amazonaws.com"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = 6378137.0


def merc(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def unmerc(x, y):
    return math.degrees(x / R), math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)


def list_prefixes(prefix):
    url = f"{BUCKET}/?list-type=2&prefix={prefix}&delimiter=/"
    xml = urllib.request.urlopen(url, timeout=60).read().decode()
    return re.findall(r"<Prefix>([^<]+/)</Prefix>", xml)[1:]


def find_scenes(tile, years, months):
    zone, band, sq = tile[:2], tile[2], tile[3:5]
    out = []
    for y in years:
        for m in months:
            pre = f"sentinel-s2-l2a-cogs/{int(zone)}/{band}/{sq}/{y}/{m}/"
            for p in list_prefixes(pre):
                sid = p.rstrip("/").split("/")[-1]
                try:
                    item = json.loads(urllib.request.urlopen(f"{BUCKET}/{p}{sid}.json", timeout=60).read())
                except Exception:
                    continue
                pr = item["properties"]
                out.append((pr.get("eo:cloud_cover", 100), pr.get("s2:nodata_pixel_percentage", 100), p, sid))
    out.sort()
    return out


def read_band(path, dst_crs, bounds, w, h, resampling=Resampling.bilinear):
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open("/vsicurl/" + path) as src:
            left, bottom, right, top = bounds
            transform = rasterio.transform.from_bounds(left, bottom, right, top, w, h)
            with WarpedVRT(src, crs=dst_crs, transform=transform, width=w, height=h, resampling=resampling) as vrt:
                return vrt.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("lon", type=float)
    ap.add_argument("lat", type=float)
    ap.add_argument("wkm", type=float, help="ширина фрагмента, км")
    ap.add_argument("hkm", type=float, help="высота фрагмента, км")
    ap.add_argument("--years", default="2022,2023,2024")
    ap.add_argument("--months", default="6,7,8,9")
    ap.add_argument("--px", type=int, default=2600, help="размер большей стороны, px")
    ap.add_argument("--tile", default=None, help="MGRS-квадрат вручную")
    ap.add_argument("--scene", default=None, help="конкретная сцена (префикс)")
    ap.add_argument("--water", action="store_true", help="сделать маску воды (NDWI)")
    ap.add_argument("--gain", type=float, default=1.0)
    ap.add_argument("--check", type=int, default=14, help="сколько сцен проверять на облака")
    a = ap.parse_args()

    tile = a.tile or mgrs.MGRS().toMGRS(a.lat, a.lon, MGRSPrecision=0)
    cx, cy = merc(a.lon, a.lat)
    k = 1 / math.cos(math.radians(a.lat))  # масштаб Меркатора
    hw, hh = a.wkm * 500 * k, a.hkm * 500 * k
    bounds = (cx - hw, cy - hh, cx + hw, cy + hh)
    if a.wkm >= a.hkm:
        w = a.px; h = round(a.px * a.hkm / a.wkm)
    else:
        h = a.px; w = round(a.px * a.wkm / a.hkm)

    if a.scene:
        scenes = [(0, 0, a.scene.rstrip("/") + "/", a.scene.rstrip("/").split("/")[-1])]
    else:
        scenes = find_scenes(tile, [int(x) for x in a.years.split(",")], [int(x) for x in a.months.split(",")])
        scenes = [s for s in scenes if s[1] < 30 and s[0] < 60] or scenes
        # оценка облачности именно в окне (по слою классификации SCL)
        scored = []
        for c, nd, p, sid in scenes[: a.check]:
            try:
                scl = read_band(f"{BUCKET}/{p}SCL.tif", "EPSG:3857", bounds, 160, max(1, round(160 * h / w)), Resampling.nearest)[0]
            except Exception as e:
                print("skip", sid, e); continue
            bad = float(np.isin(scl, [0, 3, 8, 9, 10, 1]).mean())
            print(f"  {sid}: облака/пропуски в окне {bad*100:.1f}% (по тайлу {c:.1f}%)")
            scored.append((bad, c, nd, p, sid))
            if bad < 0.003:
                break
        scored.sort()
        scenes = [(c, nd, p, sid) for bad, c, nd, p, sid in scored]
    if not scenes:
        sys.exit("нет сцен")
    print("лучшие сцены:", [(round(c, 1), round(n, 1), s) for c, n, _, s in scenes[:5]])
    cloud, nod, prefix, sid = scenes[0]
    base = f"{BUCKET}/{prefix}"
    rgb = read_band(base + "TCI.tif", "EPSG:3857", bounds, w, h)
    img = np.moveaxis(rgb, 0, -1).astype(np.float32) * a.gain
    img = np.clip(img, 0, 255).astype(np.uint8)
    nodata = float((rgb.sum(axis=0) == 0).mean())
    print("нет данных в окне:", round(nodata * 100, 1), "%")
    if nodata > 0.005 and not a.scene:
        # окно на стыке квадратов MGRS: дозаполняем снимками соседних квадратов за ту же дату
        date = sid.split("_")[2]
        m = mgrs.MGRS()
        tiles = set()
        for fx in (0, 0.5, 1):
            for fy in (0, 0.5, 1):
                lo, la = unmerc(bounds[0] + (bounds[2] - bounds[0]) * fx, bounds[1] + (bounds[3] - bounds[1]) * fy)
                tiles.add(m.toMGRS(la, lo, MGRSPrecision=0))
        tiles.discard(tile)
        for tl in tiles:
            zone, band, sq = tl[:2], tl[2], tl[3:5]
            pre = f"sentinel-s2-l2a-cogs/{int(zone)}/{band}/{sq}/{date[:4]}/{int(date[4:6])}/"
            cands = [p for p in list_prefixes(pre) if f"_{date}_" in p]
            if not cands:
                print("  нет снимка", tl, date); continue
            extra = read_band(f"{BUCKET}/{cands[0]}TCI.tif", "EPSG:3857", bounds, w, h)
            hole = rgb.sum(axis=0) == 0
            rgb[:, hole] = extra[:, hole]
            print("  дозаполнено из", tl, "осталось", round(float((rgb.sum(axis=0) == 0).mean()) * 100, 1), "%")
        img = np.clip(np.moveaxis(rgb, 0, -1).astype(np.float32) * a.gain, 0, 255).astype(np.uint8)
    os.makedirs(os.path.join(ROOT, "public/geo/s2"), exist_ok=True)
    Image.fromarray(img).save(os.path.join(ROOT, f"public/geo/s2/{a.name}.jpg"), quality=88)

    entry = {}
    if a.water:
        g = read_band(base + "B03.tif", "EPSG:3857", bounds, w, h)[0].astype(np.float32)
        n = read_band(base + "B08.tif", "EPSG:3857", bounds, w, h)[0].astype(np.float32)
        ndwi = (g - n) / np.maximum(g + n, 1)
        alpha = np.clip((ndwi - 0.0) / 0.15, 0, 1)
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[..., :3] = 255
        rgba[..., 3] = (alpha * 255).astype(np.uint8)
        Image.fromarray(rgba).save(os.path.join(ROOT, f"public/geo/s2/{a.name}_water.png"), optimize=True)
        entry["water"] = f"geo/s2/{a.name}_water.png"

    west, south = unmerc(bounds[0], bounds[1])
    east, north = unmerc(bounds[2], bounds[3])
    pj = os.path.join(ROOT, "src/geo/data/patches.json")
    os.makedirs(os.path.dirname(pj), exist_ok=True)
    data = json.load(open(pj)) if os.path.exists(pj) else {}
    data[a.name] = {"src": f"geo/s2/{a.name}.jpg", "bounds": [round(west, 6), round(south, 6), round(east, 6), round(north, 6)],
                    "size": [w, h], "scene": sid, "cloud": round(cloud, 2), **entry}
    json.dump(data, open(pj, "w"), ensure_ascii=False, indent=1)
    print("готово:", a.name, data[a.name])


if __name__ == "__main__":
    main()
