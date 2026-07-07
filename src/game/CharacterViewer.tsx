import { Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PorterGLB } from './PorterGLB'
import { PostFX } from './PostFX'
import { runtime } from './shared'

const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')

// PorterGLB plants feet at y=-0.86 in its own space; lift it so feet sit on the ground disc.
const LIFT = 0.86
const TARGET: [number, number, number] = [0, 0.8, 0] // character mid-body

/**
 * Standalone character showcase (?view=character). Fixed, hand-framed camera — avoids
 * bounding-box framing, which is unreliable for this skinned mesh's odd export transform.
 */
export function CharacterViewer() {
  useEffect(() => {
    // ?anim=idle shows the idle loop; default drives the walk cycle
    const anim = new URLSearchParams(window.location.search).get('anim')
    runtime.playerSpeed = anim === 'idle' ? 0 : 5
    return () => { runtime.playerSpeed = 0 }
  }, [])

  return (
    <Canvas
      shadows
      dpr={CAPTURE ? 1 : [1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 100, position: [2.3, 1.5, 3.0] }}
      gl={{ antialias: true, preserveDrawingBuffer: CAPTURE, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#0b0618']} />
      <fog attach="fog" args={['#0b0618', 8, 20]} />
      <ambientLight intensity={0.55} color="#8b6bff" />
      <hemisphereLight args={['#c9b6ff', '#140a2a', 0.7]} />
      <directionalLight position={[4, 7, 4]} intensity={1.7} color="#ffffff" castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#ff5aa8" />
      <pointLight position={[0, 1.4, 2.5]} intensity={10} color="#7b3ff7" distance={9} />

      <Suspense fallback={null}>
        {/* PorterGLB carries a PI yaw offset (faces away in-world); cancel it to face the camera */}
        <group position={[0, LIFT, 0]} rotation={[0, Math.PI, 0]}>
          <PorterGLB />
        </group>
      </Suspense>

      {/* ground disc + glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#1a1030" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.0, 1.12, 48]} />
        <meshBasicMaterial color="#9b6bff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {CAPTURE ? <CamLook /> : <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.4} target={TARGET} minPolarAngle={0.6} maxPolarAngle={1.7} />}
      <PostFX bloom={0.7} />
    </Canvas>
  )
}

function CamLook() {
  const { camera } = useThree()
  useFrame(() => camera.lookAt(TARGET[0], TARGET[1], TARGET[2]))
  return null
}
