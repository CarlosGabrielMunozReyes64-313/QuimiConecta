import { useEffect, useState } from 'react'
import { LAYOUTS, type Orientation, type StageLayout } from '../game/layout'

export interface StageFit {
  orientation: Orientation
  layout: StageLayout
  scale: number
}

/** Lee las zonas seguras (muescas, barras del sistema) con un elemento sonda. */
function safeInsets() {
  let probe = document.getElementById('safe-area-probe')
  if (!probe) {
    probe = document.createElement('div')
    probe.id = 'safe-area-probe'
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
    document.body.appendChild(probe)
  }
  const cs = getComputedStyle(probe)
  return {
    x: parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) || 0,
    y: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) || 0,
  }
}

function measure(): StageFit {
  const inset = safeInsets()
  const vw = window.innerWidth - inset.x
  const vh = window.innerHeight - inset.y
  // Vertical cuando la ventana es claramente más alta que ancha (móviles en retrato).
  const orientation: Orientation = vw / vh < 0.85 ? 'portrait' : 'landscape'
  const layout = LAYOUTS[orientation]
  const scale = Math.min(vw / layout.width, vh / layout.height)
  return { orientation, layout, scale }
}

/** Calcula qué lienzo usar y cuánto escalarlo para que quepa en la ventana. */
export function useStageLayout(): StageFit {
  const [fit, setFit] = useState<StageFit>(measure)
  useEffect(() => {
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setFit(measure()))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return fit
}
