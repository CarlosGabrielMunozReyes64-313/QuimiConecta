import type { BondOrder, Element, MoleculeSpec } from '../../types/game'
import { BOND_NAMES, ELEMENT_NAMES, TYPICAL_VALENCE, shellTarget } from './molecules'

/** Estructura que el estudiante ha construido en el tablero. */
export interface BuiltAtom {
  id: string
  element: Element
  lonePairs: number
}

export interface BuiltBond {
  id: string
  a: string
  b: string
  order: BondOrder
}

export interface BuiltGraph {
  atoms: BuiltAtom[]
  bonds: BuiltBond[]
}

export type Mark = 'ok' | 'error'

export interface ValidationResult {
  correct: boolean
  /** Mensajes en orden de prioridad, listos para mostrar. */
  issues: string[]
  atomMarks: Record<string, Mark>
  bondMarks: Record<string, Mark>
  /** Electrones alrededor de cada átomo frente a su objetivo (dueto u octeto). */
  electrons: Record<string, { count: number; target: number }>
  /**
   * Contador que se muestra sobre los átomos con error: electrones (estructura de Lewis)
   * o enlaces (cuando el ejercicio solo pide los enlaces).
   */
  counters: Record<string, { count: number; target: number; unit: 'electrones' | 'enlaces' }>
}

export interface ValidateOptions {
  requireLonePairs: boolean
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()]
  const out: T[][] = []
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const p of permutations(rest)) out.push([item, ...p])
  })
  return out
}

/** Todas las asignaciones átomo construido → átomo objetivo que respetan el elemento. */
function elementPreservingMappings(built: BuiltAtom[], target: MoleculeSpec['atoms']): Map<string, string>[] | null {
  const groups = new Map<Element, { built: string[]; target: string[] }>()
  for (const a of built) {
    const g = groups.get(a.element) ?? { built: [], target: [] }
    g.built.push(a.id)
    groups.set(a.element, g)
  }
  for (const a of target) {
    const g = groups.get(a.element) ?? { built: [], target: [] }
    g.target.push(a.id)
    groups.set(a.element, g)
  }
  for (const g of groups.values()) if (g.built.length !== g.target.length) return null

  let mappings: Map<string, string>[] = [new Map()]
  for (const g of groups.values()) {
    const perms = permutations(g.built)
    const next: Map<string, string>[] = []
    for (const m of mappings) {
      for (const p of perms) {
        const copy = new Map(m)
        p.forEach((builtId, i) => copy.set(builtId, g.target[i]))
        next.push(copy)
      }
    }
    mappings = next
  }
  return mappings
}

const label = (el: Element) => `${el}`
const named = (el: Element) => `el ${ELEMENT_NAMES[el]} (${el})`

function components(graph: BuiltGraph): string[][] {
  const adj = new Map<string, string[]>()
  graph.atoms.forEach((a) => adj.set(a.id, []))
  graph.bonds.forEach((b) => {
    adj.get(b.a)?.push(b.b)
    adj.get(b.b)?.push(b.a)
  })
  const seen = new Set<string>()
  const out: string[][] = []
  for (const a of graph.atoms) {
    if (seen.has(a.id)) continue
    const stack = [a.id]
    const comp: string[] = []
    seen.add(a.id)
    while (stack.length) {
      const id = stack.pop() as string
      comp.push(id)
      for (const n of adj.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
    out.push(comp)
  }
  return out
}

/**
 * Compara la estructura construida con la molécula objetivo.
 * Evalúa conectividad y tipo de enlace (no posiciones en pantalla) y,
 * si se pide la estructura de Lewis completa, los pares no compartidos.
 */
export function validateStructure(spec: MoleculeSpec, graph: BuiltGraph, options: ValidateOptions): ValidationResult {
  const atomById = new Map(graph.atoms.map((a) => [a.id, a]))
  const targetBonds = new Map(spec.bonds.map((b) => [pairKey(b.a, b.b), b.order]))
  const targetElement = new Map(spec.atoms.map((a) => [a.id, a.element]))
  const issues: string[] = []
  const atomMarks: Record<string, Mark> = {}
  const bondMarks: Record<string, Mark> = {}
  const electrons: Record<string, { count: number; target: number }> = {}

  // Electrones alrededor de cada átomo: 2 por cada enlace (según su orden) + 2 por par libre.
  const bondSum = new Map<string, number>()
  graph.atoms.forEach((a) => bondSum.set(a.id, 0))
  graph.bonds.forEach((b) => {
    bondSum.set(b.a, (bondSum.get(b.a) ?? 0) + b.order)
    bondSum.set(b.b, (bondSum.get(b.b) ?? 0) + b.order)
  })
  for (const a of graph.atoms) {
    const pairs = options.requireLonePairs ? a.lonePairs : 0
    electrons[a.id] = { count: 2 * (bondSum.get(a.id) ?? 0) + 2 * pairs, target: shellTarget(a.element) }
    atomMarks[a.id] = 'ok'
  }

  const mappings = elementPreservingMappings(graph.atoms, spec.atoms)
  if (!mappings) {
    graph.atoms.forEach((a) => (atomMarks[a.id] = 'error'))
    graph.bonds.forEach((b) => (bondMarks[b.id] = 'error'))
    return { correct: false, issues: ['Las piezas no coinciden con la molécula pedida.'], atomMarks, bondMarks, electrons, counters: {} }
  }

  // Elige la asignación que más enlaces (y pares) hace coincidir.
  let best = mappings[0]
  let bestScore = -Infinity
  for (const m of mappings) {
    let score = 0
    for (const b of graph.bonds) {
      const order = targetBonds.get(pairKey(m.get(b.a) as string, m.get(b.b) as string))
      if (order === b.order) score += 3
      else if (order !== undefined) score += 1
      else score -= 1
    }
    if (options.requireLonePairs) {
      for (const a of graph.atoms) if ((spec.lonePairs[m.get(a.id) as string] ?? 0) === a.lonePairs) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  const inverse = new Map([...best].map(([builtId, targetId]) => [targetId, builtId]))

  // 1. Átomos sueltos y moléculas separadas.
  const loose = graph.atoms.filter((a) => (bondSum.get(a.id) ?? 0) === 0)
  if (loose.length > 0 && spec.bonds.length > 0) {
    const els = [...new Set(loose.map((a) => a.element))]
    issues.push(
      loose.length === 1
        ? `Hay un átomo sin conectar: ${named(loose[0].element)}.`
        : `Hay ${loose.length} átomos sin conectar (${els.map(label).join(', ')}).`,
    )
    loose.forEach((a) => (atomMarks[a.id] = 'error'))
  } else if (components(graph).length > 1) {
    issues.push('Las piezas forman varios fragmentos: todo debe quedar en una sola molécula.')
  }

  // 2. Átomo central.
  const targetDegree = new Map<string, number>()
  spec.bonds.forEach((b) => {
    targetDegree.set(b.a, (targetDegree.get(b.a) ?? 0) + 1)
    targetDegree.set(b.b, (targetDegree.get(b.b) ?? 0) + 1)
  })
  const maxTarget = Math.max(0, ...targetDegree.values())
  const centers = [...targetDegree].filter(([, d]) => d === maxTarget && d >= 2).map(([id]) => id)
  if (centers.length === 1) {
    const centerEl = targetElement.get(centers[0]) as Element
    const builtDegree = new Map<string, number>()
    graph.bonds.forEach((b) => {
      builtDegree.set(b.a, (builtDegree.get(b.a) ?? 0) + 1)
      builtDegree.set(b.b, (builtDegree.get(b.b) ?? 0) + 1)
    })
    const maxBuilt = Math.max(0, ...builtDegree.values())
    const builtCenters = [...builtDegree].filter(([, d]) => d === maxBuilt && d >= 2).map(([id]) => atomById.get(id)?.element)
    if (builtCenters.length > 0 && !builtCenters.includes(centerEl)) {
      issues.push(`${named(centerEl).replace(/^el/, 'El')} debe ocupar la posición central.`)
    }
  }

  // 3. Enlaces: comparación con la asignación elegida.
  for (const b of graph.bonds) {
    const ta = best.get(b.a) as string
    const tb = best.get(b.b) as string
    const order = targetBonds.get(pairKey(ta, tb))
    // Orden fijo de los símbolos para que «C y O» y «O y C» sean el mismo mensaje.
    const [ea, eb] = [atomById.get(b.a)?.element as Element, atomById.get(b.b)?.element as Element].sort()
    if (order === b.order) {
      bondMarks[b.id] = 'ok'
    } else if (order !== undefined) {
      bondMarks[b.id] = 'error'
      issues.push(`El enlace entre ${ea} y ${eb} debería ser ${BOND_NAMES[order]}, no ${BOND_NAMES[b.order]}.`)
    } else {
      bondMarks[b.id] = 'error'
      issues.push(`Sobra el enlace entre ${ea} y ${eb}: esos átomos no van unidos.`)
    }
  }
  const builtPairs = new Set(graph.bonds.map((b) => pairKey(b.a, b.b)))
  let missing = 0
  for (const tb of spec.bonds) {
    const ba = inverse.get(tb.a)
    const bb = inverse.get(tb.b)
    if (!ba || !bb || !builtPairs.has(pairKey(ba, bb))) missing += 1
  }
  if (missing > 0 && loose.length === 0) {
    issues.push(missing === 1 ? 'Falta un enlace por colocar.' : `Faltan ${missing} enlaces por colocar.`)
  }

  // 4. Pares libres y reglas del octeto/dueto.
  for (const a of graph.atoms) {
    const e = electrons[a.id]
    if (a.element === 'H' && e.count > 2) {
      atomMarks[a.id] = 'error'
      issues.push(`Un H rompe la regla del dueto: lo rodean ${e.count} electrones y solo admite 2.`)
    } else if (a.element !== 'H' && e.count > 8) {
      atomMarks[a.id] = 'error'
      issues.push(`${named(a.element).replace(/^el/, 'El')} supera el octeto: lo rodean ${e.count} electrones.`)
    }
  }
  if (options.requireLonePairs) {
    for (const a of graph.atoms) {
      const expected = spec.lonePairs[best.get(a.id) as string] ?? 0
      if (a.lonePairs !== expected) {
        atomMarks[a.id] = 'error'
        if (expected === 0) {
          issues.push(`${a.element === 'H' ? 'Un H' : named(a.element).replace(/^el/, 'El')} no lleva pares no compartidos.`)
        } else {
          issues.push(
            `${named(a.element).replace(/^el/, 'El')} necesita ${expected} ${expected === 1 ? 'par no compartido' : 'pares no compartidos'} (tiene ${a.lonePairs}).`,
          )
        }
      }
    }
  } else {
    for (const a of graph.atoms) {
      const sum = bondSum.get(a.id) ?? 0
      if (sum > 0 && sum !== TYPICAL_VALENCE[a.element] && !issues.some((i) => i.includes('octeto') || i.includes('dueto'))) {
        atomMarks[a.id] = 'error'
        const v = TYPICAL_VALENCE[a.element]
        issues.push(`${named(a.element).replace(/^el/, 'El')} forma ${v} ${v === 1 ? 'enlace' : 'enlaces'} en total y aquí tiene ${sum}.`)
      }
    }
  }

  // Marca de error en los átomos que tocan un enlace incorrecto.
  for (const b of graph.bonds) {
    if (bondMarks[b.id] === 'error') {
      atomMarks[b.a] = 'error'
      atomMarks[b.b] = 'error'
    }
  }

  const bondsOk = graph.bonds.every((b) => bondMarks[b.id] === 'ok') && missing === 0 && graph.bonds.length === spec.bonds.length
  const pairsOk = !options.requireLonePairs || graph.atoms.every((a) => a.lonePairs === (spec.lonePairs[best.get(a.id) as string] ?? 0))
  const correct = bondsOk && pairsOk && loose.length === 0

  const counters: ValidationResult['counters'] = {}
  for (const a of graph.atoms) {
    counters[a.id] = options.requireLonePairs
      ? { ...electrons[a.id], unit: 'electrones' }
      : { count: bondSum.get(a.id) ?? 0, target: TYPICAL_VALENCE[a.element], unit: 'enlaces' }
  }

  return { correct, issues: correct ? [] : [...new Set(issues)], atomMarks, bondMarks, electrons, counters }
}
