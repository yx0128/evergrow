import type { ItemDef, TileType } from '../config/evergrow.config'
import { itemDefinition } from './catalog'
import { setLevel } from './cells'
import { isBuildable, isInWorld, key } from './grid'
import { itemAt } from './placement'
import {
  checkPlacement,
  editFootprint,
  invalid,
  requireItem,
  valid,
} from './commandHelpers'
import type { Command, ValidateResult, WorldState } from './commandTypes'

function allowedTile(def: ItemDef, type: TileType): ValidateResult {
  return def.allowedTiles.includes(type) ? valid() : invalid('wrongTile')
}

/** Player-facing validation; programming errors throw (D019, D029). */
export function validate(
  command: Command,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): ValidateResult {
  switch (command.kind) {
    case 'place': {
      const def = itemDefinition(catalog, command.id)
      if (state.items.has(command.uid)) {
        throw new Error(`Item uid already exists: ${command.uid}`)
      }
      const placement = checkPlacement(command, def, {
        cells: state.cells,
        occupancy: state.occupancy,
      })
      if (!placement.ok) return invalid(placement.reason)
      if (command.source === 'inventory') {
        const count = state.inventory.get(command.id) ?? 0
        if (count < 1) return invalid('notInInventory')
      } else if (state.coins < def.price) {
        return invalid('unaffordable')
      }
      return valid()
    }
    case 'move': {
      const item = requireItem(state, command.uid)
      const def = itemDefinition(catalog, item.id)
      const placement = checkPlacement(
        command,
        def,
        { cells: state.cells, occupancy: state.occupancy },
        command.uid,
      )
      return placement.ok ? valid() : invalid(placement.reason)
    }
    case 'rotate':
    case 'store':
    case 'sell':
      requireItem(state, command.uid)
      return valid()
    case 'paint': {
      if (!isInWorld(command.x, command.z)) return invalid('outsideWorld')
      const item = itemAt(command.x, command.z, state.occupancy, state.items)
      if (item) {
        const def = itemDefinition(catalog, item.id)
        return allowedTile(def, command.type)
      }
      if (state.cells.has(key(command.x, command.z))) return valid()
      return isBuildable(command.x, command.z, state.cells)
        ? valid()
        : invalid('outsideBuildableZone')
    }
    case 'changeItemTile': {
      const item = requireItem(state, command.uid)
      const def = itemDefinition(catalog, item.id)
      return allowedTile(def, command.type)
    }
    case 'setLevel': {
      const uid = state.occupancy.get(key(command.x, command.z))
      if (uid !== undefined) {
        throw new Error(
          `Cell ${command.x},${command.z} is under item ${uid}; use setLevelItem`,
        )
      }
      const result = setLevel(state.cells, command.x, command.z, command.level)
      return result.ok ? valid() : invalid(result.reason)
    }
    case 'setLevelItem': {
      const item = requireItem(state, command.uid)
      const result = editFootprint(state, item, catalog, (cells, x, z) =>
        setLevel(cells, x, z, command.level),
      )
      return result.ok ? valid() : invalid(result.reason)
    }
    case 'digUp': {
      if (!isInWorld(command.x, command.z)) return invalid('outsideWorld')
      const uid = state.occupancy.get(key(command.x, command.z))
      if (uid !== undefined) return invalid('underItem')
      return valid()
    }
    case 'batch':
      throw new Error('Batch commands must be executed with executeBatch')
  }
}
