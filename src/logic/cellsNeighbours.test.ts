import { describe, expect, it } from 'vitest'
import { CONFIG, type TileType } from '../config/evergrow.config'
import { digUp, paint, setCell, setLevel, setType } from './cells'
import { DIRECTIONS } from './grid'
import { getLevelRange } from './placement'
import { expectOk, getCell } from './testing/cellFixtures'
import { cell, mapWith } from './testing/fixtures'

const HALF_START = CONFIG.world.startZone / 2
const MAX = CONFIG.world.maxStack
const MIN = CONFIG.world.minStack

describe('no water or neighbour rules (D014)', () => {
  it('setCell stores water at any height beside any neighbour', () => {
    const cells = mapWith(cell(1, 0, 'land', 1))
    const next = expectOk(setCell(cells, cell(0, 0, 'water', 5)))

    expect(getCell(next, 0, 0)).toEqual(cell(0, 0, 'water', 5))
  })

  it('setLevel raises water above a lower neighbour', () => {
    const cells = mapWith(cell(0, 0, 'water', 1), cell(1, 0, 'land', 1))

    expect(getCell(expectOk(setLevel(cells, 0, 0, MAX)), 0, 0)?.level).toBe(MAX)
  })

  it('setLevel raises land beside water', () => {
    const cells = mapWith(cell(0, 0, 'land', 1), cell(1, 0, 'water', 1))

    expect(getCell(expectOk(setLevel(cells, 0, 0, MAX)), 0, 0)?.level).toBe(MAX)
  })

  it('setType makes water beside a different height', () => {
    const cells = mapWith(cell(0, 0, 'land', 2), cell(1, 0, 'grass', 5))

    expect(getCell(expectOk(setType(cells, 0, 0, 'water')), 0, 0)).toEqual(
      cell(0, 0, 'water', 2),
    )
  })

  it('paint turns a raised column into water', () => {
    const cells = mapWith(cell(2, 3, 'grass', 5))

    expect(getCell(expectOk(paint(cells, 2, 3, 'water')), 2, 3)).toEqual(
      cell(2, 3, 'water', 5),
    )
  })

  it('paint turns raised water into land', () => {
    const cells = mapWith(cell(2, 3, 'water', 5))

    expect(getCell(expectOk(paint(cells, 2, 3, 'land')), 2, 3)).toEqual(
      cell(2, 3, 'land', 5),
    )
  })

  it('paint places water beside land', () => {
    const cells = mapWith(cell(0, 0, 'land'))

    expect(getCell(expectOk(paint(cells, 1, 0, 'water')), 1, 0)?.type).toBe('water')
  })

  it('paint places land beside water', () => {
    const cells = mapWith(cell(0, 0, 'water'))

    expect(getCell(expectOk(paint(cells, 1, 0, 'land')), 1, 0)?.type).toBe('land')
  })

  it('paint places water beside a raised tile', () => {
    const cells = mapWith(cell(0, 0, 'land', MAX))

    expect(getCell(expectOk(paint(cells, 1, 0, 'water')), 1, 0)).toEqual(
      cell(1, 0, 'water', MIN),
    )
  })

  it('paint places water in the ring outside the start zone', () => {
    const cells = mapWith(cell(HALF_START - 1, 0, 'grass'))

    expect(getCell(expectOk(paint(cells, HALF_START + 3, 0, 'water')), HALF_START + 3, 0)?.type).toBe(
      'water',
    )
  })

  it('digUp lowers water one level at a time', () => {
    const cells = mapWith(cell(1, 1, 'water', 3))

    expect(getCell(expectOk(digUp(cells, 1, 1)), 1, 1)).toEqual(cell(1, 1, 'water', 2))
  })

  it('digUp removes level-1 water', () => {
    const cells = mapWith(cell(1, 1, 'water', 1))

    expect(expectOk(digUp(cells, 1, 1)).size).toBe(0)
  })

  it('tile edits ignore every neighbour type, direction and height', () => {
    const types: TileType[] = ['grass', 'land', 'water']
    const heights = [MIN, MAX]

    for (const type of types) {
      for (const neighbourType of types) {
        for (const direction of Object.values(DIRECTIONS)) {
          for (const height of heights) {
            for (const neighbourHeight of heights) {
              const near = cell(direction.x, direction.z, neighbourType, neighbourHeight)
              const both = mapWith(cell(0, 0, type, height), near)

              expect(getCell(expectOk(setCell(mapWith(near), cell(0, 0, type, height))), 0, 0)?.level).toBe(height)
              for (const target of heights) {
                expect(getCell(expectOk(setLevel(both, 0, 0, target)), 0, 0)?.level).toBe(target)
              }
              expect(getCell(expectOk(paint(mapWith(near), 0, 0, type)), 0, 0)).toEqual(
                cell(0, 0, type, MIN),
              )
              expect(getCell(expectOk(digUp(both, 0, 0)), 0, 0)?.level).toBe(height === MIN ? undefined : height - 1)
              expect(
                getLevelRange(0, 0, { cells: both, occupancy: new Map(), items: new Map() }, new Map()),
              ).toEqual({ min: MIN, max: MAX })
            }
          }
        }
      }
    }
  })
})
