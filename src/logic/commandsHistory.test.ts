import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import type { Command } from './commands'
import {
  EMPTY_HISTORY,
  canRedo,
  canUndo,
  execute,
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
  worldCoords,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

describe('history', () => {
  const placeLamp: Command = {
    kind: 'place',
    uid: 'a',
    id: 'lamp',
    x: 0,
    z: 0,
    rot: 0,
    autoTile: 'grass',
    source: 'inventory',
  }

  it('tracks canUndo and canRedo and clears future on execute', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    expect(canUndo(EMPTY_HISTORY)).toBe(false)
    expect(canRedo(EMPTY_HISTORY)).toBe(false)

    const first = execute(EMPTY_HISTORY, initial, placeLamp, catalog)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(canUndo(first.history)).toBe(true)
    expect(canRedo(first.history)).toBe(false)

    const undone = undo(first.history, first.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(canUndo(undone.history)).toBe(false)
    expect(canRedo(undone.history)).toBe(true)

    const second = execute(undone.history, undone.state, { kind: 'paint', x: 4, z: 4, type: 'grass' }, catalog)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(canUndo(second.history)).toBe(true)
    expect(canRedo(second.history)).toBe(false)
  })

  it('leaves state and history unchanged when execute fails', () => {
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
    const result = execute(EMPTY_HISTORY, state, command, catalog)

    expect(result).toEqual({
      ok: false,
      reason: 'occupied',
      state,
      history: EMPTY_HISTORY,
    })
  })

  it('throws when there is nothing to undo or redo', () => {
    expect(() => undo(EMPTY_HISTORY, stateOf(), catalog)).toThrow('Nothing to undo')
    expect(() => redo(EMPTY_HISTORY, stateOf(), catalog)).toThrow('Nothing to redo')
  })

  it('re-validates redo after an outside coin change', () => {
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

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return

    const spent = { ...undone.state, coins: 0 }
    expect(redo(undone.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: undone.history,
    })
  })
})

describe('history limit', () => {
  it('keeps the newest limit entries, drops the oldest, and undoes the kept ones', () => {
    const limit = CONFIG.history.limit
    const coords = worldCoords(limit + 1)

    let state = stateOf()
    let history = EMPTY_HISTORY
    for (const [x, z] of coords) {
      const result = execute(history, state, { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
      assertConsistent(state)
    }

    expect(history.past).toHaveLength(limit)
    for (let count = 0; count < limit; count += 1) {
      const undone = undo(history, state, catalog)
      expect(undone.ok).toBe(true)
      if (!undone.ok) return
      state = undone.state
      history = undone.history
      assertConsistent(state)
    }

    expect(canUndo(history)).toBe(false)
    expect(state.cells.size).toBe(1)
    expect(state.cells.has(key(coords[0][0], coords[0][1]))).toBe(true)
  })
})
