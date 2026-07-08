import { Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { VectorSmithGLB } from './VectorSmithGLB'

/**
 * Isolated inspector for Vector Smith (?view=vsmith[&vac=<clip>]). A light scene (no valley
 * geometry) so the software renderer paints reliably, used to vet the rig / skinning while a clip
 * plays. VectorSmithGLB reads `?vac=` to force a single clip; without it he idles.
 */
const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')
const TARGET: [number, number, number] = [0, 1.0, 0]

export function VSmithViewer() {
  return (
    <Canvas
      shadows
      dpr={CAPTURE ? 1 : [1, 1.75]}
      camera={{ fov: 34, near: 0.1, far: 100, position: [1.8, 1.4, 3.2] }}
      gl={{ antialias: true, preserveDrawingBuffer: CAPTURE, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#0b0e24']} />
      <ambientLight intensity={0.7} color="#aebcff" />
      <hemisphereLight args={['#dfe6ff', '#140a2a', 0.8]} />
      <directionalLight position={[4, 7, 4]} intensity={1.9} color="#ffffff" castShadow />
      <directionalLight position={[-4, 3, -3]} intensity={0.8} color="#7ad0ff" />
      <pointLight position={[0, 1.6, 3]} intensity={12} color="#9b6bff" distance={10} />

      <Suspense fallback={null}>
        {/* VectorSmithGLB plants feet via VALLEY_STAGE.smith.feetY (0.35) meant for the valley
            surface at y≈0.3; here the ground disc is at y=0, so drop it by that much to stand flat. */}
        <group position={[0, -0.35, 0]}>
          <VectorSmithGLB />
        </group>
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#1a1030" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.0, 1.12, 48]} />
        <meshBasicMaterial color="#7ad0ff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <gridHelper args={[6, 12, '#3a4b8b', '#1c2450']} />

      {CAPTURE ? <CamLook /> : <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.2} target={TARGET} minPolarAngle={0.5} maxPolarAngle={1.7} />}
    </Canvas>
  )
}

function CamLook() {
  const { camera } = useThree()
  useFrame(() => camera.lookAt(TARGET[0], TARGET[1], TARGET[2]))
  return null
}
