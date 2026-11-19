import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { chunkOf } from '../scene/tileGeometry'

async function load() {
  const world = await import('./world')
  const seed = await import('./devSeed')
  return { world, seed }
}

const cellAt = (world: Awaited<ReturnType<typeof load>>['world'], x: number, z: number) =>
  world.useWorldStore.getState().cells.get(`${x},${z}`)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('devSeed', () => {
  it('does nothing when DEV is false', async () => {
    vi.stubEnv('DEV', false)
    const { world, seed } = await load()
    seed.seedDevWorld()

    const state = world.useWorldStore.getState()
    expect(state.cells.size).toBe(0)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('seeds mixed terrain once through commands and clears the history', async () => {
    vi.stubEnv('DEV', true)
    const { world, seed } = await load()
    seed.seedDevWorld()

    const state = world.useWorldStore.getState()
    expect(state.cells.size).toBeGreaterThan(0)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)

    const types = new Set([...state.cells.values()].map((cell) => cell.type))
    expect(types).toEqual(new Set(['grass', 'land', 'water']))
    expect([...state.cells.values()].some((cell) => cell.x < 0)).toBe(true)

    const levels = new Set([...state.cells.values()].map((cell) => cell.level))
    const expectedLevels = Array.from(
      { length: CONFIG.world.maxStack - CONFIG.world.minStack + 1 },
      (_, index) => CONFIG.world.minStack + index,
    )
    expect([...levels].sort((a, b) => a - b)).toEqual(expectedLevels)

    const chunks = new Set(
      [...state.cells.values()].map((cell) => {
        const chunk = chunkOf(cell.x, cell.z)
        return `${chunk.cx},${chunk.cz}`
      }),
    )
    expect(chunks.size).toBeGreaterThan(1)
    expect(chunks.has('-1,-1')).toBe(true)
    expect(chunks.has('0,-1')).toBe(true)

    expect(cellAt(world, -4, -2)?.level).toBe(CONFIG.world.maxStack)
    expect(cellAt(world, -2, 0)?.type).toBe('land')
    expect(cellAt(world, -2, 1)?.type).toBe('water')
    expect(cellAt(world, -2, 1)?.level).toBe(Math.ceil(CONFIG.world.maxStack / 2))
    expect(cellAt(world, -2, 1)!.level).toBeGreaterThan(cellAt(world, -2, 0)!.level)

    seed.seedDevWorld()
    const again = world.useWorldStore.getState()
    expect(again.cells).toBe(state.cells)
    expect(again.history.past).toHaveLength(0)
    expect(again.history.future).toHaveLength(0)
  })

  it('warns when the seed batch fails', async () => {
    vi.stubEnv('DEV', true)
    const { world, seed } = await load()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(world.useWorldStore.getState(), 'executeBatch').mockReturnValue({
      ok: false,
      reason: 'outsideWorld',
    } as never)

    seed.seedDevWorld()

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DEBUG seed failed'))
    expect(world.useWorldStore.getState().cells.size).toBe(0)
  })

  it('warns when the seed batch skips commands', async () => {
    vi.stubEnv('DEV', true)
    const { world, seed } = await load()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(world.useWorldStore.getState(), 'executeBatch').mockReturnValue({
      ok: true,
      skipped: [{ index: 0, reason: 'outsideWorld' }],
    } as never)

    seed.seedDevWorld()

    expect(warn).toHaveBeenCalledWith('DEBUG seed skipped commands', [
      { index: 0, reason: 'outsideWorld' },
    ])
  })
})
