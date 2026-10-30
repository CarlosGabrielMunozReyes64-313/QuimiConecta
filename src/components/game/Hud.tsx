import { STAGES } from '../../game/questions/bank'
import { rectStyle, type Orientation, type Rect } from '../../game/layout'
import type { AnswerRecord, Question } from '../../types/game'
import { PixelButton } from '../ui/PixelButton'
import { ProgressTrack } from '../ui/ProgressTrack'
import { SoundToggles } from '../ui/SoundToggles'
import styles from './Hud.module.css'

interface Props {
  questions: readonly Question[]
  answers: readonly AnswerRecord[]
  index: number
  orientation: Orientation
  rect: Rect
  onMenu: () => void
}

/** Barra superior: etapa, pregunta actual, progreso y sonido. */
export function Hud({ questions, answers, index, orientation, rect, onMenu }: Props) {
  const q = questions[index]
  return (
    <header className={`${styles.hud} ${styles[orientation]} px-panel`} style={rectStyle(rect)}>
      <p className={styles.logo}>QuimiConecta</p>
      <div className={styles.center}>
        <p className={styles.stage}>
          Etapa {q.stage}: {STAGES[q.stage].title.toLowerCase()}
          <span className={styles.count}>
            Pregunta {index + 1} de {questions.length}
          </span>
        </p>
        <ProgressTrack questions={questions} answers={answers} currentIndex={index} />
      </div>
      <div className={styles.right}>
        <SoundToggles />
        <PixelButton variant="ghost" size="sm" onClick={onMenu}>
          Menú
        </PixelButton>
      </div>
    </header>
  )
}
