#!/usr/bin/env python3
"""NEXUS OS — servidor local con motor de diseño gráfico en Python (Pillow + NumPy).

Sirve la app estática y expone una API de imagen en 127.0.0.1 (solo tu equipo).
    python server.py            -> http://127.0.0.1:8765
    python server.py --open     -> además abre el navegador
Sin este servidor NEXUS OS sigue funcionando; solo se apagan las funciones "🐍 Python".
"""
import argparse
import hashlib
import os
import shutil
import subprocess
import email.utils
import http.cookies
import secrets
import threading
import base64
import html
import http.client
import io
import ipaddress
import json
import re
import socket
import ssl
import sys
import time
import urllib.parse
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

import design
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
ALLOWED_TOP = {"", "index.html", "sw.js", "README.md", "css", "js", "assets"}  # lo único que se sirve como estático
MAX_BODY = 40 * 1024 * 1024
MAX_SIDE = 4096
MAX_OPS = 30
Image.MAX_IMAGE_PIXELS = MAX_SIDE * MAX_SIDE * 2  # protección contra "decompression bombs"


# ---------- utilidades ----------
def decode(data_url):
    if not isinstance(data_url, str) or "," not in data_url:
        raise ValueError("imagen inválida")
    raw = base64.b64decode(data_url.split(",", 1)[1])
    im = Image.open(io.BytesIO(raw))
    im.load()
    im = im.convert("RGBA")
    if max(im.size) > MAX_SIDE:
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return im


def encode(im):
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def num(p, key, default, lo, hi):
    try:
        v = float(p.get(key, default))
    except (TypeError, ValueError):
        v = default
    return max(lo, min(hi, v))


def hexcolor(s, default):
    try:
        s = str(s).lstrip("#")
        if len(s) == 3:
            s = "".join(c * 2 for c in s)
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    except (ValueError, IndexError):
        return default


def on_rgb(im, fn):
    """Aplica fn al RGB y conserva el canal alfa."""
    r, g, b, a = im.split()
    out = fn(Image.merge("RGB", (r, g, b))).convert("RGB")
    out.putalpha(a)
    return out


def blend_amount(im, fn, p):
    amount = num(p, "amount", 100, 0, 100) / 100
    return on_rgb(im, lambda rgb: Image.blend(rgb, fn(rgb), amount))


# ---------- operaciones ----------
def op_brightness(im, p): return on_rgb(im, lambda x: ImageEnhance.Brightness(x).enhance(num(p, "v", 100, 0, 300) / 100))
def op_contrast(im, p): return on_rgb(im, lambda x: ImageEnhance.Contrast(x).enhance(num(p, "v", 100, 0, 300) / 100))
def op_saturation(im, p): return on_rgb(im, lambda x: ImageEnhance.Color(x).enhance(num(p, "v", 100, 0, 400) / 100))
def op_blur(im, p): return on_rgb(im, lambda x: x.filter(ImageFilter.GaussianBlur(num(p, "r", 2, 0, 60))))
def op_sharpen(im, p): return on_rgb(im, lambda x: x.filter(ImageFilter.UnsharpMask(radius=2, percent=int(num(p, "percent", 160, 0, 500)), threshold=2)))
def op_edges(im, p): return on_rgb(im, lambda x: x.convert("L").filter(ImageFilter.FIND_EDGES))
def op_emboss(im, p): return on_rgb(im, lambda x: x.filter(ImageFilter.EMBOSS))
def op_invert(im, p): return on_rgb(im, ImageOps.invert)
def op_autocontrast(im, p): return on_rgb(im, lambda x: ImageOps.autocontrast(x, cutoff=1))
def op_posterize(im, p): return on_rgb(im, lambda x: ImageOps.posterize(x, int(num(p, "bits", 3, 1, 8))))


def op_grayscale(im, p):
    return blend_amount(im, lambda x: x.convert("L").convert("RGB"), p)


def op_sepia(im, p):
    m = (0.393, 0.769, 0.189, 0, 0.349, 0.686, 0.168, 0, 0.272, 0.534, 0.131, 0)
    return blend_amount(im, lambda x: x.convert("RGB", m), p)


def op_hue(im, p):
    shift = int(num(p, "deg", 0, -360, 360) / 360 * 255)

    def f(x):
        hsv = np.array(x.convert("HSV"))
        hsv[..., 0] = (hsv[..., 0].astype(int) + shift) % 256
        return Image.fromarray(hsv, "HSV").convert("RGB")
    return on_rgb(im, f)


def op_threshold(im, p):
    lvl = int(num(p, "level", 128, 0, 255))
    return on_rgb(im, lambda x: x.convert("L").point(lambda v: 255 if v >= lvl else 0))


def op_duotone(im, p):
    dark, light = hexcolor(p.get("dark"), (20, 20, 80)), hexcolor(p.get("light"), (255, 160, 160))
    return on_rgb(im, lambda x: ImageOps.colorize(ImageOps.autocontrast(x.convert("L")), dark, light))


def op_vignette(im, p):
    s = num(p, "strength", 0.6, 0, 1)
    w, h = im.size
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
    mask = 1 - s * np.clip((d - 0.3) / 0.7, 0, 1) ** 1.5

    def f(x):
        a = np.asarray(x, dtype=np.float32) * mask[..., None]
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
    return on_rgb(im, f)


def op_grain(im, p):
    amt = num(p, "amount", 0.06, 0, 0.5) * 255
    rng = np.random.default_rng()

    def f(x):
        a = np.asarray(x, dtype=np.float32)
        a += rng.normal(0, amt, a.shape[:2])[..., None]
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
    return on_rgb(im, f)


def op_pixelate(im, p):
    s = int(num(p, "size", 8, 2, 128))
    w, h = im.size
    small = im.resize((max(1, w // s), max(1, h // s)), Image.BOX)
    return small.resize((w, h), Image.NEAREST)


def op_rotate(im, p): return im.rotate(-num(p, "deg", 90, -360, 360), expand=True, resample=Image.BICUBIC)
def op_flip(im, p): return ImageOps.mirror(im) if p.get("axis", "h") == "h" else ImageOps.flip(im)


def op_resize(im, p):
    w, h = im.size
    if "scale" in p:
        k = num(p, "scale", 1, 0.05, 8)
        nw, nh = int(w * k), int(h * k)
    else:
        nw, nh = int(num(p, "w", w, 1, MAX_SIDE)), int(num(p, "h", h, 1, MAX_SIDE))
    nw, nh = max(1, min(MAX_SIDE, nw)), max(1, min(MAX_SIDE, nh))
    return im.resize((nw, nh), Image.LANCZOS)


def op_crop(im, p):
    w, h = im.size
    x, y = int(num(p, "x", 0, 0, w - 1)), int(num(p, "y", 0, 0, h - 1))
    cw, ch = int(num(p, "w", w - x, 1, w - x)), int(num(p, "h", h - y, 1, h - y))
    return im.crop((x, y, x + cw, y + ch))


OPS = {k[3:]: v for k, v in list(globals().items()) if k.startswith("op_")}


def run_ops(im, ops):
    if not isinstance(ops, list) or len(ops) > MAX_OPS:
        raise ValueError(f"ops debe ser una lista de máximo {MAX_OPS}")
    for o in ops:
        name = o.get("op") if isinstance(o, dict) else None
        if name not in OPS:
            raise ValueError(f"operación desconocida: {name}")
        im = OPS[name](im, o)
    return im


def make_palette(im, n):
    im = im.copy()
    im.thumbnail((160, 160))
    rgba = np.asarray(im.convert("RGBA"))
    opaque = rgba[rgba[..., 3] > 128][:, :3]
    if len(opaque) == 0:
        return []
    side = int(np.ceil(np.sqrt(len(opaque))))
    pad = np.zeros((side * side, 3), np.uint8)
    pad[: len(opaque)] = opaque
    q = Image.fromarray(pad.reshape(side, side, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    return [{"hex": "#%02x%02x%02x" % tuple(pal[i * 3:i * 3 + 3]), "pct": round(100 * c / total, 1)} for c, i in counts]


# ---------- generadores de arte ----------
DEFAULT_COLS = [(108, 140, 255), (192, 107, 255), (255, 107, 203), (56, 214, 232)]


def lerp_palette(t, cols):
    n = len(cols) - 1
    t = np.clip(t, 0, 1) * n
    i = np.minimum(t.astype(int), n - 1)
    f = (t - i)[..., None]
    c = np.array(cols, np.float32)
    return c[i] * (1 - f) + c[i + 1] * f


def gen_mesh(w, h, cols, rng):
    k = max(4, len(cols) + 2)
    pts = rng.random((k, 2))
    pc = np.array([cols[i % len(cols)] for i in range(k)], np.float32)
    lw, lh = max(8, w // 8), max(8, h // 8)
    yy, xx = np.mgrid[0:lh, 0:lw]
    xx, yy = xx / lw, yy / lh
    d = (xx[..., None] - pts[:, 0]) ** 2 + (yy[..., None] - pts[:, 1]) ** 2 + 1e-4
    wgt = 1 / d ** 1.6
    wgt /= wgt.sum(-1, keepdims=True)
    img = (wgt[..., None] * pc).sum(2)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").resize((w, h), Image.BICUBIC)


def gen_plasma(w, h, cols, rng):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx, yy = xx / w, yy / h
    v = np.zeros((h, w), np.float32)
    for _ in range(4):
        fx, fy, ph = rng.uniform(1, 7), rng.uniform(1, 7), rng.uniform(0, 6.28)
        v += np.sin(fx * 6.28 * xx + fy * 6.28 * yy + ph)
    v += np.sin(np.hypot(xx - 0.5, yy - 0.5) * rng.uniform(8, 18))
    t = (v / 5 + 1) / 2
    return Image.fromarray(np.clip(lerp_palette(t, cols), 0, 255).astype(np.uint8), "RGB")


def ss_factor(w, h):
    return 2 if w * h <= 1_500_000 else 1


def gen_geo(w, h, cols, rng):
    f = ss_factor(w, h)
    W, H = w * f, h * f
    s = max(40, min(W, H) // 8)
    nx, ny = W // s + 2, H // s + 2
    jit = s * 0.35
    P = [[(x * s + rng.uniform(-jit, jit), y * s + rng.uniform(-jit, jit)) for x in range(nx)] for y in range(ny)]
    im = Image.new("RGB", (W, H))
    dr = ImageDraw.Draw(im)
    for y in range(ny - 1):
        for x in range(nx - 1):
            a, b, c, d = P[y][x], P[y][x + 1], P[y + 1][x + 1], P[y + 1][x]
            for tri in ((a, b, c), (a, c, d)):
                cx = sum(p[0] for p in tri) / 3 / W
                cy = sum(p[1] for p in tri) / 3 / H
                t = np.clip(0.55 * cx + 0.45 * cy + rng.uniform(-0.08, 0.08), 0, 1)
                dr.polygon(tri, fill=tuple(int(v) for v in lerp_palette(np.array(t), cols)))
    return im.resize((w, h), Image.LANCZOS) if f > 1 else im


def gen_halftone(w, h, cols, rng):
    f = ss_factor(w, h)
    W, H = w * f, h * f
    s = max(14 * f, min(W, H) // 40)
    im = Image.new("RGB", (W, H), cols[0])
    dr = ImageDraw.Draw(im)
    fx, fy, ph = rng.uniform(1.5, 3.5), rng.uniform(1.5, 3.5), rng.uniform(0, 6.28)
    for y in range(0, H + s, s):
        for x in range(0, W + s, s):
            v = (np.sin(fx * 6.28 * x / W + ph) + np.sin(fy * 6.28 * y / H) + 2) / 4
            r = s * 0.5 * (0.12 + 0.88 * v)
            col = tuple(int(c) for c in lerp_palette(np.array(x / W * 0.5 + y / H * 0.5), cols[1:] if len(cols) > 2 else cols))
            dr.ellipse((x - r, y - r, x + r, y + r), fill=col)
    return im.resize((w, h), Image.LANCZOS) if f > 1 else im


def load_font(size):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def gen_poster(w, h, cols, rng, text, subtitle):
    im = gen_mesh(w, h, cols, rng).convert("RGB")
    mean = np.asarray(im).reshape(-1, 3).mean(0)
    fg = (255, 255, 255) if (0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2]) < 150 else (15, 18, 32)
    dr = ImageDraw.Draw(im)
    text = (text or "NEXUS").strip()[:80]
    size = max(16, h // 5)
    font = load_font(size)
    while size > 14 and max(dr.textlength(line, font=font) for line in text.split("\n")) > w * 0.84:
        size = int(size * 0.9)
        font = load_font(size)
    lines = text.split("\n")
    th = len(lines) * int(size * 1.15)
    y = (h - th) / 2 - (size * 0.25 if subtitle else 0)
    for line in lines:
        dr.text(((w - dr.textlength(line, font=font)) / 2, y), line, font=font, fill=fg)
        y += size * 1.15
    if subtitle:
        sf = load_font(max(12, size // 3))
        sub = subtitle.strip()[:100]
        dr.text(((w - dr.textlength(sub, font=sf)) / 2, y + size * 0.15), sub, font=sf, fill=fg)
    dr.rectangle((w * 0.08, h * 0.08, w * 0.08 + max(3, w // 60), h * 0.08 + h // 9), fill=fg)
    return im


GENS = {"mesh": gen_mesh, "plasma": gen_plasma, "geo": gen_geo, "halftone": gen_halftone}


def generate(p):
    kind = p.get("kind", "mesh")
    w, h = int(num(p, "w", 1024, 64, 2048)), int(num(p, "h", 640, 64, 2048))
    rng = np.random.default_rng(int(num(p, "seed", 1, 0, 2**31 - 1)))
    cols = [hexcolor(c, None) for c in p.get("colors", [])[:6] if isinstance(c, str)]
    cols = [c for c in cols if c] or DEFAULT_COLS
    if len(cols) < 2:
        cols = cols * 2
    if kind == "poster":
        return gen_poster(w, h, cols, rng, str(p.get("text", "")), str(p.get("subtitle", "")))
    if kind not in GENS:
        raise ValueError("generador desconocido: %s" % kind)
    return GENS[kind](w, h, cols, rng)


# ---------- navegador integrado: proxy web con protección SSRF ----------
PROXY_MAX = 12 * 1024 * 1024
POST_MAX = 8 * 1024 * 1024
TOKEN = secrets.token_urlsafe(18)   # el navegador integrado lo obtiene de /api/health; evita que otras webs usen el proxy
ALLOW_LOCAL = False                 # --allow-local: permite navegar a tu red local (router, servidores de desarrollo…)
SERVER_PORT = 0
JAR, JAR_LOCK = {}, threading.Lock()  # cookies en memoria: {dominio: {nombre: valor}}; se pierden al cerrar el servidor


def find_chrome():
    """Localiza Google Chrome (o, si no está, Chromium/Edge) para abrir NEXUS OS como aplicación."""
    env = os.environ
    cands = [env.get("CHROME_PATH", "")]
    for base in (env.get("ProgramFiles"), env.get("ProgramFiles(x86)"), env.get("LocalAppData")):
        if base:
            cands.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
    cands += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    cands += [shutil.which(n) or "" for n in ("google-chrome", "google-chrome-stable", "chrome", "chromium", "chromium-browser")]
    for c in cands:
        if c and os.path.isfile(c):
            return c
    return None


CHROME = find_chrome()


def open_in_chrome(url, app=False):
    """Abre la URL en Chrome (app=True: ventana sin barra de pestañas, como un sistema operativo). Devuelve True si usó Chrome."""
    if CHROME:
        subprocess.Popen([CHROME, ("--app=" + url) if app else url] + (["--window-size=1440,900"] if app else []), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    webbrowser.open(url)
    return False


def jar_header(host):
    host = host.lower()
    with JAR_LOCK:
        pairs = [f"{k}={v}" for dom, cs in JAR.items() if host == dom or host.endswith("." + dom) for k, v in cs.items()]
    return "; ".join(pairs)


def jar_store(host, headers):
    for raw in headers:
        try:
            c = http.cookies.SimpleCookie()
            c.load(raw)
        except http.cookies.CookieError:
            continue
        for name, m in c.items():
            dom = (m["domain"] or host).lstrip(".").lower()
            if not (host == dom or host.endswith("." + dom)):
                continue  # un sitio no puede fijar cookies de otro dominio
            dead = False
            if m["max-age"]:
                try:
                    dead = int(m["max-age"]) <= 0
                except ValueError:
                    pass
            if m["expires"]:
                try:
                    dead = dead or email.utils.parsedate_to_datetime(m["expires"]).timestamp() < time.time()
                except (TypeError, ValueError):
                    pass
            with JAR_LOCK:
                if dead:
                    JAR.get(dom, {}).pop(name, None)
                elif sum(len(v) for v in JAR.values()) < 600:
                    JAR.setdefault(dom, {})[name] = m.value[:4096]


def jar_clear():
    with JAR_LOCK:
        n = sum(len(v) for v in JAR.values())
        JAR.clear()
    return n
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 NEXUS-OS"


def public_ip(host, port):
    """Resuelve el host y rechaza cualquier dirección privada, local o reservada (evita usar el proxy contra tu red)."""
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise ValueError("no se pudo resolver el sitio: %s" % host)
    chosen = None
    for _fam, _t, _p, _c, addr in infos:
        ip = ipaddress.ip_address(addr[0])
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if not ip.is_global:
            if not ALLOW_LOCAL:
                raise ValueError("red local bloqueada. Para permitirla inicia con: python server.py --allow-local")
            if ip.is_loopback and port == SERVER_PORT:
                raise ValueError("no se permite abrir el propio servidor de NEXUS dentro del navegador")
        chosen = chosen or addr[0]
    if not chosen:
        raise ValueError("sin dirección pública para " + host)
    return chosen


class _Pin:
    """Conecta a la IP ya validada (no vuelve a resolver el nombre: evita DNS rebinding)."""
    def _pinned(self):
        return socket.create_connection((public_ip(self.host, self.port), self.port), self.timeout)


class PinHTTP(_Pin, http.client.HTTPConnection):
    def connect(self):
        self.sock = self._pinned()


def _tls_context():
    ctx = ssl.create_default_context()
    try:  # certifi cubre las raíces que Windows aún no descargó (p. ej. example.com)
        import certifi
        ctx.load_verify_locations(certifi.where())
    except ImportError:
        pass
    return ctx


class PinHTTPS(_Pin, http.client.HTTPSConnection):
    _ctx = _tls_context()

    def connect(self):
        self.sock = self._ctx.wrap_socket(self._pinned(), server_hostname=self.host)


def fetch_url(url, method="GET", body=None, ctype=None):
    posted = method == "POST"
    for _ in range(8):
        u = urllib.parse.urlsplit(url)
        if u.scheme not in ("http", "https") or not u.hostname:
            raise ValueError("URL no válida: solo se admite http o https")
        if u.username or u.password:
            raise ValueError("URL con credenciales no permitida")
        port = u.port or (443 if u.scheme == "https" else 80)
        conn = (PinHTTPS if u.scheme == "https" else PinHTTP)(u.hostname, port, timeout=15)
        try:
            path = (u.path or "/") + ("?" + u.query if u.query else "")
            hdrs = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "es,en;q=0.8", "Accept-Encoding": "identity"}
            ck = jar_header(u.hostname)
            if ck:
                hdrs["Cookie"] = ck
            if method == "POST":
                hdrs["Content-Type"] = ctype or "application/x-www-form-urlencoded"
                hdrs["Content-Length"] = str(len(body or b""))
            conn.request(method, path, body=body if method == "POST" else None, headers=hdrs)
            r = conn.getresponse()
            jar_store(u.hostname, r.msg.get_all("Set-Cookie") or [])
            loc = r.getheader("Location")
            if r.status in (301, 302, 303, 307, 308) and loc:
                url = urllib.parse.urljoin(url, loc)
                if r.status in (301, 302, 303):
                    method, body = "GET", None   # como un navegador: tras un POST, la redirección es GET
                continue
            data = r.read(PROXY_MAX + 1)
            if len(data) > PROXY_MAX:
                raise ValueError("contenido demasiado grande (máx. 12 MB)")
            return url, r.status, r.getheader("Content-Type") or "application/octet-stream", data, posted
        finally:
            conn.close()
    raise ValueError("demasiadas redirecciones")


NAV_SCRIPT = r"""<script>(function(){var O=__ORIG__,PB=__PB__,POSTED=__POST__;
function P(m){m.nxb=1;try{parent.postMessage(m,'*')}catch(e){}}
function S(u){return String(u).split('#')[0]}
function msg(){P({t:'loaded',url:O,title:document.title,post:POSTED})}
msg();addEventListener('load',msg);
function go(h,ev){if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.button===1)P({t:'new',url:h});else P({t:'nav',url:h})}
function link(e){
 if(e.defaultPrevented)return;
 var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
 var h=a.href;if(!h||/^(javascript|mailto|tel|data|blob):/i.test(h))return;
 if(e.type==='click'&&e.button!==0)return;if(e.type==='auxclick'&&e.button!==1)return;
 e.preventDefault();
 if(e.type==='click'&&S(h)===S(O)&&!e.ctrlKey&&!e.metaKey&&a.target!=='_blank'){var id=decodeURIComponent(h.split('#')[1]||'');var t=id&&(document.getElementById(id)||document.getElementsByName(id)[0]);if(t)t.scrollIntoView();else scrollTo(0,0);return}
 if(a.target==='_blank')P({t:'new',url:h});else go(h,e)}
document.addEventListener('click',link,true);document.addEventListener('auxclick',link,true);
document.addEventListener('submit',function(e){var f=e.target;if(!f||e.defaultPrevented)return;
 var act=new URL(f.getAttribute('action')||O,O).href;
 if((f.method||'get').toLowerCase()==='post'){f.action=PB+encodeURIComponent(act);f.target='_self';return}
 e.preventDefault();var u=new URL(act);new FormData(f).forEach(function(v,k){if(typeof v==='string')u.searchParams.set(k,v)});P({t:'nav',url:u.href})},true);
window.open=function(u){if(u)P({t:'new',url:new URL(u,O).href});return null};
})();</script>"""


def make_proxy_html(body, final_url, pb, posted):
    base = final_url
    m = re.search(rb'<base[^>]+href\s*=\s*["\']?([^"\'\s>]+)', body, re.I)
    if m:
        base = urllib.parse.urljoin(final_url, m.group(1).decode("utf-8", "ignore"))
    body = re.sub(rb"<base\b[^>]*>", b"", body, flags=re.I)
    body = re.sub(rb'<meta[^>]+http-equiv\s*=\s*["\']?content-security-policy[^>]*>', b"", body, flags=re.I)
    inj = ('<base href="%s">' % html.escape(base, quote=True) + NAV_SCRIPT.replace("__ORIG__", json.dumps(final_url).replace("</", "<\\/")).replace("__PB__", json.dumps(pb)).replace("__POST__", "true" if posted else "false")).encode("utf-8")
    m = re.search(rb"<head[^>]*>", body, re.I) or re.search(rb"<html[^>]*>", body, re.I)
    return body[:m.end()] + inj + body[m.end():] if m else inj + body


def error_page(msg, url):
    return ("""<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0b0506;color:#f4dcdf;font:15px system-ui;display:grid;place-items:center;height:100vh">
<div style="max-width:520px;padding:28px;border:1px solid #ff2a3d55;border-left:4px solid #ff2a3d"><h2 style="margin:0 0 10px;letter-spacing:.1em;color:#ff2a3d">NO SE PUDO CARGAR</h2>
<p style="margin:0 0 8px;word-break:break-all;color:#b98d93">%s</p><p style="margin:0">%s</p></div>""" % (html.escape(url[:300]), html.escape(msg))).encode("utf-8")


# ---------- programas de Windows dentro de NEXUS ----------
# Seguridad: el servidor NUNCA acepta una ruta enviada por la página. Solo lanza entradas de su lista, y esa lista
# solo se llena (a) desde el escaneo del menú Inicio hecho por el propio servidor o (b) con un diálogo nativo de
# Windows en el que el usuario elige el archivo. Así una web maliciosa no puede ejecutar nada.
APPS_FILE = ROOT / "userdata" / "apps.json"
APPS_LOCK = threading.Lock()
SCAN = {}   # id -> (nombre, ruta) del último escaneo
BAD_NAMES = re.compile(r"uninstall|desinstal|readme|léeme|leeme|license|licencia|help|ayuda|documentation|release notes", re.I)


def apps_load():
    try:
        return json.loads(APPS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def apps_save(d):
    APPS_FILE.parent.mkdir(exist_ok=True)
    APPS_FILE.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def app_id(path):
    return hashlib.sha1(path.lower().encode("utf-8", "ignore")).hexdigest()[:12]


def kind_of(path):
    return "folder" if os.path.isdir(path) else ("app" if path.lower().endswith((".exe", ".lnk", ".bat", ".cmd", ".url", ".msi")) else "file")


def scan_start_menu():
    roots = [os.path.join(os.environ.get(v, ""), "Microsoft", "Windows", "Start Menu", "Programs") for v in ("ProgramData", "APPDATA")]
    seen, out = set(), []
    SCAN.clear()
    for root in roots:
        for dp, _dn, fn in os.walk(root):
            for f in fn:
                stem, ext = os.path.splitext(f)
                if ext.lower() not in (".lnk", ".url") or BAD_NAMES.search(stem) or stem.lower() in seen:
                    continue
                seen.add(stem.lower())
                path = os.path.join(dp, f)
                SCAN[app_id(path)] = (stem, path)
                out.append({"id": app_id(path), "name": stem})
                if len(out) >= 700:
                    return sorted(out, key=lambda x: x["name"].lower())
    return sorted(out, key=lambda x: x["name"].lower())


PS_PICK = {
    "file": "$f=New-Object System.Windows.Forms.OpenFileDialog;$f.Title='NEXUS OS - elige un programa o archivo';$f.Filter='Todos los archivos|*.*';$o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true};if($f.ShowDialog($o) -eq 'OK'){[Console]::Out.Write($f.FileName)}",
    "folder": "$f=New-Object System.Windows.Forms.FolderBrowserDialog;$f.Description='NEXUS OS - elige una carpeta';$o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true};if($f.ShowDialog($o) -eq 'OK'){[Console]::Out.Write($f.SelectedPath)}",
}


def native_pick(kind):
    if os.name != "nt":
        raise ValueError("el selector nativo solo está disponible en Windows")
    script = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;Add-Type -AssemblyName System.Windows.Forms;" + PS_PICK[kind]
    r = subprocess.run(["powershell", "-NoProfile", "-STA", "-Command", script], capture_output=True, timeout=600)
    return r.stdout.decode("utf-8", "ignore").strip()


def launch_path(path):
    if not os.path.exists(path):
        raise ValueError("el archivo ya no existe: " + path)
    if os.name == "nt":
        os.startfile(path)  # noqa: S606 - ruta de la lista aprobada por el usuario
    else:
        subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", path])


# ---------- HTTP ----------
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        origin = self.headers.get("Origin", "")
        # CORS solo para la propia app: abierta como file:// ("null") o desde localhost
        if not self.path.startswith("/proxy") and (origin == "null" or origin.startswith(("http://127.0.0.1:", "http://localhost:"))):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            sys.stderr.write("[api] %s\n" % (fmt % args))

    def _strict(self, data):
        o = self.headers.get("Origin", "")
        site = self.headers.get("Sec-Fetch-Site", "same-origin")
        ok = o in (f"http://127.0.0.1:{SERVER_PORT}", f"http://localhost:{SERVER_PORT}") and site == "same-origin"
        if not ok or not secrets.compare_digest(str(data.get("token", "")), TOKEN):
            raise PermissionError("esta función solo está disponible abriendo NEXUS con iniciar.bat (http://127.0.0.1:%d)" % SERVER_PORT)

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send(self, code, ctype, body, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self, method="GET"):
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        url = (q.get("u") or [""])[0]
        # el documento proxeado se ejecuta en un origen aislado: no puede tocar los datos de NEXUS OS
        iso = {"Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"}
        if not secrets.compare_digest((q.get("k") or [""])[0], TOKEN):
            return self._send(403, "text/html; charset=utf-8", error_page("Acceso denegado: falta la ficha de seguridad del navegador de NEXUS.", url), iso)
        body = ctype = None
        if method == "POST":
            if self.headers.get("Origin", "null") not in ("null", f"http://127.0.0.1:{SERVER_PORT}", f"http://localhost:{SERVER_PORT}"):
                return self._send(403, "text/html; charset=utf-8", error_page("Origen no permitido.", url), iso)
            n = int(self.headers.get("Content-Length", 0) or 0)
            if n < 0 or n > POST_MAX:
                return self._send(413, "text/html; charset=utf-8", error_page("Formulario demasiado grande (máx. 8 MB).", url), iso)
            body, ctype = self.rfile.read(n), self.headers.get("Content-Type")
        try:
            final, status, ct, data, posted = fetch_url(url, method, body, ctype)
        except (ValueError, OSError, http.client.HTTPException) as e:
            return self._send(502, "text/html; charset=utf-8", error_page(str(e) or e.__class__.__name__, url), iso)
        if ct.lower().startswith(("text/html", "application/xhtml")):
            pb = "http://127.0.0.1:%d/proxy?k=%s&u=" % (SERVER_PORT, TOKEN)
            data = make_proxy_html(data, final, pb, posted)
        self._send(status, ct, data, iso)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            return self._json(200, {"ok": True, "ops": sorted(OPS), "pillow": Image.__version__ if hasattr(Image, "__version__") else "?", "numpy": np.__version__, "proxy": True, "theme": True, "token": TOKEN, "local": ALLOW_LOCAL, "chrome": bool(CHROME), "cookies": sum(len(v) for v in JAR.values())})
        if path == "/proxy":
            return self._proxy("GET")
        top = path.strip("/").split("/", 1)[0]
        if path.startswith("/api/") or top not in ALLOWED_TOP:
            return self._json(404, {"error": "no encontrado"})
        super().do_GET()

    do_HEAD = SimpleHTTPRequestHandler.do_HEAD

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/proxy":
            return self._proxy("POST")
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > MAX_BODY:
                return self._json(413, {"error": "cuerpo vacío o mayor a 40 MB"})
            data = json.loads(self.rfile.read(n))
            t0 = time.perf_counter()
            if path == "/api/image":
                im = run_ops(decode(data.get("image")), data.get("ops", []))
                return self._json(200, {"image": encode(im), "w": im.width, "h": im.height, "ms": round((time.perf_counter() - t0) * 1000)})
            if path == "/api/palette":
                cols = make_palette(decode(data.get("image")), int(max(2, min(16, data.get("n", 6)))))
                return self._json(200, {"colors": cols, "ms": round((time.perf_counter() - t0) * 1000)})
            if path in ("/api/local", "/api/open-chrome") and data.get("token") != TOKEN:
                return self._json(403, {"error": "ficha inválida"})
            if path == "/api/local":
                global ALLOW_LOCAL
                ALLOW_LOCAL = bool(data.get("enabled"))
                return self._json(200, {"local": ALLOW_LOCAL})
            if path == "/api/open-chrome":
                u = str(data.get("url", ""))
                if len(u) > 2048 or urllib.parse.urlsplit(u).scheme not in ("http", "https") or any(c in u for c in "\r\n\x00"):
                    raise ValueError("solo se pueden abrir direcciones http o https")
                return self._json(200, {"chrome": open_in_chrome(u)})
            if path.startswith("/api/winapps/"):
                self._strict(data)
                act = path.rsplit("/", 1)[1]
                with APPS_LOCK:
                    reg = apps_load()
                    if act == "scan":
                        return self._json(200, {"apps": scan_start_menu() if os.name == "nt" else []})
                    if act == "list":
                        return self._json(200, {"apps": [{"id": k, "name": v["name"], "kind": v["kind"]} for k, v in reg.items()]})
                    if act == "add":
                        if data.get("from") == "scan":
                            hit = SCAN.get(str(data.get("id")))
                            if not hit:
                                raise ValueError("programa no encontrado: vuelve a escanear")
                            name, path_ = hit
                        else:
                            kind_req = "folder" if data.get("kind") == "folder" else "file"
                            path_ = native_pick(kind_req)
                            if not path_:
                                return self._json(200, {"cancelled": True})
                            name = os.path.splitext(os.path.basename(path_.rstrip("\\/")))[0] or path_
                        aid = app_id(path_)
                        reg[aid] = {"name": name[:60], "path": path_, "kind": kind_of(path_)}
                        apps_save(reg)
                        return self._json(200, {"id": aid, "name": reg[aid]["name"], "kind": reg[aid]["kind"]})
                    if act == "remove":
                        reg.pop(str(data.get("id")), None)
                        apps_save(reg)
                        return self._json(200, {"ok": True})
                    if act == "launch":
                        e = reg.get(str(data.get("id")))
                        if not e:
                            raise ValueError("programa no registrado")
                        launch_path(e["path"])
                        return self._json(200, {"ok": True})
                return self._json(404, {"error": "acción desconocida"})
            if path == "/api/cookies":
                if data.get("token") != TOKEN:
                    return self._json(403, {"error": "ficha inválida"})
                return self._json(200, {"cleared": jar_clear()})
            if path == "/api/theme":
                out = design.theme_payload(data.get("accent"), int(data.get("seed", 7)), "hud" if data.get("style") == "hud" else "3d")
                out["ms"] = round((time.perf_counter() - t0) * 1000)
                return self._json(200, out)
            if path == "/api/holo":
                return self._json(200, design.holo_geometry(int(data.get("seed", 7)), int(data.get("n", 520))))
            if path == "/api/generate":
                im = generate(data)
                return self._json(200, {"image": encode(im), "w": im.width, "h": im.height, "ms": round((time.perf_counter() - t0) * 1000)})
            return self._json(404, {"error": "endpoint desconocido"})
        except PermissionError as e:
            return self._json(403, {"error": str(e)})
        except subprocess.TimeoutExpired:
            return self._json(408, {"error": "tiempo agotado"})
        except (ValueError, KeyError, TypeError, OSError) as e:
            return self._json(400, {"error": str(e) or e.__class__.__name__})


BANNER = r"""
   _   _ _____ __  __ _   _ ____
  | \ | | ____|\ \/ /| | | / ___|
  |  \| |  _|  \  / | | | \___ \
  | |\  | |___ /  \ | |_| |___) |
  |_| \_|_____/_/\_\ \___/|____/   nucleo holografico en linea
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--open", action="store_true", help="abrir el navegador")
    ap.add_argument("--no-app", action="store_true", help="abrir NEXUS en una pestaña normal en vez de ventana de aplicación")
    ap.add_argument("--allow-local", action="store_true", help="el navegador de NEXUS podrá abrir tu red local (router, servidores de desarrollo). Solo si confías en lo que navegas")
    a = ap.parse_args()
    global ALLOW_LOCAL, SERVER_PORT
    ALLOW_LOCAL, SERVER_PORT = a.allow_local, a.port
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    except OSError as e:
        sys.exit(f"No se pudo usar el puerto {a.port}: {e}\nProbablemente ya está corriendo. Usa --port otro.")
    url = f"http://127.0.0.1:{a.port}/"
    if ALLOW_LOCAL:
        print("AVISO: red local permitida en el navegador (--allow-local).")
    print(BANNER)
    print(f"NEXUS OS + motor Python (Pillow {Image.__version__ if hasattr(Image, '__version__') else ''}) en {url}\nCtrl+C para detener.")
    print("Navegador:", ("Google Chrome: " + CHROME) if CHROME else "Chrome no encontrado, se usara el navegador predeterminado (define CHROME_PATH si está en otra ruta)")
    if a.open:
        open_in_chrome(url, app=not a.no_app)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nDetenido.")


if __name__ == "__main__":
    main()
