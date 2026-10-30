/**
 * Sonido chiptune sintetizado con Web Audio: no hay archivos de audio externos.
 * El AudioContext se crea en el primer gesto del usuario (política de autoplay).
 */
export type Sfx =
  | 'select'
  | 'correct'
  | 'wrong'
  | 'snap'
  | 'detach'
  | 'pair'
  | 'reject'
  | 'complete'
  | 'point'
  | 'finish'
  | 'blip'
  | 'shutter'
  | 'tick'
  | 'timeout'

export interface SoundSettings {
  sfx: boolean
  music: boolean
}

type Wave = OscillatorType

const STORAGE_KEY = 'quimiconecta:sound'

function loadSettings(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundSettings>
      return { sfx: parsed.sfx !== false, music: parsed.music === true }
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return { sfx: true, music: false }
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private settings: SoundSettings = typeof window === 'undefined' ? { sfx: true, music: false } : loadSettings()
  private listeners = new Set<() => void>()
  private musicTimer: number | null = null
  private nextNoteTime = 0
  private step = 0
  private lastBlip = 0

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSettings = () => this.settings

  private emit() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch {
      /* sin persistencia */
    }
    this.listeners.forEach((fn) => fn())
  }

  /** Debe llamarse desde un gesto del usuario (clic, tecla). */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.18
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (this.settings.music) this.startMusic()
  }

  setSfx(on: boolean) {
    this.settings = { ...this.settings, sfx: on }
    this.emit()
  }

  setMusic(on: boolean) {
    this.settings = { ...this.settings, music: on }
    if (on) {
      this.unlock()
      this.startMusic()
    } else {
      this.stopMusic()
    }
    this.emit()
  }

  private tone(freq: number, start: number, dur: number, wave: Wave, vol: number, out?: AudioNode, slideTo?: number) {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, start)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(out ?? this.master)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  private noise(start: number, dur: number, vol: number) {
    if (!this.ctx || !this.master) return
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    gain.gain.value = vol
    src.buffer = buf
    src.connect(gain)
    gain.connect(this.master)
    src.start(start)
  }

  play(name: Sfx) {
    if (!this.settings.sfx) return
    this.unlock()
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + 0.01
    const seq = (notes: number[], step: number, wave: Wave, vol: number, len = step) =>
      notes.forEach((n, i) => this.tone(NOTE(n), t + i * step, len, wave, vol))
    switch (name) {
      case 'select':
        this.tone(NOTE(76), t, 0.06, 'square', 0.12)
        this.tone(NOTE(83), t + 0.05, 0.07, 'square', 0.1)
        break
      case 'correct':
        seq([72, 76, 79, 84], 0.07, 'square', 0.12, 0.12)
        break
      case 'wrong':
        this.tone(NOTE(58), t, 0.16, 'square', 0.12)
        this.tone(NOTE(53), t + 0.15, 0.28, 'square', 0.12, undefined, NOTE(50))
        break
      case 'snap':
        this.tone(NOTE(81), t, 0.04, 'triangle', 0.25)
        this.tone(NOTE(88), t + 0.035, 0.06, 'triangle', 0.2)
        this.noise(t, 0.03, 0.06)
        break
      case 'detach':
        this.tone(NOTE(79), t, 0.1, 'triangle', 0.2, undefined, NOTE(67))
        break
      case 'pair':
        this.tone(NOTE(91), t, 0.05, 'square', 0.08)
        this.tone(NOTE(91), t + 0.07, 0.05, 'square', 0.08)
        break
      case 'reject':
        this.tone(NOTE(45), t, 0.12, 'sawtooth', 0.08)
        break
      case 'complete':
        seq([72, 76, 79, 84, 79, 84, 88], 0.08, 'square', 0.11, 0.14)
        seq([48, 55, 60], 0.18, 'triangle', 0.2, 0.3)
        break
      case 'point':
        this.tone(NOTE(83), t, 0.07, 'square', 0.1)
        this.tone(NOTE(88), t + 0.07, 0.22, 'square', 0.1)
        break
      case 'finish':
        seq([67, 72, 76, 79, 76, 79, 84], 0.11, 'square', 0.1, 0.18)
        seq([43, 48, 52, 55], 0.2, 'triangle', 0.22, 0.35)
        break
      case 'blip': {
        if (t - this.lastBlip < 0.05) return
        this.lastBlip = t
        this.tone(NOTE(70 + Math.floor(Math.random() * 6)), t, 0.025, 'square', 0.025)
        break
      }
      case 'tick':
        this.tone(NOTE(93), t, 0.03, 'square', 0.07)
        break
      case 'timeout':
        this.tone(NOTE(55), t, 0.22, 'sawtooth', 0.1)
        this.tone(NOTE(55), t + 0.26, 0.5, 'sawtooth', 0.1, undefined, NOTE(43))
        break
      case 'shutter':
        this.noise(t, 0.08, 0.2)
        this.tone(NOTE(96), t, 0.03, 'square', 0.06)
        break
    }
  }

  // ------------------------------------------------------------- música
  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return
    this.nextNoteTime = this.ctx.currentTime + 0.1
    this.step = 0
    this.musicTimer = window.setInterval(() => this.schedule(), 90)
  }

  private stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  private schedule() {
    if (!this.ctx || !this.musicGain) return
    // La menor - Fa - Do - Sol, corcheas a 112 ppm
    const chords = [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ]
    const stepDur = 60 / 112 / 2
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8) % 4
      const chord = chords[bar]
      const s = this.step % 8
      const arp = chord[[0, 1, 2, 1, 0, 2, 1, 2][s]] + 12
      this.tone(NOTE(arp), this.nextNoteTime, stepDur * 0.9, 'square', 0.12, this.musicGain)
      if (s % 2 === 0) this.tone(NOTE(chord[0] - 12), this.nextNoteTime, stepDur * 1.8, 'triangle', 0.35, this.musicGain)
      this.nextNoteTime += stepDur
      this.step += 1
    }
  }
}

export const sound = new SoundEngine()
