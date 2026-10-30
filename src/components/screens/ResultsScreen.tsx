import { useEffect, useState } from 'react'
import { fill, lineFor, resultLine, RESULT_MESSAGES, type DialogueLine } from '../../game/dialogue'
import { formatDuration, gradeFor } from '../../game/grading'
import { rectStyle } from '../../game/layout'
import { QUESTIONS } from '../../game/questions/bank'
import type { StageFit } from '../../hooks/useStageLayout'
import type { GameResult, Player } from '../../types/game'
import { Host } from '../characters/Host'
import { StudentAvatar } from '../characters/StudentAvatar'
import { Whiteboard } from '../board/Whiteboard'
import { PlayerCard } from '../game/PlayerCard'
import { StagesPanel } from '../game/StagesPanel'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import { ProgressTrack } from '../ui/ProgressTrack'
import styles from './ResultsScreen.module.css'

interface Props {
  fit: StageFit
  player: Player
  result: GameResult
  onReplay: () => void
  onChangePlayer: () => void
  onMenu: () => void
}

/** Resultados finales con la calificación de S a F. */
export function ResultsScreen({ fit, player, result, onReplay, onChangePlayer, onMenu }: Props) {
  const { layout, orientation } = fit
  const grade = gradeFor(result.score)
  const wrong = result.total - result.score
  const elapsed = result.finishedAt - result.startedAt
  const [line, setLine] = useState<DialogueLine>(() => lineFor('finish', player.name))

  useEffect(() => {
    const id = window.setTimeout(() => setLine(resultLine(grade.grade)), 3400)
    return () => window.clearTimeout(id)
  }, [grade.grade])

  return (
    <main className={styles.screen}>
      <header className={`${styles.hud} px-panel`} style={rectStyle(layout.hud)}>
        <p className={styles.logo}>QuimiConecta</p>
        <p className={styles.hudText}>Partida terminada</p>
      </header>
      <div style={rectStyle(layout.card)} className={styles.slot}>
        <PlayerCard name={player.name} answers={result.answers} elapsed={elapsed} total={result.total} orientation={orientation} />
      </div>
      <div style={rectStyle(layout.stages)} className={styles.slot}>
        <StagesPanel questions={QUESTIONS} answers={result.answers} currentStage={null} compact={orientation === 'portrait'} />
      </div>

      <Whiteboard variant={orientation} style={rectStyle(layout.board)} label="Resultados" className={styles[orientation]}>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={`${styles.stamp} ${styles[`g${grade.grade}`]}`} aria-hidden="true">
              <span className={styles.stampLetter}>{grade.grade}</span>
              <span className={styles.stampLabel}>{grade.label}</span>
            </div>
            <div className={styles.summary}>
              <h1 className={styles.title}>Resultados de {player.name}</h1>
              <p className="sr-only">
                Calificación {grade.grade}: {grade.label}.
              </p>
              <p className={styles.score}>
                <span>{result.score}</span>/{result.total} puntos
              </p>
              <dl className={styles.stats}>
                <div>
                  <dt>Correctas</dt>
                  <dd className={styles.ok}>{result.score}</dd>
                </div>
                <div>
                  <dt>Incorrectas</dt>
                  <dd className={styles.bad}>{wrong}</dd>
                </div>
                <div>
                  <dt>Tiempo total</dt>
                  <dd>{formatDuration(elapsed)}</dd>
                </div>
              </dl>
            </div>
            {orientation === 'landscape' ? (
              <StudentAvatar size={150} photo={player.pixelStyle ? player.photoPixel : player.photo} pixel={player.pixelStyle} label={`Foto de ${player.name}`} />
            ) : null}
          </div>
          <p className={styles.message}>{fill(RESULT_MESSAGES[grade.grade], player.name)}</p>
          <div className={styles.track}>
            <span className={styles.trackLabel}>Pregunta por pregunta</span>
            <ProgressTrack questions={QUESTIONS} answers={result.answers} currentIndex={-1} />
          </div>
          <div className={styles.actions}>
            <PixelButton variant="wood" size="sm" onClick={onMenu}>
              Menú principal
            </PixelButton>
            <PixelButton variant="wood" size="sm" onClick={onChangePlayer}>
              Cambiar jugador
            </PixelButton>
            <PixelButton onClick={onReplay} icon={<PixelIcon name="next" cell={3} />}>
              Jugar de nuevo
            </PixelButton>
          </div>
        </div>
      </Whiteboard>

      <div className={styles.avatar} style={rectStyle(layout.avatar)}>
        <StudentAvatar size={layout.avatar.w} photo={player.pixelStyle ? player.photoPixel : player.photo} pixel={player.pixelStyle} label={`Avatar de ${player.name}`} />
      </div>
      <Host line={line} bubble={layout.bubble} scientist={layout.scientist} tail={layout.tail} />
    </main>
  )
}
