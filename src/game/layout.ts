import type { CSSProperties } from 'react'

/**
 * Composición del escenario. El juego se diseña sobre un lienzo virtual fijo
 * (1280×720 en horizontal, 720×1280 en vertical) que se escala entero a la ventana.
 * Así el pixel art conserva proporciones y Matter.js trabaja en coordenadas estables.
 */
export type Orientation = 'landscape' | 'portrait'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface StageLayout {
  width: number
  height: number
  hud: Rect
  board: Rect
  card: Rect
  avatar: Rect
  scientist: Rect
  bubble: Rect
  /** Panel de etapas; en vertical se muestra en un hueco más pequeño. */
  stages: Rect
  /** Dirección de la cola del globo hacia el científico. */
  tail: 'right' | 'down'
}

/** Zoom del área de construcción: en vertical las piezas se ven más grandes para tocarlas. */
export const BUILD_ZOOM: Record<Orientation, number> = { landscape: 1, portrait: 1.35 }

/** Escala de los retratos del científico (46×46 px nativos). */
export const SCIENTIST_SCALE = 4

export const LAYOUTS: Record<Orientation, StageLayout> = {
  landscape: {
    width: 1280,
    height: 720,
    hud: { x: 16, y: 12, w: 1248, h: 48 },
    board: { x: 248, y: 68, w: 808, h: 520 },
    card: { x: 16, y: 72, w: 220, h: 404 },
    avatar: { x: 16, y: 500, w: 220, h: 220 },
    scientist: { x: 1076, y: 536, w: 46 * SCIENTIST_SCALE, h: 46 * SCIENTIST_SCALE },
    bubble: { x: 248, y: 600, w: 812, h: 108 },
    stages: { x: 1068, y: 72, w: 196, h: 300 },
    tail: 'right',
  },
  portrait: {
    width: 720,
    height: 1280,
    hud: { x: 16, y: 12, w: 688, h: 96 },
    board: { x: 16, y: 116, w: 688, h: 696 },
    card: { x: 16, y: 820, w: 688, h: 128 },
    avatar: { x: 16, y: 1092, w: 188, h: 188 },
    scientist: { x: 520, y: 1096, w: 46 * SCIENTIST_SCALE, h: 46 * SCIENTIST_SCALE },
    bubble: { x: 16, y: 958, w: 688, h: 128 },
    stages: { x: 212, y: 1100, w: 300, h: 172 },
    tail: 'down',
  },
}

/** Marco de la pizarra (en px del escenario): 7, 7, 5 y 5 unidades de 4 px. */
export const BOARD_FRAME = { left: 28, top: 28, right: 20, bottom: 20 }

export function rectStyle(r: Rect): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h }
}
