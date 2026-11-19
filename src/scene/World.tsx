import { useEffect } from 'react'
import { CONFIG } from '../config/evergrow.config'
import { seedDevWorld } from '../store/devSeed'
import { useWorldStore } from '../store/world'
import { cellCentre } from './cameraMath'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'

// DEBUG: start-zone grid and cell boxes are placeholders until tile rendering exists.
function DebugStartZoneGrid() {
  const size = CONFIG.world.startZone
  const color = CONFIG.palette.ui.border
  return (
    <gridHelper
      args={[size, size, color, color]}
      position={[0, 0.01, 0]}
      renderOrder={1}
    >
      <lineBasicMaterial attach="material" color={color} transparent opacity={0.18} depthWrite={false} />
    </gridHelper>
  )
}

function DebugCells() {
  const cells = useWorldStore((state) => state.cells)
  const thickness = CONFIG.world.tileThickness
  const color = CONFIG.palette.ui.accent

  return (
    <>
      {[...cells.values()].map((cell) => {
        const centre = cellCentre(cell.x, cell.z)
        return (
          <mesh
            key={`${cell.x},${cell.z}`}
            position={[centre.x, (cell.level - 0.5) * thickness, centre.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, thickness, 1]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        )
      })}
    </>
  )
}

export function World() {
  useEffect(() => {
    if (import.meta.env.DEV) seedDevWorld()
  }, [])

  return (
    <>
      <Lighting />
      <CameraRig />
      <DebugStartZoneGrid />
      <DebugCells />
    </>
  )
}
