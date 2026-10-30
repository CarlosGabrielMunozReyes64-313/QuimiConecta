import { sound } from '../../audio/sound'
import type { DialogueLine } from '../../game/dialogue'
import { rectStyle, type Rect } from '../../game/layout'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTypewriter } from '../../hooks/useTypewriter'
import { Scientist } from './Scientist'
import styles from './Host.module.css'

interface Props {
  line: DialogueLine
  bubble: Rect
  scientist: Rect
  tail: 'right' | 'down'
}

/** El presentador: retrato animado y globo de diálogo con efecto de máquina de escribir. */
export function Host({ line, bubble, scientist, tail }: Props) {
  const reduced = useReducedMotion()
  const { visible, done, skip } = useTypewriter(line.text, line.id, reduced, 48, () => sound.play('blip'))
  return (
    <>
      <div
        className={`${styles.bubble} ${tail === 'right' ? styles.tailRight : styles.tailDown}`}
        style={rectStyle(bubble)}
        onClick={skip}
      >
        <span className={styles.name}>Prof. Enlace</span>
        <p className={styles.text} aria-hidden="true">
          {line.text.slice(0, visible)}
          <span className={styles.ghost}>{line.text.slice(visible)}</span>
        </p>
        <p className="sr-only" aria-live="polite">
          {line.text}
        </p>
      </div>
      <div className={styles.scientist} style={rectStyle(scientist)}>
        <Scientist mood={line.mood} talking={!done} lineId={line.id} />
      </div>
    </>
  )
}
