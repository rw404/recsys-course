import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { runtime } from './shared'
import { useProgress } from '../state/progress'

// textured + rigged porter (Meshy: text-to-3d refine -> auto-rigging + animation library)
const IDLE_URL = '/models/porter-v2/idle.glb'
const WALK_URL = '/models/porter-v2/walking.glb'
const RUN_URL = '/models/porter-v2/running.glb'
const CHAT_URL = '/models/porter-v2/chat.glb' // "Stand and Chat" — played while listening in a lesson

// clip names as authored by Meshy (one clip per file)
const IDLE = 'Armature|Idle|baselayer' // real breathing idle from the animation library
const WALK = 'Armature|walking_man|baselayer'
const RUN = 'Armature|running|baselayer'
const CHAT = 'CHAT' // renamed on load (its authored name varies); used in study mode

// Skinned meshes are posed by bones, so Box3.setFromObject (which uses the mesh node's
// 0.01-scaled transform) massively under-reports height. At native scale the rig already
// renders ~1.6 units tall, so we use a fixed scale and just plant the feet.
const SCALE = 1
const FEET_LOCAL_Y = -0.6 // model foot plant in the RigidBody's local space (raised so feet sit on the floor, not sunk in)
const YAW_OFFSET = Math.PI // Meshy character faces +Z; camera sits behind, so flip
// Player RUN_SPEED is 4.2 (Player.tsx), so the run clip must trigger below that. 3.4 sits
// between WALK_SPEED (2.2) and RUN_SPEED (4.2): walking → walk clip, Shift-running → run clip.
const RUN_THRESHOLD = 3.4

export function PorterGLB() {
  const base = useGLTF(WALK_URL)
  const walkG = useGLTF(WALK_URL)
  const runG = useGLTF(RUN_URL)
  const idleG = useGLTF(IDLE_URL)
  const chatG = useGLTF(CHAT_URL)

  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(base.scene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if ((m as THREE.SkinnedMesh).isSkinnedMesh || m.isMesh) {
        m.castShadow = true
        m.receiveShadow = false
        m.frustumCulled = false // skinned bounds can cull incorrectly with our camera
        // keep the model's own baked texture; add a faint neon rim to fit the world
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive = new THREE.Color('#2a1550')
          mat.emissiveIntensity = 0.12
        }
      }
    })
    return c
  }, [base.scene])

  const clips = useMemo(() => {
    const pick = (g: { animations: THREE.AnimationClip[] }, name: string, rename?: string) => {
      const c = g.animations.find((a) => a.name === name) ?? g.animations[0]
      if (!c) return c
      // Strip .scale tracks (the idle clip animates the Armature root scale, which combined
      // with the 0.01 bind scale blows the character up 100×) and the Hips.position ROOT-MOTION
      // track (it drifts/bobs the whole body, causing foot-slide and feet dipping into the
      // floor). Physics owns the body's world position; the clip should animate in place.
      const cl = c.clone()
      if (rename) cl.name = rename
      cl.tracks = cl.tracks.filter((t) => !t.name.endsWith('.scale') && t.name !== 'Hips.position')
      return cl
    }
    return [pick(idleG, IDLE), pick(walkG, WALK), pick(runG, RUN), pick(chatG, CHAT, CHAT)].filter(Boolean)
  }, [idleG, walkG, runG, chatG])

  const fit = useRef<THREE.Group>(null)
  const { actions } = useAnimations(clips, fit)
  const current = useRef<string>(IDLE)
  // while a lesson is open the (staged) porter listens/chats instead of the plain breathing idle
  const study = useProgress((s) => s.mode === 'study')

  // start in idle
  useEffect(() => {
    const idle = actions[IDLE]
    idle?.reset().fadeIn(0.3).play()
    return () => {
      Object.values(actions).forEach((a) => a?.stop())
    }
  }, [actions])

  useFrame(() => {
    const speed = runtime.playerSpeed
    const want = study ? CHAT : speed < 0.35 ? IDLE : speed > RUN_THRESHOLD ? RUN : WALK
    if (want !== current.current && actions[want]) {
      actions[current.current]?.fadeOut(0.22)
      actions[want]?.reset().fadeIn(0.22).play()
      current.current = want
    }
    // Sync stride cadence to actual ground speed so feet don't slide.
    // K chosen so timeScale ≈ 1.1 at full walk/run (natural, not hurried).
    const wa = actions[WALK]
    if (wa) wa.timeScale = THREE.MathUtils.clamp(speed * 0.5, 0.55, 1.5)
    const ra = actions[RUN]
    if (ra) ra.timeScale = THREE.MathUtils.clamp(speed * 0.28, 0.7, 1.4)
    // idle is a real skeletal breathing loop (Meshy animation library) — no procedural sway needed
  })

  return (
    <group rotation={[0, YAW_OFFSET, 0]}>
      <group ref={fit} scale={SCALE} position={[0, FEET_LOCAL_Y, 0]}>
        <primitive object={cloned} />
      </group>
      <BackArtifact />
    </group>
  )
}

/** Metric Compass rides on the porter's back once earned. */
function BackArtifact() {
  const has = useProgress((s) => s.artifacts['metric-compass'])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.03
  })
  if (!has) return null
  // note: YAW_OFFSET already flips the group, so +Z here is the character's back
  return (
    <mesh ref={ref} position={[0, 1.15, 0.22]}>
      <octahedronGeometry args={[0.12]} />
      <meshStandardMaterial color="#66f0ff" emissive="#66f0ff" emissiveIntensity={1.7} toneMapped={false} />
    </mesh>
  )
}

useGLTF.preload(WALK_URL)
useGLTF.preload(RUN_URL)
useGLTF.preload(IDLE_URL)
useGLTF.preload(CHAT_URL)
