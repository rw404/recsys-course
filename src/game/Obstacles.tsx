import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * Physical, dynamic world dressing: crystals you bump into, climbable stairs/ramps/platforms,
 * stepping stones to jump across, and floating rotating shapes. All the solid ones carry
 * fixed colliders so the player can collide with and climb on them.
 */
export function Obstacles() {
  return (
    <>
      <PhysicalCrystals />
      <ClimbStairs position={[14, 0, 5]} />
      <RampPlatform position={[-3, 0, 13]} rotationY={-0.4} />
      <SteppingStones />
      <FloatingShapes />
    </>
  )
}

const CRYSTAL_SPOTS: [number, number, number, number][] = [
  [-9, 0, 9, 0.6],
  [4, 0, 8, 0.5],
  [16, 0, -3, 0.5],
  [-8, 0, -6, 0.6],
  [2, 0, -10, 0.5],
  [7, 0, -13, 0.45],
  [-12, 0, 2, 0.55],
  [20, 0, -12, 0.6],
  [-2, 0, -4, 0.45],
  [-14, 0, -3, 0.55],
]

/** Emissive crystals with real colliders (bump into them). */
function PhysicalCrystals() {
  return (
    <group>
      {CRYSTAL_SPOTS.map(([x, , z, s], i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[x, s * 1.05, z]} rotation={[0, i, 0]}>
          <CuboidCollider args={[s * 0.7, s * 1.05, s * 0.7]} />
          <mesh castShadow>
            <octahedronGeometry args={[s]} />
            <meshStandardMaterial color="#b06bff" emissive="#8a3ffb" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

/** A short staircase up to a platform — climbable with steps + a jump. */
function ClimbStairs({ position }: { position: [number, number, number] }) {
  const steps = 5
  const stepH = 0.34
  const stepD = 0.9
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {Array.from({ length: steps }).map((_, i) => {
        const h = (i + 1) * stepH
        const z = -i * stepD
        return (
          <group key={i}>
            <CuboidCollider args={[1.4, h / 2, stepD / 2]} position={[0, h / 2, z]} />
            <mesh position={[0, h / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[2.8, h, stepD]} />
              <meshStandardMaterial color="#2a1d4a" roughness={0.8} />
            </mesh>
          </group>
        )
      })}
      {/* top platform */}
      <CuboidCollider args={[1.6, 0.15, 1.6]} position={[0, steps * stepH + 0.15, -steps * stepD - 1.3]} />
      <mesh position={[0, steps * stepH + 0.15, -steps * stepD - 1.3]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#32215a" roughness={0.75} />
      </mesh>
      {/* glowing beacon on the platform */}
      <mesh position={[0, steps * stepH + 1.1, -steps * stepD - 1.3]}>
        <icosahedronGeometry args={[0.35]} />
        <meshStandardMaterial color="#66f0ff" emissive="#66f0ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </RigidBody>
  )
}

/** A ramp you can walk up onto a raised platform. */
function RampPlatform({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const rampAngle = 0.32 // ~18°
  const rampLen = 4.2
  const platH = rampLen * Math.sin(rampAngle)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      {/* ramp */}
      <group position={[0, (rampLen / 2) * Math.sin(rampAngle), 0]} rotation={[-rampAngle, 0, 0]}>
        <CuboidCollider args={[1.5, 0.12, rampLen / 2]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.24, rampLen]} />
          <meshStandardMaterial color="#2a1d4a" roughness={0.8} />
        </mesh>
      </group>
      {/* platform at the top */}
      <CuboidCollider args={[1.6, 0.15, 1.6]} position={[0, platH, -rampLen * Math.cos(rampAngle) - 1.4]} />
      <mesh position={[0, platH, -rampLen * Math.cos(rampAngle) - 1.4]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#32215a" roughness={0.75} />
      </mesh>
    </RigidBody>
  )
}

/** Low platforms to jump across. */
function SteppingStones() {
  const stones: [number, number, number][] = [
    [-6, 0.3, 16],
    [-3.5, 0.6, 18],
    [-1, 0.9, 19.5],
    [2, 0.6, 18.5],
  ]
  return (
    <group>
      {stones.map(([x, h, z], i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[x, h / 2, z]}>
          <CuboidCollider args={[0.9, h / 2, 0.9]} />
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1, 1.1, h, 6]} />
            <meshStandardMaterial color="#2c1e50" roughness={0.8} emissive="#5a2f8f" emissiveIntensity={0.2} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

/** Slowly rotating / bobbing decorative shapes — some solid, for a livelier world. */
function FloatingShapes() {
  const shapes = useMemo(
    () =>
      [
        { pos: [10, 2.2, -2], kind: 'octa', s: 0.7, color: '#ff7ad9', solid: false },
        { pos: [-10, 2.6, -8], kind: 'torus', s: 0.8, color: '#7ad0ff', solid: false },
        { pos: [17, 1.4, 3], kind: 'dodeca', s: 0.9, color: '#b48bff', solid: true },
        { pos: [-6, 3.0, -2], kind: 'tetra', s: 0.7, color: '#ffd36b', solid: false },
        { pos: [6, 2.0, 14], kind: 'octa', s: 0.6, color: '#8affc9', solid: false },
        { pos: [22, 2.4, -6], kind: 'icosa', s: 0.8, color: '#ff9ec4', solid: false },
        { pos: [-15, 1.6, 6], kind: 'box', s: 0.8, color: '#9b6bff', solid: true },
      ] as const,
    []
  )
  return (
    <group>
      {shapes.map((sh, i) => (
        <FloatingShape key={i} {...sh} seed={i} />
      ))}
    </group>
  )
}

function FloatingShape({
  pos,
  kind,
  s,
  color,
  solid,
  seed,
}: {
  pos: readonly [number, number, number]
  kind: string
  s: number
  color: string
  solid: boolean
  seed: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current || solid) return
    const t = performance.now() * 0.001 + seed
    ref.current.position.y = pos[1] + Math.sin(t * 0.9) * 0.25
    ref.current.rotation.y = t * 0.4
    ref.current.rotation.x = Math.sin(t * 0.5) * 0.3
  })
  const geom =
    kind === 'torus' ? (
      <torusGeometry args={[s, s * 0.32, 12, 28]} />
    ) : kind === 'dodeca' ? (
      <dodecahedronGeometry args={[s]} />
    ) : kind === 'tetra' ? (
      <tetrahedronGeometry args={[s]} />
    ) : kind === 'icosa' ? (
      <icosahedronGeometry args={[s]} />
    ) : kind === 'box' ? (
      <boxGeometry args={[s * 1.4, s * 1.4, s * 1.4]} />
    ) : (
      <octahedronGeometry args={[s]} />
    )
  const material = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.8}
      roughness={0.4}
      metalness={0.2}
      toneMapped={false}
    />
  )
  // Solid ones sit on the ground with a collider (bump into them); floaty ones are decorative.
  if (solid) {
    return (
      <RigidBody type="fixed" colliders={false} position={[pos[0], s, pos[2]]}>
        <CuboidCollider args={[s, s, s]} />
        <mesh castShadow rotation={[0.3, seed, 0]}>
          {geom}
          {material}
        </mesh>
      </RigidBody>
    )
  }
  return (
    <group ref={ref} position={[pos[0], pos[1], pos[2]]}>
      <mesh castShadow>
        {geom}
        {material}
      </mesh>
    </group>
  )
}
