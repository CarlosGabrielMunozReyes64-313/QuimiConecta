import type { Element } from '../../types/game'
import { ATOM_COLORS } from './atomColors'
import { circleCells } from './pixelCircle'
import styles from './AtomGlyph.module.css'

interface Props {
  element: Element
  /** Diámetro en px; se dibuja con celdas de 4 px. */
  diameter: number
}

/** Átomo pixel con el color CPK de su elemento y su símbolo. */
export function AtomGlyph({ element, diameter }: Props) {
  const cells = Math.round(diameter / 4)
  const c = circleCells(cells)
  const col = ATOM_COLORS[element]
  return (
    <span className={styles.atom} style={{ width: diameter, height: diameter }}>
      <svg width={diameter} height={diameter} viewBox={`0 0 ${cells} ${cells}`} shapeRendering="crispEdges" aria-hidden="true">
        <path d={c.fill} fill={col.fill} />
        <path d={c.light} fill={col.light} />
        <path d={c.shade} fill={col.shade} />
        <path d={c.outline} fill="#001420" />
      </svg>
      <span className={styles.symbol} style={{ color: col.text }}>
        {element}
      </span>
    </span>
  )
}
