"""Скачивает тайлы NASA Blue Marble (открытые, public domain) и склеивает их в 512-px тайлы.
Источник: s3.amazonaws.com/com.modestmaps.bluemarble (Blue Marble Next Generation, 500 м/пикс).

Запуск:
  npx tsx scripts/geo/needed-tiles.ts reel1 > tiles.txt
  python scripts/geo/fetch_tiles.py tiles.txt
Результат: public/geo/tiles/<уровень>/<x>/<y>.jpg и список src/geo/data/tiles.json
"""
import io, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public/geo/tiles")
URL = "https://s3.amazonaws.com/com.modestmaps.bluemarble/{z}-r{y}-c{x}.jpg"


def get(z, x, y):
    for _ in range(4):
        try:
            return Image.open(io.BytesIO(urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read())).convert("RGB")
        except Exception as e:
            err = e
    print("нет тайла", z, x, y, err)
    return None


def make(key):
    l, x, y = map(int, key.split("/"))
    p = os.path.join(OUT, str(l), str(x), f"{y}.jpg")
    if os.path.exists(p):
        return
    im = Image.new("RGB", (512, 512))
    for dy in (0, 1):
        for dx in (0, 1):
            t = get(l + 1, 2 * x + dx, 2 * y + dy)
            if t is None:
                return
            im.paste(t, (dx * 256, dy * 256))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, quality=84, optimize=True)


def manifest():
    keys = []
    for l in sorted(os.listdir(OUT), key=int):
        for x in os.listdir(os.path.join(OUT, l)):
            for f in os.listdir(os.path.join(OUT, l, x)):
                keys.append(f"{l}/{x}/{f[:-4]}")
    keys.sort(key=lambda k: tuple(map(int, k.split("/"))))
    json.dump(keys, open(os.path.join(ROOT, "src/geo/data/tiles.json"), "w"), separators=(",", ":"))
    print("тайлов всего:", len(keys))


if __name__ == "__main__":
    keys = [k.strip() for f in sys.argv[1:] for k in open(f) if k.strip()]
    with ThreadPoolExecutor(16) as ex:
        list(ex.map(make, keys))
    manifest()
