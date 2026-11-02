import regularUrl from '../assets/fonts/Andika-Regular.woff2'
import boldUrl from '../assets/fonts/Andika-Bold.woff2'

/**
 * Andika (SIL International, licencia OFL): tipografía diseñada para quienes
 * están aprendiendo a leer. Sus letras son muy claras y fáciles de distinguir
 * (a y g de un solo piso, I mayúscula con remates, l con cola).
 */
export const GAME_FONT = 'Andika'

/** Pila completa para SVG y estilos en línea. */
export const GAME_FONT_STACK = `'${GAME_FONT}', 'Trebuchet MS', 'Segoe UI', Arial, sans-serif`

/**
 * Si el archivo llega incrustado como data URL (versión de un solo archivo), se
 * decodifica a bytes en memoria: así la fuente funciona aunque la página no
 * permita cargar fuentes desde URLs.
 */
function sourceOf(url: string): string | ArrayBuffer {
  if (!url.startsWith('data:')) return `url(${url})`
  const binary = atob(url.slice(url.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Registra la fuente (normal y negrita) con la API FontFace. */
export async function loadGameFont(timeoutMs = 2000): Promise<void> {
  try {
    const faces = [
      new FontFace(GAME_FONT, sourceOf(regularUrl), { weight: '400', display: 'block' }),
      new FontFace(GAME_FONT, sourceOf(boldUrl), { weight: '700', display: 'block' }),
    ]
    faces.forEach((f) => document.fonts.add(f))
    await Promise.race([Promise.all(faces.map((f) => f.load())), new Promise((resolve) => window.setTimeout(resolve, timeoutMs))])
  } catch {
    /* si falla, se usa la fuente de respaldo */
  }
}
