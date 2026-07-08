import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, BallCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * World-05 interactive DYNAMICS — the "move something" mechanic the garden is built around.
 *
 * Six glowing SEED ORBS are real dynamic rigid bodies: walk into them and they roll, bump and
 * scatter (rapier resolves the contact against the velocity-controlled player capsule). Herd them
 * into the DIVERSITY PLANTER and the ring lights up + blossoms grow in proportion to how many
 * different-coloured seeds you have gathered — a hands-on echo of the lesson: variety drives growth.
 * Purely client-side (reads the bodies' translations each frame); no progression gating, so it can
 * never wedge the course — it is a living toy in the scene.
 */

const PLANTER = new THREE.Vector3(2.4, 0, 3.4)
const PLANTER_R = 2.3

// six diverse seed colours, scattered along the path near the planter
const SEEDS: { pos: [number, number, number]; color: string }[] = [
  { pos: [-0.6, 0.5, 5.6], color: '#ff6bd0' },
  { pos: [0.8, 0.5, 6.2], color: '#6bd0ff' },
  { pos: [2.2, 0.5, 5.4], color: '#ffd36b' },
  { pos: [3.6, 0.5, 6.0], color: '#8affc9' },
  { pos: [1.4, 0.5, 4.6], color: '#c08bff' },
  { pos: [4.6, 0.5, 4.8], color: '#ff9b6b' },
]
const SEED_R = 0.42

export function GardenDynamics() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const spawns = useMemo(() => SEEDS.map((s) => new THREE.Vector3(...s.pos)), [])

  const planterMat = useRef<THREE.MeshStandardMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const blooms = useRef<THREE.Group>(null)
  const countRef = useRef<{ n: number; smooth: number }>({ n: 0, smooth: 0 })

  // pre-place the blossom ring around the planter (revealed as seeds gather)
  const bloomSpots = useMemo(() => {
    const out: { x: number; z: number; color: string; s: number }[] = []
    const palette = ['#ff6bd0', '#6bd0ff', '#ffd36b', '#8affc9', '#c08bff', '#ff9b6b']
    const n = 14
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = PLANTER_R - 0.35 + (i % 2) * 0.28
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, color: palette[i % palette.length], s: 0.7 + (i % 3) * 0.16 })
    }
    return out
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    let inside = 0
    for (let i = 0; i < bodies.current.length; i++) {
      const b = bodies.current[i]
      if (!b) continue
      const p = b.translation()
      // safety net: if a seed is knocked off the island (or tunnels), respawn it
      if (p.y < -3 || Math.hypot(p.x - 1, p.z + 2) > 30) {
        const s = spawns[i]
        b.setTranslation({ x: s.x, y: s.y, z: s.z }, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
        continue
      }
      const dx = p.x - PLANTER.x
      const dz = p.z - PLANTER.z
      if (Math.hypot(dx, dz) < PLANTER_R) inside++
    }

    const c = countRef.current
    c.n = inside
    c.smooth += (inside - c.smooth) * Math.min(1, dt * 4)

    if (planterMat.current) planterMat.current.emissiveIntensity = 0.4 + c.smooth * 0.85
    if (ringMat.current) ringMat.current.opacity = 0.28 + c.smooth * 0.1 + Math.sin(t * 2) * 0.06

    // reveal + gently pop the blossoms proportional to seeds gathered
    if (blooms.current) {
      const shown = (c.smooth / SEEDS.length) * bloomSpots.length
      blooms.current.children.forEach((ch, i) => {
        const target = i < shown ? bloomSpots[i].s : 0.0001
        const cur = ch.scale.x
        const next = cur + (target - cur) * Math.min(1, dt * 6)
        ch.scale.setScalar(next)
        ch.visible = next > 0.02
      })
    }
  })

  return (
    <group>
      {/* ---- the planter: a low glowing bowl the seeds are herded into ---- */}
      <group position={[PLANTER.x, 0, PLANTER.z]}>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[PLANTER_R, PLANTER_R + 0.25, 0.28, 40]} />
          <meshStandardMaterial
            ref={planterMat}
            color="#3a2a5e"
            emissive="#a86bff"
            emissiveIntensity={0.4}
            roughness={0.7}
            metalness={0.2}
            toneMapped={false}
          />
        </mesh>
        {/* soil disc */}
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[PLANTER_R - 0.05, 40]} />
          <meshStandardMaterial color="#241a3e" roughness={1} />
        </mesh>
        {/* pulsing rim ring */}
        <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PLANTER_R - 0.1, PLANTER_R + 0.05, 48]} />
          <meshBasicMaterial ref={ringMat} color="#c9a6ff" transparent opacity={0.3} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        {/* blossoms that grow as diversity gathers (hidden at scale ~0 until revealed) */}
        <group ref={blooms}>
          {bloomSpots.map((b, i) => (
            <group key={i} position={[b.x, 0.28, b.z]} scale={0.0001}>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.56, 5]} />
                <meshStandardMaterial color="#3f7a4a" emissive="#2f5a3a" emissiveIntensity={0.4} />
              </mesh>
              <mesh position={[0, 0.6, 0]}>
                <icosahedronGeometry args={[0.16, 0]} />
                <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={1.2} toneMapped={false} flatShading />
              </mesh>
            </group>
          ))}
        </group>
        <pointLight position={[0, 1.4, 0]} intensity={6} color="#c58bff" distance={6} />
        <Billboard position={[0, 2.4, 0]}>
          <Text fontSize={0.26} color="#f2e6ff" anchorX="center" outlineWidth={0.012} outlineColor="#140b26">
            Diversity Planter
          </Text>
          <Text position={[0, -0.3, 0]} fontSize={0.15} color="#b79bff" anchorX="center">
            roll the seeds in ↑
          </Text>
        </Billboard>
      </group>

      {/* ---- the six pushable seed orbs (real dynamic bodies) ---- */}
      {SEEDS.map((s, i) => (
        <RigidBody
          key={i}
          ref={(b) => { bodies.current[i] = b }}
          colliders={false}
          position={s.pos}
          restitution={0.35}
          friction={0.6}
          linearDamping={0.5}
          angularDamping={0.6}
          ccd
        >
          <BallCollider args={[SEED_R]} density={1.4} />
          <mesh castShadow>
            <icosahedronGeometry args={[SEED_R, 1]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.9} roughness={0.35} metalness={0.1} toneMapped={false} />
          </mesh>
          {/* inner core glow */}
          <mesh>
            <sphereGeometry args={[SEED_R * 0.55, 12, 12]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35} toneMapped={false} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
