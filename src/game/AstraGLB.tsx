import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { LESSON_STAGE } from './shared'
import { useProgress } from '../state/progress'

// Guide Astra, rigged via Meshy (auto-rig + animation library) so she actually MOVES her arms
// and head to narrate. Each lesson page cycles through a short SEQUENCE of talking gestures
// (drawn from the library below) so she stays lively instead of looping one pose.
const DIR = '/models/astra-rigged'
const BASE_URL = `${DIR}/character.glb`

// gesture palette — [key, file]. Each glb holds exactly one clip; we take animations[0].
const CLIP_FILES: [string, string][] = [
  ['idle', `${DIR}/idle.glb`],
  ['talkOpen', `${DIR}/talk-open.glb`],        // 313 both hands open
  ['talkPassion', `${DIR}/talk-passion.glb`],  // 308 passionate
  ['talkRight', `${DIR}/talk-right.glb`],       // 314 right hand open
  ['talkLeftHip', `${DIR}/talk-lefthip.glb`],   // 309 talk, left hand on hip
  ['talkLeftRaise', `${DIR}/talk-leftraise.glb`], // 310 talk, left hand raised
  ['handOnHip', `${DIR}/hand-on-hip.glb`],      // 315 hand on hip
  ['shrug', `${DIR}/shrug.glb`],                // 317 shrug
  ['agree', `${DIR}/agree.glb`],                // 25 agree / nod
  ['wave', `${DIR}/wave.glb`],                  // 290 wave one hand
  ['think', `${DIR}/think.glb`],                // 36 thinking scratch
  ['cheer', `${DIR}/cheer.glb`],                // 49 motivational cheer
]
const CLIP_URLS = CLIP_FILES.map(([, url]) => url)

// per-page gesture sequences (index = slide). Astra cycles through each list while the page
// is open, giving varied, non-repetitive narration. Falls back to the last list.
// Only calm, natural talking poses (arms low/relaxed) — the earlier raised-arm gestures
// (wave/leftRaise/cheer) and the arm-near-head ones (agree/handOnHip/shrug) read as awkward
// mid-motion, so they're intentionally excluded.
const PAGE_GESTURES: string[][] = [
  ['talkOpen', 'talkRight', 'talkLeftHip'],    // 0 welcome
  ['talkPassion', 'talkRight', 'talkOpen'],    // 1 emphasis
  ['talkLeftHip', 'talkOpen', 'talkPassion'],  // 2 explain
  ['think', 'talkRight', 'talkLeftHip'],       // 3 weighing options
  ['talkPassion', 'talkOpen', 'talkRight'],    // 4 finale
]
const CYCLE_SEC = 4.5

// ?ac=<key> forces a single clip (used to vet each gesture during capture)
const FORCE_CLIP =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ac') : null

export function AstraGLB() {
  const base = useGLTF(BASE_URL)
  const sources = useGLTF(CLIP_URLS) as { animations: THREE.AnimationClip[] }[]

  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(base.scene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if ((m as THREE.SkinnedMesh).isSkinnedMesh || m.isMesh) {
        m.castShadow = true
        m.receiveShadow = false
        m.frustumCulled = false // skinned bounds cull wrong with our staged camera
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive = new THREE.Color('#3a2168')
          mat.emissiveIntensity = 0.16
        }
      }
    })
    return c
  }, [base.scene])

  // one clip per file, renamed to its stable key, with root-motion/scale tracks stripped (the
  // Armature root animates a 0.01 scale track that would blow the mesh up 100×; Hips.position
  // would drift her off her mark — placement owns world position).
  const clips = useMemo(() => {
    return CLIP_FILES.map(([key], i) => {
      const src = sources[i]?.animations?.[0]
      if (!src) return null
      const cl = src.clone()
      cl.name = key
      cl.tracks = cl.tracks.filter((t) => !t.name.endsWith('.scale') && t.name !== 'Hips.position')
      return cl
    }).filter(Boolean) as THREE.AnimationClip[]
  }, [sources])

  const fit = useRef<THREE.Group>(null)
  const { actions } = useAnimations(clips, fit)
  const current = useRef<string>('idle')
  const pageStart = useRef(0)
  const prevPage = useRef(-1)
  const prevActive = useRef(false)

  const active = useProgress((s) => s.mode === 'study')
  const page = useProgress((s) => s.lessonPage)

  useEffect(() => {
    actions['idle']?.reset().fadeIn(0.3).play()
    return () => {
      Object.values(actions).forEach((a) => a?.stop())
    }
  }, [actions])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // reset the gesture cycle whenever the page changes or a lesson opens
    if (page !== prevPage.current || active !== prevActive.current) {
      prevPage.current = page
      prevActive.current = active
      pageStart.current = t
    }

    let want: string
    if (FORCE_CLIP && actions[FORCE_CLIP]) {
      want = FORCE_CLIP
    } else if (!active) {
      want = 'idle'
    } else {
      const seq = PAGE_GESTURES[page] ?? PAGE_GESTURES[PAGE_GESTURES.length - 1]
      const idx = Math.floor((t - pageStart.current) / CYCLE_SEC) % seq.length
      want = seq[idx]
    }

    if (want !== current.current && actions[want]) {
      actions[current.current]?.fadeOut(0.4)
      actions[want]?.reset().fadeIn(0.4).play()
      current.current = want
    }
  })

  // yaw/position are applied by the parent RigidBody in LessonStage (single source of truth);
  // here we only fit the rig (uniform scale + feet plant).
  const { scale, feetY } = LESSON_STAGE.astra
  return (
    <group ref={fit} scale={scale} position={[0, feetY, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

useGLTF.preload(BASE_URL)
useGLTF.preload(CLIP_URLS)
