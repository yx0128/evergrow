import { describe, expect, it } from 'vitest'
import type { Command } from './commands'
import { EMPTY_HISTORY, execute, undo, validate } from './commands'
import { key } from './grid'
import {
  assertConsistent,
  catalog,
  expectRoundTrip,
  inventoryOf,
  lamp,
  stateOf,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

describe('place', () => {
  it('places from inventory, spends one item, and undoes the delta', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')).toEqual(placed('a', lamp))
    expect(executed.state.cells.get(key(0, 0))).toEqual(cell(0, 0))
    expect(executed.state.inventory.has('lamp')).toBe(false)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.inventory.get('lamp')).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('places from the shop, charges, and refunds on undo', () => {
    const initial = stateOf({ coins: 100 })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'cottage',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(20)
    expect(executed.state.cells.size).toBe(4)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.coins).toBe(100)
    expectRoundTrip(initial, command)
  })

  it('places a connectable fence at rot 1', () => {
    const initial = stateOf({ inventory: inventoryOf([['fence', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'f',
      id: 'fence',
      x: 0,
      z: 0,
      rot: 1,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('f')?.rot).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('rejects an inventory item that is not owned', () => {
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(validate(command, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'notInInventory',
    })
  })

  it('rejects a shop item that costs more than the coins held', () => {
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'cottage',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    }
    expect(validate(command, stateOf({ coins: 10 }), catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
    })
  })

  it('rejects an occupied footprint', () => {
    const other = placed('a', lamp)
    const state = stateOf({ cells: mapWith(cell(0, 0)), items: itemsOf(other) })
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
    expect(validate(command, state, catalog)).toEqual({ ok: false, reason: 'occupied' })
  })

  it('throws when the uid already exists', () => {
    const state = stateOf({ items: itemsOf(placed('a', lamp)) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 4,
      z: 4,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(() => validate(command, state, catalog)).toThrow('Item uid already exists: a')
  })

  it('undo removes only the tiles the place command created', () => {
    const initial = stateOf({ cells: mapWith(cell(5, 5)), inventory: inventoryOf([['lamp', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.cells).toEqual(initial.cells)
    expect(undone.state.cells.has(key(5, 5))).toBe(true)
  })
})

describe('move', () => {
  it('moves an item, keeps old tiles, creates tiles at the destination, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = {
      kind: 'move',
      uid: 'a',
      x: 2,
      z: 2,
      rot: 0,
      autoTile: 'grass',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')).toEqual(placed('a', lamp, 2, 2))
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    expect(executed.state.cells.has(key(2, 2))).toBe(true)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('rejects a move onto another item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(3, 3)),
      items: itemsOf(placed('a', lamp, 3, 3), placed('b', lamp)),
    })
    const command: Command = {
      kind: 'move',
      uid: 'a',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
    }
    expect(validate(command, state, catalog)).toEqual({ ok: false, reason: 'occupied' })
  })

  it('throws for an unknown uid', () => {
    const command: Command = {
      kind: 'move',
      uid: 'missing',
      x: 1,
      z: 1,
      rot: 0,
      autoTile: 'grass',
    }
    expect(() => validate(command, stateOf(), catalog)).toThrow('Unknown item uid: missing')
  })
})
