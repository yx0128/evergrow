import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { isDevSeedShortcut, type DevSeedKeyEvent } from './devSeedShortcut'

const key = (overrides: Partial<DevSeedKeyEvent> = {}): DevSeedKeyEvent => ({
  key: CONFIG.ui.devSeedKey,
  repeat: false,
  ...overrides,
})

describe('isDevSeedShortcut', () => {
  it('accepts the configured key in dev builds', () => {
    expect(isDevSeedShortcut(key(), true)).toBe(true)
  })

  it('ignores other keys', () => {
    expect(isDevSeedShortcut(key({ key: 'F8' }), true)).toBe(false)
  })

  it('ignores repeats', () => {
    expect(isDevSeedShortcut(key({ repeat: true }), true)).toBe(false)
  })

  it('ignores keys typed into inputs and content-editable elements', () => {
    expect(isDevSeedShortcut(key({ target: { tagName: 'INPUT' } }), true)).toBe(false)
    expect(
      isDevSeedShortcut(
        key({ target: { tagName: 'DIV', isContentEditable: true } }),
        true,
      ),
    ).toBe(false)
  })

  it('ignores keys pressed with a modifier', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) {
      expect(isDevSeedShortcut(key({ [modifier]: true }), true)).toBe(false)
    }
  })

  it('does nothing outside dev builds', () => {
    expect(isDevSeedShortcut(key(), false)).toBe(false)
  })
})
