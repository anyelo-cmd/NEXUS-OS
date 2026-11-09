#!/usr/bin/env python3
"""NEXUS OS — estudio de diseño en Python (tema "Ultron").

Genera con Pillow + NumPy todo el aspecto visual:
  assets/ultron-bg.jpg   fondo HUD (rejilla hexagonal, anillos de radar, circuitos, escaneo)
  assets/logo.svg        logo hexagonal con ojos luminosos
  assets/eye.svg         ojos animados de la pantalla de arranque
  assets/ring.svg        anillo HUD giratorio
  css/ultron.css         tema completo (variables + reglas) calculado desde un color de acento

    python design.py                      -> regenera todo con el rojo Ultron
    python design.py --accent #19d3ff     -> otro acento (cian, ámbar, verde…)
    python design.py --seed 42            -> otra variación del fondo

server.py reutiliza estas funciones en /api/theme para cambiar el estilo en vivo desde la app.
"""
import argparse
import base64
import colorsys
import io
import math
import random
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
DEFAULT_ACCENT = "#ff2a3d"


# ---------- color ----------
def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l, s)
    return (r * 255, g * 255, b * 255)


def rgb_hsl(c):
    h, l, s = colorsys.rgb_to_hls(*[v / 255 for v in c])
    return h * 360, s, l


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def rgba(c, a):
    return "rgba(%d,%d,%d,%s)" % (round(c[0]), round(c[1]), round(c[2]), a)


def valid_accent(a):
    return a if isinstance(a, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", a) else DEFAULT_ACCENT


def palette(accent):
    H, S, L = rgb_hsl(hex2rgb(valid_accent(accent)))
    S = max(S, 0.6)
    return H, S, hsl(H, S, min(0.62, max(0.5, L))), hsl(H + 24, S, 0.55)  # hue, sat, acento, ámbar


def tokens(accent=DEFAULT_ACCENT):
    """Variables CSS del tema, derivadas de un único color de acento."""
    H, S, acc, acc2 = palette(accent)
    return {
        "--bg": rgb2hex(hsl(H, 0.35, 0.03)), "--panel": rgb2hex(hsl(H, 0.28, 0.06)), "--panel2": rgb2hex(hsl(H, 0.24, 0.09)),
        "--border": rgba(acc, 0.32), "--grid": rgba(acc, 0.2), "--text": rgb2hex(hsl(H, 0.2, 0.93)), "--muted": rgb2hex(hsl(H, 0.14, 0.64)),
        "--accent": rgb2hex(acc), "--accent2": rgb2hex(acc2), "--accent-text": "#ffffff", "--glass": rgba(hsl(H, 0.35, 0.045), 0.84),
        "--star": "%d,%d,%d" % tuple(round(v) for v in mix(acc, (255, 255, 255), 0.25)),
        "--ok": "#35f2a0", "--warn": "#ffb000", "--bad": "#ff3d5a", "--shadow": "0 18px 46px -14px rgba(0,0,0,.85)",
        "--mesh1": rgba(acc, 0.16), "--mesh2": rgba(acc2, 0.1), "--mesh3": rgba(acc, 0.08),
    }


# ---------- fondo HUD ----------
def render_hud(accent=DEFAULT_ACCENT, seed=7, w=1920, h=1080):
    rng = random.Random(seed)
    nrng = np.random.default_rng(seed)
    H, S, acc, acc2 = palette(accent)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h

    base = np.array(hsl(H, 0.35, 0.02)) * (1 - v[..., None]) + np.array(hsl(H, 0.4, 0.055)) * v[..., None]

    def glow(cx, cy, r, col, k):
        d = np.hypot((u - cx) * w, (v - cy) * h) / r
        return (np.exp(-d * d * 2.2) * k)[..., None] * np.array(col)

    base = base + glow(0.8, 0.22, 560, acc, 0.24) + glow(0.06, 0.95, 680, acc2, 0.11) + glow(0.5, 0.5, 950, acc, 0.05)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    col = lambda a, c=acc: (int(c[0]), int(c[1]), int(c[2]), int(a))
    fx, fy = 0.8 * w, 0.22 * h

    # rejilla hexagonal con desvanecido desde el foco
    s = 44
    hh = s * math.sqrt(3)
    for row in range(-1, int(h / hh) + 2):
        for cc in range(-1, int(w / (1.5 * s)) + 2):
            cx, cy = cc * 1.5 * s, row * hh + (hh / 2 if cc % 2 else 0)
            a = 4 + max(0, 30 * (1 - math.hypot(cx - fx, cy - fy) / (0.95 * w)))
            pts = [(cx + s * math.cos(math.pi / 3 * k), cy + s * math.sin(math.pi / 3 * k)) for k in range(6)]
            d.line(pts + [pts[0]], fill=col(a), width=1)

    # anillos de radar + arcos brillantes + marcas
    for r in range(90, 1000, 64):
        d.ellipse((fx - r, fy - r, fx + r, fy + r), outline=col(26), width=1)
    for _ in range(14):
        r = rng.choice(range(154, 860, 64))
        a0 = rng.uniform(0, 360)
        d.arc((fx - r, fy - r, fx + r, fy + r), a0, a0 + rng.uniform(18, 70), fill=col(rng.randint(110, 200), rng.choice([acc, acc2])), width=rng.choice([2, 3, 4]))
    for deg in range(0, 360, 3):
        r1, r2 = 330, 330 + (16 if deg % 30 == 0 else 7)
        ca, sa = math.cos(math.radians(deg)), math.sin(math.radians(deg))
        d.line((fx + ca * r1, fy + sa * r1, fx + ca * r2, fy + sa * r2), fill=col(70 if deg % 30 == 0 else 38), width=1)
    d.line((fx - 40, fy, fx + 40, fy), fill=col(140), width=1)
    d.line((fx, fy - 40, fx, fy + 40), fill=col(140), width=1)

    # trazas de circuito con nodos
    for _ in range(26):
        x, y = (rng.choice([0, rng.uniform(0, w * 0.25)]), rng.uniform(h * 0.15, h)) if rng.random() < 0.6 else (rng.uniform(0, w * 0.5), h)
        pts = [(x, y)]
        for _k in range(rng.randint(3, 7)):
            dx, dy = rng.choice([(1, 0), (0, -1), (1, -1), (1, 1), (0, 1)])
            ln = rng.uniform(50, 190)
            x, y = min(w, max(0, x + dx * ln)), min(h, max(0, y + dy * ln))
            pts.append((x, y))
        d.line(pts, fill=col(rng.randint(40, 90), rng.choice([acc, acc2])), width=2)
        ex, ey = pts[-1]
        d.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), outline=col(170), width=2)
        d.ellipse((ex - 1.5, ey - 1.5, ex + 1.5, ey + 1.5), fill=col(220))

    img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(5)))
    img = Image.alpha_composite(img, layer)

    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    arr[::3] *= 0.93                                                         # líneas de escaneo
    arr *= (1 - 0.55 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2)[..., None]     # viñeta
    arr += nrng.normal(0, 2.0, arr.shape[:2])[..., None]                     # grano
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


# ---------- fondo 3D futurista ----------
def _rotm(ax, ay, az):
    cx, sx, cy, sy, cz, sz = math.cos(ax), math.sin(ax), math.cos(ay), math.sin(ay), math.cos(az), math.sin(az)
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return rz @ ry @ rx


def _icosa():
    f = (1 + 5 ** 0.5) / 2
    v = []
    for a in (-1, 1):
        for b in (-f, f):
            v += [(0, a, b), (a, b, 0), (b, 0, a)]
    v = np.array(v, dtype=float)
    v /= np.linalg.norm(v[0])
    dmin = min(np.linalg.norm(v[0] - v[k]) for k in range(1, 12))
    edges = [(i, j) for i in range(12) for j in range(i + 1, 12) if np.linalg.norm(v[i] - v[j]) < dmin * 1.05]
    es = set(edges)
    faces = [(i, j, k) for i in range(12) for j in range(i + 1, 12) for k in range(j + 1, 12) if (i, j) in es and (j, k) in es and (i, k) in es]
    return v, edges, faces


def render_3d(accent=DEFAULT_ACCENT, seed=7, w=1920, h=1080):
    """Escena 3D en Pillow+NumPy: suelo de rejilla en perspectiva, nucleo icosaedrico con anillos orbitales,
    fragmentos flotantes, haz de luz y reflejo en el suelo."""
    rng = random.Random(seed)
    nrng = np.random.default_rng(seed)
    H, S, acc, acc2 = palette(accent)
    SS = 2
    W, HH = w * SS, h * SS
    k = h / 1080 * SS
    hor = 0.62 * HH
    vx, ocx, ocy = 0.64 * W, 0.64 * W, 0.36 * HH

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    t = np.clip(v / 0.62, 0, 1)[..., None]
    sky = np.array(hsl(H, 0.4, 0.012)) * (1 - t) + np.array(hsl(H, 0.5, 0.07)) * t
    floor = np.array(hsl(H, 0.4, 0.012)) + np.clip((v - 0.62) / 0.38, 0, 1)[..., None] * np.array(hsl(H, 0.4, 0.02))
    base = np.where((v < 0.62)[..., None], sky, floor)
    dh = ((v - 0.62) * h) / (95 * k / SS)
    base = base + (np.exp(-dh * dh) * 0.42)[..., None] * np.array(acc)
    dd = np.hypot((u - 0.64) * w, (v - 0.36) * h) / (470 * k / SS)
    base = base + (np.exp(-dd * dd * 1.6) * 0.34)[..., None] * np.array(acc) + (np.exp(-(dd * 2.2) ** 2) * 0.22)[..., None] * 255
    dl = np.hypot((u - 0.06) * w, (v - 0.95) * h) / (650 * k / SS)
    base = base + (np.exp(-dl * dl * 2) * 0.1)[..., None] * np.array(acc2)
    bg = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    def col(a, c=acc):
        return (int(c[0]), int(c[1]), int(c[2]), int(max(0, min(255, a))))

    # suelo de rejilla en perspectiva
    fl = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    d = ImageDraw.Draw(fl)
    N = 38
    for j in range(1, N + 1):
        q = (j / N) ** 2.3
        y = hor + (HH - hor) * q
        a = 20 + 150 * q ** 0.55
        d.line((0, y, W, y), fill=col(a * (1.0 if j % 4 else 1.6), acc if j % 4 else acc2), width=max(1, int(k * (1 + q * 1.4))))
    sp = 150 * k
    for i in range(-40, 41):
        xb = vx + i * sp * 1.9
        segs = 26
        for sgi in range(segs):
            t0, t1 = sgi / segs, (sgi + 1) / segs
            p0 = (vx + (xb - vx) * t0, hor + (HH - hor) * t0)
            p1 = (vx + (xb - vx) * t1, hor + (HH - hor) * t1)
            a = 6 + 165 * t1 ** 1.4
            d.line((p0, p1), fill=col(a * (1.5 if i % 4 == 0 else 1), acc2 if i % 4 == 0 else acc), width=max(1, int(k * (1 + t1 * 1.2))))
    for _ in range(18):
        i = rng.randint(-14, 14)
        xb = vx + i * sp * 1.9
        t0 = rng.uniform(0.05, 0.9)
        t1 = min(1, t0 + rng.uniform(0.05, 0.16))
        d.line((vx + (xb - vx) * t0, hor + (HH - hor) * t0, vx + (xb - vx) * t1, hor + (HH - hor) * t1), fill=col(235, (255, 255, 255)), width=max(2, int(k * 3 * t1 + 1)))

    # objetos 3D
    obj = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    od = ImageDraw.Draw(obj)
    D = 4.2
    R = 255 * k

    def proj(p, cx, cy, rad):
        z = p[..., 2]
        s = D / (D + z)
        return np.stack([cx + p[..., 0] * rad * s, cy + p[..., 1] * rad * s], -1), z

    L = np.array([-0.45, -0.6, -0.66])
    L /= np.linalg.norm(L)
    V, E, F = _icosa()

    def draw_solid(rm, rad, cx, cy, alpha=1.0, faces=True):
        P = V @ rm.T
        sc, z = proj(P, cx, cy, rad)
        if faces:
            for f in sorted(F, key=lambda f: -float(z[list(f)].mean())):
                a, b, c = P[list(f)]
                n = np.cross(b - a, c - a)
                n = n / (np.linalg.norm(n) + 1e-9)
                if n @ (a + b + c) < 0:
                    n = -n
                front = n[2] < 0
                lam = max(0.0, float(-n @ L)) if front else 0.0
                tint = mix((6, 8, 14), acc, 0.18 + 0.7 * lam)
                od.polygon([tuple(sc[i]) for i in f], fill=(int(tint[0]), int(tint[1]), int(tint[2]), int(alpha * (150 if front else 40))))
        for i, j in E:
            zm = (z[i] + z[j]) / 2
            a = (70 + 185 * (1 - (zm + 1) / 2)) * alpha
            od.line((tuple(sc[i]), tuple(sc[j])), fill=col(a, mix(acc, (255, 255, 255), 0.35 if zm < 0 else 0.0)), width=max(2, int(k * 2.6)))
        for i in range(12):
            r = k * (3 + 3.5 * (1 - (z[i] + 1) / 2))
            od.ellipse((sc[i][0] - r, sc[i][1] - r, sc[i][0] + r, sc[i][1] + r), fill=col(240 * alpha, (255, 255, 255)))

    ry = rng.uniform(0.3, 1.1)
    draw_solid(_rotm(0.5, ry, 0.25), R, ocx, ocy)
    draw_solid(_rotm(-0.7, -ry * 1.7, 0.5), R * 0.46, ocx, ocy, 0.9, faces=False)

    def ring(r, rm, width, a0=60):
        th = np.linspace(0, 2 * math.pi, 240)
        pts = (np.stack([np.cos(th), np.zeros_like(th), np.sin(th)], -1) * r) @ rm.T
        sc, z = proj(pts, ocx, ocy, R)
        for i in range(len(th) - 1):
            front = 1 - (z[i] / r + 1) / 2
            od.line((tuple(sc[i]), tuple(sc[i + 1])), fill=col(a0 + 150 * front, acc if front < 0.7 else acc2), width=max(1, int(k * width * (0.7 + front))))
        for _ in range(3):
            i = rng.randint(0, len(th) - 9)
            for q in range(7):
                od.line((tuple(sc[i + q]), tuple(sc[i + q + 1])), fill=col(255, (255, 255, 255)), width=max(2, int(k * width * 2.4)))
        i = rng.randint(0, len(th) - 1)
        od.ellipse((sc[i][0] - 7 * k, sc[i][1] - 7 * k, sc[i][0] + 7 * k, sc[i][1] + 7 * k), fill=col(255, (255, 255, 255)))

    ring(1.62, _rotm(1.15, rng.uniform(0, 3), 0.3), 2.2)
    ring(2.05, _rotm(0.45, rng.uniform(0, 3), -0.6), 1.6, 40)
    ring(2.55, _rotm(1.5, rng.uniform(0, 3), 0.9), 1.2, 30)

    shards = []
    for _ in range(26):
        ang, dist = rng.uniform(0, 2 * math.pi), rng.uniform(2.0, 6.0)
        pos = np.array([math.cos(ang) * dist * 1.1, rng.uniform(-2.2, 1.6), math.sin(ang) * dist - 1.2])
        shards.append((pos[2], pos, rng.uniform(0.06, 0.2), rng.choice(("o", "c"))))
    for _z, pos, sz, kind in sorted(shards, key=lambda s: -s[0]):
        if kind == "o":
            pts = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], float)
            ed = [(0, 2), (0, 3), (1, 2), (1, 3), (4, 0), (4, 1), (4, 2), (4, 3), (5, 0), (5, 1), (5, 2), (5, 3)]
        else:
            pts = np.array([(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float) * 0.8
            ed = [(i, j) for i in range(8) for j in range(i + 1, 8) if np.linalg.norm(pts[i] - pts[j]) < 1.7]
        pts = (pts * sz) @ _rotm(rng.uniform(0, 6), rng.uniform(0, 6), rng.uniform(0, 6)).T + pos
        sc, z = proj(pts, ocx, ocy, R)
        depth = max(0.12, min(1.0, 1 - (pos[2] + 1.5) / 8))
        for i, j in ed:
            od.line((tuple(sc[i]), tuple(sc[j])), fill=col(40 + 190 * depth, acc2 if kind == "c" else acc), width=max(1, int(k * 1.8 * depth + 1)))

    core = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    for r, a in ((70, 60), (46, 110), (28, 190), (14, 255)):
        cd.ellipse((ocx - r * k, ocy - r * k, ocx + r * k, ocy + r * k), fill=col(a, mix(acc, (255, 255, 255), 0.55 if r < 30 else 0.0)))
    core = core.filter(ImageFilter.GaussianBlur(10 * k))
    obj = Image.alpha_composite(obj, core)

    my = hor + (HH - hor) * 0.1
    refl = obj.transpose(Image.FLIP_TOP_BOTTOM)
    rl = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    rl.paste(refl, (0, int(2 * my - HH)))
    ra = np.asarray(rl, dtype=np.float32).copy()
    ys = np.arange(HH, dtype=np.float32)
    fade = np.clip(1 - (ys - my) / (HH - my) * 1.5, 0, 1) ** 1.8 * 0.38
    fade[ys < my] = 0
    ra[..., 3] *= fade[:, None]
    refl = Image.fromarray(ra.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(2 * k))

    bx = (np.arange(W, dtype=np.float32) - ocx) / (30 * k)
    by = np.clip((hor - np.arange(HH, dtype=np.float32)) / (hor - ocy), 0, 1)
    beam = np.outer(np.sqrt(by) * (np.arange(HH) > ocy), np.exp(-bx * bx)) * 0.5
    stars = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    for _ in range(260):
        x, y = rng.uniform(0, W), rng.uniform(0, hor)
        r = rng.choice((1, 1, 1, 2, 3)) * k * 0.6
        sd.ellipse((x - r, y - r, x + r, y + r), fill=col(rng.randint(60, 230), (255, 255, 255)))

    comp = Image.alpha_composite(stars, fl)
    comp = Image.alpha_composite(comp, refl)
    comp = Image.alpha_composite(comp, obj)
    comp = comp.resize((w, h), Image.LANCZOS)
    out = Image.alpha_composite(bg, comp.filter(ImageFilter.GaussianBlur(22)))
    out = Image.alpha_composite(out, comp.filter(ImageFilter.GaussianBlur(7)))
    out = Image.alpha_composite(out, comp)

    arr = np.asarray(out.convert("RGB"), dtype=np.float32)
    bm = np.asarray(Image.fromarray((np.clip(beam, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), dtype=np.float32) / 255
    arr = arr + bm[..., None] * np.array(acc) * 0.32
    arr = arr * (1 - 0.62 * ((u - 0.55) ** 2 + (v - 0.5) ** 2) * 2)[..., None]
    arr = arr + nrng.normal(0, 1.6, arr.shape[:2])[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def render_background(accent=DEFAULT_ACCENT, seed=7, w=1920, h=1080, style="3d"):
    return render_hud(accent, seed, w, h) if style == "hud" else render_3d(accent, seed, w, h)


def bg_jpeg_bytes(accent, seed, w, h, quality, style="3d"):
    buf = io.BytesIO()
    render_background(accent, seed, w, h, style).save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


# ---------- SVG ----------
def logo_svg(accent=DEFAULT_ACCENT):
    _, _, acc, _ = palette(accent)
    c = rgb2hex(acc)
    eye_l, eye_r = "13,27 28,31 28,36 15,33", "51,27 36,31 36,36 49,33"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>
<filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e7ee"/><stop offset=".45" stop-color="#626878"/><stop offset="1" stop-color="#16181f"/></linearGradient></defs>
<polygon points="32,3 58,17 58,47 32,61 6,47 6,17" fill="url(#m)" stroke="{c}" stroke-width="2"/>
<polygon points="32,10 52,21 52,43 32,54 12,43 12,21" fill="none" stroke="{c}" stroke-opacity=".35"/>
<polygon points="{eye_l}" fill="{c}" filter="url(#g)"/><polygon points="{eye_r}" fill="{c}" filter="url(#g)"/>
<polygon points="{eye_l}" fill="#fff"/><polygon points="{eye_r}" fill="#fff"/>
<polygon points="{eye_l}" fill="{c}" fill-opacity=".55"/><polygon points="{eye_r}" fill="{c}" fill-opacity=".55"/></svg>'''


def eye_svg(accent=DEFAULT_ACCENT):
    _, _, acc, _ = palette(accent)
    c = rgb2hex(acc)
    L, R = "40,34 200,58 200,86 54,74", "440,34 280,58 280,86 426,74"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120"><defs>
<filter id="b" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
<linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="{c}" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="{c}" stop-opacity="0"/></linearGradient></defs>
<g><animate attributeName="opacity" values="1;.78;1;.9;1" dur="3.2s" repeatCount="indefinite"/>
<polygon points="{L}" fill="{c}" filter="url(#b)"/><polygon points="{R}" fill="{c}" filter="url(#b)"/>
<polygon points="{L}" fill="{c}"/><polygon points="{R}" fill="{c}"/>
<polygon points="{L}" fill="#fff" fill-opacity=".85" transform="translate(6,6) scale(.92)"/><polygon points="{R}" fill="#fff" fill-opacity=".85" transform="translate(30,6) scale(.92)"/></g>
<rect x="30" y="52" width="420" height="3" fill="url(#s)"><animate attributeName="y" values="14;100;14" dur="2.6s" repeatCount="indefinite"/></rect></svg>'''


def ring_svg(accent=DEFAULT_ACCENT):
    _, _, acc, acc2 = palette(accent)
    c, c2 = rgb2hex(acc), rgb2hex(acc2)
    cx = 210
    ticks = ""
    for deg in range(0, 360, 5):
        ln = 14 if deg % 30 == 0 else 7
        ca, sa = math.cos(math.radians(deg)), math.sin(math.radians(deg))
        ticks += f'<line x1="{cx + ca * 196:.1f}" y1="{cx + sa * 196:.1f}" x2="{cx + ca * (196 - ln):.1f}" y2="{cx + sa * (196 - ln):.1f}" stroke="{c}" stroke-opacity="{.9 if deg % 30 == 0 else .45}"/>'
    spin = lambda dur, rev=False: f'<animateTransform attributeName="transform" type="rotate" from="{360 if rev else 0} {cx} {cx}" to="{0 if rev else 360} {cx} {cx}" dur="{dur}s" repeatCount="indefinite"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" fill="none" stroke-width="1.5">
<g>{ticks}{spin(60)}</g>
<circle cx="{cx}" cy="{cx}" r="170" stroke="{c}" stroke-opacity=".35"/>
<g><circle cx="{cx}" cy="{cx}" r="150" stroke="{c2}" stroke-width="5" stroke-dasharray="90 60 30 80" stroke-opacity=".85"/>{spin(24, True)}</g>
<g><circle cx="{cx}" cy="{cx}" r="122" stroke="{c}" stroke-width="2" stroke-dasharray="4 10" stroke-opacity=".8"/>{spin(36)}</g>
<g><circle cx="{cx}" cy="{cx}" r="96" stroke="{c}" stroke-width="7" stroke-dasharray="140 60" stroke-opacity=".6"/>{spin(14)}</g>
<circle cx="{cx}" cy="{cx}" r="64" stroke="{c}" stroke-opacity=".5"/>
<line x1="{cx - 24}" y1="{cx}" x2="{cx + 24}" y2="{cx}" stroke="{c}" stroke-opacity=".7"/><line x1="{cx}" y1="{cx - 24}" x2="{cx}" y2="{cx + 24}" stroke="{c}" stroke-opacity=".7"/></svg>'''


# ---------- CSS del tema ----------
THEME_CSS = r"""/* Generado por design.py: no editar a mano (python design.py para regenerar) */
:root[data-theme="ultron"]{__VARS__}
[data-theme="ultron"] body{background:#050203 url(../assets/ultron-bg.jpg) center/cover no-repeat fixed;animation:none}
[data-theme="ultron"] #spot{background:radial-gradient(380px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--accent) 17%,transparent),transparent 70%)}
[data-theme="ultron"] #viewport{background-image:radial-gradient(color-mix(in srgb,var(--accent) 34%,transparent) 1.2px,transparent 1.5px)}
[data-theme="ultron"] ::selection{background:var(--accent);color:#fff}

/* identidad unificada: todo se tiñe con el acento */
[data-theme="ultron"] .win,[data-theme="ultron"] .l-item,[data-theme="ultron"] .task,[data-theme="ultron"] .app,[data-theme="ultron"] .card,[data-theme="ultron"] .tabs,[data-theme="ultron"] .toolbar{--ac:var(--accent)!important}

/* ventanas: marco angular con esquinas HUD */
[data-theme="ultron"] .win{border-radius:3px;background:linear-gradient(180deg,var(--glass),color-mix(in srgb,var(--bg) 90%,transparent));border-color:var(--border)}
[data-theme="ultron"] .win::after{content:"";position:absolute;inset:-1px;pointer-events:none;z-index:7;
 background:linear-gradient(var(--accent),var(--accent)) top left/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) top left/2px 16px no-repeat,
 linear-gradient(var(--accent),var(--accent)) top right/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) top right/2px 16px no-repeat,
 linear-gradient(var(--accent),var(--accent)) bottom left/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) bottom left/2px 16px no-repeat,
 linear-gradient(var(--accent),var(--accent)) bottom right/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) bottom right/2px 16px no-repeat;opacity:.85}
[data-theme="ultron"] .win.focus{box-shadow:0 0 0 1px var(--accent),0 0 60px -10px var(--accent),var(--shadow)}
[data-theme="ultron"] .win-head{text-transform:uppercase;letter-spacing:.14em;font-size:12px;
 background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 34%,transparent),transparent 72%),repeating-linear-gradient(135deg,transparent 0 6px,rgba(255,255,255,.03) 6px 7px)}
[data-theme="ultron"] .win-title::before{content:"// ";color:var(--accent)}
[data-theme="ultron"] .win-ic{border-radius:2px}
[data-theme="ultron"] .win-head button{border-radius:2px}

/* controles angulares */
[data-theme="ultron"] .btn,[data-theme="ultron"] .chip,[data-theme="ultron"] .seg,[data-theme="ultron"] .badge,[data-theme="ultron"] .tb-btn,[data-theme="ultron"] .task,
[data-theme="ultron"] input,[data-theme="ultron"] select,[data-theme="ultron"] textarea,[data-theme="ultron"] .kpi,[data-theme="ultron"] .card{border-radius:2px}
[data-theme="ultron"] .btn.primary,[data-theme="ultron"] .tb-btn.accent{background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#000));
 clip-path:polygon(0 0,calc(100% - 9px) 0,100% 9px,100% 100%,9px 100%,0 calc(100% - 9px));border-color:transparent;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
[data-theme="ultron"] .card{border-left:2px solid var(--accent);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 9%,transparent),transparent 55%)}
[data-theme="ultron"] .card h4,[data-theme="ultron"] .sec{color:var(--accent)}
[data-theme="ultron"] .tab.on{box-shadow:inset 0 2px 0 var(--accent),0 0 18px -8px var(--accent)}
[data-theme="ultron"] .seg button.on,[data-theme="ultron"] .chip.on{background:var(--accent);color:#fff}

/* dock, lanzador, marca */
[data-theme="ultron"] #taskbar{border-radius:3px;border-color:var(--border);box-shadow:var(--shadow),0 0 50px -16px var(--accent);
 background:linear-gradient(180deg,var(--glass),color-mix(in srgb,var(--bg) 92%,transparent))}
[data-theme="ultron"] #taskbar::before{content:"";position:absolute;left:12%;right:12%;top:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
[data-theme="ultron"] #launcher{border-radius:3px;box-shadow:var(--shadow),0 0 60px -14px var(--accent)}
[data-theme="ultron"] .l-item{border-radius:2px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 12%,transparent),transparent)}
[data-theme="ultron"] #brand .logo{background:none;box-shadow:none;width:46px;height:46px;border-radius:0;filter:drop-shadow(0 0 10px var(--accent))}
[data-theme="ultron"] #brand .logo img{width:100%;height:100%}
[data-theme="ultron"] #brand b{letter-spacing:.42em;font-family:Bahnschrift,"Segoe UI Variable","Segoe UI",sans-serif;background:linear-gradient(90deg,var(--text),var(--accent));-webkit-background-clip:text;background-clip:text;}
[data-theme="ultron"] .toast{border-radius:2px;border-left-width:3px}

"""


def build_css(accent=DEFAULT_ACCENT):
    return THEME_CSS.replace("__VARS__", "".join(f"{k}:{v};" for k, v in tokens(accent).items()))


# ---------- geometria del holograma (nucleo de IA) ----------
def holo_geometry(seed=7, n=520):
    """Nube de puntos esferica con relieve organico + red neuronal (vecinos mas cercanos). La dibuja el cliente en 3D."""
    n = int(max(120, min(900, n)))
    rng = np.random.default_rng(int(seed) & 0x7FFFFFFF)
    i = np.arange(n, dtype=np.float64) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    th = math.pi * (1 + 5 ** 0.5) * i
    p = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
    ph = rng.uniform(0, 6.28, 6)
    bump = (0.07 * np.sin(p[:, 0] * 5 + ph[0]) * np.sin(p[:, 1] * 4 + ph[1]) + 0.05 * np.sin(p[:, 2] * 7 + ph[2]) * np.cos(p[:, 0] * 3 + ph[3]))
    p = p * (1 + bump)[:, None]
    m = n // 4
    j = np.arange(m, dtype=np.float64) + 0.5
    ph2 = np.arccos(1 - 2 * j / m)
    t2 = math.pi * (1 + 5 ** 0.5) * j
    q = 0.52 * np.stack([np.cos(t2) * np.sin(ph2), np.cos(ph2), np.sin(t2) * np.sin(ph2)], 1)
    pts = np.vstack([p, q])
    d = np.linalg.norm(pts[:, None, :] - pts[None, :, :], axis=2)
    np.fill_diagonal(d, 9)
    idx = np.argsort(d, axis=1)[:, :3]
    edges = set()
    lim = 2.4 * math.sqrt(4 * math.pi / n)
    for a in range(len(pts)):
        for b in idx[a]:
            if d[a, b] < lim:
                edges.add((min(a, int(b)), max(a, int(b))))
    return {"seed": int(seed), "pts": np.round(pts, 3).tolist(), "edges": sorted(edges)}


# ---------- entrada ----------
def build(accent=DEFAULT_ACCENT, seed=7):
    accent = valid_accent(accent)
    assets, css = ROOT / "assets", ROOT / "css"
    assets.mkdir(exist_ok=True)
    (assets / "ultron-bg.jpg").write_bytes(bg_jpeg_bytes(accent, seed, 1920, 1080, 84))
    (assets / "logo.svg").write_text(logo_svg(accent), encoding="utf-8")
    (assets / "eye.svg").write_text(eye_svg(accent), encoding="utf-8")
    (assets / "ring.svg").write_text(ring_svg(accent), encoding="utf-8")
    (css / "ultron.css").write_text(build_css(accent), encoding="utf-8")
    return accent


def theme_payload(accent, seed, style="3d"):
    """Para /api/theme: variables + fondo (más ligero) en data-URL."""
    accent = valid_accent(accent)
    seed = int(max(0, min(2**31 - 1, seed)))
    bg = base64.b64encode(bg_jpeg_bytes(accent, seed, 1600, 900, 78, "hud" if style == "hud" else "3d")).decode()
    return {"accent": accent, "seed": seed, "style": style, "vars": tokens(accent), "bg": "data:image/jpeg;base64," + bg}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Genera el tema Ultron de NEXUS OS")
    ap.add_argument("--accent", default=DEFAULT_ACCENT)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    print("Tema generado con acento", build(a.accent, a.seed), "-> assets/ y css/ultron.css")
