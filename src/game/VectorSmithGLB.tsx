import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { VALLEY_STAGE } from './shared'
import { useProgress } from '../state/progress'

/**
 * Vector Smith — the ANN engineer of Retrieval Valley, rigged via Meshy (auto-rig + animation
 * library) so he actually gestures while narrating the Two-Tower lesson. He is the World-02
 * analogue of Guide Astra: one clip per lesson page, idle when not lecturing. Same clip pipeline
 * (each glb holds one AnimationClip; the mesh comes from character.glb; root scale + Hips.position
 * tracks are stripped so the rig neither blows up 100× nor drifts off its mark).
 */
const DIR = '/models/vector-smith-rigged'
const BASE_URL = `${DIR}/character.glb`

// Only the clips that keep the arms LOW / near the torso are used: this rig's auto-rigged skinning
// tears the side of the body when an arm raises (shoulder-bone weight bleeds into the torso), so the
// big-arm clips (talk-open / talk-passion / talk-right / think) and the odd crouch (agree) are
// dropped. These four stand upright with hands at/near the body — no visible tearing.
const CLIP_FILES: [string, string][] = [
  ['idle', `${DIR}/idle.glb`],
  ['standChat', `${DIR}/standchat.glb`], // 56 stand & chat (arms at sides)
  ['listening', `${DIR}/listening.glb`], // 47 listening (relaxed)
  ['talkCalm', `${DIR}/talk-calm.glb`], // 311 talk, hands gesturing low at the waist
]
const CLIP_URLS = CLIP_FILES.map(([, url]) => url)

// per-page gesture sequences (index = slide). This rig's auto-rigged skinning tears the side of
// the torso when the arms raise (shoulder-bone weight bleeds into the body), so we use ONLY
// low-arm / head-driven clips — stand-and-chat, listening, a gentle nod and hands-low talk. Arms
// stay near the body, so the bleed never shows. The big-arm clips (talkOpen/talkPassion/think)
// are intentionally excluded.
const PAGE_GESTURES: string[][] = [
  ['talkCalm', 'standChat', 'listening'], // 0 welcome / intro
  ['standChat', 'talkCalm', 'listening'], // 1 two towers
  ['talkCalm', 'listening', 'standChat'], // 2 ANN
  ['listening', 'talkCalm', 'standChat'], // 3 negatives (weighing)
  ['talkCalm', 'standChat', 'listening'], // 4 in-batch finale
]
const CYCLE_SEC = 5.2
const GESTURE_SPEED = 0.9
const CROSSFADE = 0.5

const FORCE_CLIP =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('vac') : null

export function VectorSmithGLB() {
  const base = useGLTF(BASE_URL)
  const sources = useGLTF(CLIP_URLS) as { animations: THREE.AnimationClip[] }[]

  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(base.scene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if ((m as THREE.SkinnedMesh).isSkinnedMesh || m.isMesh) {
        m.castShadow = true
        m.receiveShadow = false
        m.frustumCulled = false
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive = new THREE.Color('#20386a')
          mat.emissiveIntensity = 0.16
        }
      }
    })
    return c
  }, [base.scene])

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

  const active = useProgress((s) => s.mode === 'study' && s.activeNodeId === 'two-tower-lesson')
  const page = useProgress((s) => s.lessonPage)

  useEffect(() => {
    actions['idle']?.reset().fadeIn(0.3).play()
    return () => {
      Object.values(actions).forEach((a) => a?.stop())
    }
  }, [actions])

  useFrame((state) => {
    const t = state.clock.elapsedTime
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
      actions[current.current]?.fadeOut(CROSSFADE)
      const next = actions[want]
      if (next) {
        next.reset()
        next.timeScale = want === 'idle' ? 1 : GESTURE_SPEED
        next.fadeIn(CROSSFADE).play()
      }
      current.current = want
    }
  })

  const { scale, feetY } = VALLEY_STAGE.smith
  return (
    <group ref={fit} scale={scale} position={[0, feetY, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

useGLTF.preload(BASE_URL)
useGLTF.preload(CLIP_URLS)
