import { describe, expect, it } from 'vitest'
import type { ItemDef, Rotation } from '../config/evergrow.config'
import { getFootprintCells, rotatedSize } from './footprint'

const item = (overrides: Partial<ItemDef> & Pick<ItemDef, 'id' | 'footprint'>): ItemDef => ({
  name: overrides.id,
  category: 'test',
  price: 0,
  defaultTile: 'grass',
  allowedTiles: ['grass', 'land'],
  connectable: false,
  model: `assets/models/${overrides.id}.glb`,
  thumb: `assets/thumbs/${overrides.id}.png`,
  emissive: false,
  ...overrides,
})

const lamp = item({ id: 'lamp', footprint: [1, 1] })
const cottage = item({ id: 'cottage', footprint: [2, 2], allowedTiles: ['grass', 'land'] })
const fence = item({ id: 'fence', footprint: [1, 1] })

const cells = (x: number, z: number, w: number, d: number): { x: number; z: number }[] => {
  const result: { x: number; z: number }[] = []
  for (let dz = 0; dz < d; dz += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      result.push({ x: x + dx, z: z + dz })
    }
  }
  return result
}

describe('rotatedSize', () => {
  it('stays generic: swaps a non-square footprint at rot 1 and 3', () => {
    const wide = item({ id: 'wide', footprint: [2, 3] })
    expect(rotatedSize(wide, 0)).toEqual([2, 3])
    expect(rotatedSize(wide, 1)).toEqual([3, 2])
    expect(rotatedSize(wide, 2)).toEqual([2, 3])
    expect(rotatedSize(wide, 3)).toEqual([3, 2])
  })

  it('keeps a 1×1 footprint square at every rotation', () => {
    const rotations: Rotation[] = [0, 1, 2, 3]
    for (const rot of rotations) expect(rotatedSize(lamp, rot)).toEqual([1, 1])
  })
})

describe('getFootprintCells', () => {
  it('covers the same 2×2 cells at rot 0–3', () => {
    const expected = cells(2, -1, 2, 2)
    for (const rot of [0, 1, 2, 3] as const) {
      expect(getFootprintCells(cottage, 2, -1, rot)).toEqual(expected)
    }
  })

  it('keeps the anchor at the min-x/min-z corner after rotation', () => {
    for (const rot of [0, 1, 2, 3] as const) {
      const footprint = getFootprintCells(cottage, 2, -1, rot)
      expect(Math.min(...footprint.map((point) => point.x))).toBe(2)
      expect(Math.min(...footprint.map((point) => point.z))).toBe(-1)
      expect(footprint).toHaveLength(4)
    }
  })

  it('returns the single cell for a 1×1 item', () => {
    expect(getFootprintCells(lamp, 4, 5, 0)).toEqual([{ x: 4, z: 5 }])
    expect(getFootprintCells(fence, 4, 5, 3)).toEqual([{ x: 4, z: 5 }])
  })
})

describe('getFootprintCells with a non-square footprint', () => {
  it('swaps width and depth at rot 1', () => {
    const bench = item({ id: 'bench', footprint: [2, 1] })
    expect(getFootprintCells(bench, 0, 0, 1)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 1 }])
  })
})
