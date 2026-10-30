import { formatClock } from '../../game/timing'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { PixelIcon } from '../ui/PixelIcon'
import styles from './QuestionTimer.module.css'

interface Props {
  remaining: number
  total: number
  /** La pregunta ya se respondió: el reloj queda congelado. */
  stopped: boolean
  paused: boolean
  timedOut: boolean
}

const SEGMENTS = 24

/** Cuenta atrás pixel: segundos y una barra de bloques que se vacía. */
export function QuestionTimer({ remaining, total, stopped, paused, timedOut }: Props) {
  const reduced = useReducedMotion()
  const fraction = total > 0 ? remaining / total : 0
  const filled = Math.ceil(fraction * SEGMENTS)
  const level = fraction > 0.5 ? styles.ok : fraction > 0.25 ? styles.mid : styles.low
  const secs = Math.ceil(remaining / 1000)
  const urgent = !stopped && !paused && secs <= 5 && secs > 0 && !reduced
  let note = ''
  if (timedOut) note = '¡Tiempo!'
  else if (paused && !stopped) note = 'En pausa'
  return (
    <div
      className={`${styles.timer} ${level} ${urgent ? styles.urgent : ''} ${stopped ? styles.stopped : ''}`}
      role="timer"
      aria-label={timedOut ? 'Se acabó el tiempo' : `Tiempo restante: ${secs} segundos${paused ? ', en pausa' : ''}`}
    >
      <span className={styles.icon}>
        <PixelIcon name="clock" cell={3} />
      </span>
      <span className={styles.secs} aria-hidden="true">
        {formatClock(remaining)}
        {remaining < 60_000 ? <small> s</small> : null}
      </span>
      <span className={styles.bar} aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={i < filled ? styles.on : styles.off} />
        ))}
      </span>
      {note ? <span className={styles.note}>{note}</span> : null}
    </div>
  )
}
