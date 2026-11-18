import {
  CONFIG,
  type InvalidReason,
  type ItemDef,
  type Rotation,
  type TileType,
} from '../config/evergrow.config'
import { itemDefinition } from './catalog'
import type { Cell, CellMap } from './cells'
import { getFootprintCells } from './footprint'
import { isBuildable, isInWorld, key } from './grid'

export interface PlacedItem {
  readonly uid: string
  readonly id: string
  readonly x: number
  readonly z: number
  readonly rot: Rotation
}

/** Placed items keyed by uid. */
export type PlacedItems = ReadonlyMap<string, PlacedItem>

/** Cell key → uid of the item covering it. */
export type Occupancy = ReadonlyMap<string, string>

export interface PlacementState {
  readonly cells: CellMap
  readonly occupancy: Occupancy
}

export type PlacementResult =
  | { readonly ok: true; readonly autoTiles: Cell[] }
  | { readonly ok: false; readonly reason: InvalidReason }

export interface LevelRange {
  readonly min: number
  readonly max: number
}

/** Map every footprint cell of every placed item to that item's uid. */
export function buildOccupancy(
  items: PlacedItems,
  catalog: ReadonlyMap<string, ItemDef>,
): Occupancy {
  const occupancy = new Map<string, string>()
  for (const item of items.values()) {
    const def = itemDefinition(catalog, item.id)
    for (const cell of getFootprintCells(def, item.x, item.z, item.rot)) {
      occupancy.set(key(cell.x, cell.z), item.uid)
    }
  }
  return occupancy
}

/** The placed item covering a cell, if any. */
export function itemAt(
  x: number,
  z: number,
  occupancy: Occupancy,
  items: PlacedItems,
): PlacedItem | undefined {
  const uid = occupancy.get(key(x, z))
  if (uid === undefined) return undefined
  return items.get(uid)
}

/**
 * Height slider range for a column (§5.4, §6.4, D029). A cell under any item
 * returns null because tile type and height are set from the item popover.
 * Missing occupancy or catalog data throws.
 */
export function getLevelRange(
  x: number,
  z: number,
  world: {
    readonly cells: CellMap
    readonly occupancy: Occupancy
    readonly items: PlacedItems
  },
  catalog: ReadonlyMap<string, ItemDef>,
): LevelRange | null {
  const uid = world.occupancy.get(key(x, z))
  if (uid !== undefined) {
    const item = world.items.get(uid)
    if (!item) throw new Error(`Unknown item uid: ${uid}`)
    // Called only to throw on a missing catalog entry; the result isn't needed.
    itemDefinition(catalog, item.id)
    return null
  }
  return { min: CONFIG.world.minStack, max: CONFIG.world.maxStack }
}

/**
 * Placement rules (§6.3), checked in this order: outside the world, outside the
 * buildable zone, occupied, wrong tile, uneven ground. `ignoreUid` lets an item
 * move onto its own cells. Empty footprint cells become level-1 auto tiles.
 */
export function validatePlacement(
  item: ItemDef,
  x: number,
  z: number,
  rot: Rotation,
  autoTile: TileType,
  state: PlacementState,
  ignoreUid?: string,
): PlacementResult {
  const footprint = getFootprintCells(item, x, z, rot)

  for (const point of footprint) {
    if (!isInWorld(point.x, point.z)) return { ok: false, reason: 'outsideWorld' }
  }

  for (const point of footprint) {
    if (!isBuildable(point.x, point.z, state.cells)) {
      return { ok: false, reason: 'outsideBuildableZone' }
    }
  }

  for (const point of footprint) {
    const uid = state.occupancy.get(key(point.x, point.z))
    if (uid !== undefined && uid !== ignoreUid) {
      return { ok: false, reason: 'occupied' }
    }
  }

  const needsAutoTile = footprint.some((p) => !state.cells.has(key(p.x, p.z)))
  if (needsAutoTile && !item.allowedTiles.includes(autoTile)) {
    return { ok: false, reason: 'wrongTile' }
  }
  for (const point of footprint) {
    const cell = state.cells.get(key(point.x, point.z))
    if (cell && !item.allowedTiles.includes(cell.type)) {
      return { ok: false, reason: 'wrongTile' }
    }
  }

  let level: number | undefined
  for (const point of footprint) {
    const cell = state.cells.get(key(point.x, point.z))
    const cellLevel = cell?.level ?? CONFIG.world.minStack
    if (level === undefined) level = cellLevel
    if (level !== cellLevel) return { ok: false, reason: 'unevenGround' }
  }

  const autoTiles: Cell[] = []
  for (const point of footprint) {
    if (!state.cells.has(key(point.x, point.z))) {
      autoTiles.push({ x: point.x, z: point.z, type: autoTile, level: CONFIG.world.minStack })
    }
  }

  return { ok: true, autoTiles }
}
