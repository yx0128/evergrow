import { describe, expect, it } from 'vitest'
import { CONFIG, type InvalidReason } from '../config/evergrow.config'
import {
  digUp,
  getCell,
  getLevelRange,
  MIN_LEVEL,
  paint,
  removeCell,
  setCell,
  setLevel,
  setType,
} from './cells'
import type { Cell, CellMap, CellResult } from './cells'
import { key } from './grid'

const HALF_WORLD = CONFIG.world.maxSize / 2
const HALF_START = CONFIG.world.startZone / 2
const MAX = CONFIG.world.maxStack

const cell = (
  x: number,
  z: number,
  type: Cell['type'] = 'grass',
  level = 1,
): Cell => ({ x, z, type, level })

const mapWith = (...cells: Cell[]): CellMap =>
  new Map(cells.map((it) => [key(it.x, it.z), it]))

function expectOk(result: CellResult): CellMap {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
  return result.cells
}

function expectFail(result: CellResult, reason: InvalidReason): void {
  expect(result).toEqual({ ok: false, reason })
}

describe('setCell', () => {
  it('adds a level-1 cell without mutating the input map', () => {
    const cells = mapWith()
    const result = setCell(cells, cell(2, -3, 'land'))

    expect(cells.size).toBe(0)
    expect(expectOk(result).get(key(2, -3))).toEqual(cell(2, -3, 'land'))
  })

  it('accepts level 1 and maxStack', () => {
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MIN_LEVEL))).size).toBe(1)
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MAX))).size).toBe(1)
  })

  it('replaces an existing cell', () => {
    const cells = mapWith(cell(1, 1, 'grass', 3))
    const next = expectOk(setCell(cells, cell(1, 1, 'water', 4)))

    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'grass', 3))
    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'water', 4))
  })

  it('rejects invalid levels and stores nothing', () => {
    const cases: [number, InvalidReason][] = [
      [0, 'minStack'],
      [MAX + 1, 'maxStack'],
      [NaN, 'minStack'],
      [2.5, 'minStack'],
      [Infinity, 'minStack'],
    ]
    for (const [level, reason] of cases) {
      const cells = mapWith()
      const before = [...cells]

      expectFail(setCell(cells, cell(0, 0, 'grass', level)), reason)

      expect([...cells]).toEqual(before)
      expect(cells.size).toBe(0)
    }
  })
})

describe('removeCell', () => {
  it('removes one cell and leaves the rest untouched', () => {
    const cells = mapWith(cell(0, 0), cell(1, 0, 'land'))
    const next = removeCell(cells, 0, 0)

    expect(cells.size).toBe(2)
    expect(next.size).toBe(1)
    expect(next.has(key(0, 0))).toBe(false)
    expect(next.has(key(1, 0))).toBe(true)
  })

  it('returns a new map when the cell does not exist', () => {
    const cells = mapWith(cell(0, 0))
    const next = removeCell(cells, 5, 5)

    expect(next).not.toBe(cells)
    expect(next).toEqual(cells)
  })
})

describe('setLevel', () => {
  it('accepts level 1 and maxStack', () => {
    const cells = mapWith(cell(-2, 4, 'water', 2))
    expect(getCell(expectOk(setLevel(cells, -2, 4, MIN_LEVEL)), -2, 4)?.level).toBe(
      MIN_LEVEL,
    )
    expect(getCell(expectOk(setLevel(cells, -2, 4, MAX)), -2, 4)?.level).toBe(MAX)
  })

  it('changes only the level', () => {
    const cells = mapWith(cell(-2, 4, 'water', 2))
    const next = expectOk(setLevel(cells, -2, 4, 5))

    expect(getCell(cells, -2, 4)).toEqual(cell(-2, 4, 'water', 2))
    expect(getCell(next, -2, 4)).toEqual(cell(-2, 4, 'water', 5))
  })

  it('rejects out-of-range and non-integer levels without changing the input', () => {
    const cases: [number, InvalidReason][] = [
      [0, 'minStack'],
      [MAX + 1, 'maxStack'],
      [NaN, 'minStack'],
      [2.5, 'minStack'],
    ]
    const cells = mapWith(cell(0, 0, 'grass', 3))
    const before = [...cells]

    for (const [level, reason] of cases) {
      expectFail(setLevel(cells, 0, 0, level), reason)
      expect([...cells]).toEqual(before)
      expect(getCell(cells, 0, 0)?.level).toBe(3)
    }
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith(cell(0, 0))
    const result = setLevel(cells, 9, 9, 4)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })
})

describe('setType', () => {
  it('changes only the type', () => {
    const cells = mapWith(cell(3, 3, 'grass', 6))
    const next = expectOk(setType(cells, 3, 3, 'water'))

    expect(getCell(cells, 3, 3)?.type).toBe('grass')
    expect(getCell(next, 3, 3)).toEqual(cell(3, 3, 'water', 6))
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith()
    const result = setType(cells, 1, 2, 'land')

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })
})

describe('paint', () => {
  it('creates a level-1 cell in the start zone', () => {
    const result = paint(mapWith(), 0, 0, 'water')
    expect(getCell(expectOk(result), 0, 0)).toEqual(cell(0, 0, 'water', MIN_LEVEL))
  })

  it('changes type but keeps the level of an existing cell', () => {
    const cells = mapWith(cell(2, 3, 'grass', 5))
    expect(getCell(expectOk(paint(cells, 2, 3, 'land')), 2, 3)).toEqual(
      cell(2, 3, 'land', 5),
    )
    expect(getCell(cells, 2, 3)).toEqual(cell(2, 3, 'grass', 5))
  })

  it('rejects empty cells outside the start zone and the ring', () => {
    expectFail(paint(mapWith(), HALF_START + 2, 0, 'grass'), 'outsideBuildableZone')
  })

  it('rejects a cell just outside the world edge even inside an edge tile ring', () => {
    const cells = mapWith(cell(HALF_WORLD - 1, 0))
    expectFail(paint(cells, HALF_WORLD, 0, 'grass'), 'outsideWorld')
  })
})

describe('digUp', () => {
  it('removes one level', () => {
    const cells = mapWith(cell(1, 1, 'land', 3))
    const next = expectOk(digUp(cells, 1, 1))

    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'land', 2))
    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'land', 3))
  })

  it('removes the cell at level 1', () => {
    const cells = mapWith(cell(1, 1, 'land', MIN_LEVEL))
    const next = expectOk(digUp(cells, 1, 1))

    expect(next.has(key(1, 1))).toBe(false)
    expect(next.size).toBe(0)
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith(cell(1, 1))
    const result = digUp(cells, 4, 4)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })
})

describe('getLevelRange', () => {
  it('returns minLevel..maxStack for empty and filled cells (§5.4)', () => {
    const expected = { min: MIN_LEVEL, max: MAX }
    expect(getLevelRange(0, 0, mapWith())).toEqual(expected)
    expect(getLevelRange(0, 0, mapWith(cell(0, 0, 'grass', 4)))).toEqual(expected)
  })
})
