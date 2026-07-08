import { Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { Environment } from './Environment'
import { RetrievalValley } from './RetrievalValley'
import { SequentialCity } from './SequentialCity'
import { PolicyTower } from './PolicyTower'
import { EcosystemGarden } from './EcosystemGarden'
import { Player } from './Player'
import { FollowCamera } from './Camera'
import { Stations, InteractionSystem } from './Stations'
import { LessonStage } from './LessonStage'
import { ValleyLessonStage } from './ValleyLessonStage'
import { CityLessonStage } from './CityLessonStage'
import { TowerLessonStage } from './TowerLessonStage'
import { GardenLessonStage } from './GardenLessonStage'
import { ClickGround } from './ClickGround'
import { PostFX } from './PostFX'
import { useProgress } from '../state/progress'

// ?capture=1 makes the WebGL backbuffer persist so headless screenshot tools
// reliably capture a painted frame (otherwise the cleared buffer reads as black).
const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')
// ?nofx=1 skips post-processing (used to isolate the software-renderer EffectComposer issue).
const NOFX =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nofx')

export function World() {
  return (
    <Canvas
      shadows={!CAPTURE}
      dpr={CAPTURE ? 1 : [1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 200, position: [-6, 9.5, 21] }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: CAPTURE,
        // ToneMapping effect owns the grade — disable renderer tone mapping to avoid double-apply
        toneMapping: THREE.NoToneMapping,
      }}
    >
      {/* dusk fog (background is set per-world by the active scene component) */}
      <fog attach="fog" args={['#231447', 34, 95]} />
      <Suspense fallback={null}>
        <Scene />
        <FollowCamera />
        <NoFrustumCull />
        {!NOFX && <PostFX />}
      </Suspense>
    </Canvas>
  )
}

/** The active region + the shared actors. Swaps the scene diorama when the player changes world. */
function Scene() {
  const world = useProgress((s) => s.currentWorld)
  return (
    <Physics gravity={[0, -18, 0]} timeStep="vary" paused={false}>
      {world === 'foundations-camp' ? (
        <Environment />
      ) : world === 'retrieval-valley' ? (
        <RetrievalValley />
      ) : world === 'sequential-city' ? (
        <SequentialCity />
      ) : world === 'policy-tower' ? (
        <PolicyTower />
      ) : (
        <EcosystemGarden />
      )}
      {/* RPG click-to-move catcher, sized to the current island's walkable disc */}
      <ClickGround center={world === 'foundations-camp' ? [3, -2] : [1, -2]} radius={world === 'foundations-camp' ? 24 : 22} />
      <Stations />
      <Player />
      {/* each region has its own rigged narrator two-shot (Astra in camp + city, Vector Smith in the
          valley). Their (large, skinned) GLBs load behind a nested Suspense so streaming a narrator
          in never blanks the whole scene — no black flash on first load or when crossing worlds. */}
      <Suspense fallback={null}>
        {world === 'foundations-camp' ? <LessonStage /> : world === 'retrieval-valley' ? <ValleyLessonStage /> : world === 'sequential-city' ? <CityLessonStage /> : world === 'policy-tower' ? <TowerLessonStage /> : <GardenLessonStage />}
      </Suspense>
      <InteractionSystem />
    </Physics>
  )
}

/**
 * Disable frustum culling scene-wide. The diorama is tiny, so the cost is negligible,
 * and it hardens against a follow-camera projection edge case where objects could be
 * culled for a frame. (Also makes headless captures render the full scene reliably.)
 */
function NoFrustumCull() {
  const scene = useThree((s) => s.scene)
  useFrame(() => {
    scene.traverse((o) => {
      o.frustumCulled = false
    })
  })
  return null
}
