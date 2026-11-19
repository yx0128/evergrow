import { CONFIG, type TileType } from '../config/evergrow.config'
import type { WorldCommandInput } from './world'
import { useWorldStore } from './world'

interface SeedCell {
  readonly x: number
  readonly z: number
  readonly type: TileType
  readonly level: number
}

let seeded = false

/** Test terrain: a grass staircase, a low land strip and a raised water pool across a chunk border. */
function seedTerrain(): WorldCommandInput[] {
  const commands: WorldCommandInput[] = []
  const cells: SeedCell[] = []
  const lowest = CONFIG.world.minStack
  const highest = CONFIG.world.maxStack

  for (let step = 0; step <= highest - lowest; step += 1) {
    cells.push({ x: -4 + step, z: -2, type: 'grass', level: highest - step })
  }
  for (let x = -2; x <= 1; x += 1) {
    cells.push({ x, z: 0, type: 'land', level: lowest })
    cells.push({ x, z: 1, type: 'water', level: Math.ceil(highest / 2) })
  }

  for (const cell of cells) {
    commands.push({ kind: 'paint', x: cell.x, z: cell.z, type: cell.type })
  }
  for (const cell of cells) {
    if (cell.level !== lowest) {
      commands.push({ kind: 'setLevel', x: cell.x, z: cell.z, level: cell.level })
    }
  }
  return commands
}

/**
 * Dev-only F9 seeding through real commands. The terrain paints every level, uses
 * negative coordinates and crosses the x = -1/0 chunk border. Seed once per session.
 */
export function seedDevWorld(): void {
  if (!import.meta.env.DEV || seeded) return
  seeded = true

  const result = useWorldStore.getState().executeBatch(seedTerrain())
  if (!result.ok) {
    console.warn(`DEBUG seed failed: ${result.reason}`)
  } else if (result.skipped.length > 0) {
    console.warn('DEBUG seed skipped commands', result.skipped)
  }
  useWorldStore.getState().clearHistory()
}
