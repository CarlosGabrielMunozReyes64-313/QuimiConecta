import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { MOLECULES } from '../../game/molecular/molecules'
import { validateStructure, type ValidationResult } from '../../game/molecular/validate'
import type { MoleculeWorld, WorldEvent } from '../../game/physics/MoleculeWorld'
import { BUILD_ZOOM, type Orientation } from '../../game/layout'
import type { AnswerRecord, BuildQuestion } from '../../types/game'
import { ScrollBanner } from '../board/ScrollBanner'
import { StructureDiagram } from '../chem/StructureDiagram'
import { ChemText } from '../ui/ChemText'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import { MoleculeBuilder } from './MoleculeBuilder'
import styles from './BuildBoard.module.css'

interface Props {
  question: BuildQuestion
  answer: AnswerRecord | undefined
  orientation: Orientation
  isLast: boolean
  onAnswer: (correct: boolean) => void
  onNext: () => void
  /** Comentarios del presentador durante la construcción. */
  onHost: (event: 'practiceSolved' | 'practiceStillWrong' | 'solution' | 'idleHint' | 'bondMade') => void
}

type Phase = 'build' | 'result' | 'practice'

const IDLE_MS = 25000

/** Pregunta de construcción molecular con Matter.js (etapa 2). */
export function BuildBoard({ question, answer, orientation, isLast, onAnswer, onNext, onHost }: Props) {
  const worldRef = useRef<MoleculeWorld | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<Phase>(answer ? 'result' : 'build')
  const [marks, setMarks] = useState<ValidationResult | null>(null)
  const [practiceSolved, setPracticeSolved] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [bonds, setBonds] = useState(0)
  const [activity, setActivity] = useState(0)
  const [noteSide, setNoteSide] = useState<'left' | 'right'>('right')
  const firstBondSaid = useRef(false)
  const spec = MOLECULES[question.moleculeId]
  const locked = phase === 'result' || (phase === 'practice' && practiceSolved)

  const handleEvent = useCallback(
    (e: WorldEvent) => {
      const world = worldRef.current
      if (world) setBonds(world.graph().bonds.length)
      if (e.type === 'connect') {
        sound.play('snap')
        if (!firstBondSaid.current) {
          firstBondSaid.current = true
          onHost('bondMade')
        }
      } else if (e.type === 'pair') sound.play('pair')
      else if (e.type === 'disconnect' || e.type === 'unpair') sound.play('detach')
      // En práctica, cualquier cambio borra las marcas anteriores.
      setMarks((m) => (m && !m.correct ? null : m))
    },
    [onHost],
  )

  // Pista del presentador si no hay actividad durante un rato.
  useEffect(() => {
    if (locked) return
    const id = window.setTimeout(() => onHost('idleHint'), IDLE_MS)
    return () => window.clearTimeout(id)
  }, [activity, locked, onHost])

  useEffect(() => {
    if (answer) nextRef.current?.focus({ preventScroll: true })
  }, [answer, phase])

  const evaluate = () => {
    const world = worldRef.current
    if (!world) return null
    // La nota de revisión se coloca en el lado contrario a los átomos enlazados.
    const linked = world.atoms().filter((a) => world.sidesUsed(a.id) > 0)
    const xs = (linked.length ? linked : world.atoms()).map((a) => a.body.position.x)
    setNoteSide(xs.reduce((s, x) => s + x, 0) / xs.length > world.width / 2 ? 'left' : 'right')
    return validateStructure(spec, world.graph(), { requireLonePairs: question.requireLonePairs })
  }

  const confirm = () => {
    const result = evaluate()
    if (!result) return
    setMarks(result)
    setPhase('result')
    if (result.correct) sound.play('complete')
    onAnswer(result.correct)
  }

  const practiceCheck = () => {
    const result = evaluate()
    if (!result) return
    setMarks(result)
    if (result.correct) {
      setPracticeSolved(true)
      sound.play('correct')
      onHost('practiceSolved')
    } else {
      sound.play('wrong')
      onHost('practiceStillWrong')
    }
  }

  const startPractice = () => {
    setMarks(null)
    setPhase('practice')
    setActivity((a) => a + 1)
  }

  const reset = () => {
    worldRef.current?.reset(true)
    setMarks(null)
    setBonds(0)
    sound.play('detach')
  }

  const issues = marks && !marks.correct ? marks.issues.slice(0, 2) : []
  const correctFinal = phase === 'result' && answer?.correct
  const nextLabel = isLast ? 'Ver resultados' : 'Siguiente pregunta'

  return (
    <div className={`${styles.wrap} ${styles[orientation]}`}>
      <ScrollBanner compact>
        <h2 className={styles.prompt}>
          <ChemText text={question.prompt} />
        </h2>
        <p className={styles.hint}>{question.hint}</p>
      </ScrollBanner>

      <div className={styles.stage}>
        <MoleculeBuilder
          pieces={question.pieces}
          zoom={BUILD_ZOOM[orientation]}
          locked={locked}
          marks={marks}
          onReady={(w) => {
            worldRef.current = w
          }}
          onEvent={handleEvent}
          onActivity={() => setActivity((a) => a + 1)}
        />

        {issues.length > 0 ? (
          <aside className={`${styles.note} ${styles[noteSide]}`} role="status">
            <p className={styles.noteTitle}>Revisa</p>
            <ul>
              {issues.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className={styles.noteLegend}>
              {question.requireLonePairs ? 'En rojo: electrones que tiene / que necesita.' : 'En rojo: enlaces que tiene / que necesita.'}
            </p>
          </aside>
        ) : null}

        {phase === 'practice' && practiceSolved ? (
          <aside className={`${styles.note} ${styles.noteOk} ${styles[noteSide]}`} role="status">
            <p className={styles.noteTitle}>¡Correcta!</p>
            <p>La arreglaste. Esta vez no suma punto, pero ya sabes construirla.</p>
          </aside>
        ) : null}

        {showSolution ? (
          <div className={styles.solution} role="dialog" aria-label={`Solución: ${spec.name}`}>
            <p className={styles.solutionTitle}>
              Solución: <ChemText text={spec.formula} /> ({spec.name})
            </p>
            <StructureDiagram molecule={spec} width={orientation === 'portrait' ? 520 : 420} height={orientation === 'portrait' ? 300 : 220} showPairs={question.requireLonePairs} />
            <p className={styles.solutionText}>
              <ChemText text={question.explanation} />
            </p>
            <PixelButton variant="wood" size="sm" onClick={() => setShowSolution(false)}>
              Volver a mi estructura
            </PixelButton>
          </div>
        ) : null}
      </div>

      <footer className={styles.footer}>
        {phase === 'build' ? (
          <>
            <p className={styles.status}>{bonds === 0 ? 'Coloca al menos un enlace para confirmar.' : 'Cuando esté lista, confírmala: no se podrá cambiar.'}</p>
            <PixelButton variant="wood" size="sm" onClick={reset}>
              Reiniciar piezas
            </PixelButton>
            <PixelButton onClick={confirm} disabled={bonds === 0} icon={<PixelIcon name="check" cell={3} />}>
              Confirmar estructura
            </PixelButton>
          </>
        ) : null}

        {phase === 'result' ? (
          <>
            <p className={`${styles.status} ${correctFinal ? styles.ok : styles.bad}`} role="status">
              {correctFinal ? '¡Molécula correcta! +1 punto.' : 'Respuesta registrada: incorrecta.'}
            </p>
            {!correctFinal ? (
              <>
                <PixelButton variant="wood" size="sm" onClick={startPractice}>
                  Corregir sin puntos
                </PixelButton>
                <PixelButton
                  variant="wood"
                  size="sm"
                  onClick={() => {
                    setShowSolution(true)
                    onHost('solution')
                  }}
                >
                  Ver solución
                </PixelButton>
              </>
            ) : null}
            <PixelButton ref={nextRef} onClick={onNext} icon={<PixelIcon name="next" cell={3} />}>
              {nextLabel}
            </PixelButton>
          </>
        ) : null}

        {phase === 'practice' ? (
          <>
            <p className={styles.status}>Práctica: corrige y comprueba. No cambia tu puntuación.</p>
            {!practiceSolved ? (
              <PixelButton variant="wood" size="sm" onClick={practiceCheck}>
                Comprobar
              </PixelButton>
            ) : null}
            <PixelButton
              variant="wood"
              size="sm"
              onClick={() => {
                setShowSolution(true)
                onHost('solution')
              }}
            >
              Ver solución
            </PixelButton>
            <PixelButton ref={nextRef} onClick={onNext} icon={<PixelIcon name="next" cell={3} />}>
              {nextLabel}
            </PixelButton>
          </>
        ) : null}
      </footer>
    </div>
  )
}
