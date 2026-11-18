import type { ItemDef, Rotation } from '../config/evergrow.config'
import { itemDefinition, type Catalog } from './catalog'
import {
  digUp,
  paint,
  setLevel,
  setType,
  type Cell,
  type CellMap,
  type CellResult,
} from './cells'
import type { PlacementState } from './placement'
import {
  checkPlacement,
  editFootprint,
  inverseOfForwardDeltas,
  requireItem,
  withWorld,
  type WorldChanges,
} from './commandHelpers'
import type { ApplyResult, Command, PlacementCommand, WorldState } from './commandTypes'

const NEXT_ROTATION: Readonly<Record<Rotation, Rotation>> = { 0: 1, 1: 2, 2: 3, 3: 0 }

/** Apply a change that spends no coins and uses no inventory. */
function applyWorldChange(
  state: WorldState,
  changes: WorldChanges,
  catalog: Catalog,
): ApplyResult {
  return { state: withWorld(state, changes, catalog), inverse: inverseOfForwardDeltas(state, 0, []) }
}

/** Return the cells from an edit that must succeed; a failure is a programming error. */
function unwrapCells(result: CellResult): CellMap {
  if (!result.ok) throw new Error(`Unexpected cell result: ${result.reason}`)
  return result.cells
}

/** Return the auto tiles a placement needs, throwing if the placement is invalid. */
function autoTilesFor(
  command: PlacementCommand,
  def: ItemDef,
  state: PlacementState,
  ignoreUid?: string,
): Cell[] {
  const result = checkPlacement(command, def, state, ignoreUid)
  if (!result.ok) throw new Error(`Invalid placement: ${result.reason}`)
  return result.autoTiles
}

/** Paint auto tiles into the cell map. */
function addAutoTiles(
  cells: CellMap,
  tiles: readonly Cell[],
): CellMap {
  let next = cells
  for (const tile of tiles) next = unwrapCells(paint(next, tile.x, tile.z, tile.type))
  return next
}

/** Apply a command that already passed `validate`. */
export function apply(
  command: Command,
  state: WorldState,
  catalog: Catalog,
): ApplyResult {
  switch (command.kind) {
    case 'place': {
      const def = itemDefinition(catalog, command.id)
      const autoTiles = autoTilesFor(command, def, state)
      const cells = addAutoTiles(state.cells, autoTiles)
      const items = new Map(state.items)
      items.set(command.uid, {
        uid: command.uid,
        id: command.id,
        x: command.x,
        z: command.z,
        rot: command.rot,
      })
      const coinsDelta = command.source === 'shop' ? -def.price : 0
      const inventoryDeltas =
        command.source === 'inventory' ? [{ id: command.id, delta: -1 }] : []
      return {
        state: withWorld(state, { cells, items, coinsDelta, inventoryDeltas }, catalog),
        inverse: inverseOfForwardDeltas(state, coinsDelta, inventoryDeltas),
      }
    }
    case 'move': {
      const item = requireItem(state, command.uid)
      const def = itemDefinition(catalog, item.id)
      const autoTiles = autoTilesFor(command, def, state, command.uid)
      const cells = addAutoTiles(state.cells, autoTiles)
      const items = new Map(state.items)
      items.set(command.uid, { ...item, x: command.x, z: command.z, rot: command.rot })
      return applyWorldChange(state, { cells, items }, catalog)
    }
    case 'rotate': {
      const item = requireItem(state, command.uid)
      const rot = NEXT_ROTATION[item.rot]
      const items = new Map(state.items)
      items.set(command.uid, { ...item, rot })
      return applyWorldChange(state, { items }, catalog)
    }
    case 'store': {
      const item = requireItem(state, command.uid)
      const items = new Map(state.items)
      items.delete(command.uid)
      const inventoryDeltas = [{ id: item.id, delta: 1 }]
      return {
        state: withWorld(state, { items, inventoryDeltas }, catalog),
        inverse: inverseOfForwardDeltas(state, 0, inventoryDeltas),
      }
    }
    case 'sell': {
      const item = requireItem(state, command.uid)
      const def = itemDefinition(catalog, item.id)
      const items = new Map(state.items)
      items.delete(command.uid)
      const coinsDelta = def.price
      return {
        state: withWorld(state, { items, coinsDelta }, catalog),
        inverse: inverseOfForwardDeltas(state, coinsDelta, []),
      }
    }
    case 'paint': {
      const cells = unwrapCells(paint(state.cells, command.x, command.z, command.type))
      return applyWorldChange(state, { cells }, catalog)
    }
    case 'changeItemTile': {
      const item = requireItem(state, command.uid)
      const cells = unwrapCells(
        editFootprint(state, item, catalog, (next, x, z) =>
          setType(next, x, z, command.type),
        ),
      )
      return applyWorldChange(state, { cells }, catalog)
    }
    case 'setLevel': {
      const cells = unwrapCells(setLevel(state.cells, command.x, command.z, command.level))
      return applyWorldChange(state, { cells }, catalog)
    }
    case 'setLevelItem': {
      const item = requireItem(state, command.uid)
      const cells = unwrapCells(
        editFootprint(state, item, catalog, (next, x, z) =>
          setLevel(next, x, z, command.level),
        ),
      )
      return applyWorldChange(state, { cells }, catalog)
    }
    case 'digUp': {
      const cells = unwrapCells(digUp(state.cells, command.x, command.z))
      return applyWorldChange(state, { cells }, catalog)
    }
    case 'batch':
      throw new Error('Batch commands must be executed with executeBatch')
  }
}
