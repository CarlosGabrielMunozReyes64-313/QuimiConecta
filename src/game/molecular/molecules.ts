import type { Element, MoleculeId, MoleculeSpec } from '../../types/game'

/**
 * Moléculas del juego. Cada una describe su grafo (átomos y enlaces),
 * los pares no compartidos y cómo dibujar su estructura de Lewis.
 */
export const MOLECULES: Record<MoleculeId, MoleculeSpec> = {
  H2O: {
    id: 'H2O',
    name: 'agua',
    formula: 'H₂O',
    atoms: [
      { id: 'O1', element: 'O' },
      { id: 'H1', element: 'H' },
      { id: 'H2', element: 'H' },
    ],
    bonds: [
      { a: 'O1', b: 'H1', order: 1 },
      { a: 'O1', b: 'H2', order: 1 },
    ],
    lonePairs: { O1: 2 },
    drawing: {
      positions: { H1: { x: -1, y: 0 }, O1: { x: 0, y: 0 }, H2: { x: 1, y: 0 } },
      pairAngles: { O1: [-90, 90] },
    },
  },
  CO2: {
    id: 'CO2',
    name: 'dióxido de carbono',
    formula: 'CO₂',
    atoms: [
      { id: 'C1', element: 'C' },
      { id: 'O1', element: 'O' },
      { id: 'O2', element: 'O' },
    ],
    bonds: [
      { a: 'C1', b: 'O1', order: 2 },
      { a: 'C1', b: 'O2', order: 2 },
    ],
    lonePairs: { O1: 2, O2: 2 },
    drawing: {
      positions: { O1: { x: -1.1, y: 0 }, C1: { x: 0, y: 0 }, O2: { x: 1.1, y: 0 } },
      pairAngles: { O1: [-90, 90], O2: [-90, 90] },
    },
  },
  NH3: {
    id: 'NH3',
    name: 'amoníaco',
    formula: 'NH₃',
    atoms: [
      { id: 'N1', element: 'N' },
      { id: 'H1', element: 'H' },
      { id: 'H2', element: 'H' },
      { id: 'H3', element: 'H' },
    ],
    bonds: [
      { a: 'N1', b: 'H1', order: 1 },
      { a: 'N1', b: 'H2', order: 1 },
      { a: 'N1', b: 'H3', order: 1 },
    ],
    lonePairs: { N1: 1 },
    drawing: {
      positions: {
        H1: { x: -1, y: 0 },
        N1: { x: 0, y: 0 },
        H2: { x: 1, y: 0 },
        H3: { x: 0, y: 1 },
      },
      pairAngles: { N1: [-90] },
    },
  },
  CH4: {
    id: 'CH4',
    name: 'metano',
    formula: 'CH₄',
    atoms: [
      { id: 'C1', element: 'C' },
      { id: 'H1', element: 'H' },
      { id: 'H2', element: 'H' },
      { id: 'H3', element: 'H' },
      { id: 'H4', element: 'H' },
    ],
    bonds: [
      { a: 'C1', b: 'H1', order: 1 },
      { a: 'C1', b: 'H2', order: 1 },
      { a: 'C1', b: 'H3', order: 1 },
      { a: 'C1', b: 'H4', order: 1 },
    ],
    lonePairs: {},
    drawing: {
      positions: {
        C1: { x: 0, y: 0 },
        H1: { x: 0, y: -1 },
        H2: { x: 1, y: 0 },
        H3: { x: 0, y: 1 },
        H4: { x: -1, y: 0 },
      },
      pairAngles: {},
    },
  },
  CH2O: {
    id: 'CH2O',
    name: 'metanal (formaldehído)',
    formula: 'CH₂O',
    atoms: [
      { id: 'C1', element: 'C' },
      { id: 'O1', element: 'O' },
      { id: 'H1', element: 'H' },
      { id: 'H2', element: 'H' },
    ],
    bonds: [
      { a: 'C1', b: 'O1', order: 2 },
      { a: 'C1', b: 'H1', order: 1 },
      { a: 'C1', b: 'H2', order: 1 },
    ],
    lonePairs: { O1: 2 },
    drawing: {
      positions: {
        O1: { x: 0, y: -1.1 },
        C1: { x: 0, y: 0 },
        H1: { x: -0.87, y: 0.6 },
        H2: { x: 0.87, y: 0.6 },
      },
      pairAngles: { O1: [-150, -30] },
    },
  },
  N2: {
    id: 'N2',
    name: 'nitrógeno',
    formula: 'N₂',
    atoms: [
      { id: 'N1', element: 'N' },
      { id: 'N2', element: 'N' },
    ],
    bonds: [{ a: 'N1', b: 'N2', order: 3 }],
    lonePairs: { N1: 1, N2: 1 },
    drawing: {
      positions: { N1: { x: -0.6, y: 0 }, N2: { x: 0.6, y: 0 } },
      pairAngles: { N1: [180], N2: [0] },
    },
  },
}

export const ELEMENT_NAMES: Record<Element, string> = {
  H: 'hidrógeno',
  C: 'carbono',
  N: 'nitrógeno',
  O: 'oxígeno',
}

/** Valencia habitual (número de enlaces) de cada elemento. */
export const TYPICAL_VALENCE: Record<Element, number> = { H: 1, C: 4, N: 3, O: 2 }

/** Electrones de valencia del átomo neutro. */
export const VALENCE_ELECTRONS: Record<Element, number> = { H: 1, C: 4, N: 5, O: 6 }

/** Electrones que el átomo debe rodear: dueto para H, octeto para el resto. */
export function shellTarget(element: Element): number {
  return element === 'H' ? 2 : 8
}

export const BOND_NAMES: Record<1 | 2 | 3, string> = { 1: 'sencillo', 2: 'doble', 3: 'triple' }
