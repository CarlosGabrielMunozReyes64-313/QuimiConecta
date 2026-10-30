import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { sound } from '../../audio/sound'
import styles from './PixelButton.module.css'

type Variant = 'primary' | 'wood' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  /** Sonido al pulsar; false para silenciar. */
  sfx?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function PixelButton({ variant = 'primary', size = 'md', icon, sfx = true, className, children, onClick, type = 'button', ref, ...rest }: Props) {
  return (
    <button
      ref={ref}
      type={type}
      className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (sfx) sound.play('select')
        onClick?.(e)
      }}
      {...rest}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.label}>{children}</span>
    </button>
  )
}
