import { CameraControlsImpl } from '@react-three/drei'
import { describe, expect, it } from 'vitest'
import {
  createMouseButtons,
  GROUND_PAN_ACTION,
  ORBIT_ACTION,
} from './cameraBindings'

const ACTION = CameraControlsImpl.ACTION

describe('camera bindings', () => {
  it('leaves left inert, zooms with the wheel and pans with the middle button', () => {
    const buttons = createMouseButtons()
    expect(buttons.left).toBe(ACTION.NONE)
    expect(buttons.middle).toBe(ACTION.SCREEN_PAN)
    expect(buttons.right).toBe(ACTION.ROTATE)
    expect(buttons.wheel).toBe(ACTION.ZOOM)
  })

  it('uses ground-plane pan for Shift+right drag', () => {
    expect(GROUND_PAN_ACTION).toBe(ACTION.SCREEN_PAN)
    expect(ORBIT_ACTION).toBe(ACTION.ROTATE)
  })

  it('gives each rig a distinct bindings object', () => {
    const first = createMouseButtons()
    const second = createMouseButtons()
    expect(first).not.toBe(second)

    first.right = GROUND_PAN_ACTION
    expect(first.right).toBe(ACTION.SCREEN_PAN)
    expect(second.right).toBe(ACTION.ROTATE)
    expect(createMouseButtons().right).toBe(ACTION.ROTATE)
  })
})
