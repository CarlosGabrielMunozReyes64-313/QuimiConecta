/** Dígitos subíndice Unicode, en orden del 0 al 9. */
export const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/** Convierte H₂O en H2O para lectores de pantalla y etiquetas aria. */
export function plainChem(text: string): string {
  return text.replace(/[₀-₉]/gu, (c) => String(SUBSCRIPTS.indexOf(c)))
}
