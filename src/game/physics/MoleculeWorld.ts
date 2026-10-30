import Matter from 'matter-js'
import type { BondOrder, BuildPieces, Element } from '../../types/game'
import type { BuiltGraph } from '../molecular/validate'

const { Engine, Bodies, Body, Composite, Constraint } = Matter
type MBody = Matter.Body
type MConstraint = Matter.Constraint

/** Radio de los átomos en px del escenario. */
export const ATOM_RADIUS = 26
/** Largo visible de una pieza de enlace suelta. */
export const BOND_PIECE = { w: 64, h: 24 }
export const PAIR_PIECE = { w: 36, h: 24 }
/** Máximo de conexiones (enlaces + pares) por átomo: los 4 lados de Lewis. */
export const MAX_SIDES = 4

const GAP: Record<BondOrder, number> = { 1: 40, 2: 36, 3: 32 }
const PAIR_ORBIT = ATOM_RADIUS + 13
const SNAP_FIRST = ATOM_RADIUS + 42
const SNAP_SECOND = ATOM_RADIUS + 120
const SNAP_PAIR = ATOM_RADIUS + 34
/** Enlace soltado «entre» dos átomos: distancia máxima entre centros y desvío lateral admitido. */
const BETWEEN_MAX = ATOM_RADIUS * 2 + 170
const BETWEEN_PERP = 34
const WALL = 400

export interface AtomEntity {
  id: string
  kind: 'atom'
  element: Element
  body: MBody
}
export interface BondEntity {
  id: string
  kind: 'bond'
  order: BondOrder
  body: MBody
  link: { a: string; b: string; constraint: MConstraint; age: number } | null
}
export interface PairEntity {
  id: string
  kind: 'pair'
  body: MBody
  host: { atomId: string; constraint: MConstraint } | null
}
export type Entity = AtomEntity | BondEntity | PairEntity

export interface WorldSnapshot {
  version: number
  atoms: { id: string; element: Element; sides: number; pairs: number }[]
  bonds: { id: string; order: BondOrder; link: { a: string; b: string } | null }[]
  pairs: { id: string; host: string | null }[]
  /** Átomos resaltados mientras se arrastra una pieza (dónde encajaría). */
  preview: string[]
  held: string | null
}

export type WorldEvent =
  | { type: 'connect'; bondId: string; a: string; b: string }
  | { type: 'disconnect'; bondId: string }
  | { type: 'pair'; pairId: string; atomId: string }
  | { type: 'unpair'; pairId: string }
  | { type: 'reject'; reason: string }

export interface WorldOptions {
  width: number
  height: number
  pieces: BuildPieces
  reducedMotion: boolean
  onEvent?: (e: WorldEvent) => void
}

const ELEMENT_ORDER: Element[] = ['C', 'N', 'O', 'H']

function wrapAngle(a: number) {
  let x = a
  while (x <= -Math.PI) x += Math.PI * 2
  while (x > Math.PI) x -= Math.PI * 2
  return x
}

/**
 * Mundo de Matter.js para construir moléculas. No sabe nada de React: la vista
 * lee posiciones en cada fotograma y se suscribe a los cambios estructurales.
 *
 * - Sin gravedad: es una mesa vista desde arriba con rozamiento con el aire.
 * - Los enlaces conectados son restricciones (muelles) entre dos átomos.
 * - Los pares libres orbitan su átomo y se repelen con los enlaces (idea de VSEPR),
 *   así la estructura se reparte sola como en un dibujo de Lewis.
 */
export class MoleculeWorld {
  readonly engine: Matter.Engine
  width: number
  height: number
  locked = false
  private entities = new Map<string, Entity>()
  private homes = new Map<string, { x: number; y: number }>()
  private walls: MBody[] = []
  private drag: { id: string; constraint: MConstraint; moved: boolean } | null = null
  private listeners = new Set<() => void>()
  private version = 0
  private snapshot: WorldSnapshot
  private onEvent?: (e: WorldEvent) => void

  constructor(opts: WorldOptions) {
    this.width = opts.width
    this.height = opts.height
    this.onEvent = opts.onEvent
    this.engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } })
    this.engine.positionIterations = 8
    this.engine.velocityIterations = 6
    this.engine.constraintIterations = 4
    this.buildWalls()
    this.createPieces(opts.pieces)
    this.placeHome(!opts.reducedMotion)
    this.snapshot = this.buildSnapshot([])
  }

  // ---------------------------------------------------------------- piezas
  private createPieces(pieces: BuildPieces) {
    const atoms = [...pieces.atoms].sort((a, b) => ELEMENT_ORDER.indexOf(a) - ELEMENT_ORDER.indexOf(b))
    const counters = new Map<string, number>()
    const nextId = (prefix: string) => {
      const n = (counters.get(prefix) ?? 0) + 1
      counters.set(prefix, n)
      return `${prefix}${n}`
    }
    for (const element of atoms) {
      const id = nextId(element)
      const body = Bodies.circle(0, 0, ATOM_RADIUS, {
        frictionAir: 0.18,
        friction: 0.02,
        restitution: 0.25,
        density: 0.002,
        inertia: Infinity,
        label: id,
      })
      this.entities.set(id, { id, kind: 'atom', element, body })
    }
    for (const order of pieces.bonds) {
      const id = nextId(`b${order}-`)
      const body = Bodies.rectangle(0, 0, BOND_PIECE.w, BOND_PIECE.h, {
        frictionAir: 0.2,
        restitution: 0.2,
        density: 0.0012,
        chamfer: { radius: 6 },
        label: id,
      })
      this.entities.set(id, { id, kind: 'bond', order, body, link: null })
    }
    for (let i = 0; i < pieces.lonePairs; i++) {
      const id = nextId('p')
      const body = Bodies.rectangle(0, 0, PAIR_PIECE.w, PAIR_PIECE.h, {
        frictionAir: 0.22,
        restitution: 0.2,
        density: 0.0012,
        chamfer: { radius: 6 },
        inertia: Infinity,
        label: id,
      })
      this.entities.set(id, { id, kind: 'pair', body, host: null })
    }
    for (const e of this.entities.values()) Composite.add(this.engine.world, e.body)
  }

  /** Posiciones de la bandeja: una o dos filas en la parte baja del área. */
  private computeHomes() {
    const list = [...this.entities.values()]
    const widthOf = (e: Entity) => (e.kind === 'atom' ? ATOM_RADIUS * 2 + 16 : e.kind === 'bond' ? BOND_PIECE.w + 18 : PAIR_PIECE.w + 16)
    const usable = this.width - 32
    const rows: Entity[][] = [[]]
    let acc = 0
    for (const e of list) {
      const w = widthOf(e)
      if (acc + w > usable && rows[rows.length - 1].length > 0) {
        rows.push([])
        acc = 0
      }
      rows[rows.length - 1].push(e)
      acc += w
    }
    const rowH = ATOM_RADIUS * 2 + 14
    rows.forEach((row, r) => {
      const total = row.reduce((s, e) => s + widthOf(e), 0)
      let x = (this.width - total) / 2
      const y = this.height - 12 - ATOM_RADIUS - (rows.length - 1 - r) * rowH
      for (const e of row) {
        const w = widthOf(e)
        this.homes.set(e.id, { x: x + w / 2, y })
        x += w
      }
    })
  }

  private placeHome(animate: boolean) {
    this.computeHomes()
    let i = 0
    for (const e of this.entities.values()) {
      const home = this.homes.get(e.id) as { x: number; y: number }
      Body.setAngle(e.body, 0)
      if (animate) {
        Body.setPosition(e.body, { x: home.x + (i % 2 ? 6 : -6), y: home.y - 70 - (i % 3) * 18 })
        Body.setVelocity(e.body, { x: 0, y: 7 + (i % 3) })
      } else {
        Body.setPosition(e.body, home)
        Body.setVelocity(e.body, { x: 0, y: 0 })
      }
      i += 1
    }
  }

  private buildWalls() {
    if (this.walls.length) Composite.remove(this.engine.world, this.walls)
    const { width: w, height: h } = this
    const opts = { isStatic: true, label: 'wall', friction: 0, restitution: 0.3 }
    this.walls = [
      Bodies.rectangle(w / 2, -WALL / 2, w + WALL * 2, WALL, opts),
      Bodies.rectangle(w / 2, h + WALL / 2, w + WALL * 2, WALL, opts),
      Bodies.rectangle(-WALL / 2, h / 2, WALL, h + WALL * 2, opts),
      Bodies.rectangle(w + WALL / 2, h / 2, WALL, h + WALL * 2, opts),
    ]
    Composite.add(this.engine.world, this.walls)
  }

  resize(width: number, height: number) {
    if (Math.abs(width - this.width) < 1 && Math.abs(height - this.height) < 1) return
    this.width = width
    this.height = height
    this.buildWalls()
    this.computeHomes()
    for (const e of this.entities.values()) this.clampBody(e.body)
  }

  // ---------------------------------------------------------------- consultas
  get(id: string): Entity | undefined {
    return this.entities.get(id)
  }

  all(): Entity[] {
    return [...this.entities.values()]
  }

  atoms(): AtomEntity[] {
    return this.all().filter((e): e is AtomEntity => e.kind === 'atom')
  }

  bonds(): BondEntity[] {
    return this.all().filter((e): e is BondEntity => e.kind === 'bond')
  }

  pairs(): PairEntity[] {
    return this.all().filter((e): e is PairEntity => e.kind === 'pair')
  }

  sidesUsed(atomId: string): number {
    let n = 0
    for (const b of this.bonds()) if (b.link && (b.link.a === atomId || b.link.b === atomId)) n++
    for (const p of this.pairs()) if (p.host?.atomId === atomId) n++
    return n
  }

  pairsOn(atomId: string): PairEntity[] {
    return this.pairs().filter((p) => p.host?.atomId === atomId)
  }

  neighbors(atomId: string): AtomEntity[] {
    const out: AtomEntity[] = []
    for (const b of this.bonds()) {
      if (!b.link) continue
      const other = b.link.a === atomId ? b.link.b : b.link.b === atomId ? b.link.a : null
      if (other) out.push(this.entities.get(other) as AtomEntity)
    }
    return out
  }

  linked(a: string, b: string): boolean {
    return this.bonds().some((x) => x.link && ((x.link.a === a && x.link.b === b) || (x.link.a === b && x.link.b === a)))
  }

  /** Grafo para la validación química. */
  graph(): BuiltGraph {
    return {
      atoms: this.atoms().map((a) => ({ id: a.id, element: a.element, lonePairs: this.pairsOn(a.id).length })),
      bonds: this.bonds()
        .filter((b) => b.link)
        .map((b) => ({ id: b.id, a: b.link?.a as string, b: b.link?.b as string, order: b.order })),
    }
  }

  label(atomId: string): string {
    const e = this.entities.get(atomId)
    return e && e.kind === 'atom' ? e.element : '?'
  }

  // ---------------------------------------------------------------- suscripción
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSnapshot = () => this.snapshot

  private buildSnapshot(preview: string[]): WorldSnapshot {
    return {
      version: this.version,
      atoms: this.atoms().map((a) => ({ id: a.id, element: a.element, sides: this.sidesUsed(a.id), pairs: this.pairsOn(a.id).length })),
      bonds: this.bonds().map((b) => ({ id: b.id, order: b.order, link: b.link ? { a: b.link.a, b: b.link.b } : null })),
      pairs: this.pairs().map((p) => ({ id: p.id, host: p.host?.atomId ?? null })),
      preview,
      held: this.drag?.id ?? null,
    }
  }

  private bump(preview: string[] = this.snapshot?.preview ?? []) {
    this.version += 1
    this.snapshot = this.buildSnapshot(preview)
    this.listeners.forEach((fn) => fn())
  }

  // ---------------------------------------------------------------- arrastre
  /** Empieza a arrastrar una pieza con un muelle hacia el puntero. */
  grab(id: string, point: { x: number; y: number }) {
    if (this.locked) return false
    const e = this.entities.get(id)
    if (!e) return false
    if (this.drag) this.release()
    if (e.kind === 'bond' && e.link) this.disconnect(id, point)
    if (e.kind === 'pair' && e.host) this.unpair(id, point)
    const body = e.body
    if (e.kind !== 'atom') body.collisionFilter = { ...body.collisionFilter, mask: 0 }
    const constraint = Constraint.create({
      pointA: { x: point.x, y: point.y },
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      length: 0,
      stiffness: 0.22,
      damping: 0.12,
    })
    Composite.add(this.engine.world, constraint)
    this.drag = { id, constraint, moved: false }
    this.bump()
    return true
  }

  moveGrab(point: { x: number; y: number }) {
    if (!this.drag) return
    this.drag.constraint.pointA = { x: Math.max(0, Math.min(this.width, point.x)), y: Math.max(0, Math.min(this.height, point.y)) }
    this.drag.moved = true
  }

  /** Suelta la pieza. Si `snap` es true intenta encajarla. */
  release(snap = true) {
    const drag = this.drag
    if (!drag) return
    Composite.remove(this.engine.world, drag.constraint)
    this.drag = null
    const e = this.entities.get(drag.id)
    if (!e) return
    if (e.kind !== 'atom') e.body.collisionFilter = { ...e.body.collisionFilter, mask: 0xffffffff }
    if (snap && !this.locked) {
      if (e.kind === 'bond') {
        const [a, b] = this.bondTargets(e)
        if (a && b) this.connect(e.id, a, b)
        else if (a) this.onEvent?.({ type: 'reject', reason: 'Un enlace une dos átomos: acerca otro átomo o suelta la pieza entre los dos.' })
      } else if (e.kind === 'pair') {
        const host = this.pairTarget(e)
        if (host) this.attachPair(e.id, host)
      }
    }
    this.bump([])
  }

  heldId() {
    return this.drag?.id ?? null
  }

  /**
   * Átomos donde encajaría un enlace soltado ahora mismo.
   * 1) Si el enlace queda sobre la línea entre dos átomos libres (cerca del centro del
   *    segmento y a una distancia razonable), une esos dos aunque no los toque.
   * 2) Si no, usa el átomo que toca y el siguiente más cercano.
   */
  bondTargets(bond: BondEntity): string[] {
    const c = bond.body.position
    const free = this.atoms().filter((a) => this.sidesUsed(a.id) < MAX_SIDES)
    let best: { a: string; b: string; score: number } | null = null
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const A = free[i].body.position
        const B = free[j].body.position
        const dx = B.x - A.x
        const dy = B.y - A.y
        const len = Math.hypot(dx, dy)
        if (len > BETWEEN_MAX || len < 1 || this.linked(free[i].id, free[j].id)) continue
        const t = ((c.x - A.x) * dx + (c.y - A.y) * dy) / (len * len)
        if (t < 0.2 || t > 0.8) continue
        const perp = Math.abs((c.x - A.x) * dy - (c.y - A.y) * dx) / len
        if (perp > BETWEEN_PERP) continue
        const score = perp + Math.abs(t - 0.5) * 60
        if (!best || score < best.score) best = { a: free[i].id, b: free[j].id, score }
      }
    }
    if (best) return [best.a, best.b]
    const near = free
      .map((a) => ({ a, d: Math.hypot(a.body.position.x - c.x, a.body.position.y - c.y) }))
      .sort((x, y) => x.d - y.d)
    const first = near.find((f) => f.d <= SNAP_FIRST)
    if (!first) return []
    const second = near.find((f) => f.a.id !== first.a.id && f.d <= SNAP_SECOND && !this.linked(first.a.id, f.a.id))
    return second ? [first.a.id, second.a.id] : [first.a.id]
  }

  pairTarget(pair: PairEntity): string | null {
    const c = pair.body.position
    let best: string | null = null
    let bestD = SNAP_PAIR
    for (const a of this.atoms()) {
      if (this.sidesUsed(a.id) >= MAX_SIDES) continue
      const d = Math.hypot(a.body.position.x - c.x, a.body.position.y - c.y)
      if (d <= bestD) {
        bestD = d
        best = a.id
      }
    }
    return best
  }

  // ---------------------------------------------------------------- conexiones
  connect(bondId: string, a: string, b: string): boolean {
    const bond = this.entities.get(bondId)
    const A = this.entities.get(a)
    const B = this.entities.get(b)
    if (this.locked || !bond || bond.kind !== 'bond' || !A || !B || A.kind !== 'atom' || B.kind !== 'atom' || a === b) return false
    if (bond.link) this.disconnect(bondId)
    if (this.linked(a, b)) {
      this.onEvent?.({ type: 'reject', reason: `Ese ${A.element} y ese ${B.element} ya están unidos. Quita su enlace si quieres cambiarlo.` })
      return false
    }
    for (const atom of [A, B]) {
      if (this.sidesUsed(atom.id) >= MAX_SIDES) {
        this.onEvent?.({ type: 'reject', reason: `Ese ${atom.element} ya no tiene lados libres: un átomo admite como máximo 4 conexiones.` })
        return false
      }
    }
    Composite.remove(this.engine.world, bond.body)
    const constraint = Constraint.create({
      bodyA: A.body,
      bodyB: B.body,
      length: ATOM_RADIUS * 2 + GAP[bond.order],
      stiffness: 0.08,
      damping: 0.12,
    })
    Composite.add(this.engine.world, constraint)
    bond.link = { a, b, constraint, age: 0 }
    this.bump()
    this.onEvent?.({ type: 'connect', bondId, a, b })
    return true
  }

  disconnect(bondId: string, at?: { x: number; y: number }) {
    const bond = this.entities.get(bondId)
    if (!bond || bond.kind !== 'bond' || !bond.link) return
    const A = this.entities.get(bond.link.a) as AtomEntity
    const B = this.entities.get(bond.link.b) as AtomEntity
    Composite.remove(this.engine.world, bond.link.constraint)
    bond.link = null
    const mid = at ?? { x: (A.body.position.x + B.body.position.x) / 2, y: (A.body.position.y + B.body.position.y) / 2 }
    const angle = Math.atan2(B.body.position.y - A.body.position.y, B.body.position.x - A.body.position.x)
    Body.setPosition(bond.body, mid)
    Body.setAngle(bond.body, angle)
    Body.setVelocity(bond.body, { x: Math.cos(angle + Math.PI / 2) * 3, y: Math.sin(angle + Math.PI / 2) * 3 })
    Body.setAngularVelocity(bond.body, 0)
    Composite.add(this.engine.world, bond.body)
    // separa un poco los átomos para que se note el cambio
    Body.setVelocity(A.body, { x: -Math.cos(angle) * 2, y: -Math.sin(angle) * 2 })
    Body.setVelocity(B.body, { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 })
    this.bump()
    this.onEvent?.({ type: 'disconnect', bondId })
  }

  /** Ángulo libre más amplio alrededor de un átomo. */
  private freeAngle(atomId: string, ignore?: string): number {
    const atom = this.entities.get(atomId) as AtomEntity
    const p = atom.body.position
    const angles: number[] = []
    for (const n of this.neighbors(atomId)) angles.push(Math.atan2(n.body.position.y - p.y, n.body.position.x - p.x))
    for (const pr of this.pairsOn(atomId)) {
      if (pr.id === ignore) continue
      angles.push(Math.atan2(pr.body.position.y - p.y, pr.body.position.x - p.x))
    }
    if (angles.length === 0) return -Math.PI / 2
    angles.sort((x, y) => x - y)
    let bestGap = -1
    let best = -Math.PI / 2
    for (let i = 0; i < angles.length; i++) {
      const cur = angles[i]
      const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1]
      const gap = next - cur
      if (gap > bestGap) {
        bestGap = gap
        best = cur + gap / 2
      }
    }
    return best
  }

  attachPair(pairId: string, atomId: string): boolean {
    const pair = this.entities.get(pairId)
    const atom = this.entities.get(atomId)
    if (this.locked || !pair || pair.kind !== 'pair' || !atom || atom.kind !== 'atom') return false
    if (pair.host) this.unpair(pairId)
    if (this.sidesUsed(atomId) >= MAX_SIDES) {
      this.onEvent?.({ type: 'reject', reason: `Ese ${atom.element} ya no tiene lados libres: un átomo admite como máximo 4 conexiones.` })
      return false
    }
    const angle = this.freeAngle(atomId)
    const p = atom.body.position
    Body.setPosition(pair.body, { x: p.x + Math.cos(angle) * PAIR_ORBIT, y: p.y + Math.sin(angle) * PAIR_ORBIT })
    Body.setVelocity(pair.body, { x: 0, y: 0 })
    pair.body.collisionFilter = { ...pair.body.collisionFilter, mask: 0 }
    const constraint = Constraint.create({ bodyA: atom.body, bodyB: pair.body, length: PAIR_ORBIT, stiffness: 0.6, damping: 0.2 })
    Composite.add(this.engine.world, constraint)
    pair.host = { atomId, constraint }
    this.bump()
    this.onEvent?.({ type: 'pair', pairId, atomId })
    return true
  }

  unpair(pairId: string, at?: { x: number; y: number }) {
    const pair = this.entities.get(pairId)
    if (!pair || pair.kind !== 'pair' || !pair.host) return
    const atom = this.entities.get(pair.host.atomId) as AtomEntity
    Composite.remove(this.engine.world, pair.host.constraint)
    pair.host = null
    pair.body.collisionFilter = { ...pair.body.collisionFilter, mask: 0xffffffff }
    const p = atom.body.position
    const q = pair.body.position
    const angle = Math.atan2(q.y - p.y, q.x - p.x)
    Body.setPosition(pair.body, at ?? { x: p.x + Math.cos(angle) * (ATOM_RADIUS + 34), y: p.y + Math.sin(angle) * (ATOM_RADIUS + 34) })
    Body.setVelocity(pair.body, { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 })
    this.clampBody(pair.body)
    this.bump()
    this.onEvent?.({ type: 'unpair', pairId })
  }

  /** Desconecta todo lo unido a un átomo. */
  clearAtom(atomId: string) {
    for (const b of this.bonds()) if (b.link && (b.link.a === atomId || b.link.b === atomId)) this.disconnect(b.id)
    for (const p of this.pairsOn(atomId)) this.unpair(p.id)
  }

  /** Mueve una pieza con el teclado. */
  nudge(id: string, dx: number, dy: number) {
    if (this.locked) return
    const e = this.entities.get(id)
    if (!e) return
    const target = e.kind === 'bond' && e.link ? null : e.body
    if (!target) return
    Body.setPosition(target, { x: target.position.x + dx, y: target.position.y + dy })
    Body.setVelocity(target, { x: 0, y: 0 })
    this.clampBody(target)
  }

  /** Devuelve todas las piezas a la bandeja y deshace todas las conexiones. */
  reset(animate = false) {
    if (this.drag) {
      Composite.remove(this.engine.world, this.drag.constraint)
      this.drag = null
    }
    for (const b of this.bonds()) {
      if (b.link) {
        Composite.remove(this.engine.world, b.link.constraint)
        b.link = null
        Composite.add(this.engine.world, b.body)
      }
    }
    for (const p of this.pairs()) {
      if (p.host) {
        Composite.remove(this.engine.world, p.host.constraint)
        p.host = null
      }
      p.body.collisionFilter = { ...p.body.collisionFilter, mask: 0xffffffff }
    }
    this.placeHome(animate)
    this.bump([])
  }

  setLocked(locked: boolean) {
    if (locked && this.drag) this.release(false)
    this.locked = locked
    this.bump()
  }

  // ---------------------------------------------------------------- simulación
  private clampBody(body: MBody) {
    const m = 8
    const x = Math.max(m, Math.min(this.width - m, body.position.x))
    const y = Math.max(m, Math.min(this.height - m, body.position.y))
    if (x !== body.position.x || y !== body.position.y) Body.setPosition(body, { x, y })
  }

  /**
   * Repulsión angular entre los dominios de cada átomo (enlaces y pares libres).
   * Las fuerzas son tangenciales, con reacción en el átomo central (fuerza neta nula)
   * y escaladas por 1/r (par de torsión nulo): la molécula se reparte sin desplazarse ni girar.
   */
  private applyDomainForces() {
    const K = 0.0007
    const M = 4.25 * 60 // masa de un átomo × radio de referencia
    const heldBody = this.drag ? this.entities.get(this.drag.id)?.body : undefined
    for (const atom of this.atoms()) {
      const p = atom.body.position
      const domains: MBody[] = [...this.neighbors(atom.id).map((n) => n.body), ...this.pairsOn(atom.id).map((x) => x.body)]
      const D = domains.length
      if (D < 2) continue
      const target = (Math.PI * 2) / D
      const angles = domains.map((b) => Math.atan2(b.position.y - p.y, b.position.x - p.x))
      const radii = domains.map((b) => Math.max(20, Math.hypot(b.position.x - p.x, b.position.y - p.y)))
      let rx = 0
      let ry = 0
      for (let i = 0; i < D; i++) {
        for (let j = i + 1; j < D; j++) {
          const delta = wrapAngle(angles[i] - angles[j])
          const abs = Math.abs(delta)
          if (abs >= target * 0.94) continue
          const strength = ((target - abs) / target) * K * M
          const sign = delta >= 0 ? 1 : -1
          for (const [idx, s] of [
            [i, sign],
            [j, -sign],
          ] as const) {
            const body = domains[idx]
            if (body === heldBody) continue
            const th = angles[idx]
            const mag = (strength * s) / radii[idx]
            const fx = -Math.sin(th) * mag
            const fy = Math.cos(th) * mag
            Body.applyForce(body, body.position, { x: fx, y: fy })
            rx -= fx
            ry -= fy
          }
        }
      }
      if (atom.body !== heldBody && (rx !== 0 || ry !== 0)) Body.applyForce(atom.body, p, { x: rx, y: ry })
    }
  }

  /** Avanza la simulación. Devuelve los átomos de vista previa si cambiaron. */
  step(dtMs: number) {
    this.applyDomainForces()
    for (const b of this.bonds()) {
      if (b.link && b.link.age < 40) {
        b.link.age += 1
        b.link.constraint.stiffness = 0.08 + (0.5 - 0.08) * (b.link.age / 40)
      }
    }
    // Subpasos fijos de 16,67 ms (lo recomendado por Matter.js); como máximo 2 por fotograma.
    const total = Math.min(Math.max(dtMs, 0), 1000 / 30)
    const steps = Math.max(1, Math.ceil(total / 16.6))
    if (total >= 1) for (let i = 0; i < steps; i++) Engine.update(this.engine, total / steps)
    for (const e of this.entities.values()) {
      if (e.kind === 'bond' && e.link) continue
      this.clampBody(e.body)
      // Reposo: elimina el arrastre residual para que las piezas queden quietas.
      if (!this.drag && Math.abs(e.body.velocity.x) + Math.abs(e.body.velocity.y) < 0.06 && e.body.angularVelocity * e.body.angularVelocity < 1e-6) {
        Body.setVelocity(e.body, { x: 0, y: 0 })
        Body.setAngularVelocity(e.body, 0)
      }
    }
    // vista previa de encaje
    let preview: string[] = []
    if (this.drag) {
      const e = this.entities.get(this.drag.id)
      if (e?.kind === 'bond') preview = this.bondTargets(e)
      else if (e?.kind === 'pair') {
        const t = this.pairTarget(e)
        preview = t ? [t] : []
      }
    }
    const prev = this.snapshot.preview
    if (preview.length !== prev.length || preview.some((id, i) => prev[i] !== id)) this.bump(preview)
  }

  destroy() {
    Composite.clear(this.engine.world, false, true)
    Engine.clear(this.engine)
    this.listeners.clear()
    this.entities.clear()
    this.onEvent = undefined
  }
}
