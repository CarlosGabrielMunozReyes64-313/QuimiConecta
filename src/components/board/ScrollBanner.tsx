import type { ReactNode } from 'react'
import styles from './ScrollBanner.module.css'

/** Pergamino del boceto: la pregunta se lee en la parte alta de la pizarra. */
export function ScrollBanner({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`${styles.banner} ${compact ? styles.compact : ''}`}>
      <span className={`${styles.roll} ${styles.left}`} aria-hidden="true" />
      <div className={styles.paper}>{children}</div>
      <span className={`${styles.roll} ${styles.right}`} aria-hidden="true" />
    </div>
  )
}
