import fontUrl from '../assets/fonts/Minecraft-ES.ttf'

export const PIXEL_FONT = 'Minecraft ES'

/**
 * Carga la fuente pixel con la API FontFace. Si el archivo llega incrustado como
 * data URL (versión de un solo archivo), se decodifica a bytes en memoria: así la
 * fuente funciona aunque la página no permita cargar fuentes desde URLs.
 */
export async function loadPixelFont(timeoutMs = 2000): Promise<void> {
  try {
    let source: string | ArrayBuffer = `url(${fontUrl})`
    if (fontUrl.startsWith('data:')) {
      const binary = atob(fontUrl.slice(fontUrl.indexOf(',') + 1))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      source = bytes.buffer
    }
    const face = new FontFace(PIXEL_FONT, source, { display: 'block' })
    document.fonts.add(face)
    await Promise.race([face.load(), new Promise((resolve) => window.setTimeout(resolve, timeoutMs))])
  } catch {
    /* si falla, se usa la fuente de respaldo */
  }
}
