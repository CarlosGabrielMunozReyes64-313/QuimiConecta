import { describe, expect, it } from 'vitest'
import { MOLECULES } from '../game/molecular/molecules'
import { validateStructure } from '../game/molecular/validate'
import { ATOM_RADIUS, MoleculeWorld, type WorldEvent } from '../game/physics/MoleculeWorld'
import { QUESTIONS } from '../game/questions/bank'
import type { BuildQuestion } from '../types/game'

const build = (id: string) => QUESTIONS.find((q) => q.id === id) as BuildQuestion

function run(world: MoleculeWorld, frames: number) {
  for (let i = 0; i < frames; i++) world.step(1000 / 60)
}

describe('mundo físico (Matter.js)', () => {
  it('crea las piezas de la pregunta y las deja dentro del área', () => {
    const q = build('q4')
    const world = new MoleculeWorld({ width: 736, height: 300, pieces: q.pieces, reducedMotion: false })
    expect(world.atoms()).toHaveLength(3)
    expect(world.bonds()).toHaveLength(3)
    expect(world.pairs()).toHaveLength(3)
    run(world, 120)
    for (const e of world.all()) {
      expect(Number.isFinite(e.body.position.x)).toBe(true)
      expect(e.body.position.x).toBeGreaterThanOrEqual(0)
      expect(e.body.position.x).toBeLessThanOrEqual(736)
      expect(e.body.position.y).toBeGreaterThanOrEqual(0)
      expect(e.body.position.y).toBeLessThanOrEqual(300)
    }
    world.destroy()
  })

  it('conecta un enlace al arrastrarlo y soltarlo entre dos átomos', () => {
    const events: WorldEvent[] = []
    const world = new MoleculeWorld({ width: 736, height: 300, pieces: build('q4').pieces, reducedMotion: true, onEvent: (e) => events.push(e) })
    const [o, h1] = world.atoms()
    world.nudge(o.id, 300 - o.body.position.x, 120 - o.body.position.y)
    world.nudge(h1.id, 400 - h1.body.position.x, 120 - h1.body.position.y)
    const bond = world.bonds().find((b) => b.order === 1)
    if (!bond) throw new Error('sin enlace sencillo')
    expect(world.grab(bond.id, bond.body.position)).toBe(true)
    world.moveGrab({ x: 350, y: 120 })
    run(world, 90)
    world.release(true)
    expect(events.some((e) => e.type === 'connect')).toBe(true)
    expect(world.graph().bonds).toHaveLength(1)
    // el muelle acerca los átomos a la distancia del enlace
    run(world, 120)
    const d = Math.hypot(o.body.position.x - h1.body.position.x, o.body.position.y - h1.body.position.y)
    expect(d).toBeGreaterThan(ATOM_RADIUS * 2)
    expect(d).toBeLessThan(ATOM_RADIUS * 2 + 70)
    world.destroy()
  })

  it('construye H₂O completo y la validación lo acepta', () => {
    const world = new MoleculeWorld({ width: 736, height: 300, pieces: build('q4').pieces, reducedMotion: true })
    const o = world.atoms().find((a) => a.element === 'O')
    const hs = world.atoms().filter((a) => a.element === 'H')
    const singles = world.bonds().filter((b) => b.order === 1)
    const [p1, p2] = world.pairs()
    if (!o || !p1 || !p2) throw new Error('faltan piezas')
    expect(world.connect(singles[0].id, o.id, hs[0].id)).toBe(true)
    expect(world.connect(singles[1].id, o.id, hs[1].id)).toBe(true)
    expect(world.attachPair(p1.id, o.id)).toBe(true)
    expect(world.attachPair(p2.id, o.id)).toBe(true)
    run(world, 240)
    const r = validateStructure(MOLECULES.H2O, world.graph(), { requireLonePairs: true })
    expect(r.correct).toBe(true)
    // la repulsión entre dominios separa los dos hidrógenos alrededor del oxígeno
    const a1 = Math.atan2(hs[0].body.position.y - o.body.position.y, hs[0].body.position.x - o.body.position.x)
    const a2 = Math.atan2(hs[1].body.position.y - o.body.position.y, hs[1].body.position.x - o.body.position.x)
    let diff = Math.abs(a1 - a2)
    if (diff > Math.PI) diff = 2 * Math.PI - diff
    expect(diff).toBeGreaterThan(Math.PI / 3)
    world.destroy()
  })

  it('no permite unir dos veces los mismos átomos ni pasar de 4 conexiones', () => {
    const events: WorldEvent[] = []
    const world = new MoleculeWorld({ width: 736, height: 300, pieces: { atoms: ['C', 'O', 'O'], bonds: [1, 1, 2, 2], lonePairs: 0 }, reducedMotion: true, onEvent: (e) => events.push(e) })
    const c = world.atoms().find((a) => a.element === 'C')
    const [o1] = world.atoms().filter((a) => a.element === 'O')
    const [b1, b2] = world.bonds()
    if (!c || !o1) throw new Error('faltan átomos')
    expect(world.connect(b1.id, c.id, o1.id)).toBe(true)
    expect(world.connect(b2.id, c.id, o1.id)).toBe(false)
    expect(events.at(-1)?.type).toBe('reject')
    world.destroy()
  })

  it('suelta un enlace al desconectarlo y bloquea la edición tras confirmar', () => {
    const world = new MoleculeWorld({ width: 736, height: 300, pieces: build('q6').pieces, reducedMotion: true })
    const n = world.atoms().find((a) => a.element === 'N')
    const h = world.atoms().find((a) => a.element === 'H')
    const bond = world.bonds()[0]
    if (!n || !h) throw new Error('faltan átomos')
    world.connect(bond.id, n.id, h.id)
    world.disconnect(bond.id)
    expect(world.graph().bonds).toHaveLength(0)
    expect(bond.link).toBeNull()
    world.setLocked(true)
    expect(world.connect(bond.id, n.id, h.id)).toBe(false)
    expect(world.grab(n.id, n.body.position)).toBe(false)
    world.setLocked(false)
    world.reset()
    expect(world.graph().bonds).toHaveLength(0)
    world.destroy()
  })
})
