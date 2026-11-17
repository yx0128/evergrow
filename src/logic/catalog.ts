import type { ItemDef } from '../config/evergrow.config'

/** Validate an item catalog. Returns human-readable errors; empty means valid. */
export function validateCatalog(
  items: readonly ItemDef[],
  starterItems: readonly string[],
): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const item of items) {
    if (item.id.length === 0) errors.push('item has an empty id')
    if (ids.has(item.id)) errors.push(`duplicate item id: ${item.id}`)
    ids.add(item.id)
    if (item.price < 0) errors.push(`negative price: ${item.id}`)
    if (item.footprint[0] < 1 || item.footprint[1] < 1) {
      errors.push(`invalid footprint: ${item.id}`)
    }
    if (!item.allowedTiles.includes(item.defaultTile)) {
      errors.push(`default tile not allowed: ${item.id}`)
    }
    if (item.connectable && item.rotatable) {
      errors.push(`connectable item must not rotate: ${item.id}`)
    }
  }

  for (const id of starterItems) {
    if (!ids.has(id)) errors.push(`unknown starter item: ${id}`)
  }

  return errors
}
