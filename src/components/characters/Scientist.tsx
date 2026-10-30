import { useEffect, useState } from 'react'
import sheet from '../../assets/sprites/scientist-sheet.png'
import { SCIENTIST_SCALE } from '../../game/layout'
import type { Mood } from '../../types/game'
import styles from './Scientist.module.css'

/**
 * Retratos en el spritesheet original: 4 de hablar (fila 128) y 4 de parpadear (fila 176).
 * Se usan 46 filas: la 47.ª trae tres píxeles amarillos de la cuadrícula en el original.
 */
const FRAME = { w: 46, h: 46, x0: 565, stride: 48, talkY: 128, blinkY: 176 }
const SHEET = { w: 1112, h: 256 }

type Frame = { row: 'talk' | 'blink'; i: number }

const TALK_CYCLE: Frame[] = [0, 1, 2, 1, 3, 1, 0, 2].map((i) => ({ row: 'talk', i }))
const BLINK: Frame[] = [1, 2, 3, 2].map((i) => ({ row: 'blink', i }))

interface Props {
  mood: Mood
  talking: boolean
  /** Cambia en cada frase para reiniciar la animación de reacción. */
  lineId: number
  scale?: number
}

export function Scientist({ mood, talking, lineId, scale = SCIENTIST_SCALE }: Props) {
  const [tick, setTick] = useState(0)
  const [blink, setBlink] = useState(-1)

  useEffect(() => {
    if (!talking) return
    const id = window.setInterval(() => setTick((t) => t + 1), 110)
    return () => window.clearInterval(id)
  }, [talking])

  // Parpadeo ocasional cuando no habla.
  useEffect(() => {
    if (talking) return
    let timeout = 0
    let interval = 0
    const schedule = () => {
      timeout = window.setTimeout(() => {
        let f = 0
        interval = window.setInterval(() => {
          setBlink(f)
          f += 1
          if (f > BLINK.length) {
            window.clearInterval(interval)
            setBlink(-1)
            schedule()
          }
        }, 70)
      }, 2200 + Math.random() * 2600)
    }
    schedule()
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [talking])

  let frame: Frame = { row: 'talk', i: 0 }
  if (talking) frame = TALK_CYCLE[tick % TALK_CYCLE.length]
  else if (mood === 'oops') frame = { row: 'blink', i: 2 }
  else if (mood === 'happy' || mood === 'surprised') frame = { row: 'talk', i: 3 }
  else if (blink >= 0 && blink < BLINK.length) frame = BLINK[blink]

  const x = FRAME.x0 + FRAME.stride * frame.i
  const y = frame.row === 'talk' ? FRAME.talkY : FRAME.blinkY

  return (
    <div className={styles.wrap} style={{ width: FRAME.w * scale, height: FRAME.h * scale }}>
      <div key={lineId} className={`${styles.body} ${styles[mood]}`}>
        <div
          className={`${styles.portrait} pixelated`}
          role="img"
          aria-label="Prof. Enlace, el presentador del concurso"
          style={{
            width: FRAME.w * scale,
            height: FRAME.h * scale,
            backgroundImage: `url(${sheet})`,
            backgroundSize: `${SHEET.w * scale}px ${SHEET.h * scale}px`,
            backgroundPosition: `${-x * scale}px ${-y * scale}px`,
          }}
        />
      </div>
    </div>
  )
}
