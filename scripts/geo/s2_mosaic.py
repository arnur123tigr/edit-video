"""Мозаика Sentinel-2 на большое окно (несколько квадратов MGRS, у каждого — свой лучший снимок).
Нужна там, где один снимок не покрывает кадр: Арал, стык квадратов у Мёртвого моря.

Пример:
  python scripts/geo/s2_mosaic.py aral 57.6 43.3 62.2 47.2 --px 3000
Результат: public/geo/s2/<name>.jpg и запись в src/geo/data/patches.json (как у s2_patch.py)
"""
import argparse, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import mgrs
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from s2_patch import BUCKET, ROOT, list_prefixes, merc, read_band  # noqa: E402


def scenes_for(tile, years, months):
    zone, band, sq = tile[:2], tile[2], tile[3:5]
    prefixes = []
    for y in years:
        for m in months:
            prefixes += list_prefixes(f"sentinel-s2-l2a-cogs/{int(zone)}/{band}/{sq}/{y}/{m}/")

    def meta(p):
        sid = p.rstrip("/").split("/")[-1]
        try:
            pr = json.loads(urllib.request.urlopen(f"{BUCKET}/{p}{sid}.json", timeout=60).read())["properties"]
        except Exception:
            return None
        return (pr.get("eo:cloud_cover", 100) + pr.get("s2:nodata_pixel_percentage", 100) / 8, p, sid)

    with ThreadPoolExecutor(12) as ex:
        out = [x for x in ex.map(meta, prefixes) if x]
    out.sort()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("w", type=float)
    ap.add_argument("s", type=float)
    ap.add_argument("e", type=float)
    ap.add_argument("n", type=float)
    ap.add_argument("--years", default="2024")
    ap.add_argument("--months", default="7,8")
    ap.add_argument("--px", type=int, default=2600)
    ap.add_argument("--per-tile", type=int, default=3, help="сколько снимков на квадрат брать для дозаполнения")
    a = ap.parse_args()

    x0, y0 = merc(a.w, a.s)
    x1, y1 = merc(a.e, a.n)
    bounds = (x0, y0, x1, y1)
    if x1 - x0 >= y1 - y0:
        W = a.px; H = round(a.px * (y1 - y0) / (x1 - x0))
    else:
        H = a.px; W = round(a.px * (x1 - x0) / (y1 - y0))

    m = mgrs.MGRS()
    tiles = set()
    for fx in np.linspace(0, 1, 14):
        for fy in np.linspace(0, 1, 14):
            lon = a.w + (a.e - a.w) * fx
            lat = a.s + (a.n - a.s) * fy
            tiles.add(m.toMGRS(lat, lon, MGRSPrecision=0))
    # квадрат Sentinel-2 у границы широтного пояса может лежать в архиве под соседней буквой пояса
    bands = "CDEFGHJKLMNPQRSTUVWX"
    for tl in list(tiles):
        i = bands.index(tl[2])
        for j in (i - 1, i + 1):
            if 0 <= j < len(bands):
                tiles.add(tl[:2] + bands[j] + tl[3:])
    print("квадраты:", sorted(tiles))

    years = [int(x) for x in a.years.split(",")]
    months = [int(x) for x in a.months.split(",")]
    with ThreadPoolExecutor(4) as ex:
        found = dict(zip(sorted(tiles), ex.map(lambda t: scenes_for(t, years, months), sorted(tiles))))

    out = np.zeros((3, H, W), np.uint8)
    for tile, sc in found.items():
        if not sc:
            continue
        for score, p, sid in sc[: a.per_tile]:
            hole = out.sum(axis=0) == 0
            if not hole.any():
                break
            try:
                rgb = read_band(f"{BUCKET}/{p}TCI.tif", "EPSG:3857", bounds, W, H)
            except Exception as e:
                print("  skip", sid, e); continue
            fill = hole & (rgb.sum(axis=0) > 0)
            out[:, fill] = rgb[:, fill]
            print(f"  {tile} {sid} (оценка {score:.1f}): +{fill.mean()*100:.1f}%, пусто {float((out.sum(axis=0)==0).mean())*100:.1f}%")

    img = np.moveaxis(out, 0, -1)
    os.makedirs(os.path.join(ROOT, "public/geo/s2"), exist_ok=True)
    Image.fromarray(img).save(os.path.join(ROOT, f"public/geo/s2/{a.name}.jpg"), quality=88)
    pj = os.path.join(ROOT, "src/geo/data/patches.json")
    data = json.load(open(pj)) if os.path.exists(pj) else {}
    data[a.name] = {"src": f"geo/s2/{a.name}.jpg", "bounds": [a.w, a.s, a.e, a.n], "size": [W, H],
                    "scene": "mosaic:" + ",".join(sorted(found)), "cloud": 0}
    json.dump(data, open(pj, "w"), ensure_ascii=False, indent=1)
    print("готово:", a.name, data[a.name])


if __name__ == "__main__":
    main()
