import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Debug-only asset inspector (?view=glb&url=/models/_inspect.glb&rot=<deg>). Auto-fits an
 * arbitrary GLB to a unit height, plants it on a ground disc, and frames it front-on. Used to
 * vet freshly-generated Meshy meshes (proportions / pose) before spending credits on rig+anim.
 */
const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')
const Q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const URL_ = Q.get('url') || '/models/_inspect.glb'
const ROT = (Number(Q.get('rot') || 0) * Math.PI) / 180

export function GlbViewer() {
  return (
    <Canvas
      shadows
      dpr={CAPTURE ? 1 : [1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 100, position: [0, 1.1, 4.2] }}
      gl={{ antialias: true, preserveDrawingBuffer: CAPTURE }}
    >
      <color attach="background" args={['#0b0618']} />
      <ambientLight intensity={0.7} color="#b6c4ff" />
      <hemisphereLight args={['#dfe6ff', '#140a2a', 0.8]} />
      <directionalLight position={[4, 7, 4]} intensity={1.9} color="#ffffff" castShadow />
      <directionalLight position={[-4, 3, -3]} intensity={0.8} color="#7ad0ff" />
      <pointLight position={[0, 1.6, 3]} intensity={12} color="#9b6bff" distance={10} />
      <Suspense fallback={null}>
        <FittedModel />
      </Suspense>
      <gridHelper args={[6, 12, '#4a3b6b', '#241a44']} />
      {!CAPTURE && <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.6} target={[0, 0.9, 0]} />}
    </Canvas>
  )
}

function FittedModel() {
  const { scene } = useGLTF(URL_)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { camera } = useThree()
  const ref = useRef<THREE.Group>(null)
  const [fit, setFit] = useState({ s: 1, y: 0 })

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const s = size.y > 0 ? 1.7 / size.y : 1
    setFit({ s, y: -box.min.y * s })
    camera.lookAt(0, 0.9, 0)
  }, [cloned, camera])

  return (
    <group ref={ref} scale={fit.s} position={[0, fit.y, 0]} rotation={[0, ROT, 0]}>
      <primitive object={cloned} />
    </group>
  )
}
