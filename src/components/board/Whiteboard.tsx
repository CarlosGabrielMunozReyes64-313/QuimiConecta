import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'
import boardLandscape from '../../assets/sprites/board-landscape.png'
import boardMenu from '../../assets/sprites/board-menu.png'
import boardPortrait from '../../assets/sprites/board-portrait.png'
import boardTall from '../../assets/sprites/board-tall.png'
import { BOARD_FRAME } from '../../game/layout'
import styles from './Whiteboard.module.css'

export type BoardVariant = 'landscape' | 'portrait' | 'menu' | 'tall'

const IMAGES: Record<BoardVariant, string> = {
  landscape: boardLandscape,
  portrait: boardPortrait,
  menu: boardMenu,
  tall: boardTall,
}

interface Props {
  variant: BoardVariant
  style?: CSSProperties
  className?: string
  children: ReactNode
  label?: string
}

/** La pizarra original, recompuesta sin estirar el marco, como tablero de juego. */
export function Whiteboard({ variant, style, className, children, label }: Props) {
  return (
    <section
      className={[styles.board, 'pixelated', className].filter(Boolean).join(' ')}
      style={{
        ...style,
        backgroundImage: `url(${IMAGES[variant]})`,
        paddingLeft: BOARD_FRAME.left + 12,
        paddingTop: BOARD_FRAME.top + 10,
        paddingRight: BOARD_FRAME.right + 12,
        paddingBottom: BOARD_FRAME.bottom + 10,
      }}
      aria-label={label}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  )
}
