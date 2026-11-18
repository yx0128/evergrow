import type { InvalidReason, ItemDef } from '../config/evergrow.config'
import { itemDefinition, type Catalog } from './catalog'
import type { CellMap, CellResult } from './cells'
import { getFootprintCells } from './footprint'
import {
  buildOccupancy,
  validatePlacement,
  type PlacedItem,
  type PlacedItems,
  type PlacementResult,
  type PlacementState,
} from './placement'
import type {
  Inverse,
  InventoryDelta,
  PlacementCommand,
  ValidateResult,
  WorldState,
} from './commandTypes'

export function valid(): ValidateResult {
  return { ok: true }
}

export function invalid(reason: InvalidReason): ValidateResult {
  return { ok: false, reason }
}

export function requireItem(state: WorldState, uid: string): PlacedItem {
  const item = state.items.get(uid)
  if (!item) throw new Error(`Unknown item uid: ${uid}`)
  return item
}

/** Apply inventory deltas, deleting entries that reach zero. */
function changeInventory(
  inventory: WorldState['inventory'],
  deltas: readonly InventoryDelta[],
): ReadonlyMap<string, number> {
  const next = new Map(inventory)
  for (const { id, delta } of deltas) {
    const count = (next.get(id) ?? 0) + delta
    if (count === 0) next.delete(id)
    else next.set(id, count)
  }
  return next
}

function negate(deltas: readonly InventoryDelta[]): InventoryDelta[] {
  return deltas.map(({ id, delta }) => ({ id, delta: -delta }))
}

export interface WorldChanges {
  readonly cells?: CellMap
  readonly items?: PlacedItems
  readonly coinsDelta?: number
  readonly inventoryDeltas?: readonly InventoryDelta[]
}

/** Build the next state, rebuilding occupancy only when the items map changed. */
export function withWorld(
  state: WorldState,
  changes: WorldChanges,
  catalog: Catalog,
): WorldState {
  const items = changes.items ?? state.items
  return {
    cells: changes.cells ?? state.cells,
    items,
    occupancy: items === state.items ? state.occupancy : buildOccupancy(items, catalog),
    inventory: changeInventory(state.inventory, changes.inventoryDeltas ?? []),
    coins: state.coins + (changes.coinsDelta ?? 0),
  }
}

/** Undo data from the current cells and items, using deltas that are already inverted. */
export function snapshotInverse(
  state: WorldState,
  coinsDelta: number,
  inventoryDeltas: readonly InventoryDelta[],
): Inverse {
  return {
    cells: state.cells,
    items: state.items,
    coinsDelta,
    inventoryDeltas,
  }
}

/** Undo data for a command, negating the coin and inventory deltas it applied. */
export function inverseOfForwardDeltas(
  state: WorldState,
  coinsDelta: number,
  inventoryDeltas: readonly InventoryDelta[],
): Inverse {
  return snapshotInverse(state, -coinsDelta, negate(inventoryDeltas))
}

/** Run the placement rules for a place or move command. */
export function checkPlacement(
  command: PlacementCommand,
  def: ItemDef,
  state: PlacementState,
  ignoreUid?: string,
): PlacementResult {
  return validatePlacement(
    def,
    command.x,
    command.z,
    command.rot,
    command.autoTile,
    state,
    ignoreUid,
  )
}

/** Apply an edit to each footprint cell in order, stopping at the first failure. */
export function editFootprint(
  state: WorldState,
  item: PlacedItem,
  catalog: Catalog,
  edit: (cells: CellMap, x: number, z: number) => CellResult,
): CellResult {
  const def = itemDefinition(catalog, item.id)
  let cells = state.cells
  for (const point of getFootprintCells(def, item.x, item.z, item.rot)) {
    const result = edit(cells, point.x, point.z)
    if (!result.ok) return result
    cells = result.cells
  }
  return { ok: true, cells }
}
