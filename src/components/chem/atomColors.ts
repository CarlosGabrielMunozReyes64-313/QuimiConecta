import type { Element } from '../../types/game'

/** Colores CPK (convención química) de cada elemento, en tonos pixel art. */
export const ATOM_COLORS: Record<Element, { fill: string; light: string; shade: string; text: string }> = {
  H: { fill: '#f4f4f0', light: '#ffffff', shade: '#c4c8cf', text: '#1d2a5c' },
  C: { fill: '#3b3f4c', light: '#666d80', shade: '#24272f', text: '#ffffff' },
  N: { fill: '#3c5bd6', light: '#7a95f2', shade: '#26399a', text: '#ffffff' },
  O: { fill: '#e8484a', light: '#ff8f86', shade: '#a3262a', text: '#ffffff' },
}
