import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Vector3, type OrthographicCamera } from 'three'
import { CONFIG } from '../config/evergrow.config'
import { useWorldStore } from '../store/world'
import {
  createMouseButtons,
  GROUND_PAN_ACTION,
  ORBIT_ACTION,
} from './cameraBindings'
import {
  blocksCameraShortcut,
  cameraTargetBounds,
  chainSnap,
  clampTarget,
  clampZoom,
  degToRad,
  easeInOut,
  homeTarget,
  lerpSpherical,
  panVector,
  positionOfPose,
  sphericalPose,
  tiltPose,
  unwrapAzimuth,
  type SphericalPose,
  type Vec3,
} from './cameraMath'
import { useReducedMotion } from './useReducedMotion'

export interface CameraRigHandle {
  goHome(): void
}

type TweenKind = 'snap' | 'home'

interface Tween {
  readonly kind: TweenKind
  readonly from: SphericalPose
  readonly to: SphericalPose
  readonly start: number
  readonly duration: number
}

export const CameraRig = forwardRef<CameraRigHandle>(function CameraRig(_props, ref) {
  const controlsRef = useRef<CameraControls>(null)
  const tweenRef = useRef<Tween | null>(null)
  const panKeys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })
  const tempTarget = useRef(new Vector3())
  const mouseButtons = useMemo(() => createMouseButtons(), [])
  const reducedMotion = useReducedMotion()
  const cells = useWorldStore((state) => state.cells)
  const bounds = useMemo(() => cameraTargetBounds(cells), [cells])
  const camera = useThree((state) => state.camera) as OrthographicCamera
  const domElement = useThree((state) => state.gl.domElement)

  const readPose = useCallback((): SphericalPose => {
    const controls = controlsRef.current
    const raw = controls?.getTarget(tempTarget.current) ?? tempTarget.current
    const target = clampTarget({ x: raw.x, y: raw.y, z: raw.z }, bounds)
    return sphericalPose(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target,
      camera.zoom,
    )
  }, [bounds, camera])

  const applyPose = useCallback((pose: SphericalPose) => {
    const controls = controlsRef.current
    if (!controls) return
    const position = positionOfPose(pose)
    controls.setLookAt(
      position.x,
      position.y,
      position.z,
      pose.target.x,
      pose.target.y,
      pose.target.z,
      false,
    )
    void controls.zoomTo(clampZoom(pose.zoom), false)
  }, [])

  const startTween = useCallback(
    (kind: TweenKind, from: SphericalPose, to: SphericalPose) => {
      if (!controlsRef.current) return
      if (reducedMotion) {
        tweenRef.current = null
        applyPose(to)
        return
      }
      tweenRef.current = {
        kind,
        from,
        to,
        start: performance.now(),
        duration: CONFIG.camera.transitionMs,
      }
    },
    [applyPose, reducedMotion],
  )

  const goHome = useCallback(() => {
    const target = homeTarget(cells)
    const [dx, dy, dz] = CONFIG.camera.homePosition
    const position: Vec3 = { x: target.x + dx, y: target.y + dy, z: target.z + dz }
    const to = sphericalPose(position, target, CONFIG.camera.defaultZoom)
    const from = readPose()
    startTween('home', { ...from, azimuthRad: unwrapAzimuth(from.azimuthRad, to.azimuthRad) }, to)
  }, [cells, readPose, startTween])

  useImperativeHandle(ref, () => ({ goHome }), [goHome])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.minPolarAngle = degToRad(CONFIG.camera.minPolarDeg)
    controls.maxPolarAngle = degToRad(CONFIG.camera.maxPolarDeg)
    controls.minZoom = CONFIG.camera.minZoom
    controls.maxZoom = CONFIG.camera.maxZoom
    controls.minDistance = CONFIG.camera.minDistance
    controls.maxDistance = CONFIG.camera.maxDistance
    controls.azimuthRotateSpeed = CONFIG.camera.rotateSpeed
    controls.polarRotateSpeed = CONFIG.camera.rotateSpeed
    controls.dollySpeed = CONFIG.camera.zoomSpeed
    controls.truckSpeed = CONFIG.camera.mousePanSpeed
  }, [])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.smoothTime = reducedMotion ? 0 : CONFIG.camera.smoothTime
    controls.draggingSmoothTime = reducedMotion ? 0 : CONFIG.camera.draggingSmoothTime
    if (reducedMotion && tweenRef.current) {
      const end = tweenRef.current.to
      tweenRef.current = null
      applyPose(end)
    }
  }, [applyPose, reducedMotion])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const suppressMenu = (event: Event) => event.preventDefault()
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 2) return
      controls.mouseButtons.right = event.shiftKey ? GROUND_PAN_ACTION : ORBIT_ACTION
    }
    const onPointerUp = () => {
      controls.mouseButtons.right = ORBIT_ACTION
    }

    domElement.addEventListener('contextmenu', suppressMenu)
    domElement.addEventListener('pointerdown', onPointerDown, true)
    domElement.addEventListener('pointerup', onPointerUp, true)
    domElement.addEventListener('pointercancel', onPointerUp, true)
    return () => {
      domElement.removeEventListener('contextmenu', suppressMenu)
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointerup', onPointerUp, true)
      domElement.removeEventListener('pointercancel', onPointerUp, true)
    }
  }, [domElement])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        blocksCameraShortcut(
          event.target as { tagName?: string; isContentEditable?: boolean } | null,
          event.ctrlKey || event.metaKey || event.altKey,
        )
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const keys = panKeys.current
      let panning = false
      switch (key) {
        case 'w':
        case 'arrowup':
          keys.forward = true
          panning = true
          break
        case 's':
        case 'arrowdown':
          keys.backward = true
          panning = true
          break
        case 'a':
        case 'arrowleft':
          keys.left = true
          panning = true
          break
        case 'd':
        case 'arrowright':
          keys.right = true
          panning = true
          break
        default:
          break
      }
      if (panning) event.preventDefault()

      if (event.repeat) return
      switch (key) {
        case 'q':
        case 'e':
        case 'h':
        case 'pageup':
        case 'pagedown':
        case '+':
        case '=':
        case '-':
        case '_':
          event.preventDefault()
          break
        default:
          return
      }

      if (key === 'h') {
        goHome()
        return
      }
      if (key === 'q' || key === 'e') {
        const direction = key === 'e' ? 1 : -1
        const snap = chainSnap(
          tweenRef.current,
          readPose(),
          performance.now(),
          direction * degToRad(CONFIG.camera.snapRotateDeg),
        )
        startTween('snap', snap.from, snap.to)
        return
      }
      if (key === 'pageup' || key === 'pagedown') {
        const direction = key === 'pageup' ? -1 : 1
        const running = tweenRef.current
        if (running) {
          tweenRef.current = {
            ...running,
            to: tiltPose(running.to, direction, CONFIG.camera.tiltStepDeg),
          }
        } else {
          applyPose(tiltPose(readPose(), direction, CONFIG.camera.tiltStepDeg))
        }
        return
      }
      const controls = controlsRef.current
      if (!controls) return
      const direction = key === '-' || key === '_' ? -1 : 1
      void controls.zoomTo(clampZoom(camera.zoom + direction * CONFIG.camera.zoomKeyStep), false)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const keys = panKeys.current
      switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keys.forward = false
          break
        case 's':
        case 'arrowdown':
          keys.backward = false
          break
        case 'a':
        case 'arrowleft':
          keys.left = false
          break
        case 'd':
        case 'arrowright':
          keys.right = false
          break
        default:
          break
      }
    }

    const clearKeys = () => {
      panKeys.current.forward = false
      panKeys.current.backward = false
      panKeys.current.left = false
      panKeys.current.right = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
    }
  }, [applyPose, camera, goHome, readPose, startTween])

  useFrame((_state, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const tween = tweenRef.current
    if (tween) {
      const progress =
        tween.duration <= 0
          ? 1
          : Math.min(1, (performance.now() - tween.start) / tween.duration)
      applyPose(lerpSpherical(tween.from, tween.to, easeInOut(progress)))
      if (progress >= 1) tweenRef.current = null
    } else {
      const keys = panKeys.current
      if (keys.forward || keys.backward || keys.left || keys.right) {
        const from = readPose()
        const direction = panVector(keys, from.azimuthRad)
        const step =
          CONFIG.camera.panSpeed * Math.min(delta, CONFIG.camera.maxFrameDelta)
        const target = clampTarget(
          {
            x: from.target.x + direction.x * step,
            y: 0,
            z: from.target.z + direction.z * step,
          },
          bounds,
        )
        applyPose({ ...from, target })
      }
    }

    const current = controls.getTarget(tempTarget.current)
    const clamped = clampTarget({ x: current.x, y: current.y, z: current.z }, bounds)
    if (clamped.x !== current.x || clamped.y !== current.y || clamped.z !== current.z) {
      const dx = clamped.x - current.x
      const dy = clamped.y - current.y
      const dz = clamped.z - current.z
      controls.setLookAt(
        camera.position.x + dx,
        camera.position.y + dy,
        camera.position.z + dz,
        clamped.x,
        clamped.y,
        clamped.z,
        false,
      )
    }
  })

  return (
    <CameraControls ref={controlsRef} makeDefault mouseButtons={mouseButtons} />
  )
})
