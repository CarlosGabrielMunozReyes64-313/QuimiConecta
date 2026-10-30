import { HOLE_BOX, HOLE_ROWS, MESSENGER_BLOCK } from './avatarGeometry'

export interface ProcessedPhoto {
  /** Foto nítida recortada al hueco de la cabeza (bloques de 8 px). */
  photo: string
  /** La misma foto reducida a la rejilla nativa del sprite: 1 píxel = 1 bloque. */
  photoPixel: string
}

/** Dibuja `source` cubriendo el lienzo sin deformarlo (recorte centrado). */
function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, w: number, h: number) {
  const scale = Math.max(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

/** Deja transparentes los bloques que quedan fuera del círculo interior. */
function applyMask(ctx: CanvasRenderingContext2D, block: number) {
  for (let row = 0; row < HOLE_BOX.h; row++) {
    const line = HOLE_ROWS[row]
    for (let col = 0; col < HOLE_BOX.w; col++) {
      if (line[col] !== '1') ctx.clearRect(col * block, row * block, block, block)
    }
  }
}

function render(source: CanvasImageSource, sw: number, sh: number, block: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = HOLE_BOX.w * block
  canvas.height = HOLE_BOX.h * block
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible')
  drawCover(ctx, source, sw, sh, canvas.width, canvas.height)
  applyMask(ctx, block)
  return canvas.toDataURL('image/png')
}

/** Convierte un cuadro capturado (o una imagen subida) en las dos versiones del avatar. */
export function processPhoto(source: HTMLCanvasElement | HTMLImageElement): ProcessedPhoto {
  const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  // Reducción en dos pasos para que la versión pixelada no tenga ruido.
  const mid = document.createElement('canvas')
  mid.width = HOLE_BOX.w * 4
  mid.height = HOLE_BOX.h * 4
  const mctx = mid.getContext('2d')
  if (!mctx) throw new Error('Canvas 2D no disponible')
  drawCover(mctx, source, sw, sh, mid.width, mid.height)
  return {
    photo: render(source, sw, sh, MESSENGER_BLOCK),
    photoPixel: render(mid, mid.width, mid.height, 1),
  }
}

/** Lee un archivo de imagen local (no se sube a ningún servidor). */
export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen. Elige una foto en JPG, PNG o similar.'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo abrir la imagen. Prueba con otra foto.'))
    }
    img.src = url
  })
}

let maskCache: string | null = null

/** Máscara (data URL) del hueco de la cabeza, a la resolución del sprite original. */
export function holeMaskUrl(): string {
  if (maskCache) return maskCache
  const canvas = document.createElement('canvas')
  canvas.width = HOLE_BOX.w * MESSENGER_BLOCK
  canvas.height = HOLE_BOX.h * MESSENGER_BLOCK
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#fff'
  HOLE_ROWS.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '1') ctx.fillRect(col * MESSENGER_BLOCK, row * MESSENGER_BLOCK, MESSENGER_BLOCK, MESSENGER_BLOCK)
    }
  })
  maskCache = canvas.toDataURL('image/png')
  return maskCache
}
