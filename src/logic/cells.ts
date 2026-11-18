import { CONFIG, type InvalidReason, type TileType } from '../config/evergrow.config'
import { isBuildable, isInWorld, key } from './grid'

/** One column of tiles; all tiles in the column share `type`. */
export interface Cell {
  readonly x: number
  readonly z: number
  readonly type: TileType
  readonly level: number
}

/** Sparse cell storage keyed by `"x,z"`. */
export type CellMap = ReadonlyMap<string, Cell>

export type CellResult =
  | { readonly ok: true; readonly cells: CellMap }
  | { readonly ok: false; readonly reason: InvalidReason }

/** Why a level is invalid, or null if valid. Infinity is too high; other non-integers are too low (D020). */
function levelReason(level: number): InvalidReason | null {
  if (level === Infinity) return 'maxStack'
  if (!Number.isInteger(level)) return 'minStack'
  if (level > CONFIG.world.maxStack) return 'maxStack'
  if (level < CONFIG.world.minStack) return 'minStack'
  return null
}

/** Add or replace a cell. Returns a new map; the input is never mutated. */
export function setCell(cells: CellMap, cell: Cell): CellResult {
  const reason = levelReason(cell.level)
  if (reason) return { ok: false, reason }

  const next = new Map(cells)
  next.set(key(cell.x, cell.z), cell)
  return { ok: true, cells: next }
}

/**
 * Change a column's level. Returns a new map on success; out-of-range levels are
 * rejected with an `InvalidReason`. An empty cell is left unchanged.
 */
export function setLevel(cells: CellMap, x: number, z: number, level: number): CellResult {
  const cellKey = key(x, z)
  const cell = cells.get(cellKey)
  if (!cell) return { ok: true, cells }

  const reason = levelReason(level)
  if (reason) return { ok: false, reason }

  const next = new Map(cells)
  next.set(cellKey, { ...cell, level })
  return { ok: true, cells: next }
}

/** Change a column's tile type. An empty cell is left unchanged. */
export function setType(cells: CellMap, x: number, z: number, type: TileType): CellResult {
  const cellKey = key(x, z)
  const cell = cells.get(cellKey)
  if (!cell) return { ok: true, cells }

  const next = new Map(cells)
  next.set(cellKey, { ...cell, type })
  return { ok: true, cells: next }
}

/**
 * Paint tool (§5.3). Empty cells become a level-1 tile if they are buildable;
 * existing cells only change type and keep their level.
 */
export function paint(cells: CellMap, x: number, z: number, type: TileType): CellResult {
  if (!isInWorld(x, z)) return { ok: false, reason: 'outsideWorld' }

  const existing = cells.get(key(x, z))
  if (existing) return setType(cells, x, z, type)

  if (!isBuildable(x, z, cells)) return { ok: false, reason: 'outsideBuildableZone' }

  return setCell(cells, { x, z, type, level: CONFIG.world.minStack })
}

/**
 * Dig-up tool (§5.3). Removes one level, deleting the cell at `minStack`.
 * An empty cell is left unchanged.
 */
export function digUp(cells: CellMap, x: number, z: number): CellResult {
  if (!isInWorld(x, z)) return { ok: false, reason: 'outsideWorld' }

  const cellKey = key(x, z)
  const cell = cells.get(cellKey)
  if (!cell) return { ok: true, cells }

  const next = new Map(cells)
  if (cell.level > CONFIG.world.minStack) {
    next.set(cellKey, { ...cell, level: cell.level - 1 })
  } else {
    next.delete(cellKey)
  }
  return { ok: true, cells: next }
}
