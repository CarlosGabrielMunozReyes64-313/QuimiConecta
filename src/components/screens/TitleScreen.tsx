import { sound } from '../../audio/sound'
import type { StageFit } from '../../hooks/useStageLayout'
import { WalkingScientist } from '../characters/WalkingScientist'
import { Whiteboard } from '../board/Whiteboard'
import { AtomGlyph } from '../chem/AtomGlyph'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import { SoundToggles } from '../ui/SoundToggles'
import styles from './TitleScreen.module.css'

interface Props {
  fit: StageFit
  onStart: () => void
  onInstructions: () => void
}

/** Pantalla de bienvenida. */
export function TitleScreen({ fit, onStart, onInstructions }: Props) {
  const { layout, orientation } = fit
  const board = { w: 688, h: 480 }
  const x = (layout.width - board.w) / 2
  const y = orientation === 'portrait' ? 260 : 96
  return (
    <main className={styles.screen}>
      <div className={styles.sound}>
        <SoundToggles />
      </div>
      <Whiteboard variant="menu" style={{ left: x, top: y, width: board.w, height: board.h }} label="Menú principal">
        <div className={styles.content}>
          <div className={styles.mark} aria-hidden="true">
            <AtomGlyph element="H" diameter={40} />
            <span className={styles.stick} />
            <AtomGlyph element="O" diameter={52} />
            <span className={styles.stick} />
            <AtomGlyph element="H" diameter={40} />
          </div>
          <h1 className={styles.logo}>QuimiConecta</h1>
          <p className={styles.subtitle}>El concurso de estructuras de Lewis y enlaces químicos</p>
          <div className={styles.actions}>
            <PixelButton
              size="lg"
              onClick={() => {
                sound.unlock()
                onStart()
              }}
              icon={<PixelIcon name="next" cell={4} />}
            >
              Iniciar partida
            </PixelButton>
            <PixelButton size="lg" variant="wood" onClick={onInstructions}>
              Instrucciones
            </PixelButton>
          </div>
          <p className={styles.meta}>9 preguntas en 3 etapas. Calificación de S a F.</p>
        </div>
      </Whiteboard>
      <div className={styles.floor} style={{ width: layout.width }}>
        <WalkingScientist width={layout.width} scale={4} />
      </div>
    </main>
  )
}
