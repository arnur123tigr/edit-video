"""Маска воды по цвету снимка (тёмные сине-зелёные пиксели) внутри заданного контура.
Нужна, когда у мозаики нет канала NIR: например, Арал, где контуры Natural Earth устарели.

  python3 scripts/geo/water_mask.py aral reel4 southAral aral_south 255,255,255
Результат: public/geo/dem/<out>.png (цвет + прозрачность) и запись <out> в src/geo/data/overlays.json
"""
import argparse, json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = 6378137.0


def merc(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("patch")
    ap.add_argument("data", help="файл src/geo/data/<data>.json")
    ap.add_argument("key", help="контур в этом файле")
    ap.add_argument("out")
    ap.add_argument("color", help="r,g,b")
    ap.add_argument("--grow", type=int, default=40, help="насколько расширить контур, px")
    ap.add_argument("--dark", type=float, default=330, help="порог суммы RGB для воды")
    a = ap.parse_args()

    P = json.load(open(os.path.join(ROOT, "src/geo/data/patches.json")))[a.patch]
    img = np.array(Image.open(os.path.join(ROOT, "public", P["src"])).convert("RGB")).astype(np.int32)
    h, w, _ = img.shape
    b = P["bounds"]
    x0, y0 = merc(b[0], b[1]); x1, y1 = merc(b[2], b[3])
    rings = json.load(open(os.path.join(ROOT, f"src/geo/data/{a.data}.json")))[a.key]
    area = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(area)
    for ring in rings:
        pts = []
        for lo, la in ring:
            x, y = merc(lo, la)
            pts.append(((x - x0) / (x1 - x0) * w, (y1 - y) / (y1 - y0) * h))
        d.polygon(pts, fill=255)
    area = np.array(area.filter(ImageFilter.MaxFilter(a.grow * 2 + 1))) > 0
    r, g, bl = img[..., 0], img[..., 1], img[..., 2]
    water = (r + g + bl < a.dark) & (np.maximum(g, bl) > r + 4) & area
    m = Image.fromarray((water * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    col = [int(c) for c in a.color.split(",")]
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = col
    rgba[..., 3] = np.array(m)
    os.makedirs(os.path.join(ROOT, "public/geo/dem"), exist_ok=True)
    Image.fromarray(rgba).save(os.path.join(ROOT, f"public/geo/dem/{a.out}.png"), optimize=True)
    ovr = os.path.join(ROOT, "src/geo/data/overlays.json")
    data = json.load(open(ovr))
    data[a.out] = {"src": f"geo/dem/{a.out}.png", "bounds": b, "size": [w, h]}
    json.dump(data, open(ovr, "w"), ensure_ascii=False, indent=1)
    print("маска", a.out, "воды", round(float(water.mean()) * 100, 2), "%")


if __name__ == "__main__":
    main()
