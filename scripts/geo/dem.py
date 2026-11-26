"""Рельеф для гео-карт: подкраска впадин, зоны ниже уровня моря, разрезы высот, карты высот для 3D.
Источники (открытые): Copernicus DEM GLO-30 (AWS copernicus-dem-30m) и Terrarium (AWS elevation-tiles-prod).

  python scripts/geo/dem.py depth karagiye 51.25 43.05 52.07 43.99 --thr -40 --full -140 --seed 51.8,43.4
  python scripts/geo/dem.py below0 caspian 44 40 58 52.5 --z 7
  python scripts/geo/dem.py profile kz 51.8 43.4 80.17 42.21
  python scripts/geo/dem.py heightmap karagiye   (по границам снимка из patches.json)
"""
import argparse, io, json, math, os, sys, urllib.request
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = 6378137.0
OVR = os.path.join(ROOT, "src/geo/data/overlays.json")


def merc(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def unmerc(x, y):
    return math.degrees(x / R), math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)


def save_overlay(name, arr_rgba, bounds, extra=None):
    os.makedirs(os.path.join(ROOT, "public/geo/dem"), exist_ok=True)
    Image.fromarray(arr_rgba).save(os.path.join(ROOT, f"public/geo/dem/{name}.png"), optimize=True)
    data = json.load(open(OVR)) if os.path.exists(OVR) else {}
    data[name] = {"src": f"geo/dem/{name}.png", "bounds": [round(b, 6) for b in bounds], **(extra or {})}
    json.dump(data, open(OVR, "w"), ensure_ascii=False, indent=1)
    print("готово:", name, data[name])


def copdem(bounds, w, h):
    """Высоты Copernicus 30 м на сетке Меркатора (bounds в градусах: w,s,e,n)."""
    import rasterio
    from rasterio.vrt import WarpedVRT
    from rasterio.enums import Resampling
    from rasterio.merge import merge
    west, south, east, north = bounds
    srcs = []
    for la in range(math.floor(south), math.floor(north) + 1):
        for lo in range(math.floor(west), math.floor(east) + 1):
            ns = "N" if la >= 0 else "S"
            ew = "E" if lo >= 0 else "W"
            nm = f"Copernicus_DSM_COG_10_{ns}{abs(la):02d}_00_{ew}{abs(lo):03d}_00_DEM"
            srcs.append(f"/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/{nm}/{nm}.tif")
    x0, y0 = merc(west, south)
    x1, y1 = merc(east, north)
    out = np.full((h, w), np.nan, np.float32)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        for s in srcs:
            try:
                ds = rasterio.open(s)
            except Exception:
                continue  # над морем тайла нет
            tr = rasterio.transform.from_bounds(x0, y0, x1, y1, w, h)
            with WarpedVRT(ds, crs="EPSG:3857", transform=tr, width=w, height=h, resampling=Resampling.bilinear, nodata=-9999) as v:
                a = v.read(1)
            m = a > -9000
            out[m] = a[m]
    return out


def terrarium(bounds, z):
    """Мозаика Terrarium на уровне z → (высоты, точные границы в градусах)."""
    west, south, east, north = bounds
    n = 2 ** z
    tx0 = int((west + 180) / 360 * n); tx1 = int((east + 180) / 360 * n)
    ty = lambda lat: int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    ty0, ty1 = ty(north), ty(south)
    W = (tx1 - tx0 + 1) * 256; H = (ty1 - ty0 + 1) * 256
    out = np.zeros((H, W), np.float32)
    for y in range(ty0, ty1 + 1):
        for x in range(tx0, tx1 + 1):
            b = urllib.request.urlopen(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", timeout=60).read()
            a = np.array(Image.open(io.BytesIO(b)).convert("RGB")).astype(np.float32)
            out[(y - ty0) * 256:(y - ty0 + 1) * 256, (x - tx0) * 256:(x - tx0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    lon = lambda x: x / n * 360 - 180
    lat = lambda y: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return out, (lon(tx0), lat(ty1 + 1), lon(tx1 + 1), lat(ty0))


def poly_mask(rings_list, bounds, w, h):
    from PIL import ImageDraw
    west, south, east, north = bounds
    x0, y0 = merc(west, south); x1, y1 = merc(east, north)
    im = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(im)
    for ring in rings_list:
        pts = []
        for lo, la in ring:
            x, y = merc(lo, la)
            pts.append(((x - x0) / (x1 - x0) * w, (y1 - y) / (y1 - y0) * h))
        d.polygon(pts, fill=255)
    return np.array(im) > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("name")
    ap.add_argument("nums", nargs="*", type=float)
    ap.add_argument("--thr", type=float, default=-40)
    ap.add_argument("--full", type=float, default=-140)
    ap.add_argument("--seed", default=None)
    ap.add_argument("--px", type=int, default=1400)
    ap.add_argument("--z", type=int, default=7)
    ap.add_argument("--n", type=int, default=500)
    ap.add_argument("--color", default="20,70,190")
    ap.add_argument("--ne", default="/tmp/claude-0/ne")
    a = ap.parse_args()
    col = [int(c) for c in a.color.split(",")]

    if a.cmd == "depth":
        b = tuple(a.nums)
        x0, y0 = merc(b[0], b[1]); x1, y1 = merc(b[2], b[3])
        w = a.px; h = round(a.px * (y1 - y0) / (x1 - x0))
        z = copdem(b, w, h)
        deep = np.nan_to_num(z, nan=0) < a.thr
        if a.seed:
            from skimage.measure import label
            lo, la = map(float, a.seed.split(","))
            sx, sy = merc(lo, la)
            px = int((sx - x0) / (x1 - x0) * w); py = int((y1 - sy) / (y1 - y0) * h)
            lab = label(deep)
            deep = lab == lab[py, px]
        alpha = np.clip((a.thr - z) / (a.thr - a.full), 0, 1) * deep
        alpha = 0.35 + 0.65 * alpha
        alpha[~deep] = 0
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[..., 0], rgba[..., 1], rgba[..., 2] = col
        rgba[..., 3] = (alpha * 255).astype(np.uint8)
        save_overlay(a.name, rgba, b, {"minElev": float(np.nanmin(z))})
    elif a.cmd == "below0":
        b = tuple(a.nums)
        z, eb = terrarium(b, a.z)
        h, w = z.shape
        sys.path.insert(0, os.path.dirname(__file__))
        feats = json.load(open(os.path.join(a.ne, "ne_10m_geography_marine_polys.geojson")))["features"]
        lakes = json.load(open(os.path.join(a.ne, "ne_10m_lakes.geojson")))["features"]
        rings = []
        for f in feats + lakes:
            if (f["properties"].get("name") or "") in ("Caspian Sea", "Kara-Bogaz-Gol", "Garabogazköl Aýlagy"):
                g = f["geometry"]
                polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
                rings += [p[0] for p in polys]
        water = poly_mask(rings, eb, w, h)
        # море и Кара-Богаз-Гол — не «суша ниже уровня моря»
        from skimage.morphology import binary_dilation, disk
        water = binary_dilation(water, disk(2))
        low = (z < 0) & ~water
        from skimage.measure import label
        lab = label(low)
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        low = np.isin(lab, np.where(sizes > 60)[0])
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[..., 0], rgba[..., 1], rgba[..., 2] = col
        rgba[..., 3] = (low * 255).astype(np.uint8)
        save_overlay(a.name, rgba, eb)
    elif a.cmd == "profile":
        lo1, la1, lo2, la2 = a.nums
        pts = [(lo1 + (lo2 - lo1) * i / (a.n - 1), la1 + (la2 - la1) * i / (a.n - 1)) for i in range(a.n)]
        b = (min(lo1, lo2) - 0.2, min(la1, la2) - 0.2, max(lo1, lo2) + 0.2, max(la1, la2) + 0.2)
        z, eb = terrarium(b, a.z)
        h, w = z.shape
        ex0, ey0 = merc(eb[0], eb[1]); ex1, ey1 = merc(eb[2], eb[3])
        prof = []
        dist = 0
        for i, (lo, la) in enumerate(pts):
            x, y = merc(lo, la)
            px = int((x - ex0) / (ex1 - ex0) * (w - 1)); py = int((ey1 - y) / (ey1 - ey0) * (h - 1))
            # максимум в окрестности, чтобы не терять пики
            win = z[max(0, py - 2):py + 3, max(0, px - 2):px + 3]
            if i:
                p0 = pts[i - 1]
                dist += 6371 * math.acos(min(1, math.sin(math.radians(la)) * math.sin(math.radians(p0[1])) + math.cos(math.radians(la)) * math.cos(math.radians(p0[1])) * math.cos(math.radians(lo - p0[0]))))
            prof.append([round(dist, 1), round(float(win.max() if win.size else z[py, px]), 1)])
        data = json.load(open(OVR)) if os.path.exists(OVR) else {}
        data[a.name] = {"profile": prof, "from": [lo1, la1], "to": [lo2, la2]}
        json.dump(data, open(OVR, "w"), ensure_ascii=False, indent=1)
        print("разрез", a.name, "мин", min(p[1] for p in prof), "макс", max(p[1] for p in prof), "длина", round(dist))
    elif a.cmd == "heightmap":
        P = json.load(open(os.path.join(ROOT, "src/geo/data/patches.json")))[a.name]
        b = tuple(P["bounds"])
        x0, y0 = merc(b[0], b[1]); x1, y1 = merc(b[2], b[3])
        w = a.px; h = round(a.px * (y1 - y0) / (x1 - x0))
        z = np.nan_to_num(copdem(b, w, h), nan=0)
        lo, hi = float(z.min()), float(z.max())
        q = ((z - lo) / max(hi - lo, 1) * 65535).astype(np.uint16)
        os.makedirs(os.path.join(ROOT, "public/geo/dem"), exist_ok=True)
        # высота в R (старший байт) и G (младший байт)
        rgb = np.zeros((h, w, 3), np.uint8)
        rgb[..., 0] = q >> 8; rgb[..., 1] = q & 255
        Image.fromarray(rgb).save(os.path.join(ROOT, f"public/geo/dem/{a.name}_h.png"), optimize=True)
        data = json.load(open(OVR)) if os.path.exists(OVR) else {}
        data[a.name + "_h"] = {"src": f"geo/dem/{a.name}_h.png", "bounds": list(b), "min": lo, "max": hi, "size": [w, h]}
        json.dump(data, open(OVR, "w"), ensure_ascii=False, indent=1)
        print("карта высот", a.name, lo, hi, w, h)


if __name__ == "__main__":
    main()
