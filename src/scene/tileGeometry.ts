import { CONFIG, type TileType } from '../config/evergrow.config'
import type { Cell, CellMap } from '../logic/cells'
import { key, neighbour, type Direction } from '../logic/grid'
import type { ChangeSource } from '../store/world'
import { cellCentre } from './cameraMath'

export interface ChunkCoordinate {
  readonly cx: number
  readonly cz: number
}

export type ChunkKey = string

export type SideDirection = 'N' | 'E' | 'S' | 'W'

export interface SideFace {
  readonly dir: SideDirection
  readonly level: number
}

export interface CellLevelDiff {
  readonly key: string
  readonly x: number
  readonly z: number
  readonly prev: Cell | null
  readonly next: Cell | null
  readonly added: readonly number[]
  readonly removed: readonly number[]
}

/** N is −Z, E is +X, S is +Z and W is −X (D017). */
const SIDE_DIRECTIONS: readonly {
  readonly dir: SideDirection
  readonly grid: Direction
}[] = [
  { dir: 'N', grid: 'north' },
  { dir: 'E', grid: 'east' },
  { dir: 'S', grid: 'south' },
  { dir: 'W', grid: 'west' },
]

/** Side meshes face +Z; each direction rotates that face into place. */
const SIDE_FACING: Readonly<
  Record<SideDirection, { readonly dx: number; readonly dz: number; readonly rotationY: number }>
> = {
  N: { dx: 0, dz: -0.5, rotationY: Math.PI },
  E: { dx: 0.5, dz: 0, rotationY: Math.PI / 2 },
  S: { dx: 0, dz: 0.5, rotationY: 0 },
  W: { dx: -0.5, dz: 0, rotationY: -Math.PI / 2 },
}

export interface SidePlacement {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotationY: number
}

/** World placement for one exposed side; shared by chunk and fade meshes (D045). */
export function sidePlacement(
  x: number,
  z: number,
  level: number,
  dir: SideDirection,
): SidePlacement {
  const centre = cellCentre(x, z)
  const facing = SIDE_FACING[dir]
  return {
    x: centre.x + facing.dx,
    y: (level - 0.5) * CONFIG.world.tileThickness,
    z: centre.z + facing.dz,
    rotationY: facing.rotationY,
  }
}

/** Chunk coordinates containing a cell; `Math.floor` keeps negative cells in the right chunk. */
export function chunkOf(x: number, z: number): ChunkCoordinate {
  const size = CONFIG.world.chunkSize
  return { cx: Math.floor(x / size), cz: Math.floor(z / size) }
}

export function chunkKey(cx: number, cz: number): ChunkKey {
  return `${cx},${cz}`
}

/** Split a cell map into chunks, preserving cell insertion order inside each chunk. */
export function groupByChunk(cells: CellMap): Map<ChunkKey, Cell[]> {
  const chunks = new Map<ChunkKey, Cell[]>()
  for (const cell of cells.values()) {
    const chunk = chunkOf(cell.x, cell.z)
    const chunkId = chunkKey(chunk.cx, chunk.cz)
    const list = chunks.get(chunkId)
    if (list) list.push(cell)
    else chunks.set(chunkId, [cell])
  }
  return chunks
}

function levelsFrom(from: number, to: number): number[] {
  const levels: number[] = []
  for (let level = from; level <= to; level += 1) levels.push(level)
  return levels
}

/**
 * Side faces to draw for one column. A neighbour hides the levels it reaches; only
 * the levels above a lower neighbour remain exposed. Tile type never matters (D014).
 */
export function exposedSides(cell: Cell, cells: CellMap): SideFace[] {
  const sides: SideFace[] = []
  for (const { dir, grid } of SIDE_DIRECTIONS) {
    const point = neighbour(cell.x, cell.z, grid)
    const other = cells.get(key(point.x, point.z))
    const first = other ? other.level + 1 : 1
    for (let level = first; level <= cell.level; level += 1) {
      sides.push({ dir, level })
    }
  }
  return sides
}

function changedCells(prevCells: CellMap, nextCells: CellMap): Cell[] {
  const changed: Cell[] = []
  const keys = new Set([...prevCells.keys(), ...nextCells.keys()])
  for (const cellKey of keys) {
    const before = prevCells.get(cellKey)
    const after = nextCells.get(cellKey)
    if (before === after) continue
    if (
      before &&
      after &&
      before.x === after.x &&
      before.z === after.z &&
      before.type === after.type &&
      before.level === after.level
    ) {
      continue
    }
    const cell = after ?? before
    if (cell) changed.push(cell)
  }
  return changed
}

/**
 * Chunks to rebuild after a change. A changed cell rebuilds its own chunk; a cell on
 * a chunk border also rebuilds the chunk across that border because the neighbour's
 * exposed sides change too.
 */
export function affectedChunks(prevCells: CellMap, nextCells: CellMap): Set<ChunkKey> {
  const chunks = new Set<ChunkKey>()
  for (const cell of changedCells(prevCells, nextCells)) {
    const own = chunkOf(cell.x, cell.z)
    chunks.add(chunkKey(own.cx, own.cz))
    for (const { grid } of SIDE_DIRECTIONS) {
      const point = neighbour(cell.x, cell.z, grid)
      const adjacent = chunkOf(point.x, point.z)
      if (adjacent.cx !== own.cx || adjacent.cz !== own.cz) {
        chunks.add(chunkKey(adjacent.cx, adjacent.cz))
      }
    }
  }
  return chunks
}

/**
 * Levels added and removed per cell. A new column adds 1..level, a removed column
 * removes 1..level, and a level change adds or removes only the difference. A type
 * change at the same level produces no entry because tile type changes are instant.
 */
export function diffLevels(prevCells: CellMap, nextCells: CellMap): CellLevelDiff[] {
  const diffs: CellLevelDiff[] = []
  const keys = new Set([...prevCells.keys(), ...nextCells.keys()])
  for (const cellKey of keys) {
    const prev = prevCells.get(cellKey) ?? null
    const next = nextCells.get(cellKey) ?? null
    let added: number[] = []
    let removed: number[] = []

    if (!prev && next) {
      added = levelsFrom(1, next.level)
    } else if (prev && !next) {
      removed = levelsFrom(1, prev.level)
    } else if (prev && next) {
      if (next.level > prev.level) added = levelsFrom(prev.level + 1, next.level)
      else if (next.level < prev.level) removed = levelsFrom(next.level + 1, prev.level)
    }

    if (added.length === 0 && removed.length === 0) continue
    const cell = next ?? prev
    if (!cell) continue
    diffs.push({
      key: cellKey,
      x: cell.x,
      z: cell.z,
      prev,
      next,
      added,
      removed,
    })
  }
  return diffs
}

/** Tile levels fade for new actions, but not for history moves or reduced motion. */
export function shouldFadeTiles(source: ChangeSource, reducedMotion: boolean): boolean {
  return !reducedMotion && (source === 'execute' || source === 'batch')
}

export interface PlannedFade {
  readonly x: number
  readonly z: number
  readonly type: TileType
  readonly levels: readonly number[]
  readonly mode: 'in' | 'out'
  readonly duration: number
  readonly cell: Cell
  readonly sides: readonly SideFace[]
}

export interface FadePlan {
  readonly cells: CellMap
  readonly fades: readonly PlannedFade[]
}

/**
 * Decide which levels fade for a change. New levels stay out of the committed cells
 * until their overlay finishes; removed levels leave the chunk immediately. Type
 * changes, history moves and reduced motion commit everything at once (D043, D044).
 * Pending fade-in levels are already in `prevCells`, so the result commits them now.
 */
export function planFades(
  prevCells: CellMap,
  nextCells: CellMap,
  canFade: boolean,
): FadePlan {
  if (!canFade) return { cells: nextCells, fades: [] }

  const committed = new Map(nextCells)
  const fades: PlannedFade[] = []

  for (const diff of diffLevels(prevCells, nextCells)) {
    const sameType = !diff.prev || !diff.next || diff.prev.type === diff.next.type
    if (!sameType) continue

    if (diff.added.length > 0 && diff.next) {
      const cell = diff.next
      const levels = new Set(diff.added)
      if (diff.prev) committed.set(diff.key, diff.prev)
      else committed.delete(diff.key)
      fades.push({
        x: diff.x,
        z: diff.z,
        type: cell.type,
        levels: diff.added,
        mode: 'in',
        duration: CONFIG.motion.tileAddFadeMs,
        cell,
        sides: exposedSides(cell, nextCells).filter((side) => levels.has(side.level)),
      })
    }

    if (diff.removed.length > 0 && diff.prev) {
      const cell = diff.prev
      const levels = new Set(diff.removed)
      fades.push({
        x: diff.x,
        z: diff.z,
        type: cell.type,
        levels: diff.removed,
        mode: 'out',
        duration: CONFIG.motion.digUpFadeMs,
        cell,
        sides: exposedSides(cell, prevCells).filter((side) => levels.has(side.level)),
      })
    }
  }

  if (fades.length === 0) return { cells: nextCells, fades }
  return { cells: committed, fades }
}
