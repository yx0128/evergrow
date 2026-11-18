import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { validatePlacement, type Occupancy, type PlacementState } from './placement'
import { key } from './grid'
import { cellsIn, cottage, lamp, stateOf } from './testing/placementFixtures'
import { cell, itemsOf, mapWith, placed } from './testing/fixtures'

const HALF_WORLD = CONFIG.world.maxSize / 2

describe('validatePlacement', () => {
  it('accepts a valid placement and returns auto tiles for empty cells', () => {
    const result = validatePlacement(
      cottage,
      0,
      0,
      0,
      'grass',
      stateOf(itemsOf()),
    )

    expect(result).toEqual({ ok: true, autoTiles: cellsIn(0, 0, 2, 2) })
  })

  it('returns outsideWorld when part of the footprint is past the world cap', () => {
    const result = validatePlacement(
      cottage,
      HALF_WORLD - 1,
      0,
      0,
      'grass',
      stateOf(itemsOf()),
    )

    expect(result).toEqual({ ok: false, reason: 'outsideWorld' })
  })

  it('returns outsideBuildableZone for an in-world cell outside the buildable area', () => {
    const result = validatePlacement(cottage, 6, 0, 0, 'grass', stateOf(itemsOf()))

    expect(result).toEqual({ ok: false, reason: 'outsideBuildableZone' })
  })

  it('returns occupied when another item covers a footprint cell', () => {
    const other = placed('a', lamp, 0, 0)
    const result = validatePlacement(lamp, 0, 0, 0, 'grass', stateOf(itemsOf(other)))

    expect(result).toEqual({ ok: false, reason: 'occupied' })
  })

  it('returns wrongTile when the auto tile is not allowed', () => {
    const result = validatePlacement(lamp, 0, 0, 0, 'water', stateOf(itemsOf()))

    expect(result).toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('accepts a disallowed auto tile when every cell already has allowed ground', () => {
    expect(validatePlacement(lamp, 0, 0, 0, 'land', stateOf(itemsOf(), mapWith(cell(0, 0)))))
      .toEqual({ ok: true, autoTiles: [] })
  })

  it('rejects a disallowed auto tile when part of the footprint is empty', () => {
    expect(validatePlacement(cottage, 0, 0, 0, 'water', stateOf(itemsOf(), mapWith(cell(0, 0)))))
      .toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('returns wrongTile when an existing cell type is not allowed', () => {
    const result = validatePlacement(
      lamp,
      0,
      0,
      0,
      'grass',
      stateOf(itemsOf(), mapWith(cell(0, 0, 'water'))),
    )

    expect(result).toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('returns unevenGround when levels differ and empty cells count as level 1', () => {
    const cells = mapWith(cell(0, 0, 'grass', 1), cell(1, 0, 'grass', 2))
    const result = validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), cells))

    expect(result).toEqual({ ok: false, reason: 'unevenGround' })
  })

  it('returns the earliest failing reason when several would fail', () => {
    const occupied = new Map([[key(HALF_WORLD - 1, 0), 'a']])
    const edgeState: PlacementState = { cells: mapWith(cell(0, 0, 'water', 3)), occupancy: occupied }

    expect(validatePlacement(cottage, HALF_WORLD - 1, 0, 0, 'water', edgeState)).toEqual({
      ok: false,
      reason: 'outsideWorld',
    })

    const farOccupied: Occupancy = new Map([[key(6, 0), 'a']])
    expect(
      validatePlacement(cottage, 6, 0, 0, 'water', {
        cells: mapWith(),
        occupancy: farOccupied,
      }),
    ).toEqual({ ok: false, reason: 'outsideBuildableZone' })
  })

  it('returns occupied before wrongTile', () => {
    const state = stateOf(itemsOf(placed('a', lamp, 0, 0)), mapWith(cell(0, 0, 'water')))

    expect(validatePlacement(lamp, 0, 0, 0, 'grass', state)).toEqual({
      ok: false,
      reason: 'occupied',
    })
  })

  it('returns wrongTile before unevenGround', () => {
    const cells = mapWith(cell(0, 0, 'water', 3))
    const result = validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), cells))

    expect(result).toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('passes when moving onto your own cells with ignoreUid', () => {
    const own = placed('a', lamp, 0, 0)
    const state = stateOf(itemsOf(own), mapWith(cell(0, 0)))

    expect(validatePlacement(lamp, 0, 0, 0, 'grass', state, 'a')).toEqual({
      ok: true,
      autoTiles: [],
    })
    expect(validatePlacement(lamp, 0, 0, 0, 'grass', state)).toEqual({
      ok: false,
      reason: 'occupied',
    })
  })

  it('creates auto tiles only for the empty footprint cells', () => {
    const result = validatePlacement(
      cottage,
      0,
      0,
      0,
      'grass',
      stateOf(itemsOf(), mapWith(cell(0, 0, 'grass', 1))),
    )

    expect(result).toEqual({ ok: true, autoTiles: cellsIn(0, 0, 2, 2).slice(1) })
  })

  it('returns no auto tiles when every footprint cell already has a tile', () => {
    const result = validatePlacement(
      cottage,
      0,
      0,
      0,
      'grass',
      stateOf(itemsOf(), mapWith(...cellsIn(0, 0, 2, 2))),
    )

    expect(result).toEqual({ ok: true, autoTiles: [] })
  })

  it('accepts mixed empty and level-1 cells but rejects mixed empty and level-2 cells', () => {
    const levelOne = mapWith(cell(0, 0, 'grass', 1))
    expect(validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), levelOne)).ok).toBe(true)

    const levelTwo = mapWith(cell(0, 0, 'grass', 2))
    expect(validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), levelTwo))).toEqual({
      ok: false,
      reason: 'unevenGround',
    })
  })
})

describe('validatePlacement checks every footprint cell', () => {
  it('returns outsideWorld when only the min corner is past the world edge', () => {
    expect(validatePlacement(cottage, -HALF_WORLD - 1, 0, 0, 'grass', stateOf(itemsOf()))).toEqual({
      ok: false,
      reason: 'outsideWorld',
    })
  })

  it('returns outsideBuildableZone when only the far cells leave the zone', () => {
    expect(validatePlacement(cottage, 4, 0, 0, 'grass', stateOf(itemsOf()))).toEqual({
      ok: false,
      reason: 'outsideBuildableZone',
    })
  })

  it('returns outsideBuildableZone when only the anchor cells leave the zone', () => {
    expect(validatePlacement(cottage, -6, 0, 0, 'grass', stateOf(itemsOf()))).toEqual({
      ok: false,
      reason: 'outsideBuildableZone',
    })
  })

  it('returns occupied when only a middle footprint cell is covered', () => {
    const state = stateOf(itemsOf(placed('l', lamp, 1, 0)))
    expect(validatePlacement(cottage, 0, 0, 0, 'grass', state)).toEqual({
      ok: false,
      reason: 'occupied',
    })
  })

  it('returns wrongTile when only the last cell has a disallowed type', () => {
    const cells = mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1, 'water'))
    expect(validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), cells))).toEqual({
      ok: false,
      reason: 'wrongTile',
    })
  })

  it('returns unevenGround when only the last cell differs', () => {
    const cells = mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1, 'grass', 2))
    expect(validatePlacement(cottage, 0, 0, 0, 'grass', stateOf(itemsOf(), cells))).toEqual({
      ok: false,
      reason: 'unevenGround',
    })
  })

  it('creates auto tiles of the requested type, not the default tile', () => {
    const result = validatePlacement(cottage, 0, 0, 0, 'land', stateOf(itemsOf()))
    expect(result.ok && result.autoTiles.map((it) => it.type)).toEqual([
      'land',
      'land',
      'land',
      'land',
    ])
  })
})
