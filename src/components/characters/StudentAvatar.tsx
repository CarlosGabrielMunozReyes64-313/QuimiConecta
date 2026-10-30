import type { ReactNode } from 'react'
import messenger from '../../assets/sprites/messenger.png'
import gloss from '../../assets/sprites/messenger-gloss.png'
import ring from '../../assets/sprites/messenger-ring.png'
import { HOLE_BOX, MESSENGER_BLOCK, MESSENGER_SIZE } from '../../game/avatarGeometry'
import { holeMaskUrl } from '../../game/photo'
import styles from './StudentAvatar.module.css'

interface Props {
  size: number
  photo?: string | null
  /** Vídeo en directo u otro contenido que se dibuja dentro del círculo. */
  live?: ReactNode
  pixel?: boolean
  label?: string
}

const pct = (v: number) => `${(v / MESSENGER_SIZE) * 100}%`

/**
 * Sprite de Windows Messenger con la foto del estudiante dentro del círculo de la cabeza.
 * Capas: sprite original → foto recortada al hueco interior → brillo → aro original encima.
 */
export function StudentAvatar({ size, photo, live, pixel = true, label }: Props) {
  const hasContent = Boolean(photo || live)
  const mask = hasContent ? holeMaskUrl() : ''
  return (
    <div className={styles.avatar} style={{ width: size, height: size }} role="img" aria-label={label ?? 'Avatar del estudiante'}>
      <img src={messenger} alt="" className={`${styles.layer} pixelated`} draggable={false} />
      {hasContent ? (
        <>
          <div
            className={styles.hole}
            style={{
              left: pct(HOLE_BOX.x * MESSENGER_BLOCK),
              top: pct(HOLE_BOX.y * MESSENGER_BLOCK),
              width: pct(HOLE_BOX.w * MESSENGER_BLOCK),
              height: pct(HOLE_BOX.h * MESSENGER_BLOCK),
              maskImage: `url(${mask})`,
              WebkitMaskImage: `url(${mask})`,
            }}
          >
            {live ?? <img src={photo ?? ''} alt="" className={`${styles.photo} ${pixel ? 'pixelated' : ''}`} draggable={false} />}
          </div>
          <img src={gloss} alt="" className={`${styles.layer} ${styles.gloss} pixelated`} draggable={false} />
          <img src={ring} alt="" className={`${styles.layer} pixelated`} draggable={false} />
        </>
      ) : null}
    </div>
  )
}
