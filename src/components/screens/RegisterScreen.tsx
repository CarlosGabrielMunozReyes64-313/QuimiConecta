import { useId, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { loadImageFile, processPhoto, type ProcessedPhoto } from '../../game/photo'
import { useCamera } from '../../hooks/useCamera'
import type { StageFit } from '../../hooks/useStageLayout'
import type { Player } from '../../types/game'
import { StudentAvatar } from '../characters/StudentAvatar'
import { Whiteboard } from '../board/Whiteboard'
import { PixelButton } from '../ui/PixelButton'
import { PixelIcon } from '../ui/PixelIcon'
import styles from './RegisterScreen.module.css'

interface Props {
  fit: StageFit
  initial: Player | null
  onBack: () => void
  onDone: (player: Player) => void
}

const MAX_NAME = 16

/** Registro: nombre o apodo y fotografía (cámara o archivo). La foto nunca sale del dispositivo. */
export function RegisterScreen({ fit, initial, onBack, onDone }: Props) {
  const { orientation } = fit
  const { status: camStatus, error: camError, videoRef, start: startCamera, stop: stopCamera, capture: captureFrame } = useCamera()
  const fileRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [draft, setDraft] = useState<ProcessedPhoto | null>(
    initial?.photo && initial.photoPixel ? { photo: initial.photo, photoPixel: initial.photoPixel } : null,
  )
  const [confirmed, setConfirmed] = useState(Boolean(initial?.photo))
  const [pixelStyle, setPixelStyle] = useState(initial?.pixelStyle ?? true)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const trimmed = name.trim()
  const nameError = touched && trimmed.length === 0 ? 'Escribe tu nombre o apodo para empezar.' : null
  const live = camStatus === 'live' || camStatus === 'requesting'
  const pending = Boolean(draft) && !confirmed
  const canStart = trimmed.length > 0 && !live && !pending

  const capture = () => {
    const canvas = captureFrame(512)
    if (!canvas) {
      setError('La cámara todavía no muestra imagen. Espera un momento y vuelve a intentarlo.')
      return
    }
    sound.play('shutter')
    setDraft(processPhoto(canvas))
    setConfirmed(false)
    stopCamera()
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const img = await loadImageFile(file)
      setDraft(processPhoto(img))
      setConfirmed(false)
      stopCamera()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la imagen.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const retake = () => {
    setDraft(null)
    setConfirmed(false)
    setError(null)
    if (camError) fileRef.current?.click()
    else void startCamera()
  }

  const start = () => {
    setTouched(true)
    if (!canStart) return
    sound.unlock()
    onDone({
      name: trimmed,
      photo: draft?.photo ?? null,
      photoPixel: draft?.photoPixel ?? null,
      pixelStyle,
    })
  }

  const rect = orientation === 'portrait' ? { x: 16, y: 120, w: 688, h: 1040 } : { x: 236, y: 100, w: 808, h: 520 }
  const avatarSize = orientation === 'portrait' ? 300 : 248

  let cameraStatus = 'La foto aparecerá dentro del círculo del avatar.'
  if (camStatus === 'requesting') cameraStatus = 'Esperando permiso para usar la cámara...'
  else if (camStatus === 'live') cameraStatus = 'Colócate en el círculo y pulsa «Tomar foto».'
  else if (pending) cameraStatus = '¿Te gusta? Confírmala o repítela.'
  else if (draft && confirmed) cameraStatus = 'Foto lista.'

  return (
    <main className={styles.screen}>
      <Whiteboard
        variant={orientation === 'portrait' ? 'tall' : 'landscape'}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        className={styles[orientation]}
        label="Registro del jugador"
      >
        <h1 className={styles.title}>Registro del jugador</h1>
        <div className={styles.columns}>
          <section className={styles.photoCol} aria-label="Fotografía">
            <StudentAvatar
              size={avatarSize}
              pixel={pixelStyle}
              photo={draft ? (pixelStyle ? draft.photoPixel : draft.photo) : null}
              live={
                live ? (
                  <video ref={videoRef} className={styles.video} muted playsInline autoPlay aria-label="Vista previa de la cámara" />
                ) : undefined
              }
              label={draft ? `Avatar con la foto de ${trimmed || 'el jugador'}` : 'Avatar de Messenger sin foto'}
            />
            <p className={styles.camStatus} role="status">
              {cameraStatus}
            </p>
            <div className={styles.camActions}>
              {camStatus === 'live' ? (
                <>
                  <PixelButton size="sm" onClick={capture} icon={<PixelIcon name="camera" cell={3} />} sfx={false}>
                    Tomar foto
                  </PixelButton>
                  <PixelButton variant="wood" size="sm" onClick={stopCamera}>
                    Cancelar
                  </PixelButton>
                </>
              ) : pending ? (
                <>
                  <PixelButton size="sm" onClick={() => setConfirmed(true)} icon={<PixelIcon name="check" cell={3} />}>
                    Confirmar foto
                  </PixelButton>
                  <PixelButton variant="wood" size="sm" onClick={retake}>
                    Repetir
                  </PixelButton>
                </>
              ) : (
                <>
                  <PixelButton
                    size="sm"
                    onClick={() => {
                      setError(null)
                      void startCamera()
                    }}
                    disabled={camStatus === 'requesting'}
                    icon={<PixelIcon name="camera" cell={3} />}
                  >
                    {draft ? 'Nueva foto' : 'Activar cámara'}
                  </PixelButton>
                  <PixelButton variant="wood" size="sm" onClick={() => fileRef.current?.click()} icon={<PixelIcon name="upload" cell={2} />}>
                    Subir foto
                  </PixelButton>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {error || camError ? (
              <p className={styles.error} role="alert">
                {error ?? camError}
              </p>
            ) : null}
          </section>

          <section className={styles.formCol}>
            <label htmlFor={nameId} className={styles.label}>
              Nombre o apodo
            </label>
            <input
              id={nameId}
              className={styles.input}
              value={name}
              maxLength={MAX_NAME}
              autoComplete="nickname"
              placeholder="Ej.: Marie"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') start()
              }}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={`${nameId}-help`}
            />
            <p id={`${nameId}-help`} className={nameError ? styles.error : styles.help}>
              {nameError ?? `Hasta ${MAX_NAME} caracteres. Aparecerá en el marcador.`}
            </p>

            <label className={styles.check}>
              <input type="checkbox" checked={pixelStyle} onChange={(e) => setPixelStyle(e.target.checked)} />
              <span className={styles.box} aria-hidden="true">
                {pixelStyle ? <PixelIcon name="check" cell={2} /> : null}
              </span>
              Foto con estilo pixel art
            </label>

            <p className={styles.privacy}>La foto solo se guarda en la memoria de este dispositivo mientras dura la partida. Si no quieres foto, puedes jugar sin ella.</p>

            <div className={styles.formActions}>
              <PixelButton variant="wood" onClick={onBack} icon={<PixelIcon name="back" cell={3} />}>
                Volver
              </PixelButton>
              <PixelButton size="lg" onClick={start} disabled={trimmed.length > 0 && !canStart} icon={<PixelIcon name="next" cell={4} />}>
                Empezar
              </PixelButton>
            </div>
            {trimmed.length > 0 && !canStart ? (
              <p className={styles.help}>{live ? 'Toma la foto o cancela la cámara para empezar.' : 'Confirma o repite la foto para empezar.'}</p>
            ) : null}
          </section>
        </div>
      </Whiteboard>
    </main>
  )
}
