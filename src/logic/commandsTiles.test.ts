import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import type { Command } from './commands'
import { EMPTY_HISTORY, execute, validate } from './commands'
import { key } from './grid'
import {
  catalog,
  cottage,
  expectRoundTrip,
  lamp,
  stateOf,
} from './testing/commandFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

const HALF_WORLD = CONFIG.world.maxSize / 2
const MAX = CONFIG.world.maxStack

describe('paint', () => {
  it('paints a bare cell and round-trips', () => {
    const initial = stateOf()
    const command: Command = { kind: 'paint', x: 0, z: 0, type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))).toEqual(cell(0, 0, 'land'))
    expectRoundTrip(initial, command)
  })

  it('allows an item-approved type and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'paint', x: 0, z: 0, type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.type).toBe('land')
    expectRoundTrip(initial, command)
  })

  it('rejects a disallowed type under an item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(validate({ kind: 'paint', x: 0, z: 0, type: 'water' }, state, catalog)).toEqual({
      ok: false,
      reason: 'wrongTile',
    })
  })

  it('returns outsideWorld for invalid paint coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x, z, type: 'grass' }, catalog)).not.toThrow()
      const result = execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result).toMatchObject({ ok: false, reason: 'outsideWorld' })
    }
    expect(
      validate({ kind: 'paint', x: HALF_WORLD, z: 0, type: 'grass' }, stateOf(), catalog),
    ).toEqual({ ok: false, reason: 'outsideWorld' })
  })

  it('returns the buildable-zone error for an in-world empty cell', () => {
    expect(validate({ kind: 'paint', x: 6, z: 0, type: 'grass' }, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'outsideBuildableZone',
    })
  })
})

describe('changeItemTile', () => {
  it('changes every footprint cell and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'changeItemTile', uid: 'a', type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    for (const value of executed.state.cells.values()) expect(value.type).toBe('land')
    expectRoundTrip(initial, command)
  })

  it('rejects a disallowed type', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(
      validate({ kind: 'changeItemTile', uid: 'a', type: 'water' }, state, catalog),
    ).toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('throws for an unknown uid', () => {
    expect(() =>
      validate({ kind: 'changeItemTile', uid: 'missing', type: 'land' }, stateOf(), catalog),
    ).toThrow('Unknown item uid: missing')
  })
})

describe('setLevel', () => {
  it('changes an uncovered cell and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0)) })
    const command: Command = { kind: 'setLevel', x: 0, z: 0, level: 3 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.level).toBe(3)
    expectRoundTrip(initial, command)
  })

  it('throws under the lamp', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(() => validate({ kind: 'setLevel', x: 0, z: 0, level: 2 }, state, catalog)).toThrow(
      'Cell 0,0 is under item a; use setLevelItem',
    )
  })

  it('throws under the cottage', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(() => validate({ kind: 'setLevel', x: 1, z: 1, level: 2 }, state, catalog)).toThrow(
      'Cell 1,1 is under item a; use setLevelItem',
    )
  })

  it('returns the level rule for an out-of-range level', () => {
    const state = stateOf({ cells: mapWith(cell(0, 0)) })
    expect(validate({ kind: 'setLevel', x: 0, z: 0, level: MAX + 1 }, state, catalog)).toEqual({
      ok: false,
      reason: 'maxStack',
    })
  })
})

describe('setLevelItem', () => {
  it('moves every footprint cell together and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'setLevelItem', uid: 'a', level: 4 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    for (const value of executed.state.cells.values()) expect(value.level).toBe(4)
    expectRoundTrip(initial, command)
  })

  it('rejects an out-of-range level and changes nothing', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const result = execute(EMPTY_HISTORY, state, { kind: 'setLevelItem', uid: 'a', level: 0 }, catalog)

    expect(result).toEqual({
      ok: false,
      reason: 'minStack',
      state,
      history: EMPTY_HISTORY,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() =>
      validate({ kind: 'setLevelItem', uid: 'missing', level: 2 }, stateOf(), catalog),
    ).toThrow('Unknown item uid: missing')
  })
})

describe('digUp', () => {
  it('removes one level and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0, 'grass', 3)) })
    const command: Command = { kind: 'digUp', x: 0, z: 0 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.level).toBe(2)
    expectRoundTrip(initial, command)
  })

  it('removes a level-1 cell and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0)) })
    const command: Command = { kind: 'digUp', x: 0, z: 0 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.has(key(0, 0))).toBe(false)
    expectRoundTrip(initial, command)
  })

  it('rejects digging under an item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(validate({ kind: 'digUp', x: 0, z: 0 }, state, catalog)).toEqual({
      ok: false,
      reason: 'underItem',
    })
  })

  it('returns outsideWorld for invalid digUp coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => execute(EMPTY_HISTORY, stateOf(), { kind: 'digUp', x, z }, catalog)).not.toThrow()
      const result = execute(EMPTY_HISTORY, stateOf(), { kind: 'digUp', x, z }, catalog)
      expect(result).toMatchObject({ ok: false, reason: 'outsideWorld' })
    }
    expect(validate({ kind: 'digUp', x: HALF_WORLD, z: 0 }, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'outsideWorld',
    })
  })
})
