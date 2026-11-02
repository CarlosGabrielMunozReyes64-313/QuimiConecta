import type { AnswerRecord, Grade } from '../types/game'

/** Puntuación máxima: una por pregunta (15 preguntas). */
export const MAX_SCORE = 15

interface GradeInfo {
  grade: Grade
  label: string
  /** Puntuación mínima (inclusive) para obtener la calificación. */
  min: number
}

/**
 * Tabla para 15 preguntas (proporcional a la original de 9):
 * 15 S · 13–14 A · 11–12 B · 9–10 C · 7–8 D · 4–6 E · 0–3 F
 */
export const GRADE_TABLE: readonly GradeInfo[] = [
  { grade: 'S', label: 'Perfecto', min: 15 },
  { grade: 'A', label: 'Excelente', min: 13 },
  { grade: 'B', label: 'Muy bueno', min: 11 },
  { grade: 'C', label: 'Bueno', min: 9 },
  { grade: 'D', label: 'En proceso', min: 7 },
  { grade: 'E', label: 'Necesita mejorar', min: 4 },
  { grade: 'F', label: 'Debe reforzar', min: 0 },
]

export function gradeFor(score: number): GradeInfo {
  const s = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)))
  return GRADE_TABLE.find((g) => s >= g.min) ?? GRADE_TABLE[GRADE_TABLE.length - 1]
}

/** Rango de puntos de una calificación, para mostrar la tabla ("4–5"). */
export function gradeRange(grade: Grade): string {
  const i = GRADE_TABLE.findIndex((g) => g.grade === grade)
  const min = GRADE_TABLE[i].min
  const max = i === 0 ? MAX_SCORE : GRADE_TABLE[i - 1].min - 1
  return min === max ? `${min}` : `${min}–${max}`
}

export function scoreOf(answers: readonly AnswerRecord[]): number {
  return answers.filter((a) => a.correct).length
}

/**
 * Calificación provisional: proyecta el porcentaje de aciertos actual a 15 preguntas.
 * Devuelve null si todavía no hay respuestas.
 */
export function provisionalGrade(answers: readonly AnswerRecord[]): GradeInfo | null {
  if (answers.length === 0) return null
  const projected = Math.round((scoreOf(answers) / answers.length) * MAX_SCORE)
  return gradeFor(projected)
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
