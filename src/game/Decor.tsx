import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DecorScatter } from './DecorScatter'

/**
 * Lush, lantern-lit dressing to bring the diorama closer to the references:
 * scattered glowing lanterns, low-poly glowing trees, a big hanging-lantern tree,
 * and flower patches. Emissive-heavy so bloom makes it glow (no extra point lights).
 */
export function Decor() {
  return (
    <>
      <Lanterns />
      <Trees />
      <HangingTree position={[-13, 0, 4]} />
      <FlowerPatches />
      <RockClusters />
    </>
  )
}

/** A few detailed mossy rock-cluster GLBs for foreground/mid dressing (violet-tinted to the camp). */
function RockClusters() {
  const items = useMemo(
    () => ([
      { pos: [-9, 0, 3] as [number, number, number], h: 1.5, rot: 0.4, tint: '#2e2450' },
      { pos: [10, 0, 3] as [number, number, number], h: 1.8, rot: 2.1, tint: '#2e2450' },
      { pos: [-3, 0, -4] as [number, number, number], h: 1.3, rot: 1.2, tint: '#2e2450' },
      { pos: [15, 0, -6] as [number, number, number], h: 2.0, rot: 3.0, tint: '#2e2450' },
    ]),
    []
  )
  return <DecorScatter url="/models/props/rock-cluster.glb" items={items} emissiveBoost={0} />
}

const LANTERN_SPOTS: [number, number, number][] = [
  [-6, 0, 2], [1, 0, 6], [8, 0, 3], [12, 0, -2], [15, 0, -8], [18, 0, -12],
  [-9, 0, 5], [-3, 0, 12], [6, 0, 11], [11, 0, 8], [20, 0, -5], [-11, 0, -4],
  [2, 0, -8], [-1, 0, 0], [17, 0, -16], [22, 0, -10], [-14, 0, 6],
]

function Lanterns() {
  return (
    <group>
      {LANTERN_SPOTS.map((p, i) => (
        <Lantern key={i} position={p} color={i % 4 === 0 ? '#ffb15a' : i % 4 === 1 ? '#7ad0ff' : '#c86bff'} seed={i} />
      ))}
    </group>
  )
}

function Lantern({ position, color, seed }: { position: [number, number, number]; color: string; seed: number }) {
  const orb = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (orb.current) {
      const t = performance.now() * 0.001 + seed
      orb.current.opacity = 0.85 + Math.sin(t * 2.3) * 0.12
    }
  })
  return (
    <group position={position}>
      {/* post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.4, 6]} />
        <meshStandardMaterial color="#1a1330" roughness={0.9} />
      </mesh>
      {/* arm */}
      <mesh position={[0.12, 1.35, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color="#1a1330" />
      </mesh>
      {/* glowing orb */}
      <mesh position={[0.24, 1.2, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial ref={orb} color={color} transparent opacity={0.9} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Note: the trees formerly at (10,10) and (16,2) were removed — they occluded the new
// rope bridge on the camp's front-right. Framing greenery there is now the pine grove.
const TREE_SPOTS: [number, number, number, number][] = [
  [-8, 0, 8, 1], [-12, 0, -1, 0.9],
  [-4, 0, -6, 0.85], [21, 0, -14, 1], [6, 0, -12, 0.95],
]

/** Detailed canopy-tree GLBs (replaced the old icosahedron-blob canopies). */
function Trees() {
  const items = useMemo(
    () => TREE_SPOTS.map(([x, , z, s], i) => ({
      pos: [x, 0, z] as [number, number, number],
      h: 3.4 * s,
      rot: i * 1.7,
      tint: i % 2 === 0 ? undefined : '#ff6bd0',
    })),
    []
  )
  return <DecorScatter url="/models/props/canopy-tree.glb" items={items} emissiveBoost={0.22} />
}

/** Big tree with hanging lanterns — the signature reference look. */
function HangingTree({ position }: { position: [number, number, number] }) {
  const hangs = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2
        const r = 1.6 + (i % 3) * 0.5
        return { x: Math.cos(a) * r, y: 2.6 + (i % 4) * 0.4, z: Math.sin(a) * r, c: i % 2 ? '#ffb15a' : '#c86bff' }
      }),
    []
  )
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.55, 3.6, 7]} />
        <meshStandardMaterial color="#1e1428" roughness={1} />
      </mesh>
      {/* canopy */}
      {[
        [0, 4.2, 0, 2.4],
        [1.4, 3.8, 0.6, 1.5],
        [-1.3, 3.9, -0.5, 1.5],
        [0.3, 4.9, 0.2, 1.4],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color="#9d4bff" emissive="#7a2ffb" emissiveIntensity={0.5} roughness={0.6} flatShading />
        </mesh>
      ))}
      {/* hanging lanterns */}
      {hangs.map((h, i) => (
        <group key={i} position={[h.x, h.y, h.z]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.7, 4]} />
            <meshBasicMaterial color="#3a2b5c" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshBasicMaterial color={h.c} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const FLOWER_PATCHES: [number, number][] = [
  [-5, 6], [4, 9], [12, 6], [-10, 2], [8, -4], [19, -11], [0, 10],
]

/** Detailed flower-cluster GLBs at each patch (replaced the old sphere-flower blobs). */
function FlowerPatches() {
  const items = useMemo(
    () => FLOWER_PATCHES.map(([x, z], i) => ({ pos: [x, 0, z] as [number, number, number], h: 1.0 + (i % 3) * 0.25, rot: i * 1.3 })),
    []
  )
  return <DecorScatter url="/models/props/flower-cluster.glb" items={items} emissiveBoost={0.3} />
}
