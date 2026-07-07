import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Billboard, Text } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

const YAW_OFFSET = Math.PI // Meshy characters face +Z; flip like the player
// Shared idle clip (Meshy animation library). Bone names match across Meshy auto-rigs,
// so this idle binds to any humanoid Meshy character by name.
const IDLE_URL = '/models/porter-v2/idle.glb'
const IDLE_CLIP = 'Armature|Idle|baselayer'

/**
 * A decorative, non-physics "wanderer" NPC (Meshy rigged character) that strolls between
 * waypoints and pauses to idle at each — walk → idle → walk, facing the direction of travel.
 */
export function Wanderer({
  dir,
  waypoints,
  speed = 1.3,
  scale = 1,
  label,
}: {
  dir: string
  waypoints: [number, number, number][]
  speed?: number
  scale?: number
  label?: string
}) {
  const { scene, animations } = useGLTF(`${dir}/walking.glb`)
  const idleG = useGLTF(IDLE_URL)
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if ((m as THREE.SkinnedMesh).isSkinnedMesh || m.isMesh) {
        m.castShadow = true
        m.frustumCulled = false
      }
    })
    return c
  }, [scene])

  const walkClip = animations[0]
  const clips = useMemo(
    () => [walkClip, idleG.animations.find((a) => a.name === IDLE_CLIP) ?? idleG.animations[0]].filter(Boolean),
    [walkClip, idleG]
  )

  const group = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const { actions } = useAnimations(clips, rig)

  const wps = useMemo(() => waypoints.map((w) => new THREE.Vector3(...w)), [waypoints])
  const idx = useRef(0)
  const pos = useRef(wps[0].clone())
  const facing = useRef(0)
  const state = useRef<'walk' | 'idle'>('walk')
  const idleTimer = useRef(0)

  useEffect(() => {
    const wa = walkClip && actions[walkClip.name]
    if (wa) wa.timeScale = THREE.MathUtils.clamp(speed * 0.55, 0.6, 1.4)
    actions[IDLE_CLIP]?.reset().play() // start idle underneath
    wa?.reset().fadeIn(0.3).play()
  }, [actions, walkClip, speed])

  useFrame((_, dtRaw) => {
    const g = group.current
    if (!g || wps.length < 2) return
    const dt = Math.min(dtRaw, 0.05)

    if (state.current === 'idle') {
      idleTimer.current -= dt
      if (idleTimer.current <= 0) {
        state.current = 'walk'
        idx.current = (idx.current + 1) % wps.length
        crossfade(actions, IDLE_CLIP, walkClip?.name, 0.3)
      }
    } else {
      const target = wps[idx.current]
      const to = new THREE.Vector3().subVectors(target, pos.current)
      to.y = 0
      const dist = to.length()
      if (dist < 0.25) {
        state.current = 'idle'
        idleTimer.current = 2 + (idx.current % 3) // 2–4s pause
        crossfade(actions, walkClip?.name, IDLE_CLIP, 0.3)
      } else {
        to.normalize()
        pos.current.addScaledVector(to, Math.min(speed * dt, dist))
        facing.current = dampAngle(facing.current, Math.atan2(-to.x, -to.z), 8, dt)
      }
    }
    g.position.set(pos.current.x, 0, pos.current.z)
    g.rotation.y = facing.current
  })

  return (
    <group ref={group}>
      <group ref={rig} rotation={[0, YAW_OFFSET, 0]} scale={scale}>
        <primitive object={cloned} />
      </group>
      {label && (
        <Billboard position={[0, 1.9, 0]}>
          <Text fontSize={0.26} color="#dcccff" anchorX="center" outlineWidth={0.01} outlineColor="#0b0618">
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

function crossfade(
  actions: Record<string, THREE.AnimationAction | null>,
  from: string | undefined,
  to: string | undefined,
  dur: number
) {
  if (from && actions[from]) actions[from]!.fadeOut(dur)
  if (to && actions[to]) actions[to]!.reset().fadeIn(dur).play()
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * (1 - Math.exp(-lambda * dt))
}
