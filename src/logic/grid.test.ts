import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import {
  boundsForSize,
  chebyshevDistance,
  DIRECTIONS,
  insideBounds,
  isBuildable,
  isInWorld,
  isWithinStartZone,
  key,
  landBounds,
  neighbour,
  neighbours,
  parseKey,
} from './grid'
import type { GridCells } from './grid'

const HALF_WORLD = CONFIG.world.maxSize / 2
const HALF_START = CONFIG.world.startZone / 2

const tile = (x: number, z: number): GridCells => new Map([[key(x, z), { x, z }]])

describe('key / parseKey', () => {
  it('round-trips positive, negative and zero coordinates', () => {
    for (const [x, z] of [
      [0, 0],
      [3, -7],
      [-HALF_WORLD, HALF_WORLD - 1],
    ]) {
      expect(parseKey(key(x, z))).toEqual({ x, z })
    }
  })

  it('formats the sparse-map key as "x,z"', () => {
    expect(key(2, -3)).toBe('2,-3')
  })

  it('throws an Error naming a malformed key', () => {
    for (const invalid of ['', '1', '1,2,3', 'a,b', '1.5,2', ' 1,2', '1,2x']) {
      expect(() => parseKey(invalid)).toThrow(`Invalid cell key: ${invalid}`)
    }
  })

  it('throws when key coordinates are not integers', () => {
    expect(() => key(1.5, 2)).toThrow('Invalid cell coordinates: 1.5,2')
    expect(() => key(0, NaN)).toThrow('Invalid cell coordinates: 0,NaN')
  })
})

describe('neighbours', () => {
  it('uses +X east, +Z south', () => {
    expect(DIRECTIONS).toEqual({
      north: { x: 0, z: -1 },
      east: { x: 1, z: 0 },
      south: { x: 0, z: 1 },
      west: { x: -1, z: 0 },
    })
  })

  it('returns N, E, S, W around a cell', () => {
    expect(neighbours(2, -3)).toEqual([
      { x: 2, z: -4 },
      { x: 3, z: -3 },
      { x: 2, z: -2 },
      { x: 1, z: -3 },
    ])
    expect(neighbour(0, 0, 'west')).toEqual({ x: -1, z: 0 })
  })

  it('computes Chebyshev ring distance', () => {
    expect(chebyshevDistance({ x: 0, z: 0 }, { x: 6, z: 4 })).toBe(6)
    expect(chebyshevDistance({ x: 0, z: 0 }, { x: 7, z: 7 })).toBe(7)
  })
})

describe('bounds', () => {
  it('centres even sizes half a cell off the origin', () => {
    const expected = (size: number) => ({
      minX: -size / 2,
      maxX: size / 2 - 1,
      minZ: -size / 2,
      maxZ: size / 2 - 1,
    })
    expect(boundsForSize(CONFIG.world.startZone)).toEqual(
      expected(CONFIG.world.startZone),
    )
    expect(boundsForSize(CONFIG.world.maxSize)).toEqual(
      expected(CONFIG.world.maxSize),
    )
  })

  it('checks the world cap and start zone edges from CONFIG', () => {
    expect(isInWorld(-HALF_WORLD, HALF_WORLD - 1)).toBe(true)
    expect(isInWorld(HALF_WORLD - 1, -HALF_WORLD)).toBe(true)
    expect(isInWorld(-HALF_WORLD - 1, 0)).toBe(false)
    expect(isInWorld(HALF_WORLD, 0)).toBe(false)
    expect(isWithinStartZone(-HALF_START, HALF_START - 1)).toBe(true)
    expect(isWithinStartZone(-HALF_START - 1, 0)).toBe(false)
    expect(isWithinStartZone(HALF_START, 0)).toBe(false)
    expect(insideBounds(0, 0, { minX: 1, maxX: 2, minZ: 1, maxZ: 2 })).toBe(false)
  })

  it('rejects non-integer and NaN coordinates', () => {
    for (const [x, z] of [
      [1.5, 0],
      [0, -2.5],
      [NaN, 0],
      [Infinity, 0],
    ]) {
      expect(isInWorld(x, z)).toBe(false)
      expect(isWithinStartZone(x, z)).toBe(false)
      expect(isBuildable(x, z, new Map())).toBe(false)
    }
  })
})

describe('isBuildable', () => {
  it('allows every cell in the start zone', () => {
    const empty: GridCells = new Map()
    for (const [x, z] of [
      [0, 0],
      [HALF_START - 1, HALF_START - 1],
      [-HALF_START, -HALF_START],
      [HALF_START - 1, -HALF_START],
    ]) {
      expect(isBuildable(x, z, empty)).toBe(true)
    }
  })

  it('rejects cells outside the start zone when the world is empty', () => {
    const empty: GridCells = new Map()
    expect(isBuildable(HALF_START, 0, empty)).toBe(false)
    expect(isBuildable(0, -HALF_START - 1, empty)).toBe(false)
  })

  it('is true 6 cells away from an existing tile and false 7 cells away', () => {
    const cells = tile(20, 20)
    for (const [x, z] of [
      [26, 20],
      [14, 20],
      [20, 26],
      [20, 14],
      [26, 26],
      [14, 14],
    ]) {
      expect(isBuildable(x, z, cells)).toBe(true)
    }
    expect(isBuildable(27, 20, cells)).toBe(false)
    expect(isBuildable(20, 13, cells)).toBe(false)
    expect(isBuildable(27, 27, cells)).toBe(false)
  })

  it('rejects cells outside the world cap even when within the ring', () => {
    const edge = tile(HALF_WORLD - 3, 0)
    expect(isBuildable(HALF_WORLD, 0, edge)).toBe(false)
    expect(isBuildable(HALF_WORLD - 1, 0, edge)).toBe(true)
    expect(isBuildable(HALF_WORLD, 0, new Map())).toBe(false)
  })
})

describe('landBounds', () => {
  it('returns null for an empty world', () => {
    expect(landBounds(new Map())).toBeNull()
  })

  it('returns the bounds of a single cell', () => {
    expect(landBounds(tile(2, -3))).toEqual({
      minX: 2,
      maxX: 2,
      minZ: -3,
      maxZ: -3,
    })
  })

  it('returns the bounding box of all cells', () => {
    const cells: GridCells = new Map([
      [key(0, 0), { x: 0, z: 0 }],
      [key(3, -2), { x: 3, z: -2 }],
      [key(-4, 5), { x: -4, z: 5 }],
    ])
    expect(landBounds(cells)).toEqual({ minX: -4, maxX: 3, minZ: -2, maxZ: 5 })
  })
})
