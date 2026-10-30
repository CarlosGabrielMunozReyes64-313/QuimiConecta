import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { lineFor, type DialogueEvent, type DialogueLine } from '../../game/dialogue'
import { rectStyle } from '../../game/layout'
import { QUESTIONS } from '../../game/questions/bank'
import { limitMs } from '../../game/timing'
import { usePageVisible } from '../../hooks/usePageVisible'
import { createSession, sessionReducer, toResult } from '../../game/session'
import { useNow } from '../../hooks/useNow'
import type { StageFit } from '../../hooks/useStageLayout'
import type { GameResult, Player } from '../../types/game'
import { Host } from '../characters/Host'
import { StudentAvatar } from '../characters/StudentAvatar'
import { Whiteboard } from '../board/Whiteboard'
import { BuildBoard, type BuildHostEvent } from '../game/BuildBoard'
import { ChoiceBoard } from '../game/ChoiceBoard'
import { Hud } from '../game/Hud'
import { PlayerCard } from '../game/PlayerCard'
import { StagesPanel } from '../game/StagesPanel'
import { Dialog } from '../ui/Dialog'
import { PixelButton } from '../ui/PixelButton'
import styles from './GameScreen.module.css'

interface Props {
  fit: StageFit
  player: Player
  onFinish: (result: GameResult) => void
  onQuit: () => void
}

const reducer = sessionReducer(QUESTIONS)

/** La partida: pizarra central, estudiante a la izquierda y presentador a la derecha. */
export function GameScreen({ fit, player, onFinish, onQuit }: Props) {
  const { layout, orientation } = fit
  const [state, dispatch] = useReducer(reducer, null, () => createSession(Date.now()))
  const [line, setLine] = useState<DialogueLine>(() => lineFor('welcome', player.name))
  const [confirmQuit, setConfirmQuit] = useState(false)
  const now = useNow(state.finishedAt === null)
  const lastIndex = useRef(0)
  const visible = usePageVisible()
  const paused = confirmQuit || !visible

  const question = QUESTIONS[state.index]
  const answer = state.answers.find((a) => a.questionId === question.id)
  const isLast = state.index === QUESTIONS.length - 1
  const elapsed = (state.finishedAt ?? now) - state.startedAt
  const limit = limitMs(question, player.timeMode)

  const say = useCallback((event: DialogueEvent) => setLine(lineFor(event, player.name)), [player.name])

  // Comentario del presentador al cambiar de pregunta.
  useEffect(() => {
    if (state.index === lastIndex.current) return
    const prev = QUESTIONS[lastIndex.current]
    lastIndex.current = state.index
    const q = QUESTIONS[state.index]
    if (q.stage !== prev.stage) say(`stage${q.stage}` as DialogueEvent)
    else say('question')
  }, [state.index, say])

  // Tras la bienvenida, presenta la etapa 1.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setLine((l) => (l.text.startsWith('¡Bienvenido') ? lineFor('stage1', player.name) : l))
    }, 5200)
    return () => window.clearTimeout(id)
  }, [player.name])

  const registerAnswer = (correct: boolean, timedOut: boolean, choiceId?: string) => {
    if (answer) return
    const t = Date.now()
    dispatch({ type: 'answer', questionId: question.id, correct, choiceId: choiceId ?? undefined, timedOut, now: t })
    const prevAnswers = state.answers
    const streak = correct && prevAnswers.length >= 2 && prevAnswers.slice(-2).every((a) => a.correct)
    if (timedOut && !correct) {
      sound.play('timeout')
      say(question.kind === 'build' ? 'buildTimeout' : 'timeout')
    } else if (correct) {
      sound.play(question.kind === 'build' ? 'point' : 'correct')
      window.setTimeout(() => sound.play('point'), 260)
      if (streak) say('streak')
      else say(question.kind === 'build' ? 'buildCorrect' : 'correct')
    } else {
      sound.play('wrong')
      say(question.kind === 'build' ? 'buildIncorrect' : 'incorrect')
    }
  }

  const next = () => {
    if (!answer) return
    if (isLast) {
      sound.play('finish')
      onFinish(toResult(state, QUESTIONS.length))
      return
    }
    dispatch({ type: 'next', now: Date.now() })
  }

  const hostEvent = useCallback((event: BuildHostEvent) => say(event), [say])
  const hurry = useCallback(() => say('hurry'), [say])

  return (
    <main className={styles.screen}>
      <Hud
        questions={QUESTIONS}
        answers={state.answers}
        index={state.index}
        orientation={orientation}
        rect={layout.hud}
        onMenu={() => setConfirmQuit(true)}
      />
      <div style={rectStyle(layout.card)} className={styles.slot}>
        <PlayerCard name={player.name} answers={state.answers} elapsed={elapsed} total={QUESTIONS.length} orientation={orientation} />
      </div>
      <div style={rectStyle(layout.stages)} className={styles.slot}>
        <StagesPanel questions={QUESTIONS} answers={state.answers} currentStage={question.stage} compact={orientation === 'portrait'} />
      </div>

      <Whiteboard
        variant={orientation}
        style={rectStyle(layout.board)}
        label={`Pregunta ${state.index + 1} de ${QUESTIONS.length}`}
      >
        <div key={question.id} className={styles.wipe}>
          {question.kind === 'build' ? (
            <BuildBoard
              question={question}
              answer={answer}
              orientation={orientation}
              isLast={isLast}
              limitMs={limit}
              paused={paused}
              onAnswer={(correct, timedOut) => registerAnswer(correct, timedOut)}
              onNext={next}
              onHost={hostEvent}
            />
          ) : (
            <ChoiceBoard
              question={question}
              answer={answer}
              orientation={orientation}
              isLast={isLast}
              limitMs={limit}
              paused={paused}
              onAnswer={(choiceId, correct, timedOut) => registerAnswer(correct, timedOut, choiceId ?? undefined)}
              onNext={next}
              onHurry={hurry}
            />
          )}
        </div>
      </Whiteboard>

      <div className={styles.avatar} style={rectStyle(layout.avatar)}>
        <StudentAvatar
          size={layout.avatar.w}
          photo={player.pixelStyle ? player.photoPixel : player.photo}
          pixel={player.pixelStyle}
          label={`Avatar de ${player.name}`}
        />
      </div>

      <Host line={line} bubble={layout.bubble} scientist={layout.scientist} tail={layout.tail} />

      {confirmQuit ? (
        <Dialog
          title="¿Salir de la partida?"
          onCancel={() => setConfirmQuit(false)}
          actions={
            <>
              <PixelButton variant="wood" onClick={() => setConfirmQuit(false)}>
                Seguir jugando
              </PixelButton>
              <PixelButton variant="danger" onClick={onQuit}>
                Salir al menú
              </PixelButton>
            </>
          }
        >
          Si sales ahora se perderá el progreso de esta partida.
        </Dialog>
      ) : null}
    </main>
  )
}
