import type { Question, StageNumber, TimeMode } from '../types/game'

/** Modos de tiempo elegibles en el registro (WCAG 2.2.1: límites ajustables). */
export const TIME_MODES: Record<TimeMode, { label: string; factor: number; description: string }> = {
  normal: { label: 'Normal', factor: 1, description: 'El tiempo estándar de cada pregunta.' },
  amplio: { label: 'Amplio', factor: 2, description: 'El doble de tiempo en cada pregunta.' },
  libre: { label: 'Sin límite', factor: Number.POSITIVE_INFINITY, description: 'Sin cuenta atrás.' },
}

/** Aviso del presentador cuando quedan estos milisegundos. */
export const WARN_AT_MS = 10_000
/** Tic-tac en los últimos segundos. */
export const TICK_FROM_S = 5

/** Límite en milisegundos de una pregunta, o null si no hay límite. */
export function limitMs(q: Question, mode: TimeMode): number | null {
  const factor = TIME_MODES[mode].factor
  return Number.isFinite(factor) ? q.timeLimit * factor * 1000 : null
}

/** 30 → "30 s", 120 → "2 min", 150 → "2 min 30 s". */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

/** Reloj de la cuenta atrás: "25" o "1:45". */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  if (total < 60) return String(total)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Rango de tiempo de una etapa en un modo: "30–40 s", "4–5 min". */
export function stageTimeLabel(questions: readonly Question[], stage: StageNumber, mode: TimeMode): string {
  const factor = TIME_MODES[mode].factor
  if (!Number.isFinite(factor)) return 'sin límite'
  const times = questions.filter((q) => q.stage === stage).map((q) => q.timeLimit * factor)
  const min = Math.min(...times)
  const max = Math.max(...times)
  if (min === max) return formatSeconds(min)
  if (max < 60) return `${min}–${max} s`
  return `${formatSeconds(min)} a ${formatSeconds(max)}`
}
