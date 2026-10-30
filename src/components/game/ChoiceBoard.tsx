import { useEffect, useRef } from 'react'
import { MOLECULES } from '../../game/molecular/molecules'
import { useQuestionClock } from '../../hooks/useQuestionClock'
import type { Orientation } from '../../game/layout'
import type { AnswerRecord, ChoiceQuestion, FormulaQuestion } from '../../types/game'
import { ScrollBanner } from '../board/ScrollBanner'
import { StructureDiagram } from '../chem/StructureDiagram'
import { plainChem } from '../../game/chemText'
import { ChemText } from '../ui/ChemText'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import { QuestionTimer } from './QuestionTimer'
import styles from './ChoiceBoard.module.css'

interface Props {
  question: ChoiceQuestion | FormulaQuestion
  answer: AnswerRecord | undefined
  orientation: Orientation
  isLast: boolean
  /** Límite de tiempo en ms (null = sin límite). */
  limitMs: number | null
  /** Pausa la cuenta atrás (menú abierto o pestaña oculta). */
  paused: boolean
  onAnswer: (choiceId: string | null, correct: boolean, timedOut: boolean) => void
  onNext: () => void
  onHurry: () => void
}

const LETTERS = ['A', 'B', 'C', 'D']

/** Pregunta de selección múltiple (etapa 1) o de identificación de fórmula (etapa 3). */
export function ChoiceBoard({ question, answer, orientation, isLast, limitMs, paused, onAnswer, onNext, onHurry }: Props) {
  const nextRef = useRef<HTMLButtonElement>(null)
  const answered = Boolean(answer)
  const isFormula = question.kind === 'formula'

  const remaining = useQuestionClock({
    limitMs,
    running: !answered && !paused,
    onExpire: () => onAnswer(null, false, true),
    onWarn: onHurry,
  })

  const choose = (id: string) => {
    if (answered) return
    onAnswer(id, id === question.correctOptionId, false)
  }

  // Atajos: 1-4 o A-D eligen una opción.
  useEffect(() => {
    if (answered || paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toUpperCase()
      const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : LETTERS.indexOf(k)
      const opt = question.options[idx]
      if (opt) {
        e.preventDefault()
        onAnswer(opt.id, opt.id === question.correctOptionId, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, paused, question, onAnswer])

  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: true })
  }, [answered])

  const longPrompt = question.prompt.length > 96
  const figure = isFormula ? MOLECULES[question.moleculeId] : null

  return (
    <div className={`${styles.wrap} ${styles[orientation]} ${isFormula ? styles.formula : ''}`}>
      <ScrollBanner>
        <h2 className={`${styles.prompt} ${longPrompt ? styles.promptLong : ''}`}>
          <ChemText text={question.prompt} />
        </h2>
      </ScrollBanner>

      {limitMs !== null && remaining !== null ? (
        <QuestionTimer remaining={remaining} total={limitMs} stopped={answered} paused={paused} timedOut={Boolean(answer?.timedOut)} />
      ) : null}

      <div className={styles.body}>
        {figure ? (
          <figure className={styles.figure}>
            <StructureDiagram
              molecule={figure}
              width={orientation === 'portrait' ? 560 : 330}
              height={orientation === 'portrait' ? 230 : 250}
              label={`Estructura de Lewis de una molécula: ${figure.atoms.map((a) => a.element).join(', ')}`}
            />
          </figure>
        ) : null}
        <div className={styles.options} role="group" aria-label="Opciones de respuesta">
          {question.options.map((opt, i) => {
            const isCorrect = opt.id === question.correctOptionId
            const chosen = answer?.choiceId === opt.id
            let state = ''
            if (answered) {
              if (isCorrect) state = chosen ? styles.right : styles.reveal
              else state = chosen ? styles.wrong : styles.dim
            }
            return (
              <button
                key={opt.id}
                type="button"
                className={`${styles.option} ${state}`}
                disabled={answered}
                aria-label={`Opción ${LETTERS[i]}: ${plainChem(opt.text)}${answered && isCorrect ? ' (correcta)' : ''}${answered && chosen && !isCorrect ? ' (tu respuesta, incorrecta)' : ''}`}
                onClick={() => choose(opt.id)}
              >
                <span className={styles.letter} aria-hidden="true">
                  {LETTERS[i]}
                </span>
                <span className={styles.optionText}>
                  <ChemText text={opt.text} />
                </span>
                {answered && (isCorrect || chosen) ? (
                  <span className={styles.mark} aria-hidden="true">
                    <PixelIcon name={isCorrect ? 'check' : 'cross'} cell={3} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <footer className={styles.footer}>
        {answered ? (
          <div className={`${styles.verdict} ${answer?.correct ? styles.verdictOk : styles.verdictBad}`} role="status">
            <strong>{answer?.correct ? '¡Correcto! +1 punto.' : answer?.timedOut ? '¡Se acabó el tiempo!' : 'Incorrecto.'}</strong>{' '}
            <ChemText text={question.explanation} />
          </div>
        ) : (
          <p className={styles.tip}>Elige una opción. También puedes pulsar 1, 2, 3 o 4.</p>
        )}
        {answered ? (
          <PixelButton ref={nextRef} onClick={onNext} icon={<PixelIcon name="next" cell={3} />}>
            {isLast ? 'Ver resultados' : 'Siguiente pregunta'}
          </PixelButton>
        ) : null}
      </footer>
    </div>
  )
}
