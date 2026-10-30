import type { Question, StageNumber } from '../../types/game'

/**
 * Banco de preguntas de QuimiConecta.
 *
 * El orden del arreglo es el orden de juego. Para cambiar una pregunta basta con
 * editar este archivo: los componentes leen todo desde aquí.
 * Los subíndices se escriben con caracteres Unicode (₂ ₃ ₄); la interfaz los convierte.
 * `timeLimit` es el tiempo en segundos del modo Normal (Amplio lo duplica).
 */
export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------- Etapa 1
  {
    id: 'q1',
    timeLimit: 30,
    stage: 1,
    kind: 'choice',
    prompt: 'Según la regla del octeto, ¿cuántos electrones buscan reunir los átomos en su capa de valencia al formar enlaces?',
    options: [
      { id: 'a', text: '8 electrones' },
      { id: 'b', text: '2 electrones' },
      { id: 'c', text: '4 electrones' },
      { id: 'd', text: '6 electrones' },
    ],
    correctOptionId: 'a',
    explanation: 'Al enlazarse, la mayoría de los átomos busca rodearse de 8 electrones de valencia, como los gases nobles.',
  },
  {
    id: 'q2',
    timeLimit: 30,
    stage: 1,
    kind: 'choice',
    prompt: '¿Qué átomo se estabiliza con solo 2 electrones, siguiendo la regla del dueto?',
    options: [
      { id: 'a', text: 'Oxígeno (O)' },
      { id: 'b', text: 'Hidrógeno (H)' },
      { id: 'c', text: 'Carbono (C)' },
      { id: 'd', text: 'Nitrógeno (N)' },
    ],
    correctOptionId: 'b',
    explanation: 'El hidrógeno solo tiene la primera capa, que se llena con 2 electrones, igual que el helio.',
  },
  {
    id: 'q3',
    timeLimit: 40,
    stage: 1,
    kind: 'choice',
    prompt: 'El oxígeno está en el grupo 16. En su estructura de Lewis, ¿cuántos electrones de valencia (puntos) se dibujan alrededor del símbolo O?',
    options: [
      { id: 'a', text: '2 puntos' },
      { id: 'b', text: '8 puntos' },
      { id: 'c', text: '6 puntos' },
      { id: 'd', text: '16 puntos' },
    ],
    correctOptionId: 'c',
    explanation: 'En Lewis solo se dibujan los electrones de valencia. El oxígeno, del grupo 16, tiene 6.',
  },

  // ---------------------------------------------------------------- Etapa 2
  {
    id: 'q4',
    timeLimit: 120,
    stage: 2,
    kind: 'build',
    moleculeId: 'H2O',
    prompt: 'Construye la estructura de Lewis del agua (H₂O).',
    hint: 'Incluye los pares de electrones no compartidos. Sobran piezas.',
    requireLonePairs: true,
    pieces: { atoms: ['O', 'H', 'H'], bonds: [1, 1, 2], lonePairs: 3 },
    explanation: 'El oxígeno va en el centro con dos enlaces sencillos y dos pares no compartidos: 8 electrones. Cada H queda con 2.',
  },
  {
    id: 'q5',
    timeLimit: 120,
    stage: 2,
    kind: 'build',
    moleculeId: 'CO2',
    prompt: 'Construye la molécula de dióxido de carbono (CO₂).',
    hint: 'Elige bien el tipo de enlace. Aquí solo cuentan los enlaces.',
    requireLonePairs: false,
    pieces: { atoms: ['C', 'O', 'O'], bonds: [1, 1, 2, 2], lonePairs: 0 },
    explanation: 'El carbono, en el centro, forma dos enlaces dobles: O=C=O. Así completa sus 4 enlaces.',
  },
  {
    id: 'q6',
    timeLimit: 150,
    stage: 2,
    kind: 'build',
    moleculeId: 'NH3',
    prompt: 'Construye la estructura de Lewis del amoníaco (NH₃).',
    hint: 'Incluye los pares de electrones no compartidos. Sobran piezas.',
    requireLonePairs: true,
    pieces: { atoms: ['N', 'H', 'H', 'H'], bonds: [1, 1, 1, 2], lonePairs: 2 },
    explanation: 'El nitrógeno se une a tres H con enlaces sencillos y conserva un par no compartido: 8 electrones.',
  },

  // ---------------------------------------------------------------- Etapa 3
  {
    id: 'q7',
    timeLimit: 40,
    stage: 3,
    kind: 'formula',
    moleculeId: 'CH4',
    prompt: '¿Qué fórmula química corresponde a esta estructura?',
    options: [
      { id: 'a', text: 'CH₃' },
      { id: 'b', text: 'C₄H' },
      { id: 'c', text: 'CH₄' },
      { id: 'd', text: 'C₂H₄' },
    ],
    correctOptionId: 'c',
    explanation: 'Un carbono unido a cuatro hidrógenos: CH₄, el metano.',
  },
  {
    id: 'q8',
    timeLimit: 40,
    stage: 3,
    kind: 'formula',
    moleculeId: 'CH2O',
    prompt: '¿Qué fórmula química corresponde a esta estructura?',
    options: [
      { id: 'a', text: 'CH₂O' },
      { id: 'b', text: 'CHO₂' },
      { id: 'c', text: 'C₂HO' },
      { id: 'd', text: 'CH₂O₂' },
    ],
    correctOptionId: 'a',
    explanation: 'Hay 1 carbono, 2 hidrógenos y 1 oxígeno unido con enlace doble: CH₂O, el metanal.',
  },
  {
    id: 'q9',
    timeLimit: 40,
    stage: 3,
    kind: 'formula',
    moleculeId: 'N2',
    prompt: '¿Qué fórmula química corresponde a esta estructura?',
    options: [
      { id: 'a', text: 'NH₃' },
      { id: 'b', text: 'N₃' },
      { id: 'c', text: 'N₂H₂' },
      { id: 'd', text: 'N₂' },
    ],
    correctOptionId: 'd',
    explanation: 'Dos nitrógenos unidos por un enlace triple, cada uno con un par libre: N₂, el gas más abundante del aire.',
  },
]

export const STAGES: Record<StageNumber, { title: string; short: string; mode: string }> = {
  1: { title: 'Reglas básicas', short: 'Reglas', mode: 'Opción múltiple' },
  2: { title: 'Construcción molecular', short: 'Construcción', mode: 'Arrastra y conecta' },
  3: { title: 'Fórmulas químicas', short: 'Fórmulas', mode: 'Elige la fórmula' },
}

export const TOTAL_QUESTIONS = QUESTIONS.length
