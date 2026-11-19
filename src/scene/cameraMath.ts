import { CONFIG } from '../config/evergrow.config'
import { landBounds, startZoneBounds, type GridBounds, type GridCells } from '../logic/grid'

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface PanKeys {
  readonly forward: boolean
  readonly backward: boolean
  readonly left: boolean
  readonly right: boolean
}

export interface FocusLike {
  readonly tagName?: string
  readonly isContentEditable?: boolean
}

/** A camera orbit state; Cartesian position is derived from the target and the angles. */
export interface SphericalPose {
  readonly target: Vec3
  readonly radius: number
  readonly polarRad: number
  readonly azimuthRad: number
  readonly zoom: number
}

export interface ShadowCameraBounds {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly near: number
  readonly far: number
}

export const degToRad = (deg: number): number => (deg * Math.PI) / 180
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export function clampZoom(zoom: number): number {
  return clamp(zoom, CONFIG.camera.minZoom, CONFIG.camera.maxZoom)
}

export function clampPolarDeg(deg: number): number {
  return clamp(deg, CONFIG.camera.minPolarDeg, CONFIG.camera.maxPolarDeg)
}

/** Cell `(x, z)` covers the unit square starting at `(x, z)`; its centre is half a cell in. */
export function cellCentre(x: number, z: number): { x: number; z: number } {
  return { x: x + 0.5, z: z + 0.5 }
}

/**
 * World-space target bounds: the land bounding box plus the camera margin, or the
 * start zone when there is no land yet (§4.6, §7).
 */
export function cameraTargetBounds(cells: GridCells): GridBounds {
  const base = landBounds(cells) ?? startZoneBounds()
  const margin = CONFIG.world.cameraBoundsMargin
  return {
    minX: base.minX - margin,
    maxX: base.maxX + 1 + margin,
    minZ: base.minZ - margin,
    maxZ: base.maxZ + 1 + margin,
  }
}

/** Clamp a camera target to the bounds; the target always stays on the ground plane. */
export function clampTarget(target: Vec3, bounds: GridBounds): Vec3 {
  return {
    x: clamp(target.x, bounds.minX, bounds.maxX),
    y: 0,
    z: clamp(target.z, bounds.minZ, bounds.maxZ),
  }
}

/** Centre of the land in world space, or the start-zone centre when there is no land. */
export function homeTarget(cells: GridCells): Vec3 {
  const base = landBounds(cells) ?? startZoneBounds()
  return {
    x: (base.minX + base.maxX + 1) / 2,
    y: 0,
    z: (base.minZ + base.maxZ + 1) / 2,
  }
}

/** Azimuth of the camera position around the target; 0 looks down -Z. */
export function poseAzimuth(position: Vec3, target: Vec3): number {
  return Math.atan2(position.x - target.x, position.z - target.z)
}

/** Polar angle in radians, measured from +Y (0 is overhead). */
export function posePolar(position: Vec3, target: Vec3): number {
  const dx = position.x - target.x
  const dy = position.y - target.y
  const dz = position.z - target.z
  const radius = Math.hypot(dx, dy, dz)
  if (radius === 0) return 0
  return Math.acos(clamp(dy / radius, -1, 1))
}

export function positionFromSpherical(
  target: Vec3,
  radius: number,
  polarRad: number,
  azimuthRad: number,
): Vec3 {
  const horizontal = radius * Math.sin(polarRad)
  return {
    x: target.x + horizontal * Math.sin(azimuthRad),
    y: target.y + radius * Math.cos(polarRad),
    z: target.z + horizontal * Math.cos(azimuthRad),
  }
}

/** Build the orbit state from the current camera position and target. */
export function sphericalPose(position: Vec3, target: Vec3, zoom: number): SphericalPose {
  return {
    target,
    radius: Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z),
    polarRad: posePolar(position, target),
    azimuthRad: poseAzimuth(position, target),
    zoom,
  }
}

export function positionOfPose(pose: SphericalPose): Vec3 {
  return positionFromSpherical(pose.target, pose.radius, pose.polarRad, pose.azimuthRad)
}

const mix = (from: number, to: number, t: number): number => from + (to - from) * t

const TAU = Math.PI * 2

/** Shift an azimuth by whole turns so it lies within 180° of the reference (shortest path). */
export function unwrapAzimuth(azimuthRad: number, referenceRad: number): number {
  return azimuthRad + Math.round((referenceRad - azimuthRad) / TAU) * TAU
}

/** Continuous azimuth part-way through an eased tween, without an atan2 wrap. */
function tweenAzimuth(
  fromAzimuthRad: number,
  toAzimuthRad: number,
  progress: number,
): number {
  return mix(fromAzimuthRad, toAzimuthRad, easeInOut(progress))
}

/** Interpolate in orbit space so a pure rotation keeps the radius and tilt constant. */
export function lerpSpherical(
  from: SphericalPose,
  to: SphericalPose,
  t: number,
): SphericalPose {
  const value = clamp(t, 0, 1)
  return {
    target: {
      x: mix(from.target.x, to.target.x, value),
      y: mix(from.target.y, to.target.y, value),
      z: mix(from.target.z, to.target.z, value),
    },
    radius: mix(from.radius, to.radius, value),
    polarRad: mix(from.polarRad, to.polarRad, value),
    azimuthRad: mix(from.azimuthRad, to.azimuthRad, value),
    zoom: mix(from.zoom, to.zoom, value),
  }
}

export interface RunningTween {
  readonly from: SphericalPose
  readonly to: SphericalPose
  readonly start: number
  readonly duration: number
}

/**
 * Build the start and end poses for a Q/E snap. A running tween contributes its
 * continuous current angle and destination; the start is unwrapped to the shortest
 * path (D039).
 */
export function chainSnap(
  running: RunningTween | null,
  current: SphericalPose,
  now: number,
  deltaRad: number,
): { readonly from: SphericalPose; readonly to: SphericalPose } {
  const progress =
    running === null || running.duration <= 0
      ? 1
      : Math.max(0, Math.min(1, (now - running.start) / running.duration))
  const startAzimuth =
    running === null
      ? current.azimuthRad
      : tweenAzimuth(running.from.azimuthRad, running.to.azimuthRad, progress)
  const base = running?.to ?? current
  const endAzimuth = base.azimuthRad + deltaRad
  return {
    from: { ...current, azimuthRad: unwrapAzimuth(startAzimuth, endAzimuth) },
    to: { ...base, azimuthRad: endAzimuth },
  }
}

/** Tilt pose; a negative direction moves toward overhead, within the polar clamps. */
export function tiltPose(
  from: SphericalPose,
  direction: number,
  stepDeg: number,
): SphericalPose {
  const polarDeg = clampPolarDeg(radToDeg(from.polarRad) + direction * stepDeg)
  return { ...from, polarRad: degToRad(polarDeg) }
}

/** Unit ground-plane pan direction for the held keys, relative to the camera facing. */
export function panVector(keys: PanKeys, azimuthRad: number): { x: number; z: number } {
  const forward = Number(keys.forward) - Number(keys.backward)
  const strafe = Number(keys.right) - Number(keys.left)
  const sin = Math.sin(azimuthRad)
  const cos = Math.cos(azimuthRad)
  let x = -sin * forward + cos * strafe
  let z = -cos * forward - sin * strafe
  const length = Math.hypot(x, z)
  if (length > 1) {
    x /= length
    z /= length
  }
  return { x, z }
}

/** Smooth ease-in-out for camera transitions (§9). Input is clamped to 0..1. */
export function easeInOut(t: number): number {
  const value = clamp(t, 0, 1)
  return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2
}

/** True when camera shortcuts must be ignored (typing or a modifier is held). */
export function blocksCameraShortcut(
  target: FocusLike | null,
  modifierHeld: boolean,
): boolean {
  if (modifierHeld) return true
  if (!target) return false
  const tag = target.tagName?.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable === true
  )
}

interface Vector {
  readonly x: number
  readonly y: number
  readonly z: number
}

const subtract = (a: Vector, b: Vector): Vector => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vector, b: Vector): Vector => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const normalize = (a: Vector): Vector => {
  const length = Math.hypot(a.x, a.y, a.z)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  return { x: a.x / length, y: a.y / length, z: a.z / length }
}

/**
 * Orthographic shadow camera extents that cover the whole camera-bounds rectangle
 * (ground to `maxHeight`) as seen from the directional light (D041). The light sits at
 * the bounds centre plus `lightOffset` and looks at the centre at ground level.
 */
export function shadowCameraBounds(
  bounds: GridBounds,
  lightOffset: readonly [number, number, number],
  maxHeight: number,
): ShadowCameraBounds {
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: 0,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
  const light = {
    x: center.x + lightOffset[0],
    y: center.y + lightOffset[1],
    z: center.z + lightOffset[2],
  }
  const forward = normalize(subtract(center, light))
  const worldUp = { x: 0, y: 1, z: 0 }
  let right = normalize(cross(forward, worldUp))
  if (Math.hypot(right.x, right.y, right.z) === 0) {
    right = { x: 1, y: 0, z: 0 }
  }
  const up = normalize(cross(right, forward))

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const x of [bounds.minX, bounds.maxX]) {
    for (const y of [0, maxHeight]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        const relative = subtract({ x, y, z }, light)
        const px = dot(relative, right)
        const py = dot(relative, up)
        const pz = dot(relative, forward)
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)
        minZ = Math.min(minZ, pz)
        maxZ = Math.max(maxZ, pz)
      }
    }
  }

  const padding = CONFIG.lighting.shadowPadding
  return {
    left: minX - padding,
    right: maxX + padding,
    top: maxY + padding,
    bottom: minY - padding,
    near: Math.max(CONFIG.lighting.shadowNear, minZ - padding),
    far: Math.max(CONFIG.lighting.shadowFar, maxZ + padding),
  }
}
