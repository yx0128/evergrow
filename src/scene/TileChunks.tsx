import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Object3D, type BufferGeometry, type InstancedMesh, type Material } from 'three'
import { CONFIG, type TileType } from '../config/evergrow.config'
import type { Cell } from '../logic/cells'
import { useWorldStore } from '../store/world'
import { TileFades } from './TileFades'
import {
  createPlaceholderTileMeshes,
  type TileMeshSources,
  type TilePart,
} from './tileMeshes'
import { planFades, shouldFadeTiles } from './tileGeometry'
import {
  applyFadePlan,
  commitTileCells,
  createTileSceneState,
  finishFade,
  type ChunkContent,
} from './tileState'
import { useReducedMotion } from './useReducedMotion'

const TILE_TYPES: readonly TileType[] = ['grass', 'land', 'water']

interface InstancedPartProps {
  readonly geometry: BufferGeometry
  readonly material: Material
  readonly instances: readonly {
    readonly x: number
    readonly y: number
    readonly z: number
    readonly rotationY: number
  }[]
  readonly castShadow: boolean
  readonly receiveShadow: boolean
  readonly renderOrder?: number
  readonly tileCells?: readonly Cell[]
}

/** One exact-sized InstancedMesh; a new count remounts it, the same count updates matrices. */
function InstancedPart({
  geometry,
  material,
  instances,
  castShadow,
  receiveShadow,
  renderOrder,
  tileCells,
}: InstancedPartProps) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    const object = mesh.current
    if (!object) return

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index]
      dummy.position.set(instance.x, instance.y, instance.z)
      dummy.rotation.set(0, instance.rotationY, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      object.setMatrixAt(index, dummy.matrix)
    }
    object.instanceMatrix.needsUpdate = true
    object.computeBoundingSphere()

    if (tileCells) {
      object.userData.tileCells = new Map(
        tileCells.map((cell, instanceId) => [instanceId, cell]),
      )
    }
  }, [dummy, instances, tileCells])

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      renderOrder={renderOrder}
    />
  )
}

interface TileChunkProps {
  readonly content: ChunkContent
  readonly sources: TileMeshSources
  readonly floor: TilePart
}

function TileChunkView({ content, sources, floor }: TileChunkProps) {
  return (
    <group name={`chunk-${content.key}`}>
      {TILE_TYPES.map((type) => {
        const parts = content.parts[type]
        const source = sources[type]
        const key = `${content.key}:${type}`
        const water = type === 'water'

        return (
          <Fragment key={type}>
            {parts.tops.length > 0 && (
              <InstancedPart
                key={`${key}:top:${parts.tops.length}`}
                geometry={source.top.geometry}
                material={source.top.material}
                instances={parts.tops}
                castShadow={!water}
                receiveShadow
                renderOrder={water ? CONFIG.rendering.transparentRenderOrder : 0}
                tileCells={parts.tops.map((top) => top.cell)}
              />
            )}
            {parts.sides.length > 0 && (
              <InstancedPart
                key={`${key}:side:${parts.sides.length}`}
                geometry={source.side.geometry}
                material={source.side.material}
                instances={parts.sides}
                castShadow
                receiveShadow
              />
            )}
            {water && parts.floors.length > 0 && (
              <InstancedPart
                key={`${key}:floor:${parts.floors.length}`}
                geometry={floor.geometry}
                material={floor.material}
                instances={parts.floors}
                castShadow
                receiveShadow
              />
            )}
          </Fragment>
        )
      })}
    </group>
  )
}

const TileChunk = memo(TileChunkView)

export function TileChunks() {
  const cells = useWorldStore((state) => state.cells)
  const changeSource = useWorldStore((state) => state.changeSource)
  const reducedMotion = useReducedMotion()
  const meshes = useMemo(() => createPlaceholderTileMeshes(), [])

  const [tileState, setTileState] = useState(() => createTileSceneState(cells))
  const lastCellsRef = useRef(cells)

  useEffect(() => () => meshes.dispose(), [meshes])

  const handleFadeDone = useCallback((id: number) => {
    setTileState((current) => finishFade(current, id, lastCellsRef.current))
  }, [])

  useEffect(() => {
    const prev = lastCellsRef.current
    if (prev === cells) return
    lastCellsRef.current = cells

    const plan = planFades(prev, cells, shouldFadeTiles(changeSource, reducedMotion))
    const now = performance.now()
    setTileState((current) => applyFadePlan(current, plan, now))
  }, [cells, changeSource, reducedMotion])

  useEffect(() => {
    if (!reducedMotion) return
    setTileState((current) => commitTileCells(current, lastCellsRef.current))
  }, [reducedMotion])

  return (
    <>
      {[...tileState.chunks.values()].map((content) => (
        <TileChunk
          key={content.key}
          content={content}
          sources={meshes.sources}
          floor={meshes.floor}
        />
      ))}
      <TileFades
        fades={tileState.fades}
        sources={meshes.sources}
        onDone={handleFadeDone}
      />
    </>
  )
}
