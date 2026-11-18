import { CONFIG } from '../config/evergrow.config'

export interface GridPoint {
  readonly x: number
  readonly z: number
}

export interface GridBounds {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
}

/** Anything keyed by cell that exposes its coordinates (e.g. `CellMap`). */
export type GridCells = ReadonlyMap<string, GridPoint>

export type Direction = 'north' | 'east' | 'south' | 'west'

/** +X is east and +Z is south; north is towards -Z. */
export const DIRECTIONS: Readonly<Record<Direction, GridPoint>> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
}

/** Stable sparse-map key for integer cell coordinates. Throws on non-integers. */
export function key(x: number, z: number): string {
  if (!Number.isInteger(x) || !Number.isInteger(z)) {
    throw new Error(`Invalid cell coordinates: ${x},${z}`)
  }
  return `${x},${z}`
}

export function neighbour(x: number, z: number, direction: Direction): GridPoint {
  const offset = DIRECTIONS[direction]
  return { x: x + offset.x, z: z + offset.z }
}

/** The four orthogonal neighbours in N, E, S, W order. */
export function neighbours(x: number, z: number): GridPoint[] {
  return [
    neighbour(x, z, 'north'),
    neighbour(x, z, 'east'),
    neighbour(x, z, 'south'),
    neighbour(x, z, 'west'),
  ]
}

/** Square bounds of `size` cells centred on the origin; even sizes sit half a cell off. */
export function boundsForSize(size: number): GridBounds {
  const min = -Math.floor(size / 2)
  return { minX: min, maxX: min + size - 1, minZ: min, maxZ: min + size - 1 }
}

export function worldBounds(): GridBounds {
  return boundsForSize(CONFIG.world.maxSize)
}

export function startZoneBounds(): GridBounds {
  return boundsForSize(CONFIG.world.startZone)
}

export function insideBounds(x: number, z: number, bounds: GridBounds): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

export function isInWorld(x: number, z: number): boolean {
  return insideBounds(x, z, worldBounds())
}

export function isWithinStartZone(x: number, z: number): boolean {
  return insideBounds(x, z, startZoneBounds())
}

/** Chebyshev (ring) distance between two cells. */
export function chebyshevDistance(a: GridPoint, b: GridPoint): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z))
}

/**
 * A cell is buildable inside the start zone, or within `buildableRing` cells of any
 * existing tile (§4.6). It must also be inside the world cap.
 */
export function isBuildable(x: number, z: number, cells: GridCells): boolean {
  if (!isInWorld(x, z)) return false
  if (isWithinStartZone(x, z)) return true

  const point = { x, z }
  for (const cell of cells.values()) {
    if (chebyshevDistance(point, cell) <= CONFIG.world.buildableRing) return true
  }
  return false
}

/** Bounding box of all existing cells, or null for an empty world. */
export function landBounds(cells: GridCells): GridBounds | null {
  if (cells.size === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const cell of cells.values()) {
    if (cell.x < minX) minX = cell.x
    if (cell.x > maxX) maxX = cell.x
    if (cell.z < minZ) minZ = cell.z
    if (cell.z > maxZ) maxZ = cell.z
  }

  return { minX, maxX, minZ, maxZ }
}
