import type { ItemDef, Rotation, TileType } from '../config/evergrow.config'
import { itemDefinition } from './catalog'
import {
  digUp,
  paint,
  setLevel,
  setType,
  type CellMap,
  type CellResult,
} from './cells'
import type { PlacementState } from './placement'
import {
  checkPlacement,
  editFootprint,
  inverseOf,
  requireItem,
  withWorld,
  type WorldChanges,
} from './commandHelpers'
import type { ApplyResult, Command, WorldState } from './commandTypes'

function simpleApply(
  state: WorldState,
  changes: WorldChanges,
  catalog: ReadonlyMap<string, ItemDef>,
): ApplyResult {
  return { state: withWorld(state, changes, catalog), inverse: inverseOf(state, 0, []) }
}

function unwrapCells(result: CellResult): CellMap {
  if (!result.ok) throw new Error(`Unexpected cell result: ${result.reason}`)
  return result.cells
}

function placementAutoTiles(
  command: Extract<Command, { kind: 'place' | 'move' }>,
  def: ItemDef,
  state: PlacementState,
  ignoreUid?: string,
) {
  const result = checkPlacement(command, def, state, ignoreUid)
  if (!result.ok) throw new Error(`Invalid placement: ${result.reason}`)
  return result.autoTiles
}

function placeAutoTiles(
  cells: CellMap,
  tiles: readonly { readonly x: number; readonly z: number; readonly type: TileType }[],
): CellMap {
  let next = cells
  for (const tile of tiles) next = unwrapCells(paint(next, tile.x, tile.z, tile.type))
  return next
}

/** Apply a command that already passed `validate`. */
export function apply(
  command: Command,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): ApplyResult {
  switch (command.kind) {
    case 'place': {
      const def = itemDefinition(catalog, command.id)
      const autoTiles = placementAutoTiles(command, def, {
        cells: state.cells,
        occupancy: state.occupancy,
      })
      const cells = placeAutoTiles(state.cells, autoTiles)
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
        inverse: inverseOf(state, coinsDelta, inventoryDeltas),
      }
    }
    case 'move': {
      const item = requireItem(state, command.uid)
      const def = itemDefinition(catalog, item.id)
      const autoTiles = placementAutoTiles(
        command,
        def,
        { cells: state.cells, occupancy: state.occupancy },
        command.uid,
      )
      const cells = placeAutoTiles(state.cells, autoTiles)
      const items = new Map(state.items)
      items.set(command.uid, { ...item, x: command.x, z: command.z, rot: command.rot })
      return simpleApply(state, { cells, items }, catalog)
    }
    case 'rotate': {
      const item = requireItem(state, command.uid)
      const rot = ((item.rot + 1) % 4) as Rotation
      const items = new Map(state.items)
      items.set(command.uid, { ...item, rot })
      return simpleApply(state, { items }, catalog)
    }
    case 'store': {
      const item = requireItem(state, command.uid)
      const items = new Map(state.items)
      items.delete(command.uid)
      const inventoryDeltas = [{ id: item.id, delta: 1 }]
      return {
        state: withWorld(state, { items, inventoryDeltas }, catalog),
        inverse: inverseOf(state, 0, inventoryDeltas),
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
        inverse: inverseOf(state, coinsDelta, []),
      }
    }
    case 'paint': {
      const cells = unwrapCells(paint(state.cells, command.x, command.z, command.type))
      return simpleApply(state, { cells }, catalog)
    }
    case 'changeItemTile': {
      const item = requireItem(state, command.uid)
      const cells = unwrapCells(
        editFootprint(state, item, catalog, (cells, x, z) =>
          setType(cells, x, z, command.type),
        ),
      )
      return simpleApply(state, { cells }, catalog)
    }
    case 'setLevel': {
      const cells = unwrapCells(setLevel(state.cells, command.x, command.z, command.level))
      return simpleApply(state, { cells }, catalog)
    }
    case 'setLevelItem': {
      const item = requireItem(state, command.uid)
      const cells = unwrapCells(
        editFootprint(state, item, catalog, (cells, x, z) =>
          setLevel(cells, x, z, command.level),
        ),
      )
      return simpleApply(state, { cells }, catalog)
    }
    case 'digUp': {
      const cells = unwrapCells(digUp(state.cells, command.x, command.z))
      return simpleApply(state, { cells }, catalog)
    }
    case 'batch':
      throw new Error('Batch commands must be executed with executeBatch')
  }
}
