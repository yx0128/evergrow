import { describe, expect, it } from 'vitest'
import type { Command } from './commands'
import { EMPTY_HISTORY, execute, undo, validate } from './commands'
import { key } from './grid'
import {
  assertConsistent,
  catalog,
  cottage,
  expectRoundTrip,
  fence,
  lamp,
  stateOf,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

describe('rotate', () => {
  it('changes only the rotation and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'rotate', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')?.rot).toBe(1)
    expect(executed.state.cells).toEqual(initial.cells)
    expectRoundTrip(initial, command)
  })

  it('rotates a connectable fence and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', fence)),
    })
    const command: Command = { kind: 'rotate', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')?.rot).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('returns to the original rotation after four rotations', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    let state = initial
    let history = EMPTY_HISTORY
    for (let turn = 0; turn < 4; turn += 1) {
      const result = execute(history, state, { kind: 'rotate', uid: 'a' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
      assertConsistent(state)
    }
    expect(state.items.get('a')?.rot).toBe(0)
    expect(state.cells).toEqual(initial.cells)
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'rotate', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})

describe('store', () => {
  it('removes the item, keeps tiles, adds it to inventory, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = { kind: 'store', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.has('a')).toBe(false)
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    expect(executed.state.inventory.get('lamp')).toBe(1)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('blocks undo when the stored item has been used', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const executed = execute(EMPTY_HISTORY, initial, { kind: 'store', uid: 'a' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const spent = { ...executed.state, inventory: new Map() }
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'notInInventory',
      state: spent,
      history: executed.history,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'store', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})

describe('sell', () => {
  it('refunds the full price, keeps tiles, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = { kind: 'sell', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(10)
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('blocks undo when the coins were spent in between', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const executed = execute(EMPTY_HISTORY, initial, { kind: 'sell', uid: 'a' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const spent = { ...executed.state, coins: 0 }
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: executed.history,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'sell', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})
