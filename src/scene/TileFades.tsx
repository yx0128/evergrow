import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial, type Material, type Mesh } from 'three'
import { CONFIG } from '../config/evergrow.config'
import { cellCentre } from './cameraMath'
import { sidePlacement } from './tileGeometry'
import type { TileMeshSources } from './tileMeshes'
import type { TileFade } from './tileState'

interface TileFadesProps {
  readonly fades: readonly TileFade[]
  readonly sources: TileMeshSources
  readonly onDone: (id: number) => void
}

/** Clone a tile material so an overlay can fade without touching the chunk materials. */
function fadeMaterial(source: Material, opacity: number): MeshStandardMaterial {
  const material = source.clone() as MeshStandardMaterial
  material.transparent = true
  material.depthWrite = false
  material.opacity = opacity
  return material
}

/** Mutate material opacity outside the component so the frame loop changes no hook values. */
function applyOpacity(
  side: MeshStandardMaterial,
  top: MeshStandardMaterial,
  value: number,
  topBase: number,
): void {
  side.opacity = value
  top.opacity = value * topBase
}

interface FadeOverlayProps {
  readonly fade: TileFade
  readonly sources: TileMeshSources
  readonly onDone: (id: number) => void
}

function FadeOverlay({ fade, sources, onDone }: FadeOverlayProps) {
  const source = sources[fade.type]
  const topBase = source.top.material.opacity
  const centre = cellCentre(fade.x, fade.z)
  const topY = fade.cell.level * CONFIG.world.tileThickness
  const done = useRef(false)
  const topMesh = useRef<Mesh>(null)

  const sideMaterial = useMemo(
    () => fadeMaterial(source.side.material, fade.mode === 'out' ? 1 : 0),
    [fade.mode, source.side.material],
  )
  const topMaterial = useMemo(
    () => fadeMaterial(source.top.material, fade.mode === 'out' ? topBase : 0),
    [fade.mode, source.top.material, topBase],
  )

  useEffect(
    () => () => {
      sideMaterial.dispose()
      topMaterial.dispose()
    },
    [sideMaterial, topMaterial],
  )

  useLayoutEffect(() => {
    const mesh = topMesh.current
    if (!mesh) return
    if (fade.mode === 'in') mesh.userData.tileCells = new Map([[0, fade.cell]])
    else delete mesh.userData.tileCells
  }, [fade.cell, fade.mode])

  useFrame(() => {
    const progress =
      fade.duration <= 0
        ? 1
        : Math.min(1, Math.max(0, (performance.now() - fade.start) / fade.duration))
    const value = fade.mode === 'in' ? progress : 1 - progress
    applyOpacity(sideMaterial, topMaterial, value, topBase)

    if (progress >= 1 && !done.current) {
      done.current = true
      onDone(fade.id)
    }
  })

  return (
    <>
      {fade.sides.map((face) => {
        const placement = sidePlacement(fade.x, fade.z, face.level, face.dir)
        return (
          <mesh
            key={`${face.dir}:${face.level}`}
            geometry={source.side.geometry}
            material={sideMaterial}
            position={[placement.x, placement.y, placement.z]}
            rotation-y={placement.rotationY}
            renderOrder={CONFIG.rendering.transparentRenderOrder}
          />
        )
      })}
      <mesh
        ref={topMesh}
        geometry={source.top.geometry}
        material={topMaterial}
        position={[centre.x, topY, centre.z]}
        renderOrder={CONFIG.rendering.transparentRenderOrder}
      />
    </>
  )
}

/** Short-lived overlay meshes for level fades; only their opacity changes per frame (§9). */
export function TileFades({ fades, sources, onDone }: TileFadesProps) {
  return (
    <>
      {fades.map((fade) => (
        <FadeOverlay key={fade.id} fade={fade} sources={sources} onDone={onDone} />
      ))}
    </>
  )
}
