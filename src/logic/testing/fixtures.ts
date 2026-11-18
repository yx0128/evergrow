import type { ItemDef } from '../../config/evergrow.config'
import type { Catalog } from '../catalog'
import type { Cell, CellMap } from '../cells'
import { key } from '../grid'
import type { PlacedItem, PlacedItems } from '../placement'

export const item = (overrides: Partial<ItemDef> & Pick<ItemDef, 'id' | 'footprint'>): ItemDef => ({
  name: overrides.id,
  category: 'test',
  price: 0,
  defaultTile: 'grass',
  allowedTiles: ['grass', 'land'],
  connectable: false,
  model: `assets/models/${overrides.id}.glb`,
  thumb: `assets/thumbs/${overrides.id}.png`,
  emissive: false,
  ...overrides,
})

export const cell = (x: number, z: number, type: Cell['type'] = 'grass', level = 1): Cell => ({
  x,
  z,
  type,
  level,
})

export const mapWith = (...cells: Cell[]): CellMap =>
  new Map(cells.map((it) => [key(it.x, it.z), it]))

export const placed = (uid: string, def: ItemDef, x = 0, z = 0, rot: PlacedItem['rot'] = 0): PlacedItem => ({
  uid,
  id: def.id,
  x,
  z,
  rot,
})

export const itemsOf = (...list: ReadonlyArray<PlacedItem>): PlacedItems =>
  new Map(list.map((it) => [it.uid, it]))

export const catalogOf = (...defs: ItemDef[]): Catalog => new Map(defs.map((def) => [def.id, def]))
