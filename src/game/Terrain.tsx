import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * A compact floating-island diorama base (instead of an infinite flat plane): a top play
 * surface, a tapered rocky body with cliff edges, rim rock outcrops, a raised back plateau,
 * and a water pool + waterfall. Turns the "flat map" into a layered diorama.
 */
export function Terrain() {
  return (
    <>
      <IslandBase />
      <RimRocks />
      <BackPlateau />
      <WaterPool position={[-13, 0.02, 10]} radius={4.2} />
      <Waterfall />
    </>
  )
}

const R = 27 // island radius

function IslandBase() {
  return (
    <group>
      {/* physics floor: a DEEP slab (top at y≈0, extends to y=-6) so a fast-falling body can't
          tunnel through a thin floor during a scene swap. */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, R]} position={[3, -3, -2]} />
      </RigidBody>

      {/* top play surface */}
      <mesh position={[3, 0, -2]} rotation={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, 0.6, 64]} />
        <meshStandardMaterial color="#241a46" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* rocky body tapering down into the fog */}
      <mesh position={[3, -3.4, -2]}>
        <cylinderGeometry args={[R - 0.5, R - 8, 6.4, 48]} />
        <meshStandardMaterial color="#1a1130" roughness={1} />
      </mesh>
      <mesh position={[3, -8.5, -2]}>
        <coneGeometry args={[R - 8, 8, 40]} />
        <meshStandardMaterial color="#120a24" roughness={1} />
      </mesh>

      {/* glowing plaza pool + ring on the surface */}
      <PlazaGlow position={[3, 0.32, -2]} radius={17} color="#6a3fd0" />
      <mesh position={[3, 0.33, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[15.4, 16, 64]} />
        <meshBasicMaterial color="#9b6bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Irregular rock outcrops around the island rim → cliff-edge silhouette. */
function RimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = R - 1.5 + ((i * 37) % 5) * 0.5
      const x = 3 + Math.cos(a) * rad
      const z = -2 + Math.sin(a) * rad
      const up = 0.6 + ((i * 53) % 7) * 0.28
      const w = 1.6 + ((i * 29) % 5) * 0.5
      out.push({ pos: [x, up * 0.5 - 0.3, z], s: [w, up, w * 0.8], rot: a })
    }
    return out
  }, [])
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={[0.15, r.rot, 0.1]} scale={r.s} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#2a2048' : '#201640'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** A raised plateau behind the camp (toward the bridge) with a ramp up — adds a level. */
function BackPlateau() {
  const h = 1.6
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* plateau top */}
      <CuboidCollider args={[7, h / 2, 5]} position={[16, h / 2, -13]} />
      <mesh position={[16, h / 2, -13]} castShadow receiveShadow>
        <boxGeometry args={[14, h, 10]} />
        <meshStandardMaterial color="#2a1f4c" roughness={0.9} />
      </mesh>
      {/* ramp up to it */}
      <group position={[9, 0, -11]} rotation={[0, Math.PI / 2, 0]}>
        <group position={[0, (5 / 2) * Math.sin(0.3), 0]} rotation={[-0.3, 0, 0]}>
          <CuboidCollider args={[2, 0.12, 2.6]} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4, 0.24, 5.2]} />
            <meshStandardMaterial color="#241a44" roughness={0.85} />
          </mesh>
        </group>
      </group>
      {/* edge lanterns hint (glow strips) */}
      <mesh position={[16, h + 0.02, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 0.3]} />
        <meshBasicMaterial color="#7ad0ff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </RigidBody>
  )
}

/** Animated water pool. */
function WaterPool({ position, radius }: { position: [number, number, number]; radius: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (mat.current) {
      const t = performance.now() * 0.001
      mat.current.emissiveIntensity = 0.25 + Math.sin(t * 1.5) * 0.08
    }
  })
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 48]} />
      <meshStandardMaterial
        ref={mat}
        color="#1b3a6b"
        emissive="#2f6ad0"
        emissiveIntensity={0.28}
        roughness={0.15}
        metalness={0.6}
        transparent
        opacity={0.86}
      />
    </mesh>
  )
}

/** A thin waterfall sheet spilling off the rim into the fog. */
function Waterfall() {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, 'rgba(150,200,255,0.7)')
    g.addColorStop(1, 'rgba(120,170,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 128)
    const t = new THREE.CanvasTexture(c)
    t.wrapT = THREE.RepeatWrapping
    return t
  }, [])
  useFrame(() => {
    tex.offset.y = (performance.now() * 0.0006) % 1
  })
  return (
    <mesh position={[-24, -4, 6]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[5, 9]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function PlazaGlow({ position, radius, color }: { position: [number, number, number]; radius: number; color: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.4, 'rgba(160,110,255,0.24)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={texture} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
