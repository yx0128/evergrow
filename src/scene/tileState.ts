import { CONFIG, type TileType } from '../config/evergrow.config'
import type { Cell, CellMap } from '../logic/cells'
import { cellCentre } from './cameraMath'
import {
  affectedChunks,
  exposedSides,
  groupByChunk,
  sidePlacement,
  type ChunkKey,
  type FadePlan,
  type PlannedFade,
} from './tileGeometry'

export interface TopInstance {
  readonly cell: Cell
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotationY: number
}

export interface SideInstance {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotationY: number
}

export interface FloorInstance {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotationY: number
}

export interface TypeParts {
  readonly tops: TopInstance[]
  readonly sides: SideInstance[]
  readonly floors: FloorInstance[]
}

export interface ChunkContent {
  readonly key: ChunkKey
  readonly parts: Readonly<Record<TileType, TypeParts>>
}

export interface TileFade extends PlannedFade {
  readonly id: number
  readonly start: number
}

/** Everything the tile scene draws; updated together so a handover has no gap. */
export interface TileSceneState {
  readonly cells: CellMap
  readonly chunks: ReadonlyMap<ChunkKey, ChunkContent>
  readonly fades: readonly TileFade[]
  readonly nextFadeId: number
}

function emptyParts(): TypeParts {
  return { tops: [], sides: [], floors: [] }
}

function emptyContent(key: ChunkKey): ChunkContent {
  return {
    key,
    parts: {
      grass: emptyParts(),
      land: emptyParts(),
      water: emptyParts(),
    },
  }
}

/** Build one chunk's instance lists; sides look at the whole committed map so borders work. */
function buildChunkContent(
  chunkId: ChunkKey,
  chunkCells: readonly Cell[],
  allCells: CellMap,
): ChunkContent {
  const content = emptyContent(chunkId)
  const thickness = CONFIG.world.tileThickness
  const floorDepth = CONFIG.water.floorDepth

  for (const cell of chunkCells) {
    const parts = content.parts[cell.type]
    const centre = cellCentre(cell.x, cell.z)
    const topY = cell.level * thickness
    parts.tops.push({ cell, x: centre.x, y: topY, z: centre.z, rotationY: 0 })

    if (cell.type === 'water') {
      parts.floors.push({
        x: centre.x,
        y: topY - floorDepth,
        z: centre.z,
        rotationY: 0,
      })
    }

    for (const face of exposedSides(cell, allCells)) {
      parts.sides.push(sidePlacement(cell.x, cell.z, face.level, face.dir))
    }
  }

  return content
}

function buildChunkMap(cells: CellMap): Map<ChunkKey, ChunkContent> {
  const chunks = new Map<ChunkKey, ChunkContent>()
  for (const [chunkId, chunkCells] of groupByChunk(cells)) {
    chunks.set(chunkId, buildChunkContent(chunkId, chunkCells, cells))
  }
  return chunks
}

function updateChunks(
  chunks: ReadonlyMap<ChunkKey, ChunkContent>,
  prevCells: CellMap,
  nextCells: CellMap,
): ReadonlyMap<ChunkKey, ChunkContent> {
  if (prevCells === nextCells) return chunks
  const affected = affectedChunks(prevCells, nextCells)
  if (affected.size === 0) return chunks

  const grouped = groupByChunk(nextCells)
  const next = new Map(chunks)
  for (const chunkId of affected) {
    const chunkCells = grouped.get(chunkId)
    if (!chunkCells || chunkCells.length === 0) next.delete(chunkId)
    else next.set(chunkId, buildChunkContent(chunkId, chunkCells, nextCells))
  }
  return next
}

export function createTileSceneState(cells: CellMap): TileSceneState {
  return {
    cells,
    chunks: buildChunkMap(cells),
    fades: [],
    nextFadeId: 0,
  }
}

/** Apply a fade plan: commit its cells, rebuild affected chunks and start its fades. */
export function applyFadePlan(
  state: TileSceneState,
  plan: FadePlan,
  now: number,
): TileSceneState {
  let nextFadeId = state.nextFadeId
  const fades = plan.fades.map((fade) => {
    nextFadeId += 1
    return { ...fade, id: nextFadeId, start: now }
  })

  return {
    cells: plan.cells,
    chunks: updateChunks(state.chunks, state.cells, plan.cells),
    fades,
    nextFadeId,
  }
}

/**
 * Finish one fade in a single state update. A fade-in commits the latest cells and
 * rebuilds their chunks as the overlay disappears; a fade-out only removes it.
 */
export function finishFade(
  state: TileSceneState,
  fadeId: number,
  latestCells: CellMap,
): TileSceneState {
  const fade = state.fades.find((value) => value.id === fadeId)
  if (!fade) return state

  const fades = state.fades.filter((value) => value.id !== fadeId)
  if (fade.mode === 'out') return { ...state, fades }

  return {
    cells: latestCells,
    chunks: updateChunks(state.chunks, state.cells, latestCells),
    fades,
    nextFadeId: state.nextFadeId,
  }
}

/** Commit cells immediately and drop every overlay, e.g. for reduced motion. */
export function commitTileCells(
  state: TileSceneState,
  latestCells: CellMap,
): TileSceneState {
  if (state.cells === latestCells && state.fades.length === 0) return state
  return {
    cells: latestCells,
    chunks: updateChunks(state.chunks, state.cells, latestCells),
    fades: [],
    nextFadeId: state.nextFadeId,
  }
}
