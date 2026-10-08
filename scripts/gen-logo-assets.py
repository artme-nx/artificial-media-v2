"""Logo: animacija lutke-I i favicon iz istog tijela (kanon v2).

Čita (samo čita) brand/05-logo/figura (lutka.py, logo2d.py) — isti algoritam kojim je nacrtan logo runde 3,
pa je zadnji frame animacije piksel-isti kao lutka u logu. Ništa ne piše u brand/ (bez __pycache__).

Izlaz:
  public/brand/logo-poses.json          — frameovi siluete (lutka se namješta u baletnu pozu); učitava se lijeno
  public/favicon.svg, public/icon-32.png, public/apple-touch-icon.png (180), public/icon-512.png
  qa/faza-1/favicon-provjera.png        — 16/24/32 px na svijetloj i tamnoj podlozi

Pokretanje: .venv-logo/bin/python scripts/gen-logo-assets.py   (numpy, opencv-python-headless)
"""
import json, math, os, sys

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = os.path.join(ROOT, "..", "brand", "05-logo", "figura")
sys.path.insert(0, FIG)

import numpy as np  # noqa: E402
import cv2  # noqa: E402
from lutka import Lutka, blend  # noqa: E402
from logo2d import render, proj_polys  # noqa: E402

lt = Lutka()
SH = 4
FX = 1 << SH


def P(name):
    return {k: v for k, v in lt.K["poses"][name].items() if not k.startswith("_")}


# Poza lutke-I u logu (05-logo runda 2b/3: brand/05-logo/runda2/gen_v4b.py, POSE_IH)
POSE_IH = P("b_enhaut")
POSE_IH["armL"] = {"th": [-6, 2, 8], "ph": [4, 14, 14], "roll": [0, 0, -20]}

# Početak animacije: lutka stoji uspravno kao obično slovo I (ruke uz tijelo, stopala zajedno).
POSE_I = json.loads(json.dumps(POSE_IH))
POSE_I["chest"] = {"tilt": 0, "pitch": 0, "yaw": 0}
POSE_I["neck"] = {"tilt": 0, "pitch": 0, "yaw": 0}
POSE_I["head"] = {"tilt": 0, "pitch": 0, "yaw": 0}
POSE_I["armL"] = {"th": [-4, -2, 0], "ph": [2, 4, 4], "roll": [0, 0, -10]}
POSE_I["armR"] = {"th": [4, 2, 0], "ph": [2, 4, 4], "roll": [0, 0, 10]}
POSE_I["legL"] = {"th": [1, 0], "ph": [0, 0], "foot": -30, "fp": 0}
POSE_I["legR"] = {"th": [-1, 0], "ph": [0, 0], "foot": 30, "fp": 0}

FIG_BOLD = 0.025  # Geometrija.fig_bold (runda 3)


def trace(mask, x0f, y1f, sc, sigma=1.6, eps=0.3, prec=4):
    cs, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        c = c[:, 0, :].astype(np.float64) + 0.5
        if len(c) < 8:
            continue
        r = int(3 * sigma)
        k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
        k /= k.sum()
        ext = np.concatenate([c[-r:], c, c[:r]])
        c = np.stack([np.convolve(ext[:, 0], k, "valid"), np.convolve(ext[:, 1], k, "valid")], -1)
        c = cv2.approxPolyDP(c.astype(np.float32).reshape(-1, 1, 2), eps, True)[:, 0, :]
        out.append("M" + "L".join(f"{x / sc + x0f:.{prec}f},{-(y1f - y / sc):.{prec}f}" for x, y in c) + "Z")
    return "".join(out)


def figure_path(pose, bold=FIG_BOLD, gap=None, scale=420, eps=0.3, prec=4):
    """Isto kao gen_runda3.figure_paths: silueta u jedinicama glave, y prema dolje od poda (0)."""
    parts = lt.layout(pose)
    m, (x0f, y1f, sc) = render(lt, parts, scale, margin=0.02, bold=bold, gap=gap)
    pp = {p["n"]: p for p in parts}
    hd = pp["head"]
    head_top = max((hd["S"] + hd["M"][:, 1] * hd["L"])[1], hd["S"][1])
    ys, xs = np.nonzero(m)
    return dict(d=trace(m, x0f, y1f, sc, eps=eps, prec=prec), head_top=float(head_top), x0=float(xs.min() / sc + x0f), x1=float(xs.max() / sc + x0f), mask=m, tf=(x0f, y1f, sc))


def ease(u):
    return u * u * u * (u * (u * 6 - 15) + 10)  # smootherstep


def logo_poses(n=18):
    """Frameovi 0..n-2 (zadnji frame je sama lutka iz loga, logo-data.json, pa nema skoka)."""
    frames = []
    for i in range(n - 1):
        u = ease(i / (n - 1))
        pose = blend(POSE_I, POSE_IH, u)
        f = figure_path(pose, scale=300, eps=0.45, prec=3)
        frames.append(f["d"])
    final = figure_path(POSE_IH)
    return dict(frames=frames, head_top=final["head_top"], x0=final["x0"], x1=final["x1"])


def favicon():
    """Izrez glave, ruke en haut i gornjeg trupa (05-logo Runda 1c, otvoreno 2). Optička veličina S: bez razmaka, deblje."""
    parts = lt.layout(POSE_IH)
    scale = 900
    m, (x0f, y1f, sc) = render(lt, parts, scale, margin=0.05, gap=0.0, bold=0.075)
    pp = {p["n"]: p for p in parts}
    chest = pp["chest"]
    # izrez: od sredine prsa do vrha ruke iznad glave
    y_cut = float((chest["S"] + chest["M"][:, 1] * chest["L"] * 0.42)[1])
    ys, xs = np.nonzero(m)
    top_px = ys.min()
    cut_px = int(round((y1f - y_cut) * sc))
    crop = m[top_px:cut_px, :]
    ys2, xs2 = np.nonzero(crop)
    crop = crop[:, xs2.min(): xs2.max() + 1]
    h, w = crop.shape
    # bista naslonjena na donji rub (klasični izrez portreta), vodoravno centrirana
    side = int(max(h * 1.1, w * 1.12))
    sq = np.zeros((side, side), np.uint8)
    oy = side - h
    ox = (side - w) // 2
    sq[oy: oy + h, ox: ox + w] = crop
    return sq


def mask_to_svg_path(mask, unit, sigma=1.4, eps=0.35):
    cs, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    k = unit / mask.shape[0]
    out = []
    for c in cs:
        c = c[:, 0, :].astype(np.float64) + 0.5
        if len(c) < 8:
            continue
        r = int(3 * sigma)
        wts = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
        wts /= wts.sum()
        ext = np.concatenate([c[-r:], c, c[:r]])
        c = np.stack([np.convolve(ext[:, 0], wts, "valid"), np.convolve(ext[:, 1], wts, "valid")], -1)
        c = cv2.approxPolyDP(c.astype(np.float32).reshape(-1, 1, 2), eps, True)[:, 0, :]
        out.append("M" + "L".join(f"{x * k:.2f},{y * k:.2f}" for x, y in c) + "Z")
    return "".join(out)


INK = (0x0B, 0x0B, 0x0C)
IVORY = (0xEF, 0xEB, 0xE3)
PAPER = (0xF3, 0xEF, 0xE7)
INK2 = (0x15, 0x13, 0x16)


def raster(mask, size, fg, bg, radius=0.22):
    """Supersamplirani raster: figura `fg` na zaobljenom kvadratu `bg`."""
    ss = 8
    big = cv2.resize(mask, (size * ss, size * ss), interpolation=cv2.INTER_AREA)
    a = big.astype(np.float32) / 255.0
    img = np.zeros((size * ss, size * ss, 4), np.float32)
    # zaobljeni kvadrat
    sq = np.zeros((size * ss, size * ss), np.uint8)
    r = int(radius * size * ss)
    cv2.rectangle(sq, (r, 0), (size * ss - 1 - r, size * ss - 1), 255, -1)
    cv2.rectangle(sq, (0, r), (size * ss - 1, size * ss - 1 - r), 255, -1)
    for cx, cy in [(r, r), (size * ss - 1 - r, r), (r, size * ss - 1 - r), (size * ss - 1 - r, size * ss - 1 - r)]:
        cv2.circle(sq, (cx, cy), r, 255, -1)
    bga = sq.astype(np.float32) / 255.0
    for i, (cf, cb) in enumerate(zip(fg, bg)):
        img[..., 2 - i] = (cf * a + cb * (1 - a))
    img[..., 3] = bga * 255
    out = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    poses = logo_poses()
    data = {
        "_izvor": "scripts/gen-logo-assets.py iz brand/05-logo/figura (kanon v2, poza POSE_IH iz runde 2b/3); ne uređuj ovdje",
        "frames": poses["frames"],
        "head_top": poses["head_top"],
        "x0": poses["x0"],
        "x1": poses["x1"],
    }
    pubb = os.path.join(ROOT, "public", "brand")
    os.makedirs(pubb, exist_ok=True)
    with open(os.path.join(pubb, "logo-poses.json"), "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print("logo-poses.json:", len(poses["frames"]), "frameova")

    fav = favicon()
    unit = 64.0
    path = mask_to_svg_path(fav, unit)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        "<style>path{fill:#151316}@media (prefers-color-scheme:dark){path{fill:#EFEBE3}}</style>"
        f'<path fill-rule="evenodd" d="{path}"/></svg>'
    )
    pub = os.path.join(ROOT, "public")
    with open(os.path.join(pub, "favicon.svg"), "w") as f:
        f.write(svg)
    for size, name in [(32, "icon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
        pad = 0.0 if size == 32 else 0.08
        m = fav
        if pad:
            s = m.shape[0]
            p = int(s * pad)
            m = cv2.copyMakeBorder(m, p, p, p, p, cv2.BORDER_CONSTANT, value=0)
        img = raster(m, size, IVORY, INK, radius=0.22 if size == 32 else 0.0)
        cv2.imwrite(os.path.join(pub, name), img)
    import shutil
    app = os.path.join(ROOT, "app")
    shutil.copy(os.path.join(pub, "favicon.svg"), os.path.join(app, "icon.svg"))
    shutil.copy(os.path.join(pub, "icon-32.png"), os.path.join(app, "icon1.png"))
    shutil.copy(os.path.join(pub, "apple-touch-icon.png"), os.path.join(app, "apple-icon.png"))
    print("favicon: svg + 32/180/512 (+ app/icon.svg, app/icon1.png, app/apple-icon.png)")

    # provjera čitljivosti: 16/24/32 px na svijetloj i tamnoj podlozi (uvećano ×8 bez glačanja)
    qa = os.path.join(ROOT, "qa", "faza-1")
    os.makedirs(qa, exist_ok=True)
    tiles = []
    for bg, fg in [(PAPER, INK2), (INK, IVORY)]:
        row = []
        for size in (16, 24, 32):
            a = cv2.resize(fav, (size, size), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
            t = np.zeros((size, size, 3), np.float32)
            for i in range(3):
                t[..., 2 - i] = fg[i] * a + bg[i] * (1 - a)
            t = cv2.resize(t.astype(np.uint8), (size * 8, size * 8), interpolation=cv2.INTER_NEAREST)
            canvas = np.zeros((300, 300, 3), np.uint8)
            canvas[:] = bg[::-1]
            oy = (300 - t.shape[0]) // 2
            canvas[oy: oy + t.shape[0], oy: oy + t.shape[1]] = t
            row.append(canvas)
        tiles.append(np.concatenate(row, 1))
    cv2.imwrite(os.path.join(qa, "favicon-provjera.png"), np.concatenate(tiles, 0))
    print("qa/faza-1/favicon-provjera.png")


if __name__ == "__main__":
    main()
