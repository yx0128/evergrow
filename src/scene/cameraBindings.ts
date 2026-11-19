import { CameraControlsImpl } from '@react-three/drei'

const ACTION = CameraControlsImpl.ACTION

/** Mouse bindings for the orthographic rig (§7): left is inert, wheel zooms. */
type MouseButtons = CameraControlsImpl['mouseButtons']

function mouseBindings(): MouseButtons {
  return {
    left: ACTION.NONE,
    middle: ACTION.SCREEN_PAN,
    right: ACTION.ROTATE,
    wheel: ACTION.ZOOM,
  }
}

/** A fresh mutable bindings object per call, so each rig's Shift+right switch changes only its own copy. */
export function createMouseButtons() {
  return mouseBindings()
}

export const ORBIT_ACTION = ACTION.ROTATE
export const GROUND_PAN_ACTION = ACTION.SCREEN_PAN
