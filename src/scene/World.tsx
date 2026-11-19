import { useEffect } from 'react'
import { seedDevWorld } from '../store/devSeed'
import { CameraRig } from './CameraRig'
import type { FocusLike } from './cameraMath'
import { isDevSeedShortcut } from './devSeedShortcut'
import { Lighting } from './Lighting'
import { TileChunks } from './TileChunks'

export function World() {
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !isDevSeedShortcut({
          key: event.key,
          repeat: event.repeat,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          target: event.target as FocusLike | null,
        })
      ) {
        return
      }
      event.preventDefault()
      seedDevWorld()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <Lighting />
      <CameraRig />
      <TileChunks />
    </>
  )
}
