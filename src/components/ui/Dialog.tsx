import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

interface Props {
  title: string
  children: ReactNode
  actions: ReactNode
  onCancel: () => void
}

/** Ventana modal pixel. Esc la cierra y el foco entra en el primer botón. */
export function Dialog({ title, children, actions, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onCancel])
  return (
    <div className={styles.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} className={`${styles.dialog} px-panel`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  )
}
