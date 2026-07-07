import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useInput } from './useInput'
import { runtime } from './shared'
import { touchControls } from './controls'
import { PorterGLB } from './PorterGLB'
import { useProgress } from '../state/progress'

const WALK_SPEED = 2.2
const RUN_SPEED = 4.2
const ACCEL = 9 // lower = smoother ramp to speed
const JUMP_V = 7.5
// Camera-forward basis on the ground plane (camera sits behind +Z, above).
const FORWARD = new THREE.Vector3(0, 0, -1)
const RIGHT = new THREE.Vector3(1, 0, 0)

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const input = useInput()

  const desired = useRef(new THREE.Vector3())
  const current = useRef(new THREE.Vector3())

  const mode = useProgress((s) => s.mode)
  // during the staged lecture the player is shown from behind by <LessonStage/>, so hide the
  // real one to avoid a duplicate character in frame.
  const hideVisual = mode === 'study'

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const rb = body.current
    if (!rb) return

    // Freeze movement while a panel is open (study/lab/quiz/interact).
    const frozen = mode !== 'explore'
    const inp = input.current

    // desired horizontal velocity in world space (keyboard + virtual joystick)
    desired.current.set(0, 0, 0)
    if (!frozen) {
      const fwd = inp.forward + touchControls.moveY
      const str = inp.strafe + touchControls.moveX
      desired.current.addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, str)
      if (desired.current.lengthSq() > 1) desired.current.normalize()
      const touchMag = Math.hypot(touchControls.moveX, touchControls.moveY)
      const speed = inp.run || touchMag > 0.9 ? RUN_SPEED : WALK_SPEED
      desired.current.multiplyScalar(speed)
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
    if (!frozen && wantsJump && grounded) vy = JUMP_V
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
      <CapsuleCollider args={[0.45, 0.42]} />
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
