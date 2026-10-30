const ICONS = {
  speaker: ['...#.....', '..##..#..', '####...#.', '####.#.#.', '####.#.#.', '####...#.', '..##..#..', '...#.....'],
  speakerOff: ['...#.....', '..##.....', '####.#.#.', '####..#..', '####.#.#.', '####.....', '..##.....', '...#.....'],
  note: ['...####.', '...#..#.', '...#..#.', '...#..#.', '.###.##.', '########', '.##..##.'],
  noteOff: ['#..####.', '.#.#..#.', '..##..#.', '...##.#.', '.###.##.', '####.###', '.##..##.#'],
  check: ['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....'],
  cross: ['#....#', '##..##', '.####.', '..##..', '.####.', '##..##', '#....#'],
  camera: ['..###...', '########', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '########'],
  upload: ['...##...', '..####..', '.######.', '...##...', '...##...', '#..##..#', '#......#', '########'],
  next: ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  back: ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  sparkle: ['..#..', '..#..', '#####', '..#..', '..#..'],
  menu: ['######', '......', '######', '......', '######'],
  clock: ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'],
} as const

export type IconName = keyof typeof ICONS

interface Props {
  name: IconName
  /** Tamaño de cada celda en px. */
  cell?: number
  className?: string
  title?: string
}

/** Iconos pixel dibujados con rectángulos nítidos a partir de una rejilla. */
export function PixelIcon({ name, cell = 3, className, title }: Props) {
  const rows = ICONS[name]
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const rects: { x: number; y: number; len: number }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x] === '#') {
        let len = 1
        while (row[x + len] === '#') len++
        rects.push({ x, y, len })
        x += len
      } else x++
    }
  })
  return (
    <svg
      className={className}
      width={w * cell}
      height={h * cell}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.len} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}
