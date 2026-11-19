import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { startZoneBounds } from '../logic/grid'
import {
  blocksCameraShortcut,
  cameraTargetBounds,
  cellCentre,
  clampPolarDeg,
  clampTarget,
  clampZoom,
  degToRad,
  easeInOut,
  homeTarget,
  lerpSpherical,
  panVector,
  poseAzimuth,
  posePolar,
  positionFromSpherical,
  positionOfPose,
  radToDeg,
  shadowCameraBounds,
  sphericalPose,
  tiltPose,
  unwrapAzimuth,
  chainSnap,
} from './cameraMath'

const cells = (...points: Array<[number, number]>) =>
  new Map(points.map(([x, z]) => [`${x},${z}`, { x, z }]))

describe('cameraMath', () => {
  it('maps a cell to its centre half a cell in', () => {
    expect(cellCentre(0, 0)).toEqual({ x: 0.5, z: 0.5 })
    expect(cellCentre(-5, 4)).toEqual({ x: -4.5, z: 4.5 })
  })

  it('uses land bounds plus the margin on both edges', () => {
    const margin = CONFIG.world.cameraBoundsMargin
    expect(cameraTargetBounds(cells([-2, -3], [4, 5]))).toEqual({
      minX: -2 - margin,
      maxX: 4 + 1 + margin,
      minZ: -3 - margin,
      maxZ: 5 + 1 + margin,
    })
  })

  it('falls back to the start zone when there is no land', () => {
    const margin = CONFIG.world.cameraBoundsMargin
    const zone = startZoneBounds()
    expect(cameraTargetBounds(cells())).toEqual({
      minX: zone.minX - margin,
      maxX: zone.maxX + 1 + margin,
      minZ: zone.minZ - margin,
      maxZ: zone.maxZ + 1 + margin,
    })
  })

  it('clamps targets on x/z and keeps y on the ground plane', () => {
    const bounds = { minX: -1, maxX: 3, minZ: -2, maxZ: 2 }
    expect(clampTarget({ x: 9, y: 5, z: -9 }, bounds)).toEqual({ x: 3, y: 0, z: -2 })
    expect(clampTarget({ x: 0, y: -4, z: 0 }, bounds)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('clamps polar and zoom to the configured limits', () => {
    expect(clampPolarDeg(0)).toBe(CONFIG.camera.minPolarDeg)
    expect(clampPolarDeg(180)).toBe(CONFIG.camera.maxPolarDeg)
    expect(clampPolarDeg(45)).toBe(45)
    expect(clampZoom(0)).toBe(CONFIG.camera.minZoom)
    expect(clampZoom(999)).toBe(CONFIG.camera.maxZoom)
    expect(clampZoom(CONFIG.camera.defaultZoom)).toBe(CONFIG.camera.defaultZoom)
  })

  it('builds spherical positions that round-trip through polar and azimuth', () => {
    const target = { x: 1, y: 0, z: -2 }
    const position = positionFromSpherical(target, 12, degToRad(60), degToRad(30))
    expect(posePolar(position, target)).toBeCloseTo(degToRad(60))
    expect(poseAzimuth(position, target)).toBeCloseTo(degToRad(30))
  })

  it('finds the land or start-zone centre for Home', () => {
    expect(homeTarget(cells([10, 20], [12, 22]))).toEqual({ x: 11.5, y: 0, z: 21.5 })
    expect(homeTarget(cells())).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('chains an idle snap from the current pose', () => {
    const current = sphericalPose({ x: 0, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 24)
    const { from, to } = chainSnap(null, current, 0, degToRad(CONFIG.camera.snapRotateDeg))

    expect(from).toEqual(current)
    expect(radToDeg(to.azimuthRad - current.azimuthRad)).toBeCloseTo(90)
    expect(to.target).toEqual(current.target)
    expect(to.radius).toBe(current.radius)
    expect(to.polarRad).toBe(current.polarRad)
    expect(to.zoom).toBe(current.zoom)
  })

  it('keeps polar and radius constant during a spherical snap', () => {
    const start = sphericalPose({ x: 0, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 24)
    const { from, to } = chainSnap(null, start, 0, degToRad(90))
    const middle = lerpSpherical(from, to, 0.5)

    expect(middle.polarRad).toBeCloseTo(start.polarRad)
    expect(middle.radius).toBeCloseTo(start.radius)
    expect(radToDeg(middle.azimuthRad - start.azimuthRad)).toBeCloseTo(45)
  })

  it('chains a snap read back through the atan2 round trip', () => {
    const target = { x: 0, y: 0, z: 0 }
    const start = sphericalPose(
      positionFromSpherical(target, 20, degToRad(45), degToRad(135)),
      target,
      24,
    )
    const running = {
      from: start,
      to: { ...start, azimuthRad: start.azimuthRad + degToRad(90) },
      start: 0,
      duration: CONFIG.camera.transitionMs,
    }
    const mid = lerpSpherical(
      running.from,
      running.to,
      easeInOut(200 / running.duration),
    )
    const readBack = sphericalPose(positionOfPose(mid), target, 24)
    expect(readBack.azimuthRad).toBeLessThan(0)

    const result = chainSnap(running, readBack, 200, degToRad(CONFIG.camera.snapRotateDeg))
    const sweep = radToDeg(result.to.azimuthRad - result.from.azimuthRad)
    const turned =
      ((radToDeg(result.to.azimuthRad - start.azimuthRad) % 360) + 360) % 360

    expect(turned).toBeCloseTo(180)
    expect(sweep).toBeLessThanOrEqual(180 + CONFIG.camera.snapRotateDeg)
    expect(radToDeg(result.from.azimuthRad)).toBeCloseTo(205)
  })

  it('keeps the Home destination when a snap starts mid-Home', () => {
    const cells = new Map([['10,20', { x: 10, z: 20 }]])
    const target = homeTarget(cells)
    const home = sphericalPose(
      { x: target.x + 10, y: 10, z: target.z + 10 },
      target,
      24,
    )
    const from = sphericalPose({ x: 0, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 24)
    const running = {
      from,
      to: home,
      start: 0,
      duration: CONFIG.camera.transitionMs,
    }
    const mid = lerpSpherical(running.from, running.to, 0.4)
    const result = chainSnap(running, mid, 120, degToRad(CONFIG.camera.snapRotateDeg))

    expect(result.to.target).toEqual(home.target)
    expect(result.to.radius).toBe(home.radius)
    expect(result.to.polarRad).toBe(home.polarRad)
    expect(result.to.zoom).toBe(home.zoom)
    expect(radToDeg(result.to.azimuthRad - home.azimuthRad)).toBeCloseTo(90)
  })

  it('chains E then Q back to the original azimuth', () => {
    const target = { x: 0, y: 0, z: 0 }
    const start = sphericalPose(
      positionFromSpherical(target, 20, degToRad(45), degToRad(135)),
      target,
      24,
    )
    const running = {
      from: start,
      to: { ...start, azimuthRad: start.azimuthRad + degToRad(90) },
      start: 0,
      duration: CONFIG.camera.transitionMs,
    }
    const mid = lerpSpherical(
      running.from,
      running.to,
      easeInOut(200 / running.duration),
    )
    const readBack = sphericalPose(positionOfPose(mid), target, 24)
    const result = chainSnap(running, readBack, 200, -degToRad(90))
    const turned =
      ((radToDeg(result.to.azimuthRad - start.azimuthRad) % 360) + 360) % 360

    expect(turned).toBeCloseTo(0)
  })

  it('takes the shortest path from -170° to 45° for Home', () => {
    const start = degToRad(-170)
    const end = degToRad(45)
    const unwrapped = unwrapAzimuth(start, end)
    expect(radToDeg(unwrapped)).toBeCloseTo(190)
    expect(radToDeg(end - unwrapped)).toBeCloseTo(-145)
  })

  it('keeps every tween frame inside the sweep', () => {
    const base = sphericalPose({ x: 0, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 24)
    const from = { ...base, azimuthRad: degToRad(190) }
    const to = { ...base, azimuthRad: degToRad(45) }
    for (let frame = 0; frame <= 100; frame += 1) {
      const azimuth = lerpSpherical(from, to, frame / 100).azimuthRad
      expect(azimuth).toBeGreaterThanOrEqual(to.azimuthRad)
      expect(azimuth).toBeLessThanOrEqual(from.azimuthRad)
    }
  })

  it('tilts toward overhead with a negative direction', () => {
    const start = sphericalPose({ x: 0, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 24)
    const up = tiltPose(start, -1, CONFIG.camera.tiltStepDeg)
    expect(radToDeg(up.polarRad)).toBeCloseTo(30)
    expect(up.target).toEqual(start.target)
    expect(up.radius).toBe(start.radius)
    expect(up.azimuthRad).toBe(start.azimuthRad)
    expect(up.zoom).toBe(start.zoom)
    expect(radToDeg(tiltPose(start, 1, CONFIG.camera.tiltStepDeg).polarRad)).toBeCloseTo(60)
    const overhead = tiltPose(start, -1, 1000)
    expect(radToDeg(overhead.polarRad)).toBe(CONFIG.camera.minPolarDeg)
  })

  it('covers every bounds corner with the shadow camera', () => {
    const bounds = { minX: -5, maxX: 6, minZ: -3, maxZ: 7 }
    const height = CONFIG.world.maxStack * CONFIG.world.tileThickness
    const extent = shadowCameraBounds(bounds, CONFIG.lighting.directionalPosition, height)

    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: 0,
      z: (bounds.minZ + bounds.maxZ) / 2,
    }
    const light = {
      x: center.x + CONFIG.lighting.directionalPosition[0],
      y: CONFIG.lighting.directionalPosition[1],
      z: center.z + CONFIG.lighting.directionalPosition[2],
    }
    const normalize = (v: { x: number; y: number; z: number }) => {
      const length = Math.hypot(v.x, v.y, v.z)
      return { x: v.x / length, y: v.y / length, z: v.z / length }
    }
    const cross = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
    ) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    })
    const dot = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
    ) => a.x * b.x + a.y * b.y + a.z * b.z

    const forward = normalize({
      x: center.x - light.x,
      y: center.y - light.y,
      z: center.z - light.z,
    })
    const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }))
    const up = normalize(cross(right, forward))

    for (const x of [bounds.minX, bounds.maxX]) {
      for (const y of [0, height]) {
        for (const z of [bounds.minZ, bounds.maxZ]) {
          const relative = { x: x - light.x, y: y - light.y, z: z - light.z }
          const px = dot(relative, right)
          const py = dot(relative, up)
          const pz = dot(relative, forward)
          expect(px).toBeGreaterThanOrEqual(extent.left)
          expect(px).toBeLessThanOrEqual(extent.right)
          expect(py).toBeGreaterThanOrEqual(extent.bottom)
          expect(py).toBeLessThanOrEqual(extent.top)
          expect(pz).toBeGreaterThanOrEqual(extent.near)
          expect(pz).toBeLessThanOrEqual(extent.far)
        }
      }
    }
  })

  it('pans relative to the camera facing and normalises diagonals', () => {
    const forward = panVector(
      { forward: true, backward: false, left: false, right: false },
      0,
    )
    expect(forward.x).toBeCloseTo(0)
    expect(forward.z).toBeCloseTo(-1)

    const right = panVector(
      { forward: false, backward: false, left: false, right: true },
      0,
    )
    expect(right.x).toBeCloseTo(1)
    expect(right.z).toBeCloseTo(0)

    const diagonal = panVector(
      { forward: true, backward: false, left: false, right: true },
      0,
    )
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1)

    const idle = panVector(
      { forward: false, backward: false, left: false, right: false },
      1,
    )
    expect(idle.x).toBeCloseTo(0)
    expect(idle.z).toBeCloseTo(0)
  })

  it('eases in and out between 0 and 1', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(-3)).toBe(0)
    expect(easeInOut(4)).toBe(1)
    expect(easeInOut(0.25)).toBeCloseTo(0.125)
    expect(easeInOut(0.75)).toBeCloseTo(0.875)
  })

  it('ignores shortcuts while typing or holding a modifier', () => {
    expect(blocksCameraShortcut(null, false)).toBe(false)
    expect(blocksCameraShortcut({ tagName: 'INPUT' }, false)).toBe(true)
    expect(blocksCameraShortcut({ tagName: 'textarea' }, false)).toBe(true)
    expect(blocksCameraShortcut({ tagName: 'SELECT' }, false)).toBe(true)
    expect(blocksCameraShortcut({ tagName: 'DIV', isContentEditable: true }, false)).toBe(true)
    expect(blocksCameraShortcut({ tagName: 'DIV' }, false)).toBe(false)
    expect(blocksCameraShortcut({ tagName: 'DIV' }, true)).toBe(true)
  })
})
