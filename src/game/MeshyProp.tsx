import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { GroundAO } from './GroundAO'

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
  ao,
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
  /** lay a soft ground-AO decal to seat the prop on the floor (default on for grounded props) */
  ao?: boolean
}) {
  const showAO = ao ?? !idleMotion
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
        // `scene.clone(true)` clones the graph but SHARES materials with the cached GLTF, so
        // mutating emissive/tint here would bleed across every prop using the same model. Clone
        // the material(s) first so per-prop tint/emissive is isolated.
        if ((emissiveBoost > 0 || tint) && m.material) {
          const apply = (mat: THREE.MeshStandardMaterial) => {
            if (!('emissive' in mat)) return mat
            const c = mat.clone()
            if (emissiveBoost > 0) {
              c.emissive = new THREE.Color('#7b3ff7')
              c.emissiveIntensity = emissiveBoost
            }
            if (tint) c.color = c.color.clone().lerp(new THREE.Color(tint), tintAmount)
            return c
          }
          m.material = Array.isArray(m.material)
            ? m.material.map((mm) => apply(mm as THREE.MeshStandardMaterial))
            : apply(m.material as THREE.MeshStandardMaterial)
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

  const aoR = Math.max(fit.hx, fit.hz, targetHeight * 0.25) * 1.45
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
        {showAO && fit.hy > 0 && <GroundAO radius={aoR} />}
      </RigidBody>
    )
  }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {visual}
      {showAO && fit.hy > 0 && <GroundAO radius={aoR} />}
    </group>
  )
}
