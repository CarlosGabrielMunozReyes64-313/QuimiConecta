import type { ReactNode } from 'react'
import labBackground from '../../assets/sprites/lab-background.png'
import type { StageFit } from '../../hooks/useStageLayout'
import styles from './Stage.module.css'

/** Lienzo virtual escalado a la ventana, con el laboratorio pixelado de fondo. */
export function Stage({ fit, children }: { fit: StageFit; children: ReactNode }) {
  const { layout, scale, orientation } = fit
  return (
    <div className={styles.viewport}>
      <img src={labBackground} alt="" className={`${styles.backdrop} pixelated`} aria-hidden="true" />
      <div className={styles.frame} style={{ width: layout.width * scale, height: layout.height * scale }}>
        <div
          className={`${styles.stage} ${styles[orientation]}`}
          style={{
            width: layout.width,
            height: layout.height,
            transform: `scale(${scale})`,
            ['--ts' as string]: orientation === 'portrait' ? 1.35 : 1,
          }}
        >
          <img src={labBackground} alt="" className={`${styles.background} pixelated`} aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  )
}
