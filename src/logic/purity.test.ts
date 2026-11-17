import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import {
  digUp,
  getLevelRange,
  paint,
  removeCell,
  setCell,
  setLevel,
  setType,
} from './cells'
import type { CellMap } from './cells'
import { isBuildable, landBounds, key } from './grid'

const MAX = CONFIG.world.maxStack

const base = (): CellMap =>
  new Map([
    [key(0, 0), { x: 0, z: 0, type: 'grass' as const, level: 3 }],
    [key(1, 0), { x: 1, z: 0, type: 'land' as const, level: 1 }],
    [key(0, 1), { x: 0, z: 1, type: 'water' as const, level: MAX }],
  ])

function expectPure(run: (cells: CellMap) => unknown): void {
  const cells = base()
  const size = cells.size
  const before = structuredClone([...cells])

  run(cells)

  expect([...cells]).toEqual(before)
  expect(cells.size).toBe(size)
}

describe('logic purity', () => {
  it('setCell does not mutate the input', () => {
    expectPure((cells) => setCell(cells, { x: 5, z: 5, type: 'grass', level: 1 }))
  })

  it('setCell rejected level does not mutate the input', () => {
    expectPure((cells) => setCell(cells, { x: 5, z: 5, type: 'grass', level: 0 }))
  })

  it('removeCell does not mutate the input', () => {
    expectPure((cells) => removeCell(cells, 0, 0))
  })

  it('setLevel does not mutate the input', () => {
    expectPure((cells) => setLevel(cells, 0, 0, 4))
  })

  it('a rejected setLevel does not mutate the input', () => {
    expectPure((cells) => setLevel(cells, 0, 0, MAX + 1))
  })

  it('setType does not mutate the input', () => {
    expectPure((cells) => setType(cells, 0, 0, 'water'))
  })

  it('paint on an existing cell does not mutate the input', () => {
    expectPure((cells) => paint(cells, 0, 0, 'land'))
  })

  it('paint on an empty cell does not mutate the input', () => {
    expectPure((cells) => paint(cells, 2, 2, 'grass'))
  })

  it('digUp above level 1 does not mutate the input', () => {
    expectPure((cells) => digUp(cells, 0, 0))
  })

  it('digUp at level 1 does not mutate the input', () => {
    expectPure((cells) => digUp(cells, 1, 0))
  })

  it('isBuildable does not mutate the input', () => {
    expectPure((cells) => isBuildable(2, 2, cells))
  })

  it('landBounds does not mutate the input', () => {
    expectPure((cells) => landBounds(cells))
  })

  it('getLevelRange does not mutate the input', () => {
    expectPure((cells) => getLevelRange(0, 0, cells))
  })
})
