import { describe, expect, it } from 'vitest'
import type { TileType } from '../config/evergrow.config'
import type { Cell, CellMap } from '../logic/cells'
import { planFades, shouldFadeTiles } from './tileGeometry'

const cell = (x: number, z: number, type: TileType = 'grass', level = 1): Cell => ({
  x,
  z,
  type,
  level,
})

const mapOf = (...cells: Cell[]): CellMap =>
  new Map(cells.map((value) => [`${value.x},${value.z}`, value]))

const empty: CellMap = new Map()

describe('planFades', () => {
  it.each(['execute', 'batch'] as const)('fades new levels on %s', (source) => {
    const next = mapOf(cell(0, 0, 'grass', 2))
    const plan = planFades(empty, next, shouldFadeTiles(source, false))

    expect(plan.cells.has('0,0')).toBe(false)
    expect(plan.fades).toHaveLength(1)
    expect(plan.fades[0]).toMatchObject({
      mode: 'in',
      type: 'grass',
      levels: [1, 2],
    })
  })

  it.each(['undo', 'redo'] as const)('is instant on %s', (source) => {
    const next = mapOf(cell(0, 0, 'grass', 2))
    const plan = planFades(empty, next, shouldFadeTiles(source, false))

    expect(plan.fades).toEqual([])
    expect(plan.cells).toBe(next)
  })

  it('is instant under reduced motion', () => {
    const next = mapOf(cell(0, 0, 'grass', 2))
    const plan = planFades(empty, next, shouldFadeTiles('execute', true))

    expect(plan.fades).toEqual([])
    expect(plan.cells).toBe(next)
  })

  it('is instant for a type change', () => {
    const prev = mapOf(cell(0, 0, 'grass', 2))
    const next = mapOf(cell(0, 0, 'water', 2))
    const plan = planFades(prev, next, shouldFadeTiles('execute', false))

    expect(plan.fades).toEqual([])
    expect(plan.cells).toBe(next)
  })

  it('fades in every level of a new column', () => {
    const next = mapOf(cell(0, 0, 'water', 3))
    const plan = planFades(empty, next, shouldFadeTiles('execute', false))

    expect(plan.fades[0].levels).toEqual([1, 2, 3])
    expect(plan.fades[0].cell).toEqual(cell(0, 0, 'water', 3))
  })

  it('fades in only the new levels when raising a column', () => {
    const prev = mapOf(cell(0, 0, 'land', 2))
    const next = mapOf(cell(0, 0, 'land', 4))
    const plan = planFades(prev, next, shouldFadeTiles('execute', false))

    expect(plan.cells.get('0,0')?.level).toBe(2)
    expect(plan.fades[0].levels).toEqual([3, 4])
    expect(plan.fades[0].cell.level).toBe(4)
    expect(plan.fades[0].sides.every((side) => side.level >= 3)).toBe(true)
  })

  it('fades out only the removed levels when lowering or digging up', () => {
    const high = mapOf(cell(0, 0, 'land', 4))
    const low = mapOf(cell(0, 0, 'land', 2))
    const lower = planFades(high, low, shouldFadeTiles('execute', false))

    expect(lower.cells.get('0,0')?.level).toBe(2)
    expect(lower.fades[0]).toMatchObject({ mode: 'out', levels: [3, 4] })

    const dug = planFades(
      mapOf(cell(0, 0, 'grass', 1)),
      empty,
      shouldFadeTiles('execute', false),
    )
    expect(dug.cells.size).toBe(0)
    expect(dug.fades[0]).toMatchObject({ mode: 'out', levels: [1] })
  })

  it('only draws exposed sides on a fade overlay', () => {
    const next = mapOf(cell(0, 0, 'grass', 2), cell(1, 0, 'land', 2))
    const plan = planFades(empty, next, shouldFadeTiles('execute', false))
    const fade = plan.fades.find((value) => value.x === 0)

    expect(fade?.sides.some((side) => side.dir === 'E')).toBe(false)
  })

  it('commits earlier pending levels and fades only the new change', () => {
    const next = mapOf(cell(0, 0, 'grass', 2), cell(1, 0, 'water', 1))
    const second = planFades(
      mapOf(cell(0, 0, 'grass', 2)),
      next,
      shouldFadeTiles('execute', false),
    )

    expect(second.cells.get('0,0')?.level).toBe(2)
    expect(second.cells.has('1,0')).toBe(false)
    expect(second.fades).toHaveLength(1)
    expect(second.fades[0]).toMatchObject({ x: 1, z: 0, mode: 'in', levels: [1] })
  })

  it('starts no fades when nothing was added or removed', () => {
    const cells = mapOf(cell(0, 0, 'grass', 2))
    const plan = planFades(cells, new Map(cells), shouldFadeTiles('execute', false))

    expect(plan.fades).toEqual([])
  })
})

describe('shouldFadeTiles', () => {
  it.each(['execute', 'batch'] as const)('fades on %s', (source) => {
    expect(shouldFadeTiles(source, false)).toBe(true)
  })

  it.each(['undo', 'redo', 'none'] as const)('is instant on %s', (source) => {
    expect(shouldFadeTiles(source, false)).toBe(false)
  })

  it('is instant for every source under reduced motion', () => {
    for (const source of ['none', 'execute', 'batch', 'undo', 'redo'] as const) {
      expect(shouldFadeTiles(source, true)).toBe(false)
    }
  })
})
