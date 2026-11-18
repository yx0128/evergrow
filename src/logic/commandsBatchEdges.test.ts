import { describe, expect, it } from 'vitest'
import type { Command } from './commands'
import {
  EMPTY_HISTORY,
  apply,
  execute,
  executeBatch,
  redo,
  undo,
} from './commands'
import { key } from './grid'
import {
  assertConsistent,
  catalog,
  inventoryOf,
  lamp,
  stateOf,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

describe('executeBatch', () => {
  it('applies dependent paint, sell and place commands in one stroke', () => {
    const initial = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
      coins: 0,
    })
    const commands: Command[] = [
      { kind: 'paint', x: 2, z: 2, type: 'grass' },
      { kind: 'sell', uid: 'a' },
      {
        kind: 'place',
        uid: 'f',
        id: 'fence',
        x: 2,
        z: 2,
        rot: 0,
        autoTile: 'grass',
        source: 'shop',
      },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.history.past).toHaveLength(1)
    expect(executed.state.items.has('f')).toBe(true)
    expect(executed.state.items.has('a')).toBe(false)
    expect(executed.state.cells.get(key(2, 2))?.type).toBe('grass')
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('applies both paints when the same cell is painted twice', () => {
    const executed = executeBatch(
      EMPTY_HISTORY,
      stateOf(),
      [
        { kind: 'paint', x: 0, z: 0, type: 'grass' },
        { kind: 'paint', x: 0, z: 0, type: 'water' },
      ],
      catalog,
    )

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([])
    expect(executed.state.cells.get(key(0, 0))?.type).toBe('water')
  })

  it('never retries a skipped command that a later command would enable', () => {
    const initial = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
      coins: 0,
    })
    const commands: Command[] = [
      {
        kind: 'place',
        uid: 'f',
        id: 'fence',
        x: 0,
        z: 0,
        rot: 0,
        autoTile: 'grass',
        source: 'shop',
      },
      { kind: 'sell', uid: 'a' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([{ index: 0, reason: 'unaffordable' }])
    expect(executed.state.items.has('f')).toBe(false)
    expect(executed.state.coins).toBe(initial.coins + lamp.price)
  })

  it('keeps inventory exact after placing and storing the same uid', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    const commands: Command[] = [
      {
        kind: 'place',
        uid: 'a',
        id: 'lamp',
        x: 0,
        z: 0,
        rot: 0,
        autoTile: 'grass',
        source: 'inventory',
      },
      { kind: 'store', uid: 'a' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.inventory.get('lamp')).toBe(1)
    expect([...executed.state.inventory.values()].every((count) => count > 0)).toBe(true)
    expect(executed.state.items.size).toBe(0)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
  })

  it('applies a sell refund as a delta after outside coin changes', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 1)),
      items: itemsOf(placed('a', lamp), placed('b', lamp, 1, 1)),
      coins: 5,
    })
    const executed = executeBatch(
      EMPTY_HISTORY,
      initial,
      [
        { kind: 'sell', uid: 'a' },
        { kind: 'sell', uid: 'b' },
      ],
      catalog,
    )
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(initial.coins + 2 * lamp.price)

    const external = stateOf({
      cells: executed.state.cells,
      items: executed.state.items,
      inventory: executed.state.inventory,
      coins: 100,
    })
    const undone = undo(executed.history, external, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.coins).toBe(external.coins - 2 * lamp.price)
  })

  it('throws for a duplicate uid inside a batch', () => {
    const initial = stateOf({ coins: lamp.price * 3 })
    const command = (x: number): Command => ({
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    })
    expect(() =>
      executeBatch(EMPTY_HISTORY, initial, [command(0), command(1)], catalog),
    ).toThrow('Item uid already exists: a')
  })

  it('skips a second place on an occupied cell', () => {
    const initial = stateOf({ coins: lamp.price * 3 })
    const command = (uid: string): Command => ({
      kind: 'place',
      uid,
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    })
    const executed = executeBatch(EMPTY_HISTORY, initial, [command('a'), command('b')], catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([{ index: 1, reason: 'occupied' }])
    expect(executed.history.past).toHaveLength(1)
    expect(executed.state.items.size).toBe(1)
  })

  it('round-trips a single-command batch', () => {
    const initial = stateOf()
    const executed = executeBatch(
      EMPTY_HISTORY,
      initial,
      [{ kind: 'paint', x: 0, z: 0, type: 'grass' }],
      catalog,
    )
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.history.past).toHaveLength(1)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('throws for nested and empty batches', () => {
    const state = stateOf()
    expect(() =>
      executeBatch(
        EMPTY_HISTORY,
        state,
        [{ kind: 'batch', commands: [{ kind: 'paint', x: 0, z: 0, type: 'grass' }] }],
        catalog,
      ),
    ).toThrow('Nested batches are not allowed')
    expect(() => executeBatch(EMPTY_HISTORY, state, [], catalog)).toThrow(
      'An empty batch is not allowed',
    )
  })

  it('throws when a batch reaches execute or apply directly', () => {
    const state = stateOf()
    const batch: Command = { kind: 'batch', commands: [] }
    expect(() => execute(EMPTY_HISTORY, state, batch, catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
    expect(() => apply(batch, state, catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
  })
})
