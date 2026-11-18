import { describe, expect, it } from 'vitest'
import { CONFIG, type InvalidReason } from '../config/evergrow.config'
import { digUp, paint, setCell, setLevel, setType } from './cells'
import { key } from './grid'
import { expectFail, expectOk, getCell } from './testing/cellFixtures'
import { cell, mapWith } from './testing/fixtures'

const HALF_WORLD = CONFIG.world.maxSize / 2
const HALF_START = CONFIG.world.startZone / 2
const MAX = CONFIG.world.maxStack
const MIN = CONFIG.world.minStack

describe('setCell', () => {
  it('adds a level-1 cell without mutating the input map', () => {
    const cells = mapWith()
    const result = setCell(cells, cell(2, -3, 'land'))

    expect(cells.size).toBe(0)
    expect(expectOk(result).get(key(2, -3))).toEqual(cell(2, -3, 'land'))
  })

  it('accepts level 1 and maxStack', () => {
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MIN))).size).toBe(1)
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MAX))).size).toBe(1)
  })

  it('replaces an existing cell', () => {
    const cells = mapWith(cell(1, 1, 'grass', 3))
    const next = expectOk(setCell(cells, cell(1, 1, 'water', 4)))

    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'grass', 3))
    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'water', 4))
  })

  it('throws on non-integer coordinates', () => {
    expect(() => setCell(mapWith(), cell(1.5, 0))).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })

  it('rejects invalid levels and stores nothing', () => {
    const cases: [number, InvalidReason][] = [
      [0, 'minStack'],
      [MAX + 1, 'maxStack'],
      [NaN, 'minStack'],
      [2.5, 'minStack'],
      [Infinity, 'maxStack'],
      [-Infinity, 'minStack'],
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

describe('setLevel', () => {
  it('accepts level 1 and maxStack', () => {
    const cells = mapWith(cell(-2, 4, 'water', 2))
    expect(getCell(expectOk(setLevel(cells, -2, 4, MIN)), -2, 4)?.level).toBe(
      MIN,
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
      [Infinity, 'maxStack'],
      [-Infinity, 'minStack'],
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

  it('throws on non-integer coordinates', () => {
    expect(() => setLevel(mapWith(), 1.5, 0, 2)).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })

  it('on an empty cell ignores an invalid level', () => {
    const cells = mapWith()
    const result = setLevel(cells, 9, 9, MAX + 1)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })

  it('on an empty cell ignores every invalid level', () => {
    const cells = mapWith()

    for (const level of [0, MAX + 1, NaN, 2.5, Infinity, -Infinity]) {
      expect(expectOk(setLevel(cells, 9, 9, level))).toBe(cells)
    }
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

  it('throws on non-integer coordinates', () => {
    expect(() => setType(mapWith(), 1.5, 0, 'land')).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })
})

describe('paint', () => {
  it('creates a level-1 cell in the start zone', () => {
    const result = paint(mapWith(), 0, 0, 'water')
    expect(getCell(expectOk(result), 0, 0)).toEqual(cell(0, 0, 'water', MIN))
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

  it('returns outsideWorld for invalid coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => paint(mapWith(), x, z, 'grass')).not.toThrow()
      expectFail(paint(mapWith(), x, z, 'grass'), 'outsideWorld')
    }
  })
})

describe('digUp', () => {
  it('returns outsideWorld for an integer outside the world', () => {
    expectFail(digUp(mapWith(), HALF_WORLD, 0), 'outsideWorld')
  })

  it('lowers x,z and not z,x', () => {
    const cells = mapWith(cell(1, 2, 'land', 3), cell(2, 1, 'grass', 5))
    const next = expectOk(digUp(cells, 1, 2))

    expect(getCell(next, 1, 2)?.level).toBe(2)
    expect(getCell(next, 2, 1)?.level).toBe(5)
  })

  it('takes level 2 down to level 1', () => {
    const cells = mapWith(cell(1, 1, 'land', 2))

    expect(getCell(expectOk(digUp(cells, 1, 1)), 1, 1)).toEqual(cell(1, 1, 'land', 1))
  })

  it('removes one level', () => {
    const cells = mapWith(cell(1, 1, 'land', 3))
    const next = expectOk(digUp(cells, 1, 1))

    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'land', 2))
    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'land', 3))
  })

  it('removes the cell at level 1', () => {
    const cells = mapWith(cell(1, 1, 'land', MIN))
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

  it('returns outsideWorld for invalid coordinates without throwing', () => {
    expect(() => digUp(mapWith(), 0.5, 0)).not.toThrow()
    expectFail(digUp(mapWith(), 0.5, 0), 'outsideWorld')
    expectFail(digUp(mapWith(), NaN, 0), 'outsideWorld')
  })
})
