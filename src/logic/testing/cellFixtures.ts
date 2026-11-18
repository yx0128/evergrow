import { expect } from 'vitest'
import type { InvalidReason } from '../../config/evergrow.config'
import type { CellMap, CellResult } from '../cells'
import { key } from '../grid'

export function expectOk(result: CellResult): CellMap {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
  return result.cells
}

export function expectFail(result: CellResult, reason: InvalidReason): void {
  expect(result).toEqual({ ok: false, reason })
}

export const getCell = (cells: CellMap, x: number, z: number) => cells.get(key(x, z))
