import { describe, expect, it } from 'vitest'
import { MOLECULES, shellTarget, VALENCE_ELECTRONS } from '../game/molecular/molecules'
import { QUESTIONS } from '../game/questions/bank'

describe('banco de preguntas', () => {
  it('tiene exactamente nueve preguntas en tres etapas y en orden', () => {
    expect(QUESTIONS).toHaveLength(9)
    expect(QUESTIONS.map((q) => q.stage)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3])
    expect(QUESTIONS.map((q) => q.kind)).toEqual(['choice', 'choice', 'choice', 'build', 'build', 'build', 'formula', 'formula', 'formula'])
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(9)
  })

  it('las preguntas de opción tienen cuatro opciones y una correcta válida', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'build') continue
      expect(q.options).toHaveLength(4)
      expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true)
      expect(new Set(q.options.map((o) => o.text)).size).toBe(4)
    }
  })

  it('la etapa 2 pide H₂O, CO₂ y NH₃ con piezas suficientes', () => {
    const builds = QUESTIONS.filter((q) => q.kind === 'build')
    expect(builds.map((q) => q.moleculeId)).toEqual(['H2O', 'CO2', 'NH3'])
    for (const q of builds) {
      const spec = MOLECULES[q.moleculeId]
      expect([...q.pieces.atoms].sort()).toEqual(spec.atoms.map((a) => a.element).sort())
      for (const order of [1, 2, 3] as const) {
        const need = spec.bonds.filter((b) => b.order === order).length
        expect(q.pieces.bonds.filter((b) => b === order).length).toBeGreaterThanOrEqual(need)
      }
      const pairs = Object.values(spec.lonePairs).reduce((s, n) => s + n, 0)
      if (q.requireLonePairs) expect(q.pieces.lonePairs).toBeGreaterThanOrEqual(pairs)
    }
  })

  it('cada molécula cumple octeto y dueto y conserva sus electrones de valencia', () => {
    for (const spec of Object.values(MOLECULES)) {
      let valence = 0
      for (const atom of spec.atoms) {
        const bondSum = spec.bonds.filter((b) => b.a === atom.id || b.b === atom.id).reduce((s, b) => s + b.order, 0)
        const pairs = spec.lonePairs[atom.id] ?? 0
        expect(2 * bondSum + 2 * pairs, `${spec.id} ${atom.id}`).toBe(shellTarget(atom.element))
        valence += VALENCE_ELECTRONS[atom.element]
      }
      const drawn = spec.bonds.reduce((s, b) => s + 2 * b.order, 0) + 2 * Object.values(spec.lonePairs).reduce((s, n) => s + n, 0)
      expect(drawn, spec.id).toBe(valence)
      const drawnPairs = Object.values(spec.drawing.pairAngles).reduce((s, a) => s + a.length, 0)
      expect(drawnPairs).toBe(Object.values(spec.lonePairs).reduce((s, n) => s + n, 0))
    }
  })

  it('la fórmula correcta de la etapa 3 coincide con la molécula dibujada', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'formula') continue
      const correct = q.options.find((o) => o.id === q.correctOptionId)
      expect(correct?.text).toBe(MOLECULES[q.moleculeId].formula)
    }
  })
})
