import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { useProgress, type NodeId } from '../state/progress'

/**
 * A reusable rigged, talking narrator (generalised from AstraGLB / VectorSmithGLB). Loads a base
 * character glb + one glb per gesture clip; while its lesson is open it cycles a per-page gesture
 * sequence, else it idles. Root scale + Hips.position tracks are stripped (the Meshy rig animates a
 * 0.01 root scale that would blow the mesh up ~100×, and Hips.position would drift it off its mark —
 * world placement owns position). Each world's lesson stage renders one of these with its own clips.
 */
export interface NarratorProps {
  /** clip glbs live under this dir; base mesh is `${dir}/character.glb` */
  dir: string
  /** [key, filename] per clip — the mesh comes from character.glb, these are read only for the clip */
  clips: [string, string][]
  /** per-lesson-page gesture key sequences (cycled while the page is open) */
  pageGestures: string[][]
  /** the lesson node this narrator belongs to (active only while that lesson is open) */
  activeNode: NodeId
  scale: number
  feetY: number
  /** emissive tint baked onto the mesh (subtle self-lit look) */
  emissive?: string
  /** ?<forceParam>=<clipKey> forces a single clip (capture/vetting) */
  forceParam?: string
  cycleSec?: number
  gestureSpeed?: number
  crossfade?: number
}

export function RiggedNarrator({
  dir,
  clips,
  pageGestures,
  activeNode,
  scale,
  feetY,
  emissive = '#3a2168',
  forceParam,
  cycleSec = 5.2,
  gestureSpeed = 0.9,
  crossfade = 0.5,
}: NarratorProps) {
  const baseUrl = `${dir}/character.glb`
  const clipUrls = useMemo(() => clips.map(([, f]) => f), [clips])

  const base = useGLTF(baseUrl)
  const sources = useGLTF(clipUrls) as { animations: THREE.AnimationClip[] }[]

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
          mat.emissive = new THREE.Color(emissive)
          mat.emissiveIntensity = 0.16
        }
      }
    })
    return c
  }, [base.scene, emissive])

  const animClips = useMemo(() => {
    return clips
      .map(([key], i) => {
        const src = sources[i]?.animations?.[0]
        if (!src) return null
        const cl = src.clone()
        cl.name = key
        cl.tracks = cl.tracks.filter((t) => !t.name.endsWith('.scale') && t.name !== 'Hips.position')
        return cl
      })
      .filter(Boolean) as THREE.AnimationClip[]
  }, [sources, clips])

  const fit = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animClips, fit)
  const current = useRef<string>('idle')
  const pageStart = useRef(0)
  const prevPage = useRef(-1)
  const prevActive = useRef(false)

  const active = useProgress((s) => s.mode === 'study' && s.activeNodeId === activeNode)
  const page = useProgress((s) => s.lessonPage)

  const forceClip =
    forceParam && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(forceParam)
      : null

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
    if (forceClip && actions[forceClip]) {
      want = forceClip
    } else if (!active) {
      want = 'idle'
    } else {
      const seq = pageGestures[page] ?? pageGestures[pageGestures.length - 1]
      const idx = Math.floor((t - pageStart.current) / cycleSec) % seq.length
      want = seq[idx]
    }

    if (want !== current.current && actions[want]) {
      actions[current.current]?.fadeOut(crossfade)
      const next = actions[want]
      if (next) {
        next.reset()
        next.timeScale = want === 'idle' ? 1 : gestureSpeed
        next.fadeIn(crossfade).play()
      }
      current.current = want
    }
  })

  return (
    <group ref={fit} scale={scale} position={[0, feetY, 0]}>
      <primitive object={cloned} />
    </group>
  )
}
