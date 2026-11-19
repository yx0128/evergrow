import {
  DoubleSide,
  FrontSide,
  MeshStandardMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type Material,
  type Side,
} from 'three'
import { CONFIG, type TileType } from '../config/evergrow.config'

export interface TilePart {
  readonly geometry: BufferGeometry
  readonly material: Material
}

/**
 * Renderer-facing tile meshes. The real `tile_<type>.glb` exports can replace the
 * placeholder parts without changing TileChunks. The side mesh faces +Z, then the
 * renderer rotates it for N, E, S and W (BRIEF §11.2).
 */
export interface TileMeshSource {
  readonly top: TilePart
  readonly side: TilePart
}

export type TileMeshSources = Readonly<Record<TileType, TileMeshSource>>

export interface TileMeshSet {
  readonly sources: TileMeshSources
  readonly floor: TilePart
  dispose(): void
}

const TILE_TYPES: readonly TileType[] = ['grass', 'land', 'water']

/** Placeholder 1 × tileThickness × 1 planes; replace with the exported GLB parts later. */
export function createPlaceholderTileMeshes(): TileMeshSet {
  const thickness = CONFIG.world.tileThickness

  const topGeometry = new PlaneGeometry(1, 1)
  topGeometry.rotateX(-Math.PI / 2)
  const sideGeometry = new PlaneGeometry(1, thickness)

  const materials = new Set<Material>()
  const sources = {} as Record<TileType, TileMeshSource>

  for (const type of TILE_TYPES) {
    const def = CONFIG.tiles[type]
    const topMaterial = new MeshStandardMaterial({
      color: def.topColor,
      transparent: def.transparent,
      opacity: def.topOpacity,
      depthWrite: !def.transparent,
      side: FrontSide,
    })
    const sideSide: Side = type === 'water' ? DoubleSide : FrontSide
    const sideMaterial = new MeshStandardMaterial({
      color: def.sideColor,
      side: sideSide,
    })
    materials.add(topMaterial)
    materials.add(sideMaterial)
    sources[type] = {
      top: { geometry: topGeometry, material: topMaterial },
      side: { geometry: sideGeometry, material: sideMaterial },
    }
  }

  const floorMaterial = new MeshStandardMaterial({ color: CONFIG.water.floorColor })
  materials.add(floorMaterial)

  return {
    sources,
    floor: { geometry: topGeometry, material: floorMaterial },
    dispose() {
      topGeometry.dispose()
      sideGeometry.dispose()
      for (const material of materials) material.dispose()
    },
  }
}
