import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedDevWorld } from './devSeed'
import { useWorldStore } from './world'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('devSeed', () => {
  it('does nothing when DEV is false', () => {
    vi.stubEnv('DEV', false)
    seedDevWorld()

    const state = useWorldStore.getState()
    expect(state.cells.size).toBe(0)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('seeds three paint cells once and clears the history', () => {
    vi.stubEnv('DEV', true)
    seedDevWorld()

    const seeded = useWorldStore.getState()
    expect(seeded.cells.size).toBe(3)
    expect(seeded.canUndo).toBe(false)
    expect(seeded.canRedo).toBe(false)

    seedDevWorld()
    const again = useWorldStore.getState()
    expect(again.cells.size).toBe(3)
    expect(again.history.past).toHaveLength(0)
    expect(again.history.future).toHaveLength(0)
  })
})
