import type { ItemDef, Rotation } from '../config/evergrow.config'
import type { GridPoint } from './grid'

export type { Rotation }

/**
 * Footprint anchor convention: `(x, z)` is the min-x/min-z corner of the footprint
 * after rotation. Every cell is `x..x+w'-1` and `z..z+d'-1`.
 *
 * Rotation steps are 90° clockwise seen from above (+X east, +Z south, D017).
 */
export function rotatedSize(item: ItemDef, rot: Rotation): readonly [number, number] {
  const [w, d] = item.footprint
  return rot % 2 === 0 ? [w, d] : [d, w]
}

/** Cells covered by an item anchored at its min corner, row by row (z, then x). */
export function getFootprintCells(
  item: ItemDef,
  x: number,
  z: number,
  rot: Rotation,
): GridPoint[] {
  const [w, d] = rotatedSize(item, rot)
  const cells: GridPoint[] = []
  for (let dz = 0; dz < d; dz += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      cells.push({ x: x + dx, z: z + dz })
    }
  }
  return cells
}
