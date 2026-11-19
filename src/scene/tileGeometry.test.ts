import { describe, expect, it } from 'vitest'
import { CONFIG, type TileType } from '../config/evergrow.config'
import type { Cell, CellMap } from '../logic/cells'
import {
  affectedChunks,
  chunkKey,
  chunkOf,
  diffLevels,
  exposedSides,
  groupByChunk,
  sidePlacement,
  type SideDirection,
} from './tileGeometry'

const cell = (x: number, z: number, type: TileType = 'grass', level = 1): Cell => ({
  x,
  z,
  type,
  level,
})

const mapOf = (...cells: Cell[]): CellMap =>
  new Map(cells.map((value) => [`${value.x},${value.z}`, value]))

const side = (dir: SideDirection, level: number) => ({ dir, level })

describe('tileGeometry', () => {
  it('assigns negative and boundary cells to the right chunk', () => {
    expect(chunkOf(0, 0)).toEqual({ cx: 0, cz: 0 })
    expect(chunkOf(15, 15)).toEqual({ cx: 0, cz: 0 })
    expect(chunkOf(16, 16)).toEqual({ cx: 1, cz: 1 })
    expect(chunkOf(-1, -1)).toEqual({ cx: -1, cz: -1 })
    expect(chunkOf(-16, -16)).toEqual({ cx: -1, cz: -1 })
    expect(chunkOf(-17, -17)).toEqual({ cx: -2, cz: -2 })
    expect(CONFIG.world.chunkSize).toBe(16)
  })

  it('groups cells by their chunk', () => {
    const cells = mapOf(
      cell(-1, 0, 'grass', 1),
      cell(0, 0, 'land', 2),
      cell(15, -1, 'water', 3),
      cell(-17, 16, 'grass', 1),
    )
    const groups = groupByChunk(cells)

    expect([...groups.keys()].sort()).toEqual(
      [chunkKey(-2, 1), chunkKey(-1, 0), chunkKey(0, -1), chunkKey(0, 0)].sort(),
    )
    expect(groups.get(chunkKey(-2, 1))?.map((entry) => entry.x)).toEqual([-17])
    expect(groups.get(chunkKey(-1, 0))?.map((entry) => entry.x)).toEqual([-1])
    expect(groups.get(chunkKey(0, -1))?.map((entry) => entry.z)).toEqual([-1])
  })

  describe('exposedSides', () => {
    const directions: readonly {
      readonly dir: SideDirection
      readonly dx: number
      readonly dz: number
    }[] = [
      { dir: 'N', dx: 0, dz: -1 },
      { dir: 'E', dx: 1, dz: 0 },
      { dir: 'S', dx: 0, dz: 1 },
      { dir: 'W', dx: -1, dz: 0 },
    ]

    const cases: readonly {
      readonly name: string
      readonly neighbourLevel: number | null
      readonly expected: readonly number[]
    }[] = [
      { name: 'empty', neighbourLevel: null, expected: [1, 2, 3] },
      { name: 'lower', neighbourLevel: 2, expected: [3] },
      { name: 'lower by two', neighbourLevel: 1, expected: [2, 3] },
      { name: 'equal', neighbourLevel: 3, expected: [] },
      { name: 'higher', neighbourLevel: 4, expected: [] },
    ]

    for (const { dir, dx, dz } of directions) {
      for (const testCase of cases) {
        it(`draws ${testCase.name} neighbour levels to ${dir}`, () => {
          const centre = cell(0, 0, 'grass', 3)
          const neighbourCell =
            testCase.neighbourLevel === null
              ? null
              : cell(dx, dz, 'land', testCase.neighbourLevel)
          const cells = mapOf(centre, ...(neighbourCell ? [neighbourCell] : []))
          const expected = testCase.expected.map((level) => side(dir, level))

          expect(exposedSides(centre, cells).filter((face) => face.dir === dir)).toEqual(
            expected,
          )
        })
      }
    }

    it('draws every level on an isolated column and ignores tile types', () => {
      const types: TileType[] = ['grass', 'land', 'water']
      for (const type of types) {
        for (const neighbourType of types) {
          const cells = mapOf(
            cell(0, 0, type, 2),
            cell(0, -1, neighbourType, 1),
            cell(1, 0, neighbourType, 1),
            cell(0, 1, neighbourType, 1),
            cell(-1, 0, neighbourType, 1),
          )

          expect(exposedSides(cells.get('0,0')!, cells)).toEqual([
            side('N', 2),
            side('E', 2),
            side('S', 2),
            side('W', 2),
          ])
        }
      }
    })

    it('counts exactly 20 exposed sides for the fixed layout', () => {
      const cells = mapOf(
        cell(0, 0, 'grass', 2),
        cell(1, 0, 'water', 1),
        cell(0, 1, 'land', 3),
        cell(-1, 0, 'grass', 1),
      )

      const total = [...cells.values()].reduce(
        (count, column) => count + exposedSides(column, cells).length,
        0,
      )

      expect(total).toBe(20)
      expect(exposedSides(cells.get('0,0')!, cells)).toEqual([
        side('N', 1),
        side('N', 2),
        side('E', 2),
        side('W', 2),
      ])
      expect(exposedSides(cells.get('1,0')!, cells)).toEqual([
        side('N', 1),
        side('E', 1),
        side('S', 1),
      ])
      expect(exposedSides(cells.get('0,1')!, cells)).toEqual([
        side('N', 3),
        side('E', 1),
        side('E', 2),
        side('E', 3),
        side('S', 1),
        side('S', 2),
        side('S', 3),
        side('W', 1),
        side('W', 2),
        side('W', 3),
      ])
      expect(exposedSides(cells.get('-1,0')!, cells)).toEqual([
        side('N', 1),
        side('S', 1),
        side('W', 1),
      ])
    })
  })

  it('places and rotates side meshes outward', () => {
    const x = 2
    const z = -3
    const level = 2
    const thickness = CONFIG.world.tileThickness
    const centre = { x: x + 0.5, z: z + 0.5 }
    const expected = [
      { dir: 'N' as const, x: 2.5, z: -3, rotationY: Math.PI },
      { dir: 'E' as const, x: 3, z: -2.5, rotationY: Math.PI / 2 },
      { dir: 'S' as const, x: 2.5, z: -2, rotationY: 0 },
      { dir: 'W' as const, x: 2, z: -2.5, rotationY: -Math.PI / 2 },
    ]

    for (const side of expected) {
      const placement = sidePlacement(x, z, level, side.dir)
      expect(placement.x).toBeCloseTo(side.x)
      expect(placement.z).toBeCloseTo(side.z)
      expect(placement.y).toBeCloseTo((level - 0.5) * thickness)
      expect(placement.rotationY).toBeCloseTo(side.rotationY)

      const normal = {
        x: Math.sin(placement.rotationY),
        z: Math.cos(placement.rotationY),
      }
      const outward = {
        x: placement.x - centre.x,
        z: placement.z - centre.z,
      }
      expect(normal.x * outward.x + normal.z * outward.z).toBeGreaterThan(0)
    }
  })

  describe('affectedChunks', () => {
    it('marks only the changed cell chunk in the middle of a chunk', () => {
      const prev = mapOf(cell(5, 5, 'grass', 1))
      const next = mapOf(cell(5, 5, 'grass', 2))
      expect([...affectedChunks(prev, next)]).toEqual([chunkKey(0, 0)])
    })

    it('marks both chunks for a cell on a chunk border', () => {
      const prev = mapOf(cell(15, 5, 'grass', 1))
      const next = mapOf(cell(15, 5, 'grass', 2))
      expect([...affectedChunks(prev, next)].sort()).toEqual(
        [chunkKey(0, 0), chunkKey(1, 0)].sort(),
      )
    })

    it('marks both chunks across a negative chunk border', () => {
      const prev = mapOf(cell(-1, 5, 'grass', 1))
      const next = mapOf(cell(-1, 5, 'grass', 2))
      expect([...affectedChunks(prev, next)].sort()).toEqual(
        [chunkKey(-1, 0), chunkKey(0, 0)].sort(),
      )
    })

    it('marks added and removed cells and border neighbours', () => {
      const prev = mapOf(cell(15, 15, 'grass', 1))
      const next = new Map<string, Cell>()
      expect([...affectedChunks(prev, next)].sort()).toEqual(
        [chunkKey(0, 0), chunkKey(1, 0), chunkKey(0, 1)].sort(),
      )

      expect([...affectedChunks(new Map(), prev)].sort()).toEqual(
        [chunkKey(0, 0), chunkKey(1, 0), chunkKey(0, 1)].sort(),
      )
    })

    it('returns no chunks when nothing changed', () => {
      const cells = mapOf(cell(5, 5, 'grass', 1))
      const copy = new Map(cells)
      expect(affectedChunks(cells, copy).size).toBe(0)
      expect(affectedChunks(cells, mapOf(cell(5, 5, 'grass', 1))).size).toBe(0)
    })
  })

  describe('diffLevels', () => {
    it('reports every level of a new and a removed column', () => {
      const empty = new Map<string, Cell>()
      const column = mapOf(cell(2, 3, 'water', 3))

      expect(diffLevels(empty, column)).toEqual([
        {
          key: '2,3',
          x: 2,
          z: 3,
          prev: null,
          next: cell(2, 3, 'water', 3),
          added: [1, 2, 3],
          removed: [],
        },
      ])
      expect(diffLevels(column, empty)[0].removed).toEqual([1, 2, 3])
      expect(diffLevels(column, empty)[0].added).toEqual([])
    })

    it('reports only the level difference when a column changes height', () => {
      const prev = mapOf(cell(0, 0, 'land', 2))
      const up = diffLevels(prev, mapOf(cell(0, 0, 'land', 4)))
      const down = diffLevels(mapOf(cell(0, 0, 'land', 4)), prev)

      expect(up[0].added).toEqual([3, 4])
      expect(up[0].removed).toEqual([])
      expect(down[0].added).toEqual([])
      expect(down[0].removed).toEqual([3, 4])
    })

    it('ignores a type change at the same level', () => {
      const prev = mapOf(cell(0, 0, 'grass', 2))
      const next = mapOf(cell(0, 0, 'water', 2))
      expect(diffLevels(prev, next)).toEqual([])
    })

    it('ignores unchanged cells', () => {
      const cells = mapOf(cell(0, 0, 'grass', 2), cell(1, 1, 'land', 1))
      expect(diffLevels(cells, new Map(cells))).toEqual([])
    })
  })
})
