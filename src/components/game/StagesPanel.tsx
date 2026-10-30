import { STAGES } from '../../game/questions/bank'
import type { AnswerRecord, Question, StageNumber } from '../../types/game'
import styles from './StagesPanel.module.css'

interface Props {
  questions: readonly Question[]
  answers: readonly AnswerRecord[]
  currentStage: StageNumber | null
  compact?: boolean
}

/** Las tres etapas con su modalidad y los aciertos de cada una. */
export function StagesPanel({ questions, answers, currentStage, compact = false }: Props) {
  const stages: StageNumber[] = [1, 2, 3]
  return (
    <aside className={`${styles.panel} ${compact ? styles.compact : ''} px-panel`} aria-label="Etapas del concurso">
      <ol className={styles.list}>
        {stages.map((s) => {
          const qs = questions.filter((q) => q.stage === s)
          const done = answers.filter((a) => qs.some((q) => q.id === a.questionId))
          const correct = done.filter((a) => a.correct).length
          const complete = done.length === qs.length
          return (
            <li key={s} className={`${styles.item} ${s === currentStage ? styles.current : ''} ${complete ? styles.complete : ''}`} aria-current={s === currentStage ? 'step' : undefined}>
              <span className={styles.num}>{s}</span>
              <span className={styles.text}>
                <span className={styles.title}>{STAGES[s].title}</span>
                {!compact ? <span className={styles.mode}>{STAGES[s].mode}</span> : null}
              </span>
              <span className={styles.score} aria-label={`${correct} de ${qs.length} aciertos`}>
                {correct}/{qs.length}
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
