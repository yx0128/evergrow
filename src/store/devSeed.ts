import { useWorldStore } from './world'

let seeded = false

/** DEBUG: seed three tiles through the real paint command; removed with tile rendering. */
export function seedDevWorld(): void {
  if (!import.meta.env.DEV || seeded) return
  seeded = true

  const store = useWorldStore.getState()
  const tiles = [
    { x: -5, z: -5, type: 'grass' },
    { x: -4, z: -5, type: 'land' },
    { x: -5, z: -4, type: 'water' },
  ] as const

  for (const tile of tiles) {
    const result = store.execute({ kind: 'paint', ...tile })
    if (!result.ok) {
      console.warn(`DEBUG seed paint failed at ${tile.x},${tile.z}: ${result.reason}`)
    }
  }

  useWorldStore.getState().clearHistory()
}
