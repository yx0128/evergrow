import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { storageKey } from './save'

describe('storageKey', () => {
  it('namespaces keys for the shared github.io origin', () => {
    expect(storageKey('save')).toBe(`${CONFIG.ui.storagePrefix}save`)
    expect(storageKey('save')).toBe('evergrow:save')
  })
})
