import { CONFIG } from '../config/evergrow.config'
import { blocksCameraShortcut, type FocusLike } from './cameraMath'

export interface DevSeedKeyEvent {
  readonly key: string
  readonly repeat: boolean
  readonly ctrlKey?: boolean
  readonly metaKey?: boolean
  readonly altKey?: boolean
  readonly shiftKey?: boolean
  readonly target?: FocusLike | null
}

/** True when a keydown should seed dev terrain; respects the camera shortcut guards. */
export function isDevSeedShortcut(
  event: DevSeedKeyEvent,
  dev: boolean = import.meta.env.DEV,
): boolean {
  if (!dev || event.repeat || event.key !== CONFIG.ui.devSeedKey) return false
  return !blocksCameraShortcut(
    event.target ?? null,
    event.ctrlKey === true ||
      event.metaKey === true ||
      event.altKey === true ||
      event.shiftKey === true,
  )
}
