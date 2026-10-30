import { formatDuration, provisionalGrade, scoreOf } from '../../game/grading'
import type { Orientation } from '../../game/layout'
import type { AnswerRecord } from '../../types/game'
import { PixelIcon } from '../ui/PixelIcon'
import styles from './PlayerCard.module.css'

interface Props {
  name: string
  answers: readonly AnswerRecord[]
  elapsed: number
  total: number
  orientation: Orientation
}

/** Información del jugador: puntos, calificación provisional, aciertos y tiempo. */
export function PlayerCard({ name, answers, elapsed, total, orientation }: Props) {
  const score = scoreOf(answers)
  const wrong = answers.length - score
  const grade = provisionalGrade(answers)
  return (
    <aside className={`${styles.card} ${styles[orientation]} px-panel`} aria-label="Marcador del jugador">
      <p className={styles.name} title={name}>
        {name}
      </p>
      <div className={styles.score}>
        <span className={styles.points} aria-live="polite" aria-label={`${score} de ${total} puntos`}>
          <span key={score} className={score > 0 ? styles.bump : undefined}>
            {score}
          </span>
          <small>/{total}</small>
        </span>
        <span className={styles.caption}>puntos</span>
        {score > 0 ? (
          <span key={`plus-${score}`} className={styles.plus} aria-hidden="true">
            +1
          </span>
        ) : null}
      </div>
      <div className={styles.grade}>
        <span className={`${styles.letter} ${grade ? styles[`g${grade.grade}`] : ''}`} aria-hidden="true">
          {grade?.grade ?? '?'}
        </span>
        <span className={styles.gradeText}>
          <span className={styles.caption}>Calificación provisional</span>
          <span>{grade ? grade.label : orientation === 'portrait' ? 'Sin nota aún' : 'Responde para verla'}</span>
        </span>
      </div>
      <ul className={styles.stats}>
        <li>
          <span className={styles.ok}>
            <PixelIcon name="check" cell={2} />
          </span>
          Aciertos <b>{score}</b>
        </li>
        <li>
          <span className={styles.bad}>
            <PixelIcon name="cross" cell={2} />
          </span>
          Fallos <b>{wrong}</b>
        </li>
        <li>
          Tiempo <b>{formatDuration(elapsed)}</b>
        </li>
      </ul>
    </aside>
  )
}
