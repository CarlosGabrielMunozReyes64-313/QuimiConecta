"""
Prepara los assets derivados de QuimiConecta a partir de los originales.

Los originales se copian sin modificar. Los derivados respetan los píxeles
de origen: solo se recortan, se reordenan o se amplían con vecino más cercano.

  - Minecraft-ES.ttf: la fuente original + glifos del español (á é í ó ú ñ ü ¿ ...)
    dibujados sobre la misma rejilla de 128 unidades por píxel.
  - board-landscape.png / board-portrait.png: la pizarra original recompuesta
    en 9 partes (esquinas intactas, bandeja del rotulador sin estirar).
  - messenger-ring.png: el icono Messenger a su resolución nativa (bloques de 8 px)
    con el interior de la cabeza vaciado, para superponer el aro sobre la foto.
  - src/game/avatarGeometry.ts: geometría del círculo, generada a partir de la imagen.

Uso: python3 scripts/prepare_assets.py <carpeta_uploads> <carpeta_fuente_minecraft>
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads")
FONT_DIR = Path(sys.argv[2] if len(sys.argv) > 2 else "/home/claude/work/mc")
SPRITES = ROOT / "src/assets/sprites"
FONTS = ROOT / "src/assets/fonts"
SPRITES.mkdir(parents=True, exist_ok=True)
FONTS.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- originales
shutil.copy(UPLOADS / "lablady_spritesheet_BOXED.png", SPRITES / "scientist-sheet.png")
shutil.copy(UPLOADS / "image.png", SPRITES / "lab-background.png")
shutil.copy(UPLOADS / "image__1_.png", SPRITES / "messenger.png")
shutil.copy(UPLOADS / "image-removebg-preview.png", SPRITES / "whiteboard-original.png")

# ---------------------------------------------------------------- fuente
PX = 128  # unidades por píxel de la fuente Minecraft (upem 1024)


def contours_of(glyf, name):
    g = glyf[name]
    if g.numberOfContours <= 0:
        return []
    coords, ends, flags = g.getCoordinates(glyf)
    out, start = [], 0
    for e in ends:
        out.append([(int(x), int(y)) for x, y in coords[start:e + 1]])
        start = e + 1
    return out


def rect(x0, y0, x1, y1):
    # sentido horario (TrueType): contorno exterior
    return [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]


def bbox(contours):
    xs = [x for c in contours for x, _ in c]
    ys = [y for c in contours for _, y in c]
    return min(xs), min(ys), max(xs), max(ys)


def translate(contours, dx, dy):
    return [[(x + dx, y + dy) for x, y in c] for c in contours]


def make_glyph(contours):
    g = Glyph()
    pts, ends = [], []
    for c in contours:
        pts.extend(c)
        ends.append(len(pts) - 1)
    g.coordinates = GlyphCoordinates(pts)
    g.endPtsOfContours = ends
    g.flags = bytearray([1] * len(pts))
    g.numberOfContours = len(ends)
    g.program = None
    from fontTools.ttLib.tables import ttProgram
    g.program = ttProgram.Program()
    g.program.fromBytecode(b"")
    return g


def snap(v):
    return int(round(v / (PX / 2)) * (PX / 2))


def acute(cx, y0):
    # dos píxeles en diagonal, de abajo-izquierda a arriba-derecha
    return [rect(cx - PX, y0, cx, y0 + PX), rect(cx, y0 + PX, cx + PX, y0 + 2 * PX)]


def patch_font():
    font = TTFont(FONT_DIR / "Minecraft.ttf")
    glyf, hmtx = font["glyf"], font["hmtx"]
    cmap = font.getBestCmap()
    order = font.getGlyphOrder()
    tilde = contours_of(glyf, cmap[ord("~")])
    dier = contours_of(glyf, cmap[ord("¨")])
    new = {}

    def base_info(ch):
        name = cmap[ord(ch)]
        return name, contours_of(glyf, name), hmtx[name]

    def compose(ch, base_ch, accent, upper):
        name, base, metrics = base_info(base_ch)
        if base_ch == "i":  # i sin punto: solo el contorno del fuste
            base = [c for c in base if max(y for _, y in c) <= 576]
        x0, _, x1, _ = bbox(base)
        cx = snap((x0 + x1) / 2)
        y0 = 832 if upper else 640
        if accent == "acute":
            acc = acute(cx, y0)
        elif accent == "tilde":
            tx0, ty0, tx1, _ = bbox(tilde)
            acc = translate(tilde, cx - snap((tx0 + tx1) / 2), (y0 + 64) - ty0)
        else:  # diéresis
            dx0, dy0, dx1, _ = bbox(dier)
            acc = translate(dier, cx - snap((dx0 + dx1) / 2), y0 - dy0)
        new[ch] = (make_glyph(base + acc), metrics)

    for ch, b in zip("áéíóú", "aeiou"):
        compose(ch, b, "acute", False)
    for ch, b in zip("ÁÉÍÓÚ", "AEIOU"):
        compose(ch, b, "acute", True)
    compose("ñ", "n", "tilde", False)
    compose("Ñ", "N", "tilde", True)
    compose("ü", "u", "dier", False)
    compose("Ü", "U", "dier", True)

    # ¿ = ? girado 180°, colocado como ¡ (desciende bajo la línea base)
    qname, q, qm = base_info("?")
    x0, y0, x1, y1 = bbox(q)
    rot = [[(x0 + x1 - x, y0 + y1 - y) for x, y in c] for c in q]
    rot = translate(rot, 0, -192 - y0)
    new["¿"] = (make_glyph(rot), qm)

    # – (raya corta) a partir del guion, más ancho
    hname, hy, hm = base_info("-")
    hx0, hy0, hx1, hy1 = bbox(hy)
    new["–"] = (make_glyph([rect(0, hy0, 640, hy1)]), (704, 0))
    # · punto medio
    new["·"] = (make_glyph([rect(0, 256, PX, 384)]), (192, 0))
    # º ordinal
    new["º"] = (make_glyph([rect(0, 512, 384, 576), rect(0, 576, PX, 768), rect(256, 576, 384, 768), rect(0, 768, 384, 832)]), (448, 0))

    for ch, (g, metrics) in new.items():
        gname = f"uni{ord(ch):04X}"
        order.append(gname)
        glyf.glyphs[gname] = g
        hmtx.metrics[gname] = (metrics[0], 0)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[ord(ch)] = gname
    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    if "post" in font and font["post"].formatType == 2.0:
        font["post"].extraNames = []
        font["post"].mapping = {}
    # nombre de familia distinto para no chocar con la original instalada
    for rec in font["name"].names:
        if rec.nameID in (1, 4, 6):
            try:
                txt = rec.toUnicode()
            except Exception:
                continue
            rec.string = txt.replace("Minecraft", "Minecraft ES").replace("Minecraft ES-", "MinecraftES-")
    font.save(FONTS / "Minecraft-ES.ttf")
    check = TTFont(FONTS / "Minecraft-ES.ttf").getBestCmap()
    missing = [c for c in "áéíóúÁÉÍÓÚñÑüÜ¿¡–·º" if ord(c) not in check]
    print("fuente ampliada; faltan:", missing or "ninguno")


patch_font()

# ---------------------------------------------------------------- pizarra
board = np.array(Image.open(UPLOADS / "image-removebg-preview.png").convert("RGBA"))
units = board[2::4, 2::4]  # 1 unidad = 4 px del original (bloques de 8 = 2 unidades)
S = units[21:103, 1:125]
H0, W0 = S.shape[:2]
L, T, R, B = 7, 7, 5, 5
DECO_FROM = 50  # desde esta columna la bandeja/rotulador se copia sin estirar


def resize(arr, h, w):
    img = Image.fromarray(arr)
    return np.array(img.resize((w, h), Image.NEAREST))


def compose_board(wu, hu):
    out = np.zeros((hu, wu, 4), dtype=np.uint8)
    out[:T, :L] = S[:T, :L]
    out[:T, wu - R:] = S[:T, W0 - R:]
    out[hu - B:, :L] = S[H0 - B:, :L]
    out[hu - B:, wu - R:] = S[H0 - B:, W0 - R:]
    out[:T, L:wu - R] = resize(S[:T, L:W0 - R], T, wu - L - R)
    out[T:hu - B, :L] = resize(S[T:H0 - B, :L], hu - T - B, L)
    out[T:hu - B, wu - R:] = resize(S[T:H0 - B, W0 - R:], hu - T - B, R)
    deco = S[H0 - B:, DECO_FROM:W0 - R]
    dw = deco.shape[1]
    left_w = wu - L - R - dw
    out[hu - B:, L:L + left_w] = resize(S[H0 - B:, L:DECO_FROM], B, left_w)
    out[hu - B:, L + left_w:wu - R] = deco
    out[T:hu - B, L:wu - R] = resize(S[T:H0 - B, L:W0 - R], hu - T - B, wu - L - R)
    return out


layouts = {"landscape": (202, 130), "portrait": (172, 174), "menu": (172, 120), "tall": (172, 260)}
for name, (wu, hu) in layouts.items():
    Image.fromarray(compose_board(wu, hu)).save(SPRITES / f"board-{name}.png", optimize=True)
print("pizarras:", layouts)

# ---------------------------------------------------------------- messenger
msg = np.array(Image.open(UPLOADS / "image__1_.png").convert("RGBA")).astype(float)
alpha = msg[..., 3]
pts = []
for y in range(4, 400, 2):
    xs = np.where(alpha[y] > 128)[0]
    if len(xs):
        pts += [(xs[0], y), (xs[-1], y)]
for x in range(300, 710, 4):
    ys = np.where(alpha[:, x] > 128)[0]
    pts.append((x, ys[0]))
P = np.array(pts, float)
X = np.c_[P[:, 0] ** 2, P[:, 1] ** 2, P[:, 0], P[:, 1]]
A_, B_, C_, D_ = np.linalg.lstsq(X, np.ones(len(P)), rcond=None)[0]
cx, cy = -C_ / (2 * A_), -D_ / (2 * B_)
k = 1 + A_ * cx * cx + B_ * cy * cy
rx, ry = np.sqrt(k / A_), np.sqrt(k / B_)
RING = 24  # 3 bloques de 8 px: grosor del aro oscuro
irx, iry = rx - RING, ry - RING
BLOCK = 8
native = np.array(Image.open(UPLOADS / "image__1_.png").convert("RGBA"))[BLOCK // 2::BLOCK, BLOCK // 2::BLOCK].copy()
N = native.shape[0]
hole = np.zeros((N, N), bool)
for j in range(N):
    for i in range(N):
        px, py = (i + 0.5) * BLOCK, (j + 0.5) * BLOCK
        hole[j, i] = ((px - cx) / irx) ** 2 + ((py - cy) / iry) ** 2 <= 1
ys, xs = np.where(hole)
bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
ring = native.copy()
ring[hole, 3] = 0
Image.fromarray(ring).save(SPRITES / "messenger-ring.png", optimize=True)

# brillo del cristal: el reflejo blanco de la cabeza, para superponerlo suave sobre la foto
gloss = np.zeros_like(native)
lum = native[..., :3].astype(float).mean(axis=2)
mask = hole & (lum > 225)
gloss[mask, :3] = 255
gloss[mask, 3] = np.clip((lum[mask] - 225) / 30 * 255, 0, 255).astype(np.uint8)
Image.fromarray(gloss).save(SPRITES / "messenger-gloss.png", optimize=True)

rows = ["".join("1" if hole[y, x] else "0" for x in range(bx0, bx1)) for y in range(by0, by1)]
ts = f"""// Archivo generado por scripts/prepare_assets.py a partir de messenger.png.
// No editar a mano: describe el círculo de la cabeza del icono Messenger.

/** Lado del sprite original en píxeles y tamaño del bloque de pixel art. */
export const MESSENGER_SIZE = 1024
export const MESSENGER_BLOCK = {BLOCK}

/** Elipse exterior de la cabeza (ajuste por mínimos cuadrados), en píxeles del original. */
export const HEAD_OUTER = {{ cx: {cx:.2f}, cy: {cy:.2f}, rx: {rx:.2f}, ry: {ry:.2f} }}

/** Grosor del aro oscuro que delimita la cabeza. */
export const HEAD_RING = {RING}

/** Rectángulo, en bloques nativos, que ocupa el hueco interior del aro. */
export const HOLE_BOX = {{ x: {bx0}, y: {by0}, w: {bx1 - bx0}, h: {by1 - by0} }}

/** Máscara del hueco: '1' = bloque donde se pinta la foto. */
export const HOLE_ROWS: readonly string[] = {json.dumps(rows, indent=2)}
"""
(ROOT / "src/game/avatarGeometry.ts").parent.mkdir(parents=True, exist_ok=True)
(ROOT / "src/game/avatarGeometry.ts").write_text(ts)
print(f"cabeza: c=({cx:.1f},{cy:.1f}) r=({rx:.1f},{ry:.1f}) hueco bloques {bx0},{by0} {bx1-bx0}x{by1-by0}")
