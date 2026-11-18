import { expect } from 'vitest'
import type { CellMap } from '../cells'
import {
  EMPTY_HISTORY,
  execute,
  redo,
  undo,
  type Command,
  type WorldState,
} from '../commands'
import { worldBounds } from '../grid'
import { buildOccupancy, type PlacedItems } from '../placement'
import { catalogOf, item, itemsOf, mapWith } from './fixtures'

export const lamp = item({ id: 'lamp', footprint: [1, 1], price: 10, allowedTiles: ['grass'] })
export const cottage = item({ id: 'cottage', footprint: [2, 2], price: 80 })
export const fence = item({
  id: 'fence',
  footprint: [1, 1],
  price: 5,
  connectable: true,
})

export const catalog = catalogOf(lamp, cottage, fence)

interface StateOptions {
  readonly cells?: CellMap
  readonly items?: PlacedItems
  readonly inventory?: ReadonlyMap<string, number>
  readonly coins?: number
}

export const stateOf = (options: StateOptions = {}): WorldState => {
  const items = options.items ?? itemsOf()
  return {
    cells: options.cells ?? mapWith(),
    items,
    occupancy: buildOccupancy(items, catalog),
    inventory: options.inventory ?? new Map(),
    coins: options.coins ?? 0,
  }
}

export const inventoryOf = (entries: ReadonlyArray<[string, number]>) => new Map(entries)

export function worldCoords(count: number): Array<[number, number]> {
  // Paint needs each cell buildable: start inside the start zone at (0, 0) and
  // snake through z >= 0 so every next cell touches the already-painted path.
  const { minX, maxX, maxZ } = worldBounds()
  const coords: Array<[number, number]> = []
  for (let z = 0; z <= maxZ && coords.length < count; z += 1) {
    if (z === 0) {
      for (let x = 0; x <= maxX && coords.length < count; x += 1) coords.push([x, z])
    } else if (z % 2 === 1) {
      for (let x = maxX; x >= minX && coords.length < count; x -= 1) coords.push([x, z])
    } else {
      for (let x = minX; x <= maxX && coords.length < count; x += 1) coords.push([x, z])
    }
  }
  if (coords.length < count) {
    throw new Error(`World has only ${coords.length} buildable-path cells; need ${count}`)
  }
  return coords
}

export function assertConsistent(state: WorldState): void {
  expect(state.occupancy).toEqual(buildOccupancy(state.items, catalog))
  for (const [cellKey, uid] of state.occupancy) {
    expect(state.items.has(uid)).toBe(true)
    expect(state.cells.has(cellKey)).toBe(true)
  }
}

export function expectRoundTrip(initial: WorldState, command: Command): void {
  const executed = execute(EMPTY_HISTORY, initial, command, catalog)
  expect(executed.ok).toBe(true)
  if (!executed.ok) return
  assertConsistent(executed.state)

  const undone = undo(executed.history, executed.state, catalog)
  expect(undone.ok).toBe(true)
  if (!undone.ok) return
  expect(undone.state).toEqual(initial)
  assertConsistent(undone.state)

  const redone = redo(undone.history, undone.state, catalog)
  expect(redone.ok).toBe(true)
  if (!redone.ok) return
  expect(redone.state).toEqual(executed.state)
  assertConsistent(redone.state)
}

export const paintCommands: Command[] = [
  { kind: 'paint', x: 0, z: 0, type: 'grass' },
  { kind: 'paint', x: 1, z: 0, type: 'grass' },
  { kind: 'paint', x: 0, z: 1, type: 'grass' },
]
