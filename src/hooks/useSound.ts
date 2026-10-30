import { useSyncExternalStore } from 'react'
import { sound } from '../audio/sound'

export function useSoundSettings() {
  return useSyncExternalStore(sound.subscribe, sound.getSettings, sound.getSettings)
}
