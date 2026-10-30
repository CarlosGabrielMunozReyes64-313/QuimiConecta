import { useEffect, useRef, useState } from 'react'
import { sound } from '../audio/sound'
import { TICK_FROM_S, WARN_AT_MS } from '../game/timing'

interface Options {
  /** Límite en ms; null = sin límite. */
  limitMs: number | null
  /** Corre solo mientras sea true (se pausa con el menú o la pestaña oculta). */
  running: boolean
  onExpire: () => void
  onWarn?: () => void
}

/**
 * Cuenta atrás de una pregunta. Guarda el tiempo restante al pausarse y continúa
 * desde ahí. Avisa una vez a los 10 s y suena un tic en los últimos 5.
 * El componente que lo usa se monta de nuevo en cada pregunta, así que se reinicia solo.
 */
export function useQuestionClock({ limitMs, running, onExpire, onWarn }: Options): number | null {
  const [remaining, setRemaining] = useState(limitMs ?? 0)
  const left = useRef(limitMs ?? 0)
  const fired = useRef({ warn: false, expire: false, lastTick: -1 })
  const callbacks = useRef({ onExpire, onWarn })

  useEffect(() => {
    callbacks.current = { onExpire, onWarn }
  })

  useEffect(() => {
    if (limitMs === null || !running || left.current <= 0) return
    const start = performance.now()
    const base = left.current
    const tick = () => {
      const now = Math.max(0, base - (performance.now() - start))
      left.current = now
      setRemaining(now)
      const secs = Math.ceil(now / 1000)
      if (!fired.current.warn && now <= WARN_AT_MS && limitMs > WARN_AT_MS * 2) {
        fired.current.warn = true
        callbacks.current.onWarn?.()
      }
      if (secs > 0 && secs <= TICK_FROM_S && secs !== fired.current.lastTick) {
        fired.current.lastTick = secs
        sound.play('tick')
      }
      if (now <= 0 && !fired.current.expire) {
        fired.current.expire = true
        window.clearInterval(id)
        callbacks.current.onExpire()
      }
    }
    const id = window.setInterval(tick, 100)
    return () => window.clearInterval(id)
  }, [limitMs, running])

  return limitMs === null ? null : remaining
}
