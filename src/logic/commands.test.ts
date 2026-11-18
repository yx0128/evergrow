import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import {
  EMPTY_HISTORY,
  apply,
  canRedo,
  execute,
  executeBatch,
  redo,
  undo,
  validate,
  type Command,
  type WorldState,
} from './commands'
import {
  catalog,
  cottage,
  inventoryOf,
  lamp,
  stateOf,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

const HALF_WORLD = CONFIG.world.maxSize / 2

describe('apply guards', () => {
  it('throws when placement was not validated first', () => {
    const state = stateOf({ cells: mapWith(cell(0, 0)), items: itemsOf(placed('a', lamp)) })
    const command: Command = {
      kind: 'place',
      uid: 'b',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(() => apply(command, state, catalog)).toThrow('Invalid placement: occupied')
  })

  it('throws when the item level was not validated first', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(() => apply({ kind: 'setLevelItem', uid: 'a', level: 0 }, state, catalog)).toThrow(
      'Unexpected cell result: minStack',
    )
  })
})

describe('command behaviour gaps', () => {
  const paintAt = (x: number, z: number): Command => ({ kind: 'paint', x, z, type: 'grass' })
  const placeLamp = (source: 'inventory' | 'shop'): Command => ({
    kind: 'place',
    uid: 'new',
    id: lamp.id,
    x: 0,
    z: 0,
    rot: 0,
    autoTile: 'grass',
    source,
  })

  function succeed<T extends { readonly ok: boolean }>(result: T): Extract<T, { ok: true }> {
    expect(result.ok).toBe(true)
    return result as Extract<T, { ok: true }>
  }

  const run = (state: WorldState, command: Command, history = EMPTY_HISTORY) =>
    succeed(execute(history, state, command, catalog))

  it('writes the requested auto tile into the world', () => {
    const result = run(stateOf({ coins: cottage.price }), {
      kind: 'place',
      uid: 'new',
      id: cottage.id,
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'land',
      source: 'shop',
    })
    expect([...result.state.cells.values()].map((it) => it.type)).toEqual([
      'land',
      'land',
      'land',
      'land',
    ])
  })

  it('buys with the exact price and refuses one coin short', () => {
    expect(run(stateOf({ coins: lamp.price }), placeLamp('shop')).state.coins).toBe(0)
    expect(validate(placeLamp('shop'), stateOf({ coins: lamp.price - 1 }), catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
    })
  })

  it('does not charge coins for an inventory place', () => {
    const state = stateOf({ coins: 100, inventory: inventoryOf([[lamp.id, 1]]) })
    expect(run(state, placeLamp('inventory')).state.coins).toBe(100)
  })

  it('does not spend inventory for a shop place', () => {
    const state = stateOf({ coins: 100, inventory: inventoryOf([[lamp.id, 2]]) })
    expect(run(state, placeLamp('shop')).state.inventory.get(lamp.id)).toBe(2)
  })

  it('lets a move overlap the item\'s own cells', () => {
    const state = stateOf({
      items: itemsOf(placed('c', cottage)),
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
    })
    const result = run(state, { kind: 'move', uid: 'c', x: 1, z: 0, rot: 0, autoTile: 'grass' })
    expect(result.state.items.get('c')).toMatchObject({ x: 1, z: 0 })
  })

  it('applies the requested rotation on move', () => {
    const state = stateOf({ items: itemsOf(placed('l', lamp)), cells: mapWith(cell(0, 0)) })
    const result = run(state, { kind: 'move', uid: 'l', x: 0, z: 0, rot: 2, autoTile: 'grass' })
    expect(result.state.items.get('l')?.rot).toBe(2)
  })

  it('throws when validate receives a batch', () => {
    const batch: Command = { kind: 'batch', commands: [paintAt(0, 0)] }
    expect(() => validate(batch, stateOf(), catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
  })

  it('keeps an existing history when execute fails', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const failed = execute(first.history, first.state, paintAt(HALF_WORLD, HALF_WORLD), catalog)
    expect(failed.ok).toBe(false)
    expect(failed.history).toBe(first.history)
  })

  it('undoes the newest command first', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const second = run(first.state, paintAt(1, 0), first.history)
    expect(succeed(undo(second.history, second.state, catalog)).state).toEqual(first.state)
  })

  it('replays two undone commands in their original order', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const second = run(first.state, paintAt(1, 0), first.history)
    const undoOne = succeed(undo(second.history, second.state, catalog))
    const undoTwo = succeed(undo(undoOne.history, undoOne.state, catalog))
    const redoOne = succeed(redo(undoTwo.history, undoTwo.state, catalog))
    expect(redoOne.state).toEqual(first.state)
    const redoTwo = succeed(redo(redoOne.history, redoOne.state, catalog))
    expect(redoTwo.state).toEqual(second.state)
    expect(canRedo(redoTwo.history)).toBe(false)
  })

  it('replays two undone batches in their original order', () => {
    const first = succeed(executeBatch(EMPTY_HISTORY, stateOf(), [paintAt(0, 0)], catalog))
    const second = succeed(executeBatch(first.history, first.state, [paintAt(1, 0)], catalog))
    const undoOne = succeed(undo(second.history, second.state, catalog))
    const undoTwo = succeed(undo(undoOne.history, undoOne.state, catalog))
    const redoOne = succeed(redo(undoTwo.history, undoTwo.state, catalog))
    expect(redoOne.state).toEqual(first.state)
    const redoTwo = succeed(redo(redoOne.history, redoOne.state, catalog))
    expect(redoTwo.state).toEqual(second.state)
    expect(canRedo(redoTwo.history)).toBe(false)
  })

  it('records a fresh inverse when redo runs on a changed world', () => {
    const done = run(stateOf(), paintAt(0, 0))
    const undone = succeed(undo(done.history, done.state, catalog))
    const changed = { ...undone.state, cells: mapWith(cell(3, 3)) }
    const redone = succeed(redo(undone.history, changed, catalog))
    expect(succeed(undo(redone.history, redone.state, catalog)).state.cells).toEqual(changed.cells)
  })

  it('records a fresh inverse when batch redo runs on a changed world', () => {
    const done = succeed(executeBatch(EMPTY_HISTORY, stateOf(), [paintAt(0, 0)], catalog))
    const undone = succeed(undo(done.history, done.state, catalog))
    const changed = { ...undone.state, cells: mapWith(cell(3, 3)) }
    const redone = succeed(redo(undone.history, changed, catalog))
    expect(succeed(undo(redone.history, redone.state, catalog)).state.cells).toEqual(changed.cells)
  })
})
