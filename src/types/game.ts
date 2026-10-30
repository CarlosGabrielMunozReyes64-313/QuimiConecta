/** Tipos centrales de QuimiConecta. */

export type Element = 'H' | 'C' | 'N' | 'O'
export type BondOrder = 1 | 2 | 3

export type StageNumber = 1 | 2 | 3

export interface ChoiceOption {
  id: string
  /** Texto de la opción. Los subíndices se escriben con caracteres Unicode (H₂O). */
  text: string
}

interface QuestionBase {
  id: string
  stage: StageNumber
  prompt: string
  /** Tiempo límite en segundos (modo Normal). */
  timeLimit: number
  /** Explicación breve que se muestra tras responder. */
  explanation: string
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice'
  options: ChoiceOption[]
  correctOptionId: string
}

export interface FormulaQuestion extends QuestionBase {
  kind: 'formula'
  /** Molécula cuya estructura se dibuja en la pizarra. */
  moleculeId: MoleculeId
  options: ChoiceOption[]
  correctOptionId: string
}

export interface BuildPieces {
  atoms: Element[]
  bonds: BondOrder[]
  lonePairs: number
}

export interface BuildQuestion extends QuestionBase {
  kind: 'build'
  moleculeId: MoleculeId
  /** Indicación secundaria bajo el enunciado. */
  hint: string
  /** Si es true, la estructura de Lewis debe incluir los pares no compartidos. */
  requireLonePairs: boolean
  pieces: BuildPieces
}

export type Question = ChoiceQuestion | FormulaQuestion | BuildQuestion

export type MoleculeId = 'H2O' | 'CO2' | 'NH3' | 'CH4' | 'CH2O' | 'N2'

export interface MoleculeAtom {
  id: string
  element: Element
}

export interface MoleculeBond {
  a: string
  b: string
  order: BondOrder
}

export interface MoleculeSpec {
  id: MoleculeId
  name: string
  formula: string
  atoms: MoleculeAtom[]
  bonds: MoleculeBond[]
  /** Pares de electrones no compartidos por átomo (los que faltan valen 0). */
  lonePairs: Record<string, number>
  /** Coordenadas para dibujar la estructura de Lewis (unidades libres, se escalan). */
  drawing: {
    positions: Record<string, { x: number; y: number }>
    /** Ángulos en grados (0 = derecha, 90 = abajo) donde se dibujan los pares libres. */
    pairAngles: Record<string, number[]>
  }
}

export interface Player {
  name: string
  /** Foto en alta resolución (data URL). Solo vive en memoria. */
  photo: string | null
  /** Foto reducida a la rejilla de bloques del sprite Messenger. */
  photoPixel: string | null
  pixelStyle: boolean
  timeMode: TimeMode
}

/** Normal, Amplio (el doble) o Sin límite (sin cuenta atrás). */
export type TimeMode = 'normal' | 'amplio' | 'libre'

export interface AnswerRecord {
  questionId: string
  correct: boolean
  /** Opción elegida (preguntas de selección). */
  choiceId?: string
  /** true si la respuesta se registró al agotarse el tiempo. */
  timedOut?: boolean
  answeredAt: number
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface GameResult {
  answers: AnswerRecord[]
  score: number
  total: number
  startedAt: number
  finishedAt: number
}

export type Mood = 'idle' | 'talking' | 'happy' | 'oops' | 'surprised'
