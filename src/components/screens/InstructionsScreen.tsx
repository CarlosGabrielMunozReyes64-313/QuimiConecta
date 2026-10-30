import { GRADE_TABLE, gradeRange } from '../../game/grading'
import { QUESTIONS, STAGES } from '../../game/questions/bank'
import { stageTimeLabel } from '../../game/timing'
import type { StageFit } from '../../hooks/useStageLayout'
import { Whiteboard } from '../board/Whiteboard'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import styles from './InstructionsScreen.module.css'

interface Props {
  fit: StageFit
  onBack: () => void
  onStart: () => void
}

const STAGE_TEXT: Record<1 | 2 | 3, string> = {
  1: 'Tres preguntas de opción múltiple sobre el octeto, el dueto y los electrones de valencia.',
  2: 'Arrastra átomos, suelta enlaces entre ellos y añade pares de electrones si se piden. Luego confirma.',
  3: 'Mira la estructura de Lewis de la pizarra y elige su fórmula química.',
}

/** Cómo se juega, controles y escala de calificación. */
export function InstructionsScreen({ fit, onBack, onStart }: Props) {
  const { orientation } = fit
  const rect = orientation === 'portrait' ? { x: 16, y: 120, w: 688, h: 1040 } : { x: 236, y: 100, w: 808, h: 520 }
  return (
    <main className={styles.screen}>
      <Whiteboard
        variant={orientation === 'portrait' ? 'tall' : 'landscape'}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        className={styles[orientation]}
        label="Instrucciones"
      >
        <h1 className={styles.title}>Cómo se juega</h1>
        <div className={styles.columns}>
          <ol className={styles.stages}>
            {([1, 2, 3] as const).map((s) => (
              <li key={s}>
                <span className={styles.num}>{s}</span>
                <div>
                  <h2>
                    {STAGES[s].title} <span className={styles.time}>({stageTimeLabel(QUESTIONS, s, 'normal')} por pregunta)</span>
                  </h2>
                  <p>{STAGE_TEXT[s]}</p>
                </div>
              </li>
            ))}
            <li className={styles.controls}>
              <div>
                <h2>Controles</h2>
                <p>Arrastra y toca con el ratón o el dedo. Con teclado: Tab, Enter, flechas y teclas 1 a 4.</p>
              </div>
            </li>
          </ol>
          <table className={styles.grades}>
            <caption>Cada acierto vale 1 punto. Si se acaba el tiempo, cuenta como fallo. En el registro puedes pedir más tiempo.</caption>
            <thead>
              <tr>
                <th scope="col">Puntos</th>
                <th scope="col">Nota</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_TABLE.map((g) => (
                <tr key={g.grade}>
                  <td>{gradeRange(g.grade)}</td>
                  <td className={styles.letter}>{g.grade}</td>
                  <td>{g.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.actions}>
          <PixelButton variant="wood" onClick={onBack} icon={<PixelIcon name="back" cell={3} />}>
            Volver
          </PixelButton>
          <PixelButton onClick={onStart} icon={<PixelIcon name="next" cell={3} />}>
            Iniciar partida
          </PixelButton>
        </div>
      </Whiteboard>
    </main>
  )
}
