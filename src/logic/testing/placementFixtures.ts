import type { Cell, CellMap } from '../cells'
import { buildOccupancy, type PlacedItems, type PlacementState } from '../placement'
import { catalogOf, cell, item, mapWith } from './fixtures'

export const lamp = item({ id: 'lamp', footprint: [1, 1], allowedTiles: ['grass'] })
export const cottage = item({ id: 'cottage', footprint: [2, 2] })
export const fence = item({
  id: 'fence',
  footprint: [1, 1],
  allowedTiles: ['grass'],
  connectable: true,
})

export const catalog = catalogOf(lamp, cottage, fence)

export const stateOf = (items: PlacedItems, cells: CellMap = mapWith()): PlacementState => ({
  cells,
  occupancy: buildOccupancy(items, catalog),
})

export const cellsIn = (x: number, z: number, w: number, d: number): Cell[] => {
  const result: Cell[] = []
  for (let dz = 0; dz < d; dz += 1) {
    for (let dx = 0; dx < w; dx += 1) result.push(cell(x + dx, z + dz))
  }
  return result
}
