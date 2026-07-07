import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * Loads a (static, non-skinned) Meshy GLB, auto-fits it to a target height and plants it
 * on the ground. For plain meshes Box3.setFromObject reports the true size, so auto-fit is safe.
 * `solid` adds a footprint collider so the player can't walk through the structure.
 */
export function MeshyProp({
  url,
  position,
  targetHeight = 2.5,
  rotationY = 0,
  emissiveBoost = 0,
  solid = false,
  colliderScale = 0.8,
  idleMotion = false,
  tint,
  tintAmount = 0.5,
}: {
  url: string
  position: [number, number, number]
  targetHeight?: number
  rotationY?: number
  emissiveBoost?: number
  solid?: boolean
  colliderScale?: number
  idleMotion?: boolean
  tint?: string
  tintAmount?: number
}) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const [fit, setFit] = useState({ scale: 1, y: 0, hx: 0, hy: 0, hz: 0, cy: 0 })
  const done = useRef(false)
  const animRef = useRef<THREE.Group>(null)

  // Living-narrator motion: a soft breathing bob plus a slow presenting sway. Purely visual —
  // the collider (when solid) stays put. Used only for characters like Guide Astra.
  useFrame((state) => {
    if (!idleMotion || !animRef.current) return
    const t = state.clock.elapsedTime
    animRef.current.position.y = fit.y + Math.sin(t * 1.5) * 0.02
    animRef.current.rotation.y = Math.sin(t * 0.5) * 0.11
    animRef.current.rotation.z = Math.sin(t * 0.9) * 0.02
  })

  useEffect(() => {
    if (done.current) return
    done.current = true
    cloned.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          if (emissiveBoost > 0) {
            mat.emissive = new THREE.Color('#7b3ff7')
            mat.emissiveIntensity = emissiveBoost
          }
          // blend the baked base colour toward `tint` (e.g. push a frosty conifer to dark green)
          if (tint) {
            mat.color = mat.color.clone().lerp(new THREE.Color(tint), tintAmount)
          }
        }
      }
    })
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const s = size.y > 0 ? targetHeight / size.y : 1
    const y = -box.min.y * s
    setFit({
      scale: s,
      y,
      hx: (size.x * s * colliderScale) / 2,
      hy: (size.y * s) / 2,
      hz: (size.z * s * colliderScale) / 2,
      cy: (size.y * s) / 2, // collider center (feet at 0)
    })
  }, [cloned, targetHeight, emissiveBoost, colliderScale, tint, tintAmount])

  const visual = (
    <group ref={animRef} scale={fit.scale} position={[0, fit.y, 0]}>
      <primitive object={cloned} />
    </group>
  )

  if (solid && fit.hy > 0) {
    return (
      <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
        <CuboidCollider args={[fit.hx, fit.hy, fit.hz]} position={[0, fit.cy, 0]} />
        {visual}
      </RigidBody>
    )
  }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {visual}
    </group>
  )
}
