import type { ItemDef } from '../config/evergrow.config'
import { itemDefinition } from './catalog'
import type { GridPoint } from './grid'
import { key, neighbours } from './grid'
import type { Occupancy, PlacedItems } from './placement'

/**
 * Connectable items are always 1×1 (D025); placement is unaffected by connection.
 * Mask bits: north = 1, east = 2, south = 4, west = 8 (D017 axes).
 */
const CONNECTION_BITS = [1, 2, 4, 8] as const

/** Bit mask of orthogonal neighbours holding a connectable item with the same id. */
export function getConnectionMask(
  uid: string,
  items: PlacedItems,
  occupancy: Occupancy,
  catalog: ReadonlyMap<string, ItemDef>,
): number {
  const self = items.get(uid)
  if (!self) return 0
  if (!itemDefinition(catalog, self.id).connectable) return 0

  let mask = 0
  const around = neighbours(self.x, self.z)
  for (let index = 0; index < around.length; index += 1) {
    const point = around[index]
    const neighbourUid = occupancy.get(key(point.x, point.z))
    if (neighbourUid === undefined) continue

    const other = items.get(neighbourUid)
    if (other && other.id === self.id) mask |= CONNECTION_BITS[index]
  }
  return mask
}

/** The changed cell followed by its N, E, S, W neighbours (§6.5). */
export function affectedByChange(x: number, z: number): GridPoint[] {
  return [{ x, z }, ...neighbours(x, z)]
}
