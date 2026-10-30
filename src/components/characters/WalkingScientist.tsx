import { useEffect, useState } from 'react'
import sheet from '../../assets/sprites/scientist-sheet.png'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import styles from './WalkingScientist.module.css'

const CELL_W = 30
const CELL_H = 29
const SHEET = { w: 1112, h: 256 }
/** Filas WALK del spritesheet original (x = 565 + 32·i); el bloque tiene celdas de 30×29. */
const WALK = { x0: 565, stride: 32, right: 1, left: 33, frames: 4 }
const IDLE_DOWN = { x: 1, y: 65 }

interface Props {
  width: number
  scale?: number
}

/** El científico de cuerpo entero paseando por el escenario del menú. */
export function WalkingScientist({ width, scale = 4 }: Props) {
  const reduced = useReducedMotion()
  const [state, setState] = useState({ x: width * 0.15, dir: 1, frame: 0 })

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setState((s) => {
        let x = s.x + s.dir * 6
        let dir = s.dir
        const max = width - CELL_W * scale
        if (x > max) {
          x = max
          dir = -1
        } else if (x < 0) {
          x = 0
          dir = 1
        }
        return { x, dir, frame: (s.frame + 1) % WALK.frames }
      })
    }, 130)
    return () => window.clearInterval(id)
  }, [reduced, width, scale])

  const sx = reduced ? IDLE_DOWN.x : WALK.x0 + WALK.stride * state.frame
  const sy = reduced ? IDLE_DOWN.y : state.dir > 0 ? WALK.right : WALK.left
  return (
    <div
      className={`${styles.walker} pixelated`}
      aria-hidden="true"
      style={{
        width: CELL_W * scale,
        height: CELL_H * scale,
        transform: `translateX(${reduced ? width / 2 - (CELL_W * scale) / 2 : state.x}px)`,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${SHEET.w * scale}px ${SHEET.h * scale}px`,
        backgroundPosition: `${-sx * scale}px ${-sy * scale}px`,
      }}
    />
  )
}
