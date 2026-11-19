import { describe, expect, it } from 'vitest'
import { CONFIG, type TileType } from '../config/evergrow.config'
import type { Cell, CellMap } from '../logic/cells'
import { planFades, shouldFadeTiles } from './tileGeometry'
import {
  applyFadePlan,
  commitTileCells,
  createTileSceneState,
  finishFade,
  type TileSceneState,
} from './tileState'

const cell = (x: number, z: number, type: TileType = 'grass', level = 1): Cell => ({
  x,
  z,
  type,
  level,
})

const mapOf = (...cells: Cell[]): CellMap =>
  new Map(cells.map((value) => [`${value.x},${value.z}`, value]))

const empty: CellMap = new Map()
const canFade = shouldFadeTiles('execute', false)

function apply(state: TileSceneState, next: CellMap): TileSceneState {
  return applyFadePlan(
    state,
    planFades(state.cells, next, canFade),
    0,
  )
}

describe('tileSceneState', () => {
  it('finishes a fade-in with the level in the chunks and the overlay gone', () => {
    const next = mapOf(cell(0, 0, 'grass', 2))
    const fading = apply(createTileSceneState(empty), next)
    expect(fading.fades).toHaveLength(1)
    expect(fading.chunks.has('0,0')).toBe(false)

    const done = finishFade(fading, fading.fades[0].id, next)
    const chunk = done.chunks.get('0,0')
    const top = chunk?.parts.grass.tops[0]

    expect(top?.y).toBe(2 * CONFIG.world.tileThickness)
    expect(chunk?.parts.grass.sides).toHaveLength(8)
    expect(done.fades).toEqual([])
  })

  it('finishes a fade-out by only removing the overlay', () => {
    const state = createTileSceneState(mapOf(cell(0, 0, 'land', 2)))
    const fading = apply(state, empty)
    expect(fading.fades).toHaveLength(1)
    expect(fading.chunks.size).toBe(0)

    const done = finishFade(fading, fading.fades[0].id, empty)
    expect(done.fades).toEqual([])
    expect(done.chunks).toBe(fading.chunks)
    expect(done.cells).toBe(fading.cells)
  })

  it('adds a floor below water tops only', () => {
    const state = createTileSceneState(
      mapOf(cell(0, 0, 'water', 3), cell(1, 0, 'grass', 1), cell(2, 0, 'land', 1)),
    )
    const parts = state.chunks.get('0,0')?.parts
    const topY = 3 * CONFIG.world.tileThickness

    expect(parts?.water.tops).toHaveLength(1)
    expect(parts?.water.tops[0].y).toBe(topY)
    expect(parts?.water.floors).toHaveLength(1)
    expect(parts?.water.floors[0].y).toBe(topY - CONFIG.water.floorDepth)
    expect(parts?.grass.floors).toEqual([])
    expect(parts?.land.floors).toEqual([])
  })

  it('keeps new levels out of the chunks while they fade and preserves other chunks', () => {
    const far = cell(32, 0)
    const state = createTileSceneState(mapOf(far))
    const farChunk = state.chunks.get('2,0')
    const next = mapOf(far, cell(1, 1, 'water', 1))

    const fading = apply(state, next)
    expect(fading.fades).toHaveLength(1)
    expect(fading.fades[0]).toMatchObject({ x: 1, z: 1, mode: 'in', levels: [1] })
    expect(fading.chunks.has('0,0')).toBe(false)
    expect(fading.chunks.get('2,0')).toBe(farChunk)
  })

  it('commits cells immediately and drops overlays', () => {
    const next = mapOf(cell(0, 0, 'grass', 2))
    const fading = apply(createTileSceneState(empty), next)
    expect(fading.fades).toHaveLength(1)
    expect(fading.chunks.has('0,0')).toBe(false)

    const committed = commitTileCells(fading, next)
    expect(committed.fades).toEqual([])
    expect(committed.chunks.get('0,0')?.parts.grass.tops).toHaveLength(1)
  })

  it('ignores an unknown fade id', () => {
    const state = createTileSceneState(empty)
    expect(finishFade(state, 999, empty)).toBe(state)
  })
})
