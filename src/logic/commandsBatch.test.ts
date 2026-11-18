import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { EMPTY_HISTORY, canRedo, execute, executeBatch, redo, undo, type Command } from './commands'
import { key } from './grid'
import { assertConsistent, catalog, inventoryOf, lamp, paintCommands, stateOf, worldCoords } from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

const HALF_WORLD = CONFIG.world.maxSize / 2

describe('executeBatch', () => {
  it('applies a stroke as one history entry and round-trips', () => {
    const initial = stateOf()
    const result = executeBatch(EMPTY_HISTORY, initial, paintCommands, catalog)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toEqual([])
    expect(result.history.past).toHaveLength(1)
    expect(result.state.cells.size).toBe(3)
    assertConsistent(result.state)

    const undone = undo(result.history, result.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
    assertConsistent(undone.state)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(result.state)
    assertConsistent(redone.state)
  })

  it('skips a failing cell and records only the applied commands', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const commands: Command[] = [
      { kind: 'paint', x: 2, z: 2, type: 'grass' },
      { kind: 'digUp', x: 0, z: 0 },
      { kind: 'paint', x: 3, z: 3, type: 'grass' },
    ]
    const result = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toEqual([{ index: 1, reason: 'underItem' }])
    expect(result.history.past).toHaveLength(1)
    expect(result.state.cells.has(key(2, 2))).toBe(true)
    expect(result.state.cells.has(key(3, 3))).toBe(true)
    expect(result.state.cells.get(key(0, 0))?.level).toBe(1)
    assertConsistent(result.state)

    const undone = undo(result.history, result.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(result.state)
  })

  it('fails with the first reason when every sub-command fails', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const commands: Command[] = [
      { kind: 'digUp', x: 0, z: 0 },
      { kind: 'paint', x: 0, z: 0, type: 'water' },
    ]
    expect(executeBatch(EMPTY_HISTORY, state, commands, catalog)).toEqual({
      ok: false,
      reason: 'underItem',
      state,
      history: EMPTY_HISTORY,
      skipped: [
        { index: 0, reason: 'underItem' },
        { index: 1, reason: 'wrongTile' },
      ],
    })
  })

  it('re-validates every sub-command on redo and changes nothing on failure', () => {
    const initial = stateOf()
    const commands: Command[] = [
      { kind: 'paint', x: 0, z: 0, type: 'water' },
      { kind: 'paint', x: 1, z: 1, type: 'water' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return

    const changed = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
    })
    expect(redo(undone.history, changed, catalog)).toEqual({
      ok: false,
      reason: 'wrongTile',
      state: changed,
      history: undone.history,
    })
  })

  it('sums inventory deltas across a batch', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 2]]) })
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
      {
        kind: 'place',
        uid: 'b',
        id: 'lamp',
        x: 2,
        z: 2,
        rot: 1,
        autoTile: 'grass',
        source: 'inventory',
      },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.inventory.has('lamp')).toBe(false)
    expect(executed.state.items.size).toBe(2)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
    expect(undone.state.inventory.get('lamp')).toBe(2)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('caps past at the limit and keeps the newest batch entry', () => {
    const limit = CONFIG.history.limit
    const coords = worldCoords(limit + 1)
    let state = stateOf()
    let history = EMPTY_HISTORY
    for (let index = 0; index < limit; index += 1) {
      const [x, z] = coords[index]
      const result = execute(history, state, { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
    }

    const [batchX, batchZ] = coords[limit]
    const result = executeBatch(
      history,
      state,
      [{ kind: 'paint', x: batchX, z: batchZ, type: 'grass' }],
      catalog,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.history.past).toHaveLength(limit)
    expect(result.history.future).toEqual([])
    expect(result.history.past[result.history.past.length - 1].command).toMatchObject({
      kind: 'batch',
    })
    expect(result.history.past[0].command).toEqual({
      kind: 'paint',
      x: coords[1][0],
      z: coords[1][1],
      type: 'grass',
    })
  })

  it('sums coin deltas from sells and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 1)),
      items: itemsOf(placed('a', lamp), placed('b', lamp, 1, 1)),
      coins: 5,
    })
    const commands: Command[] = [
      { kind: 'sell', uid: 'a' },
      { kind: 'sell', uid: 'b' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(initial.coins + 2 * lamp.price)
    expect(executed.history.past).toHaveLength(1)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)

    const undoneAgain = undo(redone.history, redone.state, catalog)
    expect(undoneAgain.ok).toBe(true)
    if (!undoneAgain.ok) return
    expect(undoneAgain.state).toEqual(initial)
  })

  it('blocks undo of a batch of sells when the coins were spent', () => {
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

    const spent = stateOf({
      cells: executed.state.cells,
      items: executed.state.items,
      inventory: executed.state.inventory,
      coins: 0,
    })
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: executed.history,
    })
  })

  it('clears future on a successful stroke and keeps it on an all-fail stroke', () => {
    const executed = execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x: 0, z: 0, type: 'grass' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(canRedo(undone.history)).toBe(true)

    const allFail = executeBatch(
      undone.history,
      undone.state,
      [{ kind: 'digUp', x: HALF_WORLD, z: 0 }],
      catalog,
    )
    expect(allFail.ok).toBe(false)
    expect(allFail.history).toEqual(undone.history)
    expect(canRedo(allFail.history)).toBe(true)

    const stroke = executeBatch(
      undone.history,
      undone.state,
      paintCommands,
      catalog,
    )
    expect(stroke.ok).toBe(true)
    if (!stroke.ok) return
    expect(canRedo(stroke.history)).toBe(false)
  })
})
