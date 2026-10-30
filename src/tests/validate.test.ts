import { describe, expect, it } from 'vitest'
import { MOLECULES } from '../game/molecular/molecules'
import { validateStructure, type BuiltGraph } from '../game/molecular/validate'
import type { BondOrder, Element } from '../types/game'

function graph(atoms: [string, Element, number?][], bonds: [string, string, BondOrder][]): BuiltGraph {
  return {
    atoms: atoms.map(([id, element, lonePairs = 0]) => ({ id, element, lonePairs })),
    bonds: bonds.map(([a, b, order], i) => ({ id: `b${i}`, a, b, order })),
  }
}

const lewis = { requireLonePairs: true }
const skeletal = { requireLonePairs: false }

describe('validación del agua (H₂O)', () => {
  it('acepta H–O–H con dos pares en el oxígeno, sin importar los ids', () => {
    const g = graph(
      [
        ['x', 'H'],
        ['y', 'O', 2],
        ['z', 'H'],
      ],
      [
        ['y', 'x', 1],
        ['z', 'y', 1],
      ],
    )
    const r = validateStructure(MOLECULES.H2O, g, lewis)
    expect(r.correct).toBe(true)
    expect(r.issues).toEqual([])
    expect(r.electrons.y).toEqual({ count: 8, target: 8 })
  })

  it('rechaza la estructura sin pares no compartidos', () => {
    const g = graph(
      [
        ['h1', 'H'],
        ['o', 'O'],
        ['h2', 'H'],
      ],
      [
        ['o', 'h1', 1],
        ['o', 'h2', 1],
      ],
    )
    const r = validateStructure(MOLECULES.H2O, g, lewis)
    expect(r.correct).toBe(false)
    expect(r.atomMarks.o).toBe('error')
    expect(r.issues.join(' ')).toMatch(/2 pares no compartidos/)
  })

  it('detecta que el oxígeno no está en el centro (H–H–O)', () => {
    const g = graph(
      [
        ['h1', 'H'],
        ['o', 'O', 2],
        ['h2', 'H'],
      ],
      [
        ['h1', 'h2', 1],
        ['h2', 'o', 1],
      ],
    )
    const r = validateStructure(MOLECULES.H2O, g, lewis)
    expect(r.correct).toBe(false)
    expect(r.issues.join(' ')).toMatch(/oxígeno \(O\) debe ocupar la posición central/)
    expect(r.issues.join(' ')).toMatch(/dueto/)
  })

  it('marca como incorrecto un enlace doble O=H', () => {
    const g = graph(
      [
        ['h1', 'H'],
        ['o', 'O', 2],
        ['h2', 'H'],
      ],
      [
        ['o', 'h1', 2],
        ['o', 'h2', 1],
      ],
    )
    const r = validateStructure(MOLECULES.H2O, g, lewis)
    expect(r.correct).toBe(false)
    expect(r.bondMarks.b0).toBe('error')
    expect(r.bondMarks.b1).toBe('ok')
  })

  it('avisa de átomos sueltos', () => {
    const g = graph(
      [
        ['h1', 'H'],
        ['o', 'O', 2],
        ['h2', 'H'],
      ],
      [['o', 'h1', 1]],
    )
    const r = validateStructure(MOLECULES.H2O, g, lewis)
    expect(r.correct).toBe(false)
    expect(r.atomMarks.h2).toBe('error')
  })
})

describe('validación del dióxido de carbono (CO₂)', () => {
  it('acepta O=C=O', () => {
    const g = graph(
      [
        ['c', 'C'],
        ['o1', 'O'],
        ['o2', 'O'],
      ],
      [
        ['c', 'o1', 2],
        ['o2', 'c', 2],
      ],
    )
    expect(validateStructure(MOLECULES.CO2, g, skeletal).correct).toBe(true)
  })

  it('rechaza O–C–O con enlaces sencillos', () => {
    const g = graph(
      [
        ['c', 'C'],
        ['o1', 'O'],
        ['o2', 'O'],
      ],
      [
        ['c', 'o1', 1],
        ['c', 'o2', 1],
      ],
    )
    const r = validateStructure(MOLECULES.CO2, g, skeletal)
    expect(r.correct).toBe(false)
    expect(r.issues.filter((i) => i.includes('debería ser doble'))).toEqual(['El enlace entre C y O debería ser doble, no sencillo.'])
    expect(r.counters.c).toEqual({ count: 2, target: 4, unit: 'enlaces' })
  })

  it('rechaza C=O=O (carbono en un extremo)', () => {
    const g = graph(
      [
        ['c', 'C'],
        ['o1', 'O'],
        ['o2', 'O'],
      ],
      [
        ['c', 'o1', 2],
        ['o1', 'o2', 2],
      ],
    )
    const r = validateStructure(MOLECULES.CO2, g, skeletal)
    expect(r.correct).toBe(false)
    expect(r.issues.join(' ')).toMatch(/carbono \(C\) debe ocupar la posición central/)
  })
})

describe('validación del amoníaco (NH₃)', () => {
  const atoms = (pairs: number): [string, Element, number?][] => [
    ['n', 'N', pairs],
    ['a', 'H'],
    ['b', 'H'],
    ['c', 'H'],
  ]
  const bonds: [string, string, BondOrder][] = [
    ['n', 'a', 1],
    ['n', 'b', 1],
    ['c', 'n', 1],
  ]

  it('acepta tres enlaces N–H y un par libre', () => {
    expect(validateStructure(MOLECULES.NH3, graph(atoms(1), bonds), lewis).correct).toBe(true)
  })

  it('rechaza dos pares libres (supera el octeto)', () => {
    const r = validateStructure(MOLECULES.NH3, graph(atoms(2), bonds), lewis)
    expect(r.correct).toBe(false)
    expect(r.electrons.n.count).toBe(10)
    expect(r.issues.join(' ')).toMatch(/supera el octeto/)
  })
})
