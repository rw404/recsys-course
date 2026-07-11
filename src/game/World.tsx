import { Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CloudCourseWorld } from './CloudCourseWorld'

const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')

export function World() {
  return (
    <Canvas
      orthographic
      shadows={!CAPTURE}
      dpr={CAPTURE ? 1 : [1, 1.7]}
      camera={{
        near: -120,
        far: 240,
        zoom: 20,
        position: [24, 27, 34],
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: CAPTURE,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      onPointerMissed={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
      }}
    >
      <fog attach="fog" args={['#dceef3', 60, 126]} />
      <Suspense fallback={null}>
        <CloudCourseWorld />
        <NoFrustumCull />
      </Suspense>
    </Canvas>
  )
}

function NoFrustumCull() {
  const scene = useThree((state) => state.scene)
  useFrame(() => {
    scene.traverse((object) => {
      object.frustumCulled = false
    })
  })
  return null
}
