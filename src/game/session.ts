import type { AnswerRecord, GameResult, Question } from '../types/game'
import { scoreOf } from './grading'

export interface SessionState {
  index: number
  answers: AnswerRecord[]
  startedAt: number
  finishedAt: number | null
}

export type SessionAction =
  | { type: 'answer'; questionId: string; correct: boolean; choiceId?: string; now: number }
  | { type: 'next'; now: number }

export function createSession(now: number): SessionState {
  return { index: 0, answers: [], startedAt: now, finishedAt: null }
}

export function isAnswered(state: SessionState, questionId: string): boolean {
  return state.answers.some((a) => a.questionId === questionId)
}

/**
 * Reductor puro. Una respuesta solo se registra una vez por pregunta y solo si
 * corresponde a la pregunta actual: así nunca se suman puntos duplicados.
 */
export function sessionReducer(questions: readonly Question[]) {
  return (state: SessionState, action: SessionAction): SessionState => {
    switch (action.type) {
      case 'answer': {
        const current = questions[state.index]
        if (!current || current.id !== action.questionId) return state
        if (isAnswered(state, action.questionId) || state.finishedAt !== null) return state
        const record: AnswerRecord = {
          questionId: action.questionId,
          correct: action.correct,
          choiceId: action.choiceId,
          answeredAt: action.now,
        }
        const answers = [...state.answers, record]
        const finishedAt = answers.length === questions.length ? action.now : null
        return { ...state, answers, finishedAt }
      }
      case 'next': {
        const current = questions[state.index]
        if (!current || !isAnswered(state, current.id)) return state
        if (state.index >= questions.length - 1) return state
        return { ...state, index: state.index + 1 }
      }
      default:
        return state
    }
  }
}

export function toResult(state: SessionState, total: number): GameResult {
  return {
    answers: state.answers,
    score: scoreOf(state.answers),
    total,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt ?? state.startedAt,
  }
}
