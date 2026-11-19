import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type DirectionalLight } from 'three'
import { CONFIG } from '../config/evergrow.config'
import { useWorldStore } from '../store/world'
import { cameraTargetBounds, shadowCameraBounds } from './cameraMath'

/** Soft directional key light with shadows plus warm ambient and hemisphere fill. */
export function Lighting() {
  const cells = useWorldStore((state) => state.cells)
  const bounds = useMemo(() => cameraTargetBounds(cells), [cells])
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
  const shadow = useMemo(
    () =>
      shadowCameraBounds(
        bounds,
        CONFIG.lighting.directionalPosition,
        CONFIG.world.maxStack * CONFIG.world.tileThickness,
      ),
    [bounds],
  )
  const target = useMemo(() => new Object3D(), [])
  const light = useRef<DirectionalLight>(null)
  const [dx, dy, dz] = CONFIG.lighting.directionalPosition

  useLayoutEffect(() => {
    if (light.current) light.current.target = target
  }, [target])

  return (
    <>
      <ambientLight
        color={CONFIG.lighting.ambientColor}
        intensity={CONFIG.lighting.ambientIntensity}
      />
      <hemisphereLight
        color={CONFIG.lighting.hemisphereSkyColor}
        groundColor={CONFIG.lighting.hemisphereGroundColor}
        intensity={CONFIG.lighting.hemisphereIntensity}
      />
      <primitive object={target} position={[center.x, 0, center.z]} />
      <directionalLight
        ref={light}
        castShadow
        color={CONFIG.lighting.directionalColor}
        intensity={CONFIG.lighting.directionalIntensity}
        position={[center.x + dx, dy, center.z + dz]}
        shadow-mapSize={[CONFIG.rendering.shadowMapSize, CONFIG.rendering.shadowMapSize]}
        shadow-radius={CONFIG.lighting.shadowRadius}
        shadow-bias={CONFIG.lighting.shadowBias}
        shadow-camera-left={shadow.left}
        shadow-camera-right={shadow.right}
        shadow-camera-top={shadow.top}
        shadow-camera-bottom={shadow.bottom}
        shadow-camera-near={shadow.near}
        shadow-camera-far={shadow.far}
      />
    </>
  )
}
