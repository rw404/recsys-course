import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { useProgress } from '../state/progress'
import { runtime } from './shared'

const BASE_URL = '/models/explorer/character.glb'
const WALK_URL = '/models/explorer/walking.glb'
const RUN_URL = '/models/explorer/running.glb'
const IDLE_URL = '/models/explorer/idle.glb'
const WAVE_URL = '/models/explorer/wave.glb'
const CHAT_URL = '/models/explorer/chat.glb'

const WALK = 'Armature|walking_man|baselayer'
const RUN = 'Armature|running|baselayer'
const IDLE = 'Armature|Idle|baselayer'
const WAVE = 'Armature|Big_Wave_Hello|baselayer'
const CHAT = 'Armature|Stand_and_Chat|baselayer'

const FEET_LOCAL_Y = -0.6
const YAW_OFFSET = Math.PI
const RUN_THRESHOLD = 3.4

export function ExplorerGLB({ intro = true }: { intro?: boolean }) {
  const base = useGLTF(BASE_URL)
  const walkGltf = useGLTF(WALK_URL)
  const runGltf = useGLTF(RUN_URL)
  const idleGltf = useGLTF(IDLE_URL)
  const waveGltf = useGLTF(WAVE_URL)
  const chatGltf = useGLTF(CHAT_URL)
  const age = useRef(0)

  const cloned = useMemo(() => {
    const scene = SkeletonUtils.clone(base.scene)
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = false
      mesh.frustumCulled = false
      const material = mesh.material as THREE.MeshStandardMaterial
      if (material?.isMeshStandardMaterial) {
        const copy = material.clone()
        copy.color.multiplyScalar(1.12)
        copy.metalness = 0.02
        copy.roughness = 0.78
        copy.envMapIntensity = 0.35
        copy.emissive = new THREE.Color('#eef8ff')
        copy.emissiveMap = copy.map
        copy.emissiveIntensity = 0.16
        mesh.material = copy
      }
    })
    return scene
  }, [base.scene])

  const clips = useMemo(() => {
    const take = (source: { animations: THREE.AnimationClip[] }, name: string) => {
      const authored = source.animations.find((clip) => clip.name === name) ?? source.animations[0]
      if (!authored) return null
      const clip = authored.clone()
      clip.name = name
      clip.tracks = clip.tracks.filter((track) => (
        !track.name.endsWith('.scale')
        && track.name !== 'Hips.position'
      ))
      return clip
    }

    return [
      take(walkGltf, WALK),
      take(runGltf, RUN),
      take(idleGltf, IDLE),
      take(waveGltf, WAVE),
      take(chatGltf, CHAT),
    ].filter((clip): clip is THREE.AnimationClip => Boolean(clip))
  }, [chatGltf, idleGltf, runGltf, walkGltf, waveGltf])

  const fit = useRef<THREE.Group>(null)
  const { actions } = useAnimations(clips, fit)
  const current = useRef(intro ? WAVE : IDLE)
  const study = useProgress((state) => state.mode === 'study')

  useEffect(() => {
    age.current = 0
    const initial = actions[intro ? WAVE : IDLE]
    if (intro && initial) {
      initial.setLoop(THREE.LoopOnce, 1)
      initial.clampWhenFinished = true
    }
    initial?.reset().fadeIn(0.18).play()
    current.current = intro ? WAVE : IDLE
    return () => {
      Object.values(actions).forEach((action) => action?.stop())
    }
  }, [actions, intro])

  useFrame((_, dt) => {
    age.current += Math.min(dt, 0.1)
    const speed = runtime.playerSpeed
    const arriving = intro && age.current < 1.42 && speed < 0.35
    const wanted = arriving
      ? WAVE
      : speed > RUN_THRESHOLD
      ? RUN
      : speed >= 0.35
      ? WALK
      : study
      ? CHAT
      : IDLE

    if (wanted !== current.current && actions[wanted]) {
      actions[current.current]?.fadeOut(0.2)
      const next = actions[wanted]
      next?.reset().fadeIn(0.2)
      if (wanted === WAVE && next) {
        next.setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
      } else {
        next?.setLoop(THREE.LoopRepeat, Infinity)
      }
      next?.play()
      current.current = wanted
    }

    const walk = actions[WALK]
    if (walk) walk.timeScale = THREE.MathUtils.clamp(speed * 0.5, 0.55, 1.5)
    const run = actions[RUN]
    if (run) run.timeScale = THREE.MathUtils.clamp(speed * 0.28, 0.7, 1.4)
  })

  return (
    <group rotation={[0, YAW_OFFSET, 0]}>
      <group ref={fit} position={[0, FEET_LOCAL_Y, 0]}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

useGLTF.preload(BASE_URL)
useGLTF.preload(WALK_URL)
useGLTF.preload(RUN_URL)
useGLTF.preload(IDLE_URL)
useGLTF.preload(WAVE_URL)
useGLTF.preload(CHAT_URL)
