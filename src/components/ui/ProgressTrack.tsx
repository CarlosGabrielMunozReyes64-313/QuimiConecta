import type { AnswerRecord, Question } from '../../types/game'
import styles from './ProgressTrack.module.css'

interface Props {
  questions: readonly Question[]
  answers: readonly AnswerRecord[]
  currentIndex: number
}

/** Nueve casillas: verde acierto, rojo fallo, contorno parpadeante en la actual. */
export function ProgressTrack({ questions, answers, currentIndex }: Props) {
  const done = answers.length
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={questions.length}
      aria-valuenow={done}
      aria-label={`Progreso: ${done} de ${questions.length} preguntas respondidas`}
    >
      {questions.map((q, i) => {
        const a = answers.find((x) => x.questionId === q.id)
        const state = a ? (a.correct ? 'correct' : 'wrong') : i === currentIndex ? 'current' : 'pending'
        return (
          <span key={q.id} className={`${styles.cell} ${styles[state]} ${i % 3 === 0 && i > 0 ? styles.stageStart : ''}`}>
            {i + 1}
          </span>
        )
      })}
    </div>
  )
}
