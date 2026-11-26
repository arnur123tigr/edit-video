"""Подложка для 3D-рельефа: кусок NASA Blue Marble вокруг детального снимка.
Кладётся плоскостью под рельефом, чтобы при наклоне камеры за краем снимка была земля, а не пустота.

  python3 scripts/geo/ground.py <имя> w s e n [--z 8]
Результат: public/geo/dem/<имя>_ground.jpg и запись <имя>_ground в src/geo/data/overlays.json
"""
import argparse, io, json, math, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVR = os.path.join(ROOT, "src/geo/data/overlays.json")
URL = "https://s3.amazonaws.com/com.modestmaps.bluemarble/{z}-r{y}-c{x}.jpg"


def wx(lon):
    return (lon + 180) / 360


def wy(lat):
    s = math.sin(math.radians(lat))
    return 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def get(z, x, y):
    for _ in range(4):
        try:
            return Image.open(io.BytesIO(urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read())).convert("RGB")
        except Exception as e:
            err = e
    raise SystemExit(f"нет тайла {z}/{x}/{y}: {err}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("bounds", nargs=4, type=float)
    ap.add_argument("--z", type=int, default=8)
    ap.add_argument("--match", default=None, help="подогнать цвета под детальный снимок (имя из patches.json)")
    a = ap.parse_args()
    w, s, e, n = a.bounds
    N = 2 ** a.z
    px0, px1 = wx(w) * N * 256, wx(e) * N * 256
    py0, py1 = wy(n) * N * 256, wy(s) * N * 256
    tx0, tx1 = int(px0 // 256), int(px1 // 256)
    ty0, ty1 = int(py0 // 256), int(py1 // 256)
    jobs = [(x, y) for y in range(ty0, ty1 + 1) for x in range(tx0, tx1 + 1)]
    with ThreadPoolExecutor(16) as ex:
        tiles = dict(zip(jobs, ex.map(lambda j: get(a.z, j[0], j[1]), jobs)))
    big = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for (x, y), im in tiles.items():
        big.paste(im, ((x - tx0) * 256, (y - ty0) * 256))
    crop = big.crop((round(px0 - tx0 * 256), round(py0 - ty0 * 256), round(px1 - tx0 * 256), round(py1 - ty0 * 256)))
    if a.match:
        # цвета Blue Marble темнее и зеленее Sentinel-2: подгоняем среднее и разброс по каналам
        import numpy as np
        P = json.load(open(os.path.join(ROOT, "src/geo/data/patches.json")))[a.match]
        pw, ps, pe, pn = P["bounds"]
        ref = np.asarray(Image.open(os.path.join(ROOT, "public", P["src"])).convert("RGB").resize((400, 400)), np.float32)
        g = np.asarray(crop, np.float32)
        W, H = crop.size
        cx0 = int((wx(pw) - wx(w)) / (wx(e) - wx(w)) * W); cx1 = int((wx(pe) - wx(w)) / (wx(e) - wx(w)) * W)
        cy0 = int((wy(pn) - wy(n)) / (wy(s) - wy(n)) * H); cy1 = int((wy(ps) - wy(n)) / (wy(s) - wy(n)) * H)
        sub = g[cy0:cy1, cx0:cx1].reshape(-1, 3)
        # вода (тёмные пиксели) не участвует в подгонке
        land_ref = ref.reshape(-1, 3); land_ref = land_ref[land_ref.mean(1) > 60]
        def landness(a):
            m = a.mean(-1); bl = a[..., 2] - a[..., 0]
            return np.clip((m - 45) / 30, 0, 1) * (1 - np.clip((bl - 5) / 20, 0, 1))
        land_sub = sub[landness(sub) > 0.9]
        out = (g - land_sub.mean(0)) / (land_sub.std(0) + 1e-3) * land_ref.std(0) + land_ref.mean(0)
        k = landness(g)[..., None] * 0.85
        out = g * (1 - k) + out * k
        crop = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    rel = f"geo/dem/{a.name}_ground.jpg"
    crop.save(os.path.join(ROOT, "public", rel), quality=86, optimize=True)
    data = json.load(open(OVR)) if os.path.exists(OVR) else {}
    data[a.name + "_ground"] = {"src": rel, "bounds": [w, s, e, n], "size": list(crop.size)}
    json.dump(data, open(OVR, "w"), ensure_ascii=False, indent=1)
    print("подложка", a.name, crop.size)


if __name__ == "__main__":
    main()
