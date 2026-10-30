import type { MoleculeSpec } from '../../types/game'

interface Props {
  molecule: MoleculeSpec
  width: number
  height: number
  /** Px por unidad del dibujo; se reduce si no cabe. */
  unit?: number
  showPairs?: boolean
  ink?: string
  label?: string
}

const LETTER = 40
const CLEAR = 20

/**
 * Estructura de Lewis dibujada como en la pizarra: símbolos, líneas para los
 * enlaces (1, 2 o 3) y pares de puntos para los electrones no compartidos.
 */
export function StructureDiagram({ molecule, width, height, unit = 92, showPairs = true, ink = '#1d2a5c', label }: Props) {
  const pos = molecule.drawing.positions
  const xs = Object.values(pos).map((p) => p.x)
  const ys = Object.values(pos).map((p) => p.y)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const margin = 56
  const u = Math.min(unit, spanX > 0 ? (width - margin * 2) / spanX : unit, spanY > 0 ? (height - margin * 2) / spanY : unit)
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const P = (id: string) => ({ x: width / 2 + (pos[id].x - cx) * u, y: height / 2 + (pos[id].y - cy) * u })
  const snap = (v: number) => Math.round(v / 2) * 2
  const element = new Map(molecule.atoms.map((a) => [a.id, a.element]))

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? 'Estructura de Lewis'}>
      <g stroke={ink} strokeWidth={4} shapeRendering="crispEdges" strokeLinecap="square">
        {molecule.bonds.map((b) => {
          const A = P(b.a)
          const B = P(b.b)
          const len = Math.hypot(B.x - A.x, B.y - A.y)
          const ux = (B.x - A.x) / len
          const uy = (B.y - A.y) / len
          const nx = -uy
          const ny = ux
          const offsets = b.order === 1 ? [0] : b.order === 2 ? [-6, 6] : [-9, 0, 9]
          return offsets.map((o, i) => (
            <line
              key={`${b.a}-${b.b}-${i}`}
              x1={snap(A.x + ux * CLEAR + nx * o)}
              y1={snap(A.y + uy * CLEAR + ny * o)}
              x2={snap(B.x - ux * CLEAR + nx * o)}
              y2={snap(B.y - uy * CLEAR + ny * o)}
            />
          ))
        })}
      </g>
      {showPairs
        ? Object.entries(molecule.drawing.pairAngles).flatMap(([id, angles]) =>
            angles.map((deg) => {
              const p = P(id)
              const a = (deg * Math.PI) / 180
              const d = 24
              const px = p.x + Math.cos(a) * d
              const py = p.y + Math.sin(a) * d
              const tx = -Math.sin(a) * 7
              const ty = Math.cos(a) * 7
              return (
                <g key={`${id}-${deg}`} fill={ink} shapeRendering="crispEdges">
                  <rect x={snap(px + tx - 3)} y={snap(py + ty - 3)} width={6} height={6} />
                  <rect x={snap(px - tx - 3)} y={snap(py - ty - 3)} width={6} height={6} />
                </g>
              )
            }),
          )
        : null}
      {molecule.atoms.map((a) => {
        const p = P(a.id)
        return (
          <text
            key={a.id}
            x={snap(p.x)}
            y={snap(p.y) + 14}
            textAnchor="middle"
            fontFamily="'Minecraft ES', monospace"
            fontSize={LETTER}
            fill={ink}
          >
            {element.get(a.id)}
          </text>
        )
      })}
    </svg>
  )
}
