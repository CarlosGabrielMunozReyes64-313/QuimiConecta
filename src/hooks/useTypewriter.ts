import { useEffect, useRef, useState } from 'react'

/**
 * Revela un texto letra a letra. Devuelve cuántos caracteres mostrar y una
 * función para saltar al final. Con movimiento reducido muestra todo de inmediato.
 */
export function useTypewriter(text: string, key: number, instant: boolean, cps = 45, onTick?: () => void) {
  const [state, setState] = useState({ key, count: instant ? text.length : 0 })
  const tickRef = useRef(onTick)
  useEffect(() => {
    tickRef.current = onTick
  })
  const current = state.key === key ? state.count : instant ? text.length : 0

  useEffect(() => {
    if (instant) return
    let count = 0
    const id = window.setInterval(() => {
      count += 1
      if (count % 2 === 0) tickRef.current?.()
      setState({ key, count })
      if (count >= text.length) window.clearInterval(id)
    }, 1000 / cps)
    return () => window.clearInterval(id)
  }, [text, key, instant, cps])

  const skip = () => setState({ key, count: text.length })
  return { visible: Math.min(current, text.length), done: current >= text.length, skip }
}
