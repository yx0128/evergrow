import type { InvalidReason, Rotation, TileType } from '../config/evergrow.config'
import type { CellMap } from './cells'
import type { Occupancy, PlacedItems } from './placement'

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

export type PlacementCommand = Extract<Command, { readonly kind: 'place' | 'move' }>

export interface InventoryDelta {
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

export interface HistoryEntry {
  readonly command: Command
  readonly inverse: Inverse
}

export interface History {
  readonly past: readonly HistoryEntry[]
  readonly future: readonly HistoryEntry[]
}
