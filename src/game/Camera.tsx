import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime, LESSON_STAGE, VALLEY_STAGE, CITY_STAGE, TOWER_STAGE } from './shared'
import { NODES, useProgress } from '../state/progress'

// Fixed, slightly-elevated isometric-ish follow. No sharp rotations, no orbit.
// ?inspect=1 frames the character close-up (3/4 view) for model review.
const INSPECT =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('inspect')
// look at the character's mid-body: player origin sits ~0.9 up, model center ~0.8 world.
const INSPECT_OFFSET = new THREE.Vector3(1.25, 0.45, 2.0)
const INSPECT_LOOK = new THREE.Vector3(0, -0.1, 0)

const EXPLORE_OFFSET = new THREE.Vector3(0, 9.5, 13)
const EXPLORE_LOOK = new THREE.Vector3(0, 1.2, -2) // look slightly ahead of the player
const PORTRAIT_LOOK = new THREE.Vector3(0, 1.0, -4) // look further ahead on tall screens
// When interacting, push in closer and frame the station.
const INTERACT_OFFSET = new THREE.Vector3(0, 5.2, 7)
// Lesson cinematic framing lives in LESSON_STAGE (shared.ts) so the camera and the staged
// actors share one source of truth.

// ?showcase=1 — static, fully param-driven diorama camera for beauty renders. Frames the
// whole camp from a hand-tuned angle (overridable via cx/cy/cz/lx/ly/lz/fov query params).
// ?lsnap=1 — snap the lesson camera instead of the smooth push-in (used by headless captures,
// where the software renderer's low frame-rate would otherwise leave the lerp unsettled).
const LESSON_SNAP =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lsnap')

const SHOWCASE = (() => {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  if (!q.has('showcase')) return null
  const n = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d)
  return {
    cam: new THREE.Vector3(n('cx', -13), n('cy', 10.5), n('cz', 17)),
    look: new THREE.Vector3(n('lx', 3), n('ly', 1.2), n('lz', -5)),
    fov: n('fov', 42),
  }
})()

export function FollowCamera() {
  const { camera, size } = useThree()
  const camPos = useRef(new THREE.Vector3().copy(runtime.playerPosition).add(EXPLORE_OFFSET))
  const scaledOffset = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const tmpTarget = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const st = useProgress.getState()
    const reduced = st.reducedMotion
    const active = st.activeNodeId ? NODES[st.activeNodeId] : null

    const p = runtime.playerPosition

    if (SHOWCASE) {
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - SHOWCASE.fov) > 0.1) {
        cam.fov = SHOWCASE.fov
        cam.updateProjectionMatrix()
      }
      camera.position.copy(SHOWCASE.cam)
      camera.lookAt(SHOWCASE.look)
      return
    }

    if (active && active.kind === 'lesson') {
      // narrator cinematic — smooth push-in to the staged lecture set (per-world framing)
      const stage =
        active.worldId === 'retrieval-valley'
          ? VALLEY_STAGE
          : active.worldId === 'sequential-city'
          ? CITY_STAGE
          : active.worldId === 'policy-tower'
          ? TOWER_STAGE
          : LESSON_STAGE
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - stage.fov) > 0.1) {
        cam.fov = stage.fov
        cam.updateProjectionMatrix()
      }
      tmpTarget.current.copy(stage.cam)
      tmpLook.current.copy(stage.look)
      if (LESSON_SNAP) {
        camPos.current.copy(tmpTarget.current)
        lookAt.current.copy(tmpLook.current)
        camera.position.copy(camPos.current)
        camera.lookAt(lookAt.current)
        return
      }
    } else if (active) {
      // cinematic push-in: sit between player and the station, closer
      const node = new THREE.Vector3(...active.position)
      const focus = tmpTarget.current.copy(p).lerp(node, 0.35)
      tmpTarget.current.copy(focus).add(INTERACT_OFFSET)
      tmpLook.current.copy(focus).setY(1.0)
    } else if (INSPECT) {
      tmpTarget.current.copy(p).add(INSPECT_OFFSET)
      tmpLook.current.copy(p).add(INSPECT_LOOK)
    } else {
      const aspect = size.width / Math.max(1, size.height)
      const portrait = aspect < 1
      // On tall screens a vertical FOV of 50° leaves a very narrow horizontal field
      // (stations fall off the sides). Widen the vertical FOV to keep the horizontal
      // field usable, and pull back only gently so the scene stays out of the fog.
      let targetFov = 50
      if (portrait) {
        const hFov = THREE.MathUtils.degToRad(64)
        targetFov = THREE.MathUtils.clamp(
          THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hFov / 2) / aspect)),
          50,
          74
        )
      }
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - targetFov) > 0.1) {
        cam.fov = targetFov
        cam.updateProjectionMatrix()
      }
      const zoom = portrait ? Math.min(1.16, 1 + (1 - aspect) * 0.32) : 1
      scaledOffset.current.copy(EXPLORE_OFFSET).multiplyScalar(zoom)
      tmpTarget.current.copy(p).add(scaledOffset.current)
      tmpLook.current.copy(p).add(portrait ? PORTRAIT_LOOK : EXPLORE_LOOK)
    }

    if (reduced || runtime.cameraSkip) {
      camPos.current.copy(tmpTarget.current)
      lookAt.current.copy(tmpLook.current)
      runtime.cameraSkip = false
    } else {
      const posLambda = active ? 6 : 3.2
      const lookLambda = active ? 6 : 4
      camPos.current.lerp(tmpTarget.current, 1 - Math.exp(-posLambda * dt))
      lookAt.current.lerp(tmpLook.current, 1 - Math.exp(-lookLambda * dt))
    }

    camera.position.copy(camPos.current)
    camera.lookAt(lookAt.current)
  })

  return null
}
