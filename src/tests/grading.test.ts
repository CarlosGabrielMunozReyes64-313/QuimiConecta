import { describe, expect, it } from 'vitest'
import { formatDuration, gradeFor, gradeRange, provisionalGrade } from '../game/grading'

describe('escala de calificaciones', () => {
  it.each([
    [9, 'S', 'Perfecto'],
    [8, 'A', 'Excelente'],
    [7, 'B', 'Muy bueno'],
    [6, 'C', 'Bueno'],
    [5, 'D', 'En proceso'],
    [4, 'D', 'En proceso'],
    [3, 'E', 'Necesita mejorar'],
    [2, 'E', 'Necesita mejorar'],
    [1, 'F', 'Debe reforzar'],
    [0, 'F', 'Debe reforzar'],
  ])('%i puntos = %s (%s)', (score, grade, label) => {
    expect(gradeFor(score).grade).toBe(grade)
    expect(gradeFor(score).label).toBe(label)
  })

  it('muestra los rangos de la tabla', () => {
    expect(gradeRange('S')).toBe('9')
    expect(gradeRange('D')).toBe('4–5')
    expect(gradeRange('F')).toBe('0–1')
  })

  it('proyecta la calificación provisional', () => {
    expect(provisionalGrade([])).toBeNull()
    const a = (correct: boolean, i: number) => ({ questionId: `q${i}`, correct, answeredAt: i })
    expect(provisionalGrade([a(true, 1), a(true, 2)])?.grade).toBe('S')
    expect(provisionalGrade([a(true, 1), a(false, 2)])?.grade).toBe('D')
  })

  it('formatea el tiempo', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(125_400)).toBe('02:05')
  })
})
