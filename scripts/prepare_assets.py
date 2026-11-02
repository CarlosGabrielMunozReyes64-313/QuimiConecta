"""
Prepara los assets derivados de QuimiConecta a partir de los originales.

Los originales se copian sin modificar. Los derivados respetan los píxeles
de origen: solo se recortan, se reordenan o se amplían con vecino más cercano.

  - board-landscape.png / board-portrait.png: la pizarra original recompuesta
    en 9 partes (esquinas intactas, bandeja del rotulador sin estirar).
  - messenger-ring.png: el icono Messenger a su resolución nativa (bloques de 8 px)
    con el interior de la cabeza vaciado, para superponer el aro sobre la foto.
  - src/game/avatarGeometry.ts: geometría del círculo, generada a partir de la imagen.

La fuente (Andika, licencia OFL) no se genera: está en src/assets/fonts.

Uso: python3 scripts/prepare_assets.py <carpeta_uploads>
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads")
SPRITES = ROOT / "src/assets/sprites"
SPRITES.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- originales
shutil.copy(UPLOADS / "lablady_spritesheet_BOXED.png", SPRITES / "scientist-sheet.png")
shutil.copy(UPLOADS / "image.png", SPRITES / "lab-background.png")
shutil.copy(UPLOADS / "image__1_.png", SPRITES / "messenger.png")
shutil.copy(UPLOADS / "image-removebg-preview.png", SPRITES / "whiteboard-original.png")

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
