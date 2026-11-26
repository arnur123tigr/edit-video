"""Подгоняет цвета снимка Sentinel-2 под подложку Blue Marble, чтобы край снимка не был виден.
Статистика берётся только с рамки по краю снимка (там на обеих картинках одна и та же суша).

  python3 scripts/geo/patch_match.py aral --border 0.2
Исходник сохраняется рядом как <имя>_raw.jpg (только локально) и при повторном запуске берётся он.
"""
import argparse, json, os, shutil, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ground import get, wx, wy  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--border", type=float, default=0.2, help="ширина рамки, доля размера")
    ap.add_argument("--z", type=int, default=7)
    ap.add_argument("--strength", type=float, default=1.0)
    a = ap.parse_args()
    P = json.load(open(os.path.join(ROOT, "src/geo/data/patches.json")))[a.name]
    src = os.path.join(ROOT, "public", P["src"])
    raw = os.path.join("/tmp/claude-0/work/raw", os.path.basename(src))
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    if not os.path.exists(raw):
        shutil.copy(src, raw)
    img = Image.open(raw).convert("RGB")
    W, H = img.size
    w, s, e, n = P["bounds"]
    N = 2 ** a.z
    px0, px1 = wx(w) * N * 256, wx(e) * N * 256
    py0, py1 = wy(n) * N * 256, wy(s) * N * 256
    tx0, tx1, ty0, ty1 = int(px0 // 256), int(px1 // 256), int(py0 // 256), int(py1 // 256)
    big = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for y in range(ty0, ty1 + 1):
        for x in range(tx0, tx1 + 1):
            big.paste(get(a.z, x, y), ((x - tx0) * 256, (y - ty0) * 256))
    bm = big.crop((round(px0 - tx0 * 256), round(py0 - ty0 * 256), round(px1 - tx0 * 256), round(py1 - ty0 * 256))).resize((W, H))
    g = np.asarray(img, np.float32)
    b = np.asarray(bm, np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    ring = (np.minimum(np.minimum(xx, W - 1 - xx) / W, np.minimum(yy, H - 1 - yy) / H) < a.border)
    gm, gs = g[ring].mean(0), g[ring].std(0)
    bmn, bs = b[ring].mean(0), b[ring].std(0)
    out = (g - gm) / (gs + 1e-3) * bs + bmn
    out = g * (1 - a.strength) + out * a.strength
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(src, quality=88)
    print("подогнано", a.name, "снимок", gm.round(1), gs.round(1), "→ подложка", bmn.round(1), bs.round(1))


if __name__ == "__main__":
    main()
