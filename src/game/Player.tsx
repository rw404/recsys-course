import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useInput } from './useInput'
import { runtime, ATLAS_SPAWN } from './shared'
import { touchControls } from './controls'
import { PorterGLB } from './PorterGLB'
import { useProgress, WORLD_SPAWN, type WorldId } from '../state/progress'

const WALK_SPEED = 2.2
const RUN_SPEED = 4.2
const ACCEL = 9 // lower = smoother ramp to speed
const JUMP_V = 7.5
// Below this Y the player has fallen through the world → respawn (the island floor sits at y≈0).
const RESPAWN_Y = -8
// Camera-forward basis on the ground plane (camera sits behind +Z, above).
const FORWARD = new THREE.Vector3(0, 0, -1)
const RIGHT = new THREE.Vector3(1, 0, 0)

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const input = useInput()

  const desired = useRef(new THREE.Vector3())
  const current = useRef(new THREE.Vector3())
  const world = useRef<WorldId>(useProgress.getState().currentWorld)
  const atlasBefore = useRef(useProgress.getState().atlasOpen)
  // click-to-move bookkeeping
  const stuckTime = useRef(0) // how long we've wanted to move but been blocked (→ auto-hop)
  const stallTime = useRef(0) // how long a click-move has made no progress (→ give up)
  const lastDist = useRef(Infinity)
  const prevTarget = useRef<THREE.Vector3 | null>(null)

  const mode = useProgress((s) => s.mode)
  // during the staged lecture the player is shown from behind by <LessonStage/>, so hide the
  // real one to avoid a duplicate character in frame.
  const hideVisual = mode === 'study'

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const rb = body.current
    if (!rb) return

    // Hard-place the body at a world-space point with zero velocity (used on region change, atlas
    // toggle, and by the fall-through safety net below).
    const placeAt = (sx: number, sy: number, sz: number) => {
      rb.setTranslation({ x: sx, y: sy, z: sz }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      runtime.playerPosition.set(sx, sy, sz)
      runtime.moveTarget = null // don't chase a target from the old region
      runtime.cameraSkip = true
      current.current.set(0, 0, 0)
      desired.current.set(0, 0, 0)
    }
    const respawn = (worldId: WorldId) => placeAt(...WORLD_SPAWN[worldId])

    const st = useProgress.getState()
    const liveWorld = st.currentWorld
    const atlas = st.atlasOpen

    // Opening / closing the Course Atlas → teleport onto the atlas island (or back to the region).
    if (atlas !== atlasBefore.current) {
      atlasBefore.current = atlas
      world.current = liveWorld // stay synced so exiting doesn't double-fire the region-change path
      if (atlas) placeAt(...ATLAS_SPAWN)
      else respawn(liveWorld)
      return
    }
    // Region change → teleport the body to the new world's spawn and snap the camera.
    if (!atlas && liveWorld !== world.current) {
      world.current = liveWorld
      respawn(liveWorld)
      return
    }

    // Safety net: if the body has dropped below the island (the terrain floor collider can be
    // absent for a frame or two while a scene swaps in, and gravity would otherwise make the
    // player fall forever), snap them back to the current surface's spawn.
    if (rb.translation().y < RESPAWN_Y) {
      if (atlas) placeAt(...ATLAS_SPAWN)
      else respawn(world.current)
      return
    }

    // Freeze movement while a panel is open (study/lab/quiz/interact).
    const frozen = mode !== 'explore'
    const inp = input.current

    // desired horizontal velocity in world space (keyboard + virtual joystick OR click-to-move)
    desired.current.set(0, 0, 0)
    if (!frozen) {
      const fwd = inp.forward + touchControls.moveY
      const str = inp.strafe + touchControls.moveX
      const manual = Math.abs(fwd) > 0.01 || Math.abs(str) > 0.01
      if (manual) {
        // WASD / joystick — cancels any active click-to-move
        runtime.moveTarget = null
        desired.current.addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, str)
        if (desired.current.lengthSq() > 1) desired.current.normalize()
        const touchMag = Math.hypot(touchControls.moveX, touchControls.moveY)
        const speed = inp.run || touchMag > 0.9 ? RUN_SPEED : WALK_SPEED
        desired.current.multiplyScalar(speed)
      } else if (runtime.moveTarget) {
        // steer toward the clicked destination
        if (runtime.moveTarget !== prevTarget.current) {
          prevTarget.current = runtime.moveTarget // new click → reset progress trackers
          lastDist.current = Infinity
          stallTime.current = 0
        }
        const tp = rb.translation()
        const dx = runtime.moveTarget.x - tp.x
        const dz = runtime.moveTarget.z - tp.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.45) {
          runtime.moveTarget = null // arrived
        } else {
          const spd = dist > 3.5 ? RUN_SPEED : WALK_SPEED
          desired.current.set((dx / dist) * spd, 0, (dz / dist) * spd)
          // give up if we've stopped making progress (blocked by an unjumpable obstacle)
          if (dist < lastDist.current - 0.03) {
            lastDist.current = dist
            stallTime.current = 0
          } else {
            stallTime.current += dt
            if (stallTime.current > 1.8) runtime.moveTarget = null
          }
        }
      }
    }

    // smooth toward desired (feels responsive but not twitchy)
    current.current.lerp(desired.current, 1 - Math.exp(-ACCEL * dt))

    const linvel = rb.linvel()
    let vy = linvel.y
    // jump when grounded (resting → |vy| small). Also honours the mobile jump button.
    const grounded = Math.abs(linvel.y) < 1.2
    const wantsJump = inp.jumpPressed || touchControls.jumpEdge
    inp.jumpPressed = false
    touchControls.jumpEdge = false

    // auto-hop: if we want to move but are blocked (near-zero actual speed while grounded), jump so
    // click-to-move / walking doesn't get stuck on a ledge or small obstacle.
    const wantMove = desired.current.lengthSq() > 0.25
    const actualPlanar = Math.hypot(linvel.x, linvel.z)
    let autoJump = false
    if (!frozen && wantMove && grounded && actualPlanar < 0.6) {
      stuckTime.current += dt
      if (stuckTime.current > 0.25) {
        autoJump = true
        stuckTime.current = 0
      }
    } else {
      stuckTime.current = 0
    }

    // No player-facing JUMP (the design brief: no jumps / platforming). We keep only the invisible
    // auto-hop so click-to-move can never get permanently stuck on a ledge. `wantsJump` is still
    // consumed above so the key does nothing rather than buffering.
    void wantsJump
    if (!frozen && !atlas && autoJump && grounded) vy = JUMP_V
    rb.setLinvel({ x: current.current.x, y: vy, z: current.current.z }, true)

    // publish position + speed for camera, stations and the character animator
    const t = rb.translation()
    runtime.playerPosition.set(t.x, t.y, t.z)
    const planarSpeed = Math.hypot(current.current.x, current.current.z)
    runtime.playerSpeed = planarSpeed

    // Face the movement direction. The model's native front is +Z and PorterGLB adds a
    // π yaw offset, so the visual group must aim at atan2(-vx, -vz) — plain atan2(vx, -vz)
    // leaves W/S correct but mirrors A/D (character turned the wrong way when strafing).
    if (planarSpeed > 0.15 && visual.current) {
      const targetYaw = Math.atan2(-current.current.x, -current.current.z)
      runtime.playerFacing = dampAngle(runtime.playerFacing, targetYaw, 12, dt)
      visual.current.rotation.y = runtime.playerFacing
    }
  })

  return (
    <RigidBody
      ref={body}
      position={[runtime.playerPosition.x, runtime.playerPosition.y, runtime.playerPosition.z]}
      colliders={false}
      mass={1}
      linearDamping={0.9}
      enabledRotations={[false, false, false]}
      canSleep={false}
    >
      {/* frictionless: the character is velocity-controlled (we set linvel every frame), so we
          don't want wall/floor friction — it would stick the player to obstacles and, crucially,
          kill the upward jump velocity when pressed against a wall (breaking the auto-hop). */}
      <CapsuleCollider args={[0.45, 0.42]} friction={0} />
      <group ref={visual} visible={!hideVisual}>
        <PorterGLB />
      </group>
    </RigidBody>
  )
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * (1 - Math.exp(-lambda * dt))
}
