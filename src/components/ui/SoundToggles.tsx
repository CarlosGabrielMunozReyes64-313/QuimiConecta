import { sound } from '../../audio/sound'
import { useSoundSettings } from '../../hooks/useSound'
import { PixelIcon } from './PixelIcon'
import styles from './SoundToggles.module.css'

/** Botones para activar o desactivar efectos y música. */
export function SoundToggles() {
  const settings = useSoundSettings()
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={settings.sfx}
        aria-label={settings.sfx ? 'Efectos de sonido activados' : 'Efectos de sonido desactivados'}
        title={settings.sfx ? 'Silenciar efectos' : 'Activar efectos'}
        onClick={() => {
          sound.setSfx(!settings.sfx)
          if (!settings.sfx) sound.play('select')
        }}
      >
        <PixelIcon name={settings.sfx ? 'speaker' : 'speakerOff'} cell={3} />
      </button>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={settings.music}
        aria-label={settings.music ? 'Música activada' : 'Música desactivada'}
        title={settings.music ? 'Apagar música' : 'Encender música'}
        onClick={() => sound.setMusic(!settings.music)}
      >
        <PixelIcon name={settings.music ? 'note' : 'noteOff'} cell={3} />
      </button>
    </div>
  )
}
