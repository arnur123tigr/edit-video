"""Готовит векторные данные (реки, границы, озёра) из Natural Earth 10m для роликов.
Исходники: https://github.com/nvkelso/natural-earth-vector (public domain).
Запуск: python scripts/geo/vectors.py <папка с geojson> 
Результат: src/geo/data/*.json
"""
import json, math, os, sys
from shapely.geometry import shape, LineString, MultiLineString, Point, mapping
from shapely.ops import linemerge, unary_union

NE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/ne"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "src/geo/data")
os.makedirs(OUT, exist_ok=True)

_cache = {}
def load(name):
    if name not in _cache:
        _cache[name] = json.load(open(os.path.join(NE, name + ".geojson")))["features"]
    return _cache[name]

def r(c, n=4):
    return [round(c[0], n), round(c[1], n)]

def parts_of(names, bbox=None, cla=("River", "Lake Centerline")):
    parts = []
    for f in load("ne_10m_rivers_lake_centerlines"):
        p = f["properties"]
        if p.get("name") in names and p.get("featurecla") in cla and f["geometry"]:
            g = shape(f["geometry"])
            for ls in (g.geoms if g.geom_type == "MultiLineString" else [g]):
                if bbox:
                    x0, y0, x1, y1 = ls.bounds
                    if x1 < bbox[0] or x0 > bbox[2] or y1 < bbox[1] or y0 > bbox[3]:
                        continue
                parts.append(list(ls.coords))
    return parts

def chain(parts, start, end=None, tol=0.25):
    """Склеивает куски в одну линию от точки start (исток) вниз по течению."""
    merged = linemerge(MultiLineString(parts))
    lines = [list(l.coords) for l in (merged.geoms if merged.geom_type == "MultiLineString" else [merged])]
    d = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
    # начинаем с линии, конец которой ближе всего к истоку
    best = min(range(len(lines)), key=lambda i: min(d(lines[i][0], start), d(lines[i][-1], start)))
    cur = lines.pop(best)
    if d(cur[-1], start) < d(cur[0], start):
        cur.reverse()
    while lines:
        tail = cur[-1]
        i = min(range(len(lines)), key=lambda i: min(d(lines[i][0], tail), d(lines[i][-1], tail)))
        cand = lines[i]
        gap = min(d(cand[0], tail), d(cand[-1], tail))
        if gap > tol:
            break
        lines.pop(i)
        if d(cand[-1], tail) < d(cand[0], tail):
            cand = cand[::-1]
        cur += cand[1:]
    return cur

def simplify(coords, tol=0.004):
    return [r(c) for c in LineString(coords).simplify(tol, preserve_topology=False).coords]

def country(name):
    for f in load("ne_10m_admin_0_countries"):
        if f["properties"]["ADMIN"] == name:
            return shape(f["geometry"])
    raise KeyError(name)

def poly_coords(g, tol=0.01, min_area=0.05):
    g = g.simplify(tol, preserve_topology=True)
    polys = g.geoms if g.geom_type == "MultiPolygon" else [g]
    return [[r(c, 3) for c in p.exterior.coords] for p in polys if p.area >= min_area]

def lake(name):
    for f in load("ne_10m_lakes"):
        if f["properties"].get("name") == name:
            return shape(f["geometry"])
    raise KeyError(name)

def marine(name):
    for f in load("ne_10m_geography_marine_polys"):
        if f["properties"].get("name") == name:
            return shape(f["geometry"])
    raise KeyError(name)

def border(a, b, tol=0.005):
    g = country(a).boundary.intersection(country(b).buffer(0.02))
    lines = linemerge(g) if g.geom_type == "MultiLineString" else g
    ls = lines.geoms if lines.geom_type == "MultiLineString" else [lines]
    return [simplify(list(l.coords), tol) for l in ls if l.length > 0.05]

def save(name, data):
    p = os.path.join(OUT, name + ".json")
    json.dump(data, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(name, os.path.getsize(p) // 1024, "KB")


def gulf_centerline(poly, lat0, lat1, step=0.1, max_lon=76.0):
    from shapely.geometry import LineString as LS
    pts = []
    prev = None
    lat = lat0
    while lat <= lat1:
        cut = poly.intersection(LS([(60, lat), (max_lon, lat)]))
        segs = [cut] if cut.geom_type == "LineString" else list(getattr(cut, "geoms", []))
        segs = [s for s in segs if s.length > 0.02]
        if segs:
            if prev is None:
                s = min(segs, key=lambda s: s.bounds[0])
            else:
                s = min(segs, key=lambda s: abs((s.bounds[0] + s.bounds[2]) / 2 - prev))
            mid = (s.bounds[0] + s.bounds[2]) / 2
            pts.append((mid, lat))
            prev = mid
        lat += step
    return pts


def reel1():
    esil = chain(parts_of({"Esil", "Ishim"}), start=(73.1, 51.0))
    irtysh = chain(parts_of({"Ertix", "Ertis", "Irtysh"}), start=(90.3, 47.9), tol=0.4)
    ob_parts = parts_of({"Ob"}, bbox=(64, 52, 86, 67))
    ob = chain(ob_parts, start=(85.1, 52.4), tol=0.4)
    gulf = gulf_centerline(marine("Gulf of Ob"), 66.55, 72.9)
    tobol = chain(parts_of({"Tobol"}), start=(61.0, 51.5))
    return esil, irtysh, ob, gulf, tobol


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "debug1":
    esil, irtysh, ob, gulf, tobol = reel1()
    for n, l in [("esil", esil), ("irtysh", irtysh), ("ob", ob), ("gulf", gulf), ("tobol", tobol)]:
        print(n, len(l), "start", r(l[0]), "end", r(l[-1]))


def smooth_pts(pts, k=3):
    out = []
    for i in range(len(pts)):
        a, b = max(0, i - k), min(len(pts), i + k + 1)
        out.append((sum(p[0] for p in pts[a:b]) / (b - a), sum(p[1] for p in pts[a:b]) / (b - a)))
    out[0], out[-1] = pts[0], pts[-1]
    return out


def export_reel1():
    esil, irtysh, ob, gulf, tobol = reel1()
    gulf = smooth_pts(gulf, 4)
    ob_full = ob + [(68.3, 66.62), (69.0, 66.58)] + gulf + [(74.0, 73.3), (73.6, 73.9)]
    syr = chain(parts_of({"Syr  Darya"}), start=(69.8, 41.0), tol=0.5)
    ural = chain(parts_of({"Ural"}), start=(59.4, 54.6), tol=0.5)
    ile = chain(parts_of({"Ile"}), start=(81.8, 43.6), tol=0.5)
    kz = country("Kazakhstan")
    data = {
        "rivers": {
            "esil": simplify(esil), "irtysh": simplify(irtysh), "ob": simplify(ob_full, 0.003),
            "tobol": simplify(tobol), "syr": simplify(syr), "ural": simplify(ural), "ile": simplify(ile),
        },
        "kz": poly_coords(kz, 0.01),
        "borderKzRu": border("Kazakhstan", "Russia"),
        "borderKzCn": border("Kazakhstan", "China"),
        "zaisan": poly_coords(lake("Lake Zaysan"), 0.003, 0.0),
        "kara": poly_coords(marine("Kara Sea"), 0.03),
        "gulfOb": poly_coords(marine("Gulf of Ob"), 0.01),
        "arctic": poly_coords(marine("Arctic Ocean"), 0.05),
        "barents": poly_coords(marine("Barents Sea"), 0.05),
    }
    save("reel1", data)


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "reel1":
    export_reel1()


def px_to_lnglat(patch, pts):
    """Пиксели детального снимка → долгота/широта (снимок в Меркаторе)."""
    P = json.load(open(os.path.join(OUT, "patches.json")))[patch]
    w, s, e, n = P["bounds"]; W, H = P["size"]
    my = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    y0, y1 = my(n), my(s)
    out = []
    for x, y in pts:
        yy = y0 + (y1 - y0) * y / H
        out.append(r((w + (e - w) * x / W, math.degrees(2 * math.atan(math.exp(yy)) - math.pi / 2)), 5))
    return out


def export_reel3(plates_path="/tmp/claude-0/plates/PB2002_boundaries.json"):
    africa = unary_union([shape(f["geometry"]) for f in load("ne_10m_admin_0_countries") if f["properties"].get("CONTINENT") == "Africa"])
    # Восточно-Африканский рифт: восточная ветвь (Афар → Эфиопия → Кения → Танзания) и Малави
    rift = [(43.0, 11.75), (42.2, 11.5), (41.2, 11.0), (40.3, 10.0), (39.5, 8.7), (38.6, 7.4), (37.9, 6.0), (37.0, 4.9), (36.4, 3.9),
            (36.1, 2.6), (36.0, 1.3), (36.1, 0.3), (36.3, -0.6), (36.42, -1.03), (36.2, -2.0), (35.9, -3.0), (35.7, -4.2), (35.4, -5.6),
            (34.9, -7.2), (34.1, -8.8), (33.9, -9.8), (34.2, -11.0), (34.5, -12.6), (34.8, -14.0), (35.2, -15.6), (35.3, -17.0)]
    rift = smooth_pts(rift, 1)
    # дорога Маи-Махиу — Нарок по снимку Sentinel-2 (пиксели снимка)
    road = px_to_lnglat("maimahiu", [(0, 1222), (150, 1221), (330, 1217), (420, 1220), (500, 1226), (600, 1235), (700, 1242),
                                      (800, 1234), (900, 1209), (1000, 1197), (1100, 1181), (1200, 1150), (1300, 1110), (1352, 1086)])
    pl = json.load(open(plates_path))["features"]
    plates = [simplify([tuple(c) for c in f["geometry"]["coordinates"]], 0.08) for f in pl]
    data = {
        "africa": poly_coords(africa, 0.02, 0.3),
        "rift": [r(p, 3) for p in rift],
        "road": road,
        "redSea": poly_coords(marine("Red Sea"), 0.02),
        "gulfAden": poly_coords(marine("Gulf of Aden"), 0.02),
        "plates": plates,
    }
    save("reel3", data)


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "reel3":
    export_reel3()
