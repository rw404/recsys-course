import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Dev-only sprite rig (?view=isoprop&glb=/models/foundry/<type>.glb&rot=<deg>).
 * ("glb", not "url" — vite dev rejects requests whose query contains url=.)
 * Frames a GLB with a true isometric orthographic camera on a transparent
 * background and exposes window.__isoCapture(frames) which renders a gentle
 * yaw-sway loop into a horizontal sprite sheet and returns it as a PNG dataURL.
 * All camera work happens inside the capture call so R3F's own camera
 * management can't fight it (frameloop is "never" — we render manually).
 */
const Q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const URL_ = Q.get('glb') || '/models/foundry/ratingsSource.glb'
const ROT = (Number(Q.get('rot') || 0) * Math.PI) / 180
const FRAME_W = 328
const FRAME_H = 300

declare global {
  interface Window {
    __isoReady?: boolean
    __isoCapture?: (frames: number) => string
  }
}

export function IsoPropViewer() {
  return (
    <div style={{ width: FRAME_W, height: FRAME_H }}>
      <Canvas
        dpr={1}
        frameloop="never"
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        orthographic
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.15} color="#ffffff" />
        <hemisphereLight args={['#ffffff', '#cfe3e0', 0.9]} />
        <directionalLight position={[6, 9, 4]} intensity={1.7} color="#fff8ec" />
        <directionalLight position={[-5, 4, -4]} intensity={0.55} color="#bfe9ff" />
        <Suspense fallback={null}>
          <IsoRig />
        </Suspense>
      </Canvas>
    </div>
  )
}

function IsoRig() {
  const { scene } = useGLTF(URL_)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { camera, gl, scene: root } = useThree()
  const group = useRef<THREE.Group>(null)
  const [fit, setFit] = useState({ s: 1, y: 0, cx: 0, cz: 0 })

  useLayoutEffect(() => {
    // Normalize: plant the model on the ground plane centered at the origin.
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const horizontal = Math.max(size.x, size.z) || 1
    const s = 5.4 / horizontal
    setFit({ s, y: -box.min.y * s, cx: -center.x * s, cz: -center.z * s })

    window.__isoCapture = (frames: number) => {
      const cam = camera as THREE.OrthographicCamera

      // True isometric camera (yaw 45deg, dimetric pitch) at zoom 1 first.
      const d = 40
      cam.position.set(d, d * 0.8165, d)
      cam.lookAt(0, 0, 0)
      cam.zoom = 1
      cam.updateProjectionMatrix()
      cam.updateMatrixWorld()

      // Project normalized bbox corners, solve zoom + camera shift so the
      // figure fills ~82% of the width and its base sits ~70% down the frame.
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const fx of [0, 1]) for (const fy of [0, 1]) for (const fz of [0, 1]) {
        const corner = new THREE.Vector3(
          (box.min.x + fx * size.x - center.x) * s,
          fy * size.y * s,
          (box.min.z + fz * size.z - center.z) * s,
        ).project(cam)
        const px = corner.x * (FRAME_W / 2)
        const py = corner.y * (FRAME_H / 2)
        minX = Math.min(minX, px); maxX = Math.max(maxX, px)
        minY = Math.min(minY, py); maxY = Math.max(maxY, py)
      }
      const zoom = Math.min((FRAME_W * 0.82) / (maxX - minX), (FRAME_H * 0.86) / (maxY - minY))
      const baseTargetY = FRAME_H * 0.30 - FRAME_H / 2 // negative: below frame center
      const dxPx = ((minX + maxX) / 2) * zoom
      const dyPx = minY * zoom - baseTargetY
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion)
      cam.position.add(right.multiplyScalar(dxPx / zoom)).add(up.multiplyScalar(dyPx / zoom))
      cam.zoom = zoom
      cam.updateProjectionMatrix()
      cam.updateMatrixWorld()
      ;(window as unknown as { __isoDebug?: object }).__isoDebug = {
        zoom, minX, maxX, minY, maxY, s,
        left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom,
      }

      const sheet = document.createElement('canvas')
      sheet.width = FRAME_W * frames
      sheet.height = FRAME_H
      const ctx2d = sheet.getContext('2d')!
      for (let i = 0; i < frames; i += 1) {
        const t = i / frames
        if (group.current) {
          // Gentle living sway: yaw wiggle plus a breath-like squash.
          group.current.rotation.y = ROT + Math.sin(t * Math.PI * 2) * 0.16
          const breathe = 1 + Math.sin(t * Math.PI * 2) * 0.012
          group.current.scale.set(s, s * breathe, s)
        }
        gl.render(root, camera)
        ctx2d.drawImage(gl.domElement, i * FRAME_W, 0, FRAME_W, FRAME_H)
      }
      return sheet.toDataURL('image/png')
    }
    window.__isoReady = true
  }, [cloned, camera, gl, root])

  return (
    <group ref={group} scale={fit.s} position={[fit.cx, fit.y, fit.cz]} rotation={[0, ROT, 0]}>
      <primitive object={cloned} />
    </group>
  )
}
