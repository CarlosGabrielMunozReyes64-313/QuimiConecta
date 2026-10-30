import { describe, expect, it } from 'vitest'
import { scoreOf } from '../game/grading'
import { QUESTIONS } from '../game/questions/bank'
import { createSession, sessionReducer } from '../game/session'

const reduce = sessionReducer(QUESTIONS)

describe('reductor de la partida', () => {
  it('no suma puntos duplicados por la misma pregunta', () => {
    let s = createSession(0)
    s = reduce(s, { type: 'answer', questionId: 'q1', correct: true, now: 1 })
    s = reduce(s, { type: 'answer', questionId: 'q1', correct: true, now: 2 })
    expect(s.answers).toHaveLength(1)
    expect(scoreOf(s.answers)).toBe(1)
  })

  it('ignora respuestas a preguntas que no son la actual', () => {
    let s = createSession(0)
    s = reduce(s, { type: 'answer', questionId: 'q5', correct: true, now: 1 })
    expect(s.answers).toHaveLength(0)
  })

  it('no avanza sin responder', () => {
    let s = createSession(0)
    s = reduce(s, { type: 'next', now: 1 })
    expect(s.index).toBe(0)
  })

  it('recorre las nueve preguntas en orden y registra el final', () => {
    let s = createSession(1000)
    QUESTIONS.forEach((q, i) => {
      expect(s.index).toBe(i)
      s = reduce(s, { type: 'answer', questionId: q.id, correct: i % 2 === 0, now: 2000 + i })
      s = reduce(s, { type: 'next', now: 2000 + i })
    })
    expect(s.answers).toHaveLength(9)
    expect(scoreOf(s.answers)).toBe(5)
    expect(s.finishedAt).toBe(2008)
    expect(s.index).toBe(8)
    const after = reduce(s, { type: 'answer', questionId: 'q9', correct: true, now: 3000 })
    expect(after).toBe(s)
  })
})
