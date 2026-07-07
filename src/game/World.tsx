import { Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { Environment } from './Environment'
import { Player } from './Player'
import { FollowCamera } from './Camera'
import { Stations, InteractionSystem } from './Stations'
import { LessonStage } from './LessonStage'
import { PostFX } from './PostFX'

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
      {/* dusk fog (background is set by <TwilightBackground/> inside Environment) */}
      <fog attach="fog" args={['#231447', 34, 95]} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -18, 0]} timeStep="vary" paused={false}>
          <Environment />
          <Stations />
          <Player />
          <LessonStage />
          <InteractionSystem />
        </Physics>
        <FollowCamera />
        <NoFrustumCull />
        {!NOFX && <PostFX />}
      </Suspense>
    </Canvas>
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
