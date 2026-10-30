import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'off' | 'requesting' | 'live' | 'error'

export interface CameraState {
  status: CameraStatus
  error: string | null
  /** Ref de callback para el elemento <video> de la vista previa. */
  videoRef: (node: HTMLVideoElement | null) => void
  start: () => Promise<void>
  stop: () => void
  /** Captura un cuadro centrado y cuadrado del vídeo (espejado como la vista previa). */
  capture: (size: number) => HTMLCanvasElement | null
}

function explain(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (!window.isSecureContext) return 'La cámara solo funciona en HTTPS o en localhost. Sube una foto desde tu dispositivo.'
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No hay permiso para usar la cámara. Puedes permitirlo en el navegador o subir una foto.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No se encontró ninguna cámara en este dispositivo. Sube una foto en su lugar.'
    case 'NotReadableError':
      return 'Otra aplicación está usando la cámara. Ciérrala o sube una foto.'
    default:
      return 'La cámara no está disponible. Sube una foto desde tu dispositivo.'
  }
}

/** Ciclo de vida de getUserMedia: solo se pide permiso al llamar a start(). */
export function useCamera(): CameraState {
  const videoEl = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('off')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoEl.current) videoEl.current.srcObject = null
    setStatus((s) => (s === 'error' ? s : 'off'))
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError(explain(new DOMException('', window.isSecureContext ? 'NotFoundError' : 'SecurityError')))
      return
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setStatus('live')
      const video = videoEl.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
    } catch (err) {
      setStatus('error')
      setError(explain(err))
    }
  }, [])

  // Al montarse el <video> (puede ser después de obtener el stream) se le asigna la cámara.
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    videoEl.current = node
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current
      void node.play().catch(() => undefined)
    }
  }, [])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  const capture = useCallback((size: number) => {
    const video = videoEl.current
    if (!video || video.videoWidth === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const side = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - side) / 2
    const sy = (video.videoHeight - side) / 2
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size)
    return canvas
  }, [])

  return { status, error, videoRef, start, stop, capture }
}
