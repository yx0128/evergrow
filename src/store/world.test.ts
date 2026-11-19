import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { buildOccupancy } from '../logic/placement'
import {
  catalogOf,
  cell,
  item,
  itemsOf,
  mapWith,
  placed,
} from '../logic/testing/fixtures'
import { createWorldStore, starterWorld } from './world'

const lamp = item({ id: 'lamp', footprint: [1, 1], price: 0 })
const catalog = catalogOf(lamp)

const paint = (x: number, z: number) =>
  ({ kind: 'paint', x, z, type: 'grass' }) as const

describe('world store', () => {
  it('starts from CONFIG.starter with an empty history', () => {
    const store = createWorldStore(catalog)
    const state = store.getState()

    expect(state.coins).toBe(CONFIG.starter.coins)
    expect(state.cells.size).toBe(0)
    expect(state.items.size).toBe(0)
    expect(state.occupancy.size).toBe(0)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
    expect([...state.inventory.values()].reduce((sum, count) => sum + count, 0)).toBe(
      CONFIG.starter.items.length,
    )
  })

  it('runs execute, undo and redo through the logic history', () => {
    const store = createWorldStore(catalog)

    const executed = store.getState().execute(paint(0, 0))
    expect(executed.ok).toBe(true)
    expect(store.getState().cells.has('0,0')).toBe(true)
    expect(store.getState().canUndo).toBe(true)
    expect(store.getState().canRedo).toBe(false)

    const undone = store.getState().undo()
    expect(undone?.ok).toBe(true)
    expect(store.getState().cells.size).toBe(0)
    expect(store.getState().canUndo).toBe(false)
    expect(store.getState().canRedo).toBe(true)

    const redone = store.getState().redo()
    expect(redone?.ok).toBe(true)
    expect(store.getState().cells.has('0,0')).toBe(true)
    expect(store.getState().canUndo).toBe(true)
    expect(store.getState().canRedo).toBe(false)
  })

  it('passes a failed command reason through and changes nothing', () => {
    const store = createWorldStore(catalog)
    const before = store.getState()

    const result = store.getState().execute(paint(1000, 0))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('outsideWorld')
    expect(store.getState().cells).toBe(before.cells)
    expect(store.getState().history).toBe(before.history)
    expect(store.getState().canUndo).toBe(false)
  })

  it('creates uids for place commands and keeps a caller-supplied uid', () => {
    const store = createWorldStore(catalog)
    const place = {
      kind: 'place',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    } as const

    const generated = store.getState().execute(place)
    expect(generated.ok).toBe(true)
    const generatedItem = [...store.getState().items.values()][0]
    expect(generatedItem.uid.length).toBeGreaterThan(0)

    const supplied = store.getState().execute({ ...place, uid: 'fixed', x: 1 })
    expect(supplied.ok).toBe(true)
    expect(store.getState().items.has('fixed')).toBe(true)
  })

  it('groups a drag stroke into one undo step', () => {
    const store = createWorldStore(catalog)
    const result = store.getState().executeBatch([paint(0, 0), paint(1, 0)])
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([])
    expect(store.getState().cells.size).toBe(2)

    store.getState().undo()
    expect(store.getState().cells.size).toBe(0)
    expect(store.getState().canUndo).toBe(false)

    store.getState().redo()
    expect(store.getState().cells.size).toBe(2)
  })

  it('reports skipped batch commands and keeps the applied ones', () => {
    const store = createWorldStore(catalog)
    const result = store.getState().executeBatch([paint(0, 0), paint(1000, 0)])
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([{ index: 1, reason: 'outsideWorld' }])
    expect(store.getState().cells.has('0,0')).toBe(true)
  })

  it('guards undo and redo on an empty history', () => {
    const store = createWorldStore(catalog)
    const before = store.getState()

    expect(store.getState().undo()).toBeUndefined()
    expect(store.getState().redo()).toBeUndefined()
    expect(store.getState().cells).toBe(before.cells)
    expect(store.getState().history).toBe(before.history)
  })

  it('clears history without touching the world', () => {
    const store = createWorldStore(catalog)
    store.getState().execute(paint(0, 0))

    store.getState().clearHistory()
    expect(store.getState().cells.has('0,0')).toBe(true)
    expect(store.getState().canUndo).toBe(false)
    expect(store.getState().canRedo).toBe(false)
    expect(store.getState().undo()).toBeUndefined()
  })

  it('counts a non-empty starter inventory per item id', () => {
    const initial = starterWorld({
      coins: 7,
      items: ['lamp', 'lamp', 'cottage'],
    })
    const store = createWorldStore(catalog, initial)

    expect(store.getState().coins).toBe(7)
    expect(store.getState().inventory.get('lamp')).toBe(2)
    expect(store.getState().inventory.get('cottage')).toBe(1)
    expect(store.getState().inventory.size).toBe(2)
  })

  it('fills uids for place commands inside a batch', () => {
    const store = createWorldStore(catalog)
    const place = {
      kind: 'place',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    } as const

    const result = store.getState().executeBatch([place, { ...place, x: 1 }])
    expect(result.ok).toBe(true)
    const items = [...store.getState().items.values()]
    expect(items).toHaveLength(2)
    expect(items[0].uid.length).toBeGreaterThan(0)
    expect(items[1].uid.length).toBeGreaterThan(0)
    expect(items[0].uid).not.toBe(items[1].uid)
  })

  it('passes through an undo failure without changing state or history', () => {
    const sellable = item({ id: 'sellable', footprint: [1, 1], price: 10 })
    const sellCatalog = catalogOf(sellable)
    const items = itemsOf(placed('a', sellable))
    const initial = {
      cells: mapWith(cell(0, 0)),
      items,
      occupancy: buildOccupancy(items, sellCatalog),
      inventory: new Map<string, number>(),
      coins: 0,
    }
    const store = createWorldStore(sellCatalog, initial)

    const sold = store.getState().execute({ kind: 'sell', uid: 'a' })
    expect(sold.ok).toBe(true)
    expect(store.getState().coins).toBe(10)

    store.setState({ coins: 0 })
    const history = store.getState().history
    const result = store.getState().undo()

    expect(result?.ok).toBe(false)
    if (!result || result.ok) return
    expect(result.reason).toBe('unaffordable')
    expect(store.getState().coins).toBe(0)
    expect(store.getState().history).toBe(history)
  })
})
