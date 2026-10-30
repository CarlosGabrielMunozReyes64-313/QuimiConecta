import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../game/questions/bank'
import { createSession, sessionReducer } from '../game/session'
import { formatClock, formatSeconds, limitMs, stageTimeLabel } from '../game/timing'

describe('tiempo límite', () => {
  it('cada pregunta tiene un límite razonable según su modalidad', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'build') expect(q.timeLimit).toBeGreaterThanOrEqual(90)
      else {
        expect(q.timeLimit).toBeGreaterThanOrEqual(20)
        expect(q.timeLimit).toBeLessThanOrEqual(60)
      }
    }
  })

  it('aplica los modos Normal, Amplio y Sin límite', () => {
    const q = QUESTIONS[0]
    expect(limitMs(q, 'normal')).toBe(q.timeLimit * 1000)
    expect(limitMs(q, 'amplio')).toBe(q.timeLimit * 2000)
    expect(limitMs(q, 'libre')).toBeNull()
  })

  it('formatea tiempos y rangos por etapa', () => {
    expect(formatSeconds(30)).toBe('30 s')
    expect(formatSeconds(120)).toBe('2 min')
    expect(formatSeconds(150)).toBe('2 min 30 s')
    expect(formatClock(24_100)).toBe('25')
    expect(formatClock(105_000)).toBe('1:45')
    expect(stageTimeLabel(QUESTIONS, 1, 'normal')).toBe('30–40 s')
    expect(stageTimeLabel(QUESTIONS, 2, 'normal')).toBe('2 min a 2 min 30 s')
    expect(stageTimeLabel(QUESTIONS, 3, 'amplio')).toBe('1 min 20 s')
    expect(stageTimeLabel(QUESTIONS, 1, 'libre')).toBe('sin límite')
  })

  it('una respuesta por tiempo agotado cuenta como fallo y queda marcada', () => {
    const reduce = sessionReducer(QUESTIONS)
    let s = createSession(0)
    s = reduce(s, { type: 'answer', questionId: 'q1', correct: false, timedOut: true, now: 30_000 })
    expect(s.answers[0]).toMatchObject({ questionId: 'q1', correct: false, timedOut: true })
    s = reduce(s, { type: 'answer', questionId: 'q1', correct: true, now: 31_000 })
    expect(s.answers).toHaveLength(1)
  })
})
