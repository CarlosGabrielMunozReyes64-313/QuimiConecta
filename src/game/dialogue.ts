import type { Grade, Mood } from '../types/game'

export type DialogueEvent =
  | 'welcome'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'question'
  | 'correct'
  | 'incorrect'
  | 'buildCorrect'
  | 'buildIncorrect'
  | 'practiceSolved'
  | 'practiceStillWrong'
  | 'solution'
  | 'streak'
  | 'idleHint'
  | 'bondMade'
  | 'hurry'
  | 'timeout'
  | 'buildTimeout'
  | 'finish'

const LINES: Record<DialogueEvent, string[]> = {
  welcome: ['¡Bienvenido a QuimiConecta, {name}! ¿Preparado para demostrar tus habilidades químicas?'],
  stage1: ['Etapa 1: reglas básicas. Elige la respuesta correcta. ¡Sin prisa!'],
  stage2: [
    'Etapa 2: ¡a construir! Arrastra los átomos, suelta un enlace entre dos de ellos y confirma cuando lo tengas.',
  ],
  stage3: ['Etapa 3: mira la estructura de la pizarra y dime qué fórmula le corresponde.'],
  question: ['Siguiente reto. ¡Tú puedes!', 'Atento a la pizarra...', '¡Vamos con otra!'],
  correct: [
    '¡Excelente! ¡Ese enlace está perfectamente conectado!',
    '¡Muy bien! Un punto más para tu marcador.',
    '¡Vaya! Tenemos un futuro químico por aquí.',
  ],
  incorrect: [
    '¡Ups! Parece que ese átomo no encontró su pareja.',
    '¡No te preocupes! Hasta los científicos se equivocan.',
    'Revisa los electrones de valencia. ¡Tú puedes!',
  ],
  buildCorrect: ['¡Molécula perfecta! Cada átomo tiene sus electrones en orden.', '¡Estructura impecable! Un punto más.'],
  buildIncorrect: [
    '¡Ups! Algo no encaja. Marqué en rojo lo que hay que revisar.',
    'Casi... Mira las piezas en rojo: ahí está la pista.',
  ],
  practiceSolved: ['¡Ahora sí! Esta vez no suma punto, pero ya sabes cómo se hace.'],
  practiceStillWrong: ['Todavía no. Cuenta los electrones de cada átomo.'],
  solution: ['Así queda la estructura correcta. ¡Fíjate en los pares de electrones!'],
  streak: ['¡Tres seguidas! Estás que echas chispas.', '¡Racha imparable! Sigue así.'],
  idleHint: [
    'Pista: suelta una pieza de enlace entre dos átomos para unirlos.',
    'Pista: toca un enlace ya colocado para quitarlo.',
    'Pista: los pares de electrones se pegan al soltarlos sobre un átomo.',
  ],
  bondMade: ['¡Eso es! Sigue así.'],
  hurry: ['¡Quedan 10 segundos!', '¡El reloj corre! Diez segundos.'],
  timeout: ['¡Se acabó el tiempo! Mira la respuesta correcta en la pizarra.', '¡Tiempo! No pasa nada: fíjate en la solución y sigue.'],
  buildTimeout: ['¡Tiempo! Revisé lo que construiste: mira las piezas en rojo o pulsa «Ver solución».'],
  finish: ['¡El experimento ha terminado! Veamos tus resultados.'],
}

const MOODS: Partial<Record<DialogueEvent, Mood>> = {
  correct: 'happy',
  buildCorrect: 'happy',
  practiceSolved: 'happy',
  streak: 'surprised',
  incorrect: 'oops',
  buildIncorrect: 'oops',
  practiceStillWrong: 'oops',
  hurry: 'surprised',
  timeout: 'oops',
  buildTimeout: 'oops',
}

const RESULT_LINES: Record<Grade, string> = {
  S: '¡Impresionante! ¡La química no tiene secretos para ti!',
  A: '¡Impresionante! Te faltó un pelo para la perfección.',
  B: '¡Muy buen experimento! Repasa un par de detalles y llegarás a la S.',
  C: 'Buen trabajo. Repasa los enlaces dobles y los pares libres.',
  D: 'Vas por buen camino. Repasa la regla del octeto y vuelve a intentarlo.',
  E: 'Toca practicar un poco más. ¡La próxima saldrá mejor!',
  F: 'Hay que reforzar lo básico: octeto, dueto y electrones de valencia. ¡Vuelve a jugar!',
}

/** Mensaje personalizado de la pantalla de resultados. */
export const RESULT_MESSAGES: Record<Grade, string> = {
  S: '¡Perfecto, {name}! Dominas las estructuras de Lewis de principio a fin.',
  A: '¡Excelente, {name}! Estás a un solo paso de la calificación perfecta.',
  B: 'Muy bien, {name}. Tienes una base sólida; afina los detalles.',
  C: 'Buen trabajo, {name}. Repasa los tipos de enlace y los pares no compartidos.',
  D: '{name}, vas en camino. Repasa la regla del octeto y vuelve a intentarlo.',
  E: '{name}, necesitas practicar un poco más. ¡Cada intento cuenta!',
  F: '{name}, toca reforzar lo básico. Repasa el octeto y el dueto, y juega de nuevo.',
}

export interface DialogueLine {
  id: number
  text: string
  mood: Mood
}

let counter = 0
const lastPick = new Map<DialogueEvent, number>()

export function fill(text: string, name: string): string {
  return text.replaceAll('{name}', name)
}

/** Elige una frase del evento sin repetir la anterior. */
export function lineFor(event: DialogueEvent, name: string, random: () => number = Math.random): DialogueLine {
  const pool = LINES[event]
  let i = Math.floor(random() * pool.length)
  if (pool.length > 1 && lastPick.get(event) === i) i = (i + 1) % pool.length
  lastPick.set(event, i)
  counter += 1
  return { id: counter, text: fill(pool[i], name), mood: MOODS[event] ?? 'idle' }
}

export function resultLine(grade: Grade): DialogueLine {
  counter += 1
  return { id: counter, text: RESULT_LINES[grade], mood: grade === 'S' || grade === 'A' ? 'surprised' : grade <= 'C' ? 'happy' : 'idle' }
}

export function customLine(text: string, mood: Mood = 'idle'): DialogueLine {
  counter += 1
  return { id: counter, text, mood }
}
