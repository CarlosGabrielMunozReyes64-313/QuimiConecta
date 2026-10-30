/** Rejillas de celdas para dibujar círculos pixel art con SVG nítido. */
export interface CircleCells {
  size: number
  fill: string
  outline: string
  light: string
  shade: string
}

const cache = new Map<string, CircleCells>()

function inside(x: number, y: number, c: number, r: number) {
  const dx = x + 0.5 - c
  const dy = y + 0.5 - c
  return dx * dx + dy * dy <= r * r
}

function runs(cells: boolean[][]): string {
  let d = ''
  cells.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x]) {
        let len = 1
        while (row[x + len]) len++
        d += `M${x} ${y}h${len}v1h${-len}z`
        x += len
      } else x++
    }
  })
  return d
}

/** Círculo relleno con contorno, brillo arriba-izquierda y sombra abajo-derecha. */
export function circleCells(size: number): CircleCells {
  const key = `c${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = size / 2
  const r = size / 2
  const grid = (fn: (x: number, y: number) => boolean) =>
    Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => fn(x, y)))
  const isIn = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && inside(x, y, c, r)
  const edge = (x: number, y: number) => isIn(x, y) && (!isIn(x - 1, y) || !isIn(x + 1, y) || !isIn(x, y - 1) || !isIn(x, y + 1))
  const interior = (x: number, y: number) => isIn(x, y) && !edge(x, y)
  const light = (x: number, y: number) => interior(x, y) && inside(x, y, c - r * 0.28, r * 0.42) && !inside(x, y, c - r * 0.12, r * 0.42)
  const shade = (x: number, y: number) => interior(x, y) && !inside(x, y, c - r * 0.18, r * 0.92)
  const out: CircleCells = {
    size,
    outline: runs(grid(edge)),
    fill: runs(grid((x, y) => interior(x, y) && !light(x, y) && !shade(x, y))),
    light: runs(grid(light)),
    shade: runs(grid(shade)),
  }
  cache.set(key, out)
  return out
}

/** Anillo de una celda de grosor (para resaltar átomos). */
export function ringPath(size: number): string {
  const key = `r${size}`
  const hit = cache.get(key)
  if (hit) return hit.outline
  const c = size / 2
  const grid = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => inside(x, y, c, size / 2) && !inside(x, y, c, size / 2 - 1.2)),
  )
  const d = runs(grid)
  cache.set(key, { size, outline: d, fill: '', light: '', shade: '' })
  return d
}
