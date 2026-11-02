import { describe, expect, it } from 'vitest'
import { formatDuration, gradeFor, gradeRange, provisionalGrade } from '../game/grading'

describe('escala de calificaciones', () => {
  it.each([
    [15, 'S', 'Perfecto'],
    [14, 'A', 'Excelente'],
    [13, 'A', 'Excelente'],
    [12, 'B', 'Muy bueno'],
    [11, 'B', 'Muy bueno'],
    [10, 'C', 'Bueno'],
    [9, 'C', 'Bueno'],
    [8, 'D', 'En proceso'],
    [7, 'D', 'En proceso'],
    [6, 'E', 'Necesita mejorar'],
    [4, 'E', 'Necesita mejorar'],
    [3, 'F', 'Debe reforzar'],
    [0, 'F', 'Debe reforzar'],
  ])('%i puntos = %s (%s)', (score, grade, label) => {
    expect(gradeFor(score).grade).toBe(grade)
    expect(gradeFor(score).label).toBe(label)
  })

  it('muestra los rangos de la tabla', () => {
    expect(gradeRange('S')).toBe('15')
    expect(gradeRange('A')).toBe('13–14')
    expect(gradeRange('E')).toBe('4–6')
    expect(gradeRange('F')).toBe('0–3')
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
