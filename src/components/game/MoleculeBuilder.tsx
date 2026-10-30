import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { sound } from '../../audio/sound'
import { BOND_NAMES, ELEMENT_NAMES } from '../../game/molecular/molecules'
import type { ValidationResult } from '../../game/molecular/validate'
import { ATOM_RADIUS, BOND_PIECE, MoleculeWorld, PAIR_PIECE, type WorldEvent } from '../../game/physics/MoleculeWorld'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { BuildPieces } from '../../types/game'
import { AtomGlyph } from '../chem/AtomGlyph'
import { ringPath } from '../chem/pixelCircle'
import styles from './MoleculeBuilder.module.css'

interface Props {
  pieces: BuildPieces
  /** Factor de ampliación visual del área (las coordenadas físicas se dividen por él). */
  zoom: number
  locked: boolean
  marks: ValidationResult | null
  onReady: (world: MoleculeWorld | null) => void
  onEvent: (e: WorldEvent) => void
  onActivity: () => void
}

type Selection = { id: string; kind: 'bond' | 'pair' | 'atom'; first: string | null }

interface Refs {
  pieces: Map<string, HTMLElement>
  lines: Map<string, SVGLineElement[]>
  hits: Map<string, HTMLElement>
}

const RING_CELLS = 18
const RING_PX = RING_CELLS * 4

/** Escribe en el DOM las posiciones actuales de los cuerpos de Matter.js. */
function paint(world: MoleculeWorld, refs: Refs) {
  for (const e of world.all()) {
    // Posiciones redondeadas a píxeles enteros: nítido y sin temblores subpíxel.
    const x = Math.round(e.body.position.x)
    const y = Math.round(e.body.position.y)
    if (e.kind === 'atom') {
      const el = refs.pieces.get(e.id)
      if (el) el.style.transform = `translate(${x - ATOM_RADIUS}px, ${y - ATOM_RADIUS}px)`
    } else if (e.kind === 'bond') {
      if (e.link) {
        const A = world.get(e.link.a)?.body.position
        const B = world.get(e.link.b)?.body.position
        if (!A || !B) continue
        const dx = B.x - A.x
        const dy = B.y - A.y
        const len = Math.max(1, Math.hypot(dx, dy))
        const ux = dx / len
        const uy = dy / len
        const nx = -uy
        const ny = ux
        const clear = ATOM_RADIUS + 3
        const offsets = e.order === 1 ? [0] : e.order === 2 ? [-6, 6] : [-9, 0, 9]
        const ls = refs.lines.get(e.id) ?? []
        offsets.forEach((o, i) => {
          const line = ls[i]
          if (!line) return
          line.setAttribute('x1', String(Math.round(A.x + ux * clear + nx * o)))
          line.setAttribute('y1', String(Math.round(A.y + uy * clear + ny * o)))
          line.setAttribute('x2', String(Math.round(B.x - ux * clear + nx * o)))
          line.setAttribute('y2', String(Math.round(B.y - uy * clear + ny * o)))
        })
        const hit = refs.hits.get(e.id)
        if (hit) {
          const w = Math.max(28, len - ATOM_RADIUS * 2 - 4)
          hit.style.width = `${w}px`
          hit.style.transform = `translate(${(A.x + B.x) / 2 - w / 2}px, ${(A.y + B.y) / 2 - 16}px) rotate(${Math.atan2(dy, dx)}rad)`
        }
      } else {
        const el = refs.pieces.get(e.id)
        if (el) el.style.transform = `translate(${x - BOND_PIECE.w / 2}px, ${y - BOND_PIECE.h / 2}px) rotate(${e.body.angle}rad)`
      }
    } else {
      const el = refs.pieces.get(e.id)
      if (!el) continue
      let angle = 0
      if (e.host) {
        const a = world.get(e.host.atomId)?.body.position
        if (a) angle = Math.atan2(y - a.y, x - a.x) + Math.PI / 2
      }
      el.style.transform = `translate(${x - PAIR_PIECE.w / 2}px, ${y - PAIR_PIECE.h / 2}px) rotate(${angle}rad)`
    }
  }
}

/**
 * Rompecabezas de construcción molecular. Crea el mundo de Matter.js al medir
 * su área y lo destruye al desmontarse (sin fugas de memoria ni de eventos).
 */
export function MoleculeBuilder({ pieces, zoom, locked, marks, onReady, onEvent, onActivity }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [world, setWorld] = useState<MoleculeWorld | null>(null)
  const [message, setMessage] = useState<{ text: string; id: number; alert: boolean } | null>(null)
  const reduced = useReducedMotion()
  const callbacks = useRef({ onReady, onEvent, onActivity, reduced, zoom })

  useEffect(() => {
    callbacks.current = { onReady, onEvent, onActivity, reduced, zoom }
  })

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const z = callbacks.current.zoom
    const w = new MoleculeWorld({
      width: el.offsetWidth / z,
      height: el.offsetHeight / z,
      pieces,
      reducedMotion: callbacks.current.reduced,
      onEvent: (e) => {
        if (e.type === 'reject') {
          sound.play('reject')
          setMessage({ text: e.reason, id: Date.now(), alert: true })
        } else if (e.type === 'connect') {
          const bond = w.get(e.bondId)
          const order = bond && bond.kind === 'bond' ? bond.order : 1
          setMessage({ text: `Enlace ${BOND_NAMES[order]} entre ${w.label(e.a)} y ${w.label(e.b)}.`, id: Date.now(), alert: false })
        } else if (e.type === 'pair') {
          setMessage({ text: `Par de electrones colocado en ${w.label(e.atomId)}.`, id: Date.now(), alert: false })
        }
        callbacks.current.onEvent(e)
      },
    })
    setWorld(w)
    callbacks.current.onReady(w)
    const ro = new ResizeObserver(() => w.resize(el.offsetWidth / z, el.offsetHeight / z))
    ro.observe(el)
    return () => {
      ro.disconnect()
      callbacks.current.onReady(null)
      w.destroy()
      setWorld(null)
    }
    // El mundo solo se recrea si cambian las piezas (otra pregunta).
  }, [pieces])

  useEffect(() => {
    world?.setLocked(locked)
  }, [world, locked])

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), 3600)
    return () => window.clearTimeout(id)
  }, [message])

  return (
    <div ref={hostRef} className={styles.area}>
      {world ? (
        <WorldView
          world={world}
          locked={locked}
          marks={marks}
          message={message?.text ?? null}
          alert={message?.alert ?? false}
          zoom={zoom}
          onActivity={() => callbacks.current.onActivity()}
        />
      ) : null}
    </div>
  )
}

interface ViewProps {
  world: MoleculeWorld
  locked: boolean
  marks: ValidationResult | null
  message: string | null
  alert: boolean
  zoom: number
  onActivity: () => void
}

function WorldView({ world, locked, marks, message, alert, zoom, onActivity }: ViewProps) {
  const snap = useSyncExternalStore(world.subscribe, world.getSnapshot)
  const rootRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Refs>({ pieces: new Map(), lines: new Map(), hits: new Map() })
  const pointer = useRef<{ id: string; pointerId: number; sx: number; sy: number; moved: boolean; grabbed: boolean } | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)

  // Bucle de simulación y pintado.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (t: number) => {
      world.step(t - last)
      last = t
      paint(world, refs.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [world])

  // Pinta antes de mostrar los elementos recién montados (evita parpadeos).
  useLayoutEffect(() => {
    paint(world, refs.current)
  }, [world, snap])

  const bondById = new Map(snap.bonds.map((b) => [b.id, b]))
  const pairById = new Map(snap.pairs.map((p) => [p.id, p]))

  // La selección deja de valer si la pieza ya se colocó o si el tablero está bloqueado.
  const active: Selection | null =
    !locked &&
    selection &&
    ((selection.kind === 'bond' && bondById.get(selection.id)?.link === null) ||
      (selection.kind === 'pair' && pairById.get(selection.id)?.host === null) ||
      selection.kind === 'atom')
      ? selection
      : null

  const toWorld = (clientX: number, clientY: number) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return { x: 0, y: 0 }
    return { x: ((clientX - r.left) * world.width) / r.width, y: ((clientY - r.top) * world.height) / r.height }
  }

  const activate = (id: string) => {
    if (locked) return
    onActivity()
    const bond = bondById.get(id)
    const pair = pairById.get(id)
    if (bond) {
      if (bond.link) {
        world.disconnect(id)
        sound.play('detach')
        return
      }
      sound.play('select')
      setSelection(active?.id === id ? null : { id, kind: 'bond', first: null })
      return
    }
    if (pair) {
      if (pair.host) {
        world.unpair(id)
        sound.play('detach')
        return
      }
      sound.play('select')
      setSelection(active?.id === id ? null : { id, kind: 'pair', first: null })
      return
    }
    // átomo
    if (active?.kind === 'bond') {
      if (!active.first) setSelection({ ...active, first: id })
      else if (active.first === id) setSelection({ ...active, first: null })
      else if (world.connect(active.id, active.first, id)) setSelection(null)
      sound.play('select')
      return
    }
    if (active?.kind === 'pair') {
      if (world.attachPair(active.id, id)) setSelection(null)
      return
    }
    sound.play('select')
    setSelection(active?.id === id ? null : { id, kind: 'atom', first: null })
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, id: string, attached: boolean) => {
    if (locked || e.button > 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointer.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, grabbed: false }
    if (!attached) {
      world.grab(id, toWorld(e.clientX, e.clientY))
      pointer.current.grabbed = true
    }
    onActivity()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const p = pointer.current
    if (!p || p.pointerId !== e.pointerId) return
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 7) p.moved = true
    if (!p.moved) return
    const pt = toWorld(e.clientX, e.clientY)
    if (!p.grabbed) {
      world.grab(p.id, pt)
      p.grabbed = true
      sound.play('detach')
    }
    world.moveGrab(pt)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const p = pointer.current
    if (!p || p.pointerId !== e.pointerId) return
    pointer.current = null
    if (!p.moved) {
      if (p.grabbed) world.release(false)
      activate(p.id)
    } else {
      world.release(true)
    }
  }

  const onPointerCancel = () => {
    if (pointer.current?.grabbed) world.release(false)
    pointer.current = null
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>, id: string, isAtom: boolean) => {
    if (locked) return
    const step = e.shiftKey ? 36 : 12
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[e.key]) {
      e.preventDefault()
      world.nudge(id, ...moves[e.key])
      onActivity()
    } else if (e.key === 'Escape') {
      setSelection(null)
    } else if (isAtom && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      world.clearAtom(id)
      sound.play('detach')
    }
  }

  // Los clics de teclado (Enter/Espacio) llegan con detail = 0; los de puntero ya se gestionaron.
  const onClick = (e: ReactMouseEvent<HTMLElement>, id: string) => {
    if (e.detail === 0) activate(id)
  }

  const pointerProps = (id: string, attached: boolean, isAtom = false) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => onPointerDown(e, id, attached),
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: onPointerCancel,
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => onKeyDown(e, id, isAtom),
    onClick: (e: ReactMouseEvent<HTMLElement>) => onClick(e, id),
  })

  const setPieceRef = (id: string) => (node: HTMLElement | null) => {
    if (node) refs.current.pieces.set(id, node)
    else refs.current.pieces.delete(id)
  }

  let help = 'Arrastra las piezas. Suelta un enlace entre dos átomos para unirlos y toca un enlace colocado para quitarlo.'
  if (active?.kind === 'bond') {
    const order = bondById.get(active.id)?.order ?? 1
    help = active.first
      ? `Ahora toca el segundo átomo para unirlo con ${world.label(active.first)}.`
      : `Enlace ${BOND_NAMES[order]} seleccionado: toca el primer átomo.`
  } else if (active?.kind === 'pair') help = 'Par de electrones seleccionado: toca el átomo donde va.'
  else if (active?.kind === 'atom') help = 'Átomo seleccionado: muévelo con las flechas. Supr quita sus conexiones.'
  if (message) help = message

  const atomState = (id: string) => {
    if (marks) {
      const m = marks.atomMarks[id]
      if (m === 'error') return 'error'
      if (marks.correct) return 'ok'
    }
    if (snap.preview.includes(id)) return 'preview'
    if (active?.id === id || active?.first === id) return 'selected'
    return null
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.world} ${locked ? styles.locked : ''}`}
      style={zoom !== 1 ? { width: world.width, height: world.height, transform: `scale(${zoom})`, transformOrigin: '0 0', right: 'auto', bottom: 'auto' } : undefined}
    >
      {!locked ? (
        <p className={`${styles.help} ${message && alert ? styles.helpAlert : ''}`} aria-live="polite">
          {help}
        </p>
      ) : null}

      <svg className={styles.lines} width={world.width} height={world.height} aria-hidden="true">
        {snap.bonds
          .filter((b) => b.link)
          .map((b) => {
            const mark = marks?.bondMarks[b.id]
            const color = mark === 'error' ? 'var(--red)' : marks?.correct ? 'var(--green-deep)' : 'var(--ink)'
            return (
              <g key={b.id} stroke={color} strokeWidth={mark === 'error' ? 6 : 4} shapeRendering="crispEdges" strokeLinecap="square">
                {Array.from({ length: b.order }, (_, i) => (
                  <line
                    key={i}
                    ref={(node) => {
                      const list = refs.current.lines.get(b.id) ?? []
                      if (node) list[i] = node
                      refs.current.lines.set(b.id, list)
                    }}
                  />
                ))}
              </g>
            )
          })}
      </svg>

      {snap.bonds
        .filter((b) => b.link)
        .map((b) => (
          <button
            key={`hit-${b.id}`}
            type="button"
            className={`${styles.bondHit} ${marks?.bondMarks[b.id] === 'error' ? styles.bondHitError : ''}`}
            ref={(node) => {
              if (node) refs.current.hits.set(b.id, node)
              else refs.current.hits.delete(b.id)
            }}
            aria-label={`Enlace ${BOND_NAMES[b.order]} entre ${world.label(b.link?.a ?? '')} y ${world.label(b.link?.b ?? '')}. Pulsa para quitarlo.`}
            disabled={locked}
            {...pointerProps(b.id, true)}
          />
        ))}

      {snap.pairs.map((p) => (
        <button
          key={p.id}
          type="button"
          ref={setPieceRef(p.id)}
          className={`${styles.pair} ${p.host ? styles.pairOn : ''} ${active?.id === p.id ? styles.pieceSelected : ''} ${snap.held === p.id ? styles.held : ''}`}
          style={{ width: PAIR_PIECE.w, height: PAIR_PIECE.h }}
          aria-label={p.host ? `Par de electrones en ${world.label(p.host)}. Pulsa para quitarlo.` : 'Par de electrones no compartidos suelto.'}
          aria-pressed={p.host ? undefined : active?.id === p.id}
          disabled={locked}
          {...pointerProps(p.id, p.host !== null)}
        >
          <span className={styles.dot} />
          <span className={styles.dot} />
        </button>
      ))}

      {snap.atoms.map((a, i) => {
        const state = atomState(a.id)
        const e = marks?.counters[a.id]
        return (
          <button
            key={a.id}
            type="button"
            ref={setPieceRef(a.id)}
            className={`${styles.atom} ${snap.held === a.id ? styles.held : ''} ${marks?.correct ? styles.celebrate : ''}`}
            style={{ width: ATOM_RADIUS * 2, height: ATOM_RADIUS * 2, animationDelay: `${i * 80}ms` }}
            aria-label={`Átomo de ${ELEMENT_NAMES[a.element]} (${a.element}). ${a.sides} ${a.sides === 1 ? 'conexión' : 'conexiones'}${a.pairs ? `, ${a.pairs} ${a.pairs === 1 ? 'par libre' : 'pares libres'}` : ''}.`}
            aria-pressed={active?.id === a.id}
            disabled={locked}
            {...pointerProps(a.id, false, true)}
          >
            <AtomGlyph element={a.element} diameter={ATOM_RADIUS * 2} />
            {state ? (
              <svg
                className={`${styles.ring} ${styles[`ring_${state}`]}`}
                width={RING_PX}
                height={RING_PX}
                viewBox={`0 0 ${RING_CELLS} ${RING_CELLS}`}
                shapeRendering="crispEdges"
                aria-hidden="true"
              >
                <path d={ringPath(RING_CELLS)} fill="currentColor" />
              </svg>
            ) : null}
            {state === 'error' && e ? (
              <span className={styles.badge} aria-label={`${e.count} de ${e.target} ${e.unit}`}>
                {e.count}/{e.target}
              </span>
            ) : null}
          </button>
        )
      })}

      {snap.bonds
        .filter((b) => !b.link)
        .map((b) => (
          <button
            key={b.id}
            type="button"
            ref={setPieceRef(b.id)}
            className={`${styles.bond} ${active?.id === b.id ? styles.pieceSelected : ''} ${snap.held === b.id ? styles.held : ''}`}
            style={{ width: BOND_PIECE.w, height: BOND_PIECE.h }}
            aria-label={`Enlace ${BOND_NAMES[b.order]} suelto. Pulsa para seleccionarlo.`}
            aria-pressed={active?.id === b.id}
            disabled={locked}
            {...pointerProps(b.id, false)}
          >
            <span className={`${styles.bars} ${styles[`order${b.order}`]}`}>
              {Array.from({ length: b.order }, (_, i) => (
                <span key={i} className={styles.bar} />
              ))}
            </span>
          </button>
        ))}
    </div>
  )
}
