import {
  CONFIG,
  type InvalidReason,
  type ItemDef,
  type Rotation,
  type TileType,
} from '../config/evergrow.config'
import { itemDefinition } from './catalog'
import {
  digUp,
  paint,
  setLevel,
  setType,
  type CellMap,
  type CellResult,
} from './cells'
import { getFootprintCells } from './footprint'
import { isBuildable, isInWorld, key } from './grid'
import {
  buildOccupancy,
  itemAt,
  validatePlacement,
  type Occupancy,
  type PlacedItem,
  type PlacedItems,
  type PlacementState,
} from './placement'

export interface WorldState {
  readonly cells: CellMap
  readonly items: PlacedItems
  readonly occupancy: Occupancy
  readonly inventory: ReadonlyMap<string, number>
  readonly coins: number
}

export type Command =
  | {
      readonly kind: 'place'
      readonly uid: string
      readonly id: string
      readonly x: number
      readonly z: number
      readonly rot: Rotation
      readonly autoTile: TileType
      readonly source: 'inventory' | 'shop'
    }
  | {
      readonly kind: 'move'
      readonly uid: string
      readonly x: number
      readonly z: number
      readonly rot: Rotation
      readonly autoTile: TileType
    }
  | { readonly kind: 'rotate'; readonly uid: string }
  | { readonly kind: 'store'; readonly uid: string }
  | { readonly kind: 'sell'; readonly uid: string }
  | { readonly kind: 'paint'; readonly x: number; readonly z: number; readonly type: TileType }
  | { readonly kind: 'changeItemTile'; readonly uid: string; readonly type: TileType }
  | { readonly kind: 'setLevel'; readonly x: number; readonly z: number; readonly level: number }
  | { readonly kind: 'setLevelItem'; readonly uid: string; readonly level: number }
  | { readonly kind: 'digUp'; readonly x: number; readonly z: number }
  | { readonly kind: 'batch'; readonly commands: readonly Command[] }

interface InventoryDelta {
  readonly id: string
  readonly delta: number
}

/** Exact cells/items plus coin and inventory deltas needed to undo a command. */
export interface Inverse {
  readonly cells: CellMap
  readonly items: PlacedItems
  readonly coinsDelta: number
  readonly inventoryDeltas: readonly InventoryDelta[]
}

export type ValidateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: InvalidReason }

export interface ApplyResult {
  readonly state: WorldState
  readonly inverse: Inverse
}

export interface BatchSkip {
  readonly index: number
  readonly reason: InvalidReason
}

export type BatchResult = OperationResult & { readonly skipped: readonly BatchSkip[] }

export type OperationResult =
  | { readonly ok: true; readonly state: WorldState; readonly history: History }
  | {
      readonly ok: false
      readonly reason: InvalidReason
      readonly state: WorldState
      readonly history: History
    }

interface HistoryEntry {
  readonly command: Command
  readonly inverse: Inverse
}

export interface History {
  readonly past: readonly HistoryEntry[]
  readonly future: readonly HistoryEntry[]
}

export const EMPTY_HISTORY: History = { past: [], future: [] }

function valid(): ValidateResult {
  return { ok: true }
}

function invalid(reason: InvalidReason): ValidateResult {
  return { ok: false, reason }
}

function requireItem(state: WorldState, uid: string): PlacedItem {
  const item = state.items.get(uid)
  if (!item) throw new Error(`Unknown item uid: ${uid}`)
  return item
}

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

interface WorldChanges {
  readonly cells?: CellMap
  readonly items?: PlacedItems
  readonly coinsDelta?: number
  readonly inventoryDeltas?: readonly InventoryDelta[]
}

function withWorld(
  state: WorldState,
  changes: WorldChanges,
  catalog: ReadonlyMap<string, ItemDef>,
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

function inverseWith(
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

function inverseOf(
  state: WorldState,
  coinsDelta: number,
  inventoryDeltas: readonly InventoryDelta[],
): Inverse {
  return inverseWith(state, -coinsDelta, negate(inventoryDeltas))
}

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

function checkPlacement(
  command: Extract<Command, { kind: 'place' | 'move' }>,
  def: ItemDef,
  state: PlacementState,
  ignoreUid?: string,
) {
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

function editFootprint(
  state: WorldState,
  item: PlacedItem,
  catalog: ReadonlyMap<string, ItemDef>,
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

function allowedTile(def: ItemDef, type: TileType): ValidateResult {
  return def.allowedTiles.includes(type) ? valid() : invalid('wrongTile')
}

function placeAutoTiles(
  cells: CellMap,
  tiles: readonly { readonly x: number; readonly z: number; readonly type: TileType }[],
): CellMap {
  let next = cells
  for (const tile of tiles) next = unwrapCells(paint(next, tile.x, tile.z, tile.type))
  return next
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

function validateInverse(inverse: Inverse, state: WorldState): ValidateResult {
  if (state.coins + inverse.coinsDelta < 0) return invalid('unaffordable')
  for (const { id, delta } of inverse.inventoryDeltas) {
    if ((state.inventory.get(id) ?? 0) + delta < 0) return invalid('notInInventory')
  }
  return valid()
}

function appendPast(
  history: History,
  entry: HistoryEntry,
): readonly HistoryEntry[] {
  const past = [...history.past, entry]
  const limit = CONFIG.history.limit
  return past.length > limit ? past.slice(past.length - limit) : past
}

interface DeltaSum {
  coinsDelta: number
  readonly inventoryDeltas: Map<string, number>
}

function emptyDeltaSum(): DeltaSum {
  return { coinsDelta: 0, inventoryDeltas: new Map() }
}

function addInverseDeltas(sum: DeltaSum, inverse: Inverse): void {
  sum.coinsDelta += inverse.coinsDelta
  for (const { id, delta } of inverse.inventoryDeltas) {
    sum.inventoryDeltas.set(id, (sum.inventoryDeltas.get(id) ?? 0) + delta)
  }
}

function inverseWithDeltas(state: WorldState, sum: DeltaSum): Inverse {
  return inverseWith(
    state,
    sum.coinsDelta,
    [...sum.inventoryDeltas].map(([id, delta]) => ({ id, delta })),
  )
}

function validateAndApply(
  command: Command,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
):
  | { readonly ok: true; readonly applied: ApplyResult }
  | { readonly ok: false; readonly reason: InvalidReason } {
  const result = validate(command, state, catalog)
  if (!result.ok) return { ok: false, reason: result.reason }
  return { ok: true, applied: apply(command, state, catalog) }
}

function appliedResult(
  state: WorldState,
  history: History,
  entry: HistoryEntry,
  future: readonly HistoryEntry[],
): OperationResult {
  return {
    ok: true,
    state,
    history: { past: appendPast(history, entry), future },
  }
}

/** Validate, apply, record on `past`, and clear `future`; failures change nothing. */
export function execute(
  history: History,
  state: WorldState,
  command: Command,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const outcome = validateAndApply(command, state, catalog)
  if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }

  return appliedResult(
    outcome.applied.state,
    history,
    { command, inverse: outcome.applied.inverse },
    [],
  )
}

/**
 * Run drag-stroke sub-commands in order, skipping failures. One history entry
 * records only the applied commands; its inverse restores the pre-batch state.
 */
export function executeBatch(
  history: History,
  state: WorldState,
  commands: readonly Command[],
  catalog: ReadonlyMap<string, ItemDef>,
): BatchResult {
  if (commands.length === 0) throw new Error('An empty batch is not allowed')
  for (const command of commands) {
    if (command.kind === 'batch') throw new Error('Nested batches are not allowed')
  }

  const applied: Command[] = []
  const skipped: BatchSkip[] = []
  const sum = emptyDeltaSum()
  let working = state
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]
    const outcome = validateAndApply(command, working, catalog)
    if (!outcome.ok) {
      skipped.push({ index, reason: outcome.reason })
      continue
    }
    working = outcome.applied.state
    applied.push(command)
    addInverseDeltas(sum, outcome.applied.inverse)
  }

  if (applied.length === 0) {
    return {
      ok: false,
      reason: skipped[0].reason,
      state,
      history,
      skipped,
    }
  }

  const batch: Command = { kind: 'batch', commands: applied }
  return {
    ...appliedResult(
      working,
      history,
      { command: batch, inverse: inverseWithDeltas(state, sum) },
      [],
    ),
    skipped,
  }
}

/** Undo the latest command after re-validating its inverse. */
export function undo(
  history: History,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const entry = history.past[history.past.length - 1]
  if (!entry) throw new Error('Nothing to undo')

  const result = validateInverse(entry.inverse, state)
  if (!result.ok) return { ok: false, reason: result.reason, state, history }

  return {
    ok: true,
    state: withWorld(state, entry.inverse, catalog),
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, entry],
    },
  }
}

/** Redo the next command after re-validating it against the current state. */
export function redo(
  history: History,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const entry = history.future[history.future.length - 1]
  if (!entry) throw new Error('Nothing to redo')

  if (entry.command.kind === 'batch') {
    let working = state
    const sum = emptyDeltaSum()
    for (const command of entry.command.commands) {
      const outcome = validateAndApply(command, working, catalog)
      if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }
      working = outcome.applied.state
      addInverseDeltas(sum, outcome.applied.inverse)
    }
    return appliedResult(
      working,
      history,
      { command: entry.command, inverse: inverseWithDeltas(state, sum) },
      history.future.slice(0, -1),
    )
  }

  const outcome = validateAndApply(entry.command, state, catalog)
  if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }

  return appliedResult(
    outcome.applied.state,
    history,
    { command: entry.command, inverse: outcome.applied.inverse },
    history.future.slice(0, -1),
  )
}

export function canUndo(history: History): boolean {
  return history.past.length > 0
}

export function canRedo(history: History): boolean {
  return history.future.length > 0
}
