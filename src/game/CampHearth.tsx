import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * The warm heart of Foundations Camp (reference photo 1): Guide Astra's canvas tent and a crackling
 * campfire in the clearing in front of her. Emissive fire + a flickering warm light give the plaza
 * its cosy amber glow against the cool night.
 *
 * Self-placed at absolute world coordinates — drop <CampHearth/> into the scene with no props.
 */
export function CampHearth() {
  return (
    <>
      <AstraTent />
      <Campfire />
    </>
  )
}

/* ------------------------------------------------------------------ Tent */

// Screen-left of the plaza (reference photo 1); the lit entrance is turned toward the campfire.
const TENT_POS: [number, number, number] = [-4.6, 0, 1.0]
// Warm canvas so the tent reads as SOLID fabric and stands apart from the violet night.
// The old #5b4a86 purple melted into the background, so the tent looked ghostly/"transparent";
// warm clay + a physical collider (below) make it feel like a real, cosy dwelling.
const CANVAS = '#b07d54' // walls — warm clay canvas
const CANVAS_LIGHT = '#caa06e' // roof — sun-warmed canvas
const CANVAS_SEAM = '#e6bd8d' // light seam where wall meets roof

export function AstraTent() {
  return (
    <group position={TENT_POS} rotation={[0, 0.5, 0]}>
      {/* SOLID collider — the player bumps the tent instead of walking through it (that
          walk-through ghosting is the main reason it read as "transparent"). Radius stops
          you at the canvas wall; the doorway stays approachable from the front. */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.85, 1.9]} position={[0, 0.85, 0]} />
      </RigidBody>

      {/* groundcloth plinth so the tent sits planted and reads solid at its base */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.16, 2.3, 0.18, 8]} />
        <meshStandardMaterial color="#5f4128" roughness={1} flatShading />
      </mesh>

      {/* canvas wall (octagonal bell tent) — taller & warm so it reads as solid fabric */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.98, 2.12, 1.5, 8, 1, true]} />
        <meshStandardMaterial color={CANVAS} emissive="#2a160a" emissiveIntensity={0.16} roughness={0.95} side={THREE.DoubleSide} flatShading />
      </mesh>
      {/* peaked canvas roof, seated on the wall top */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[2.45, 1.7, 8]} />
        <meshStandardMaterial color={CANVAS_LIGHT} emissive="#341c0d" emissiveIntensity={0.2} roughness={0.9} flatShading />
      </mesh>
      {/* solid light seam band where wall meets roof (was a see-through ring) */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[2.0, 2.14, 0.18, 8, 1, true]} />
        <meshStandardMaterial color={CANVAS_SEAM} emissive="#3a2210" emissiveIntensity={0.24} roughness={0.85} side={THREE.DoubleSide} flatShading />
      </mesh>

      {/* dark interior for entrance depth */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[1.6, 12, 10]} />
        <meshBasicMaterial color="#1a0f08" side={THREE.BackSide} />
      </mesh>

      {/* ENTRANCE facing +z: posts + dark opening + strong warm interior glow + tied-back flaps */}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.95, 1.92]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 1.9, 6]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 1.88]}>
        <planeGeometry args={[1.35, 1.8]} />
        <meshBasicMaterial color="#20120a" />
      </mesh>
      {/* warm interior glow — clearly a lived-in, cosy home, not an empty portal */}
      <mesh position={[0, 0.85, 1.9]}>
        <planeGeometry args={[1.05, 1.5]} />
        <meshBasicMaterial color="#ffb662" transparent opacity={0.5} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* tied-back canvas flaps framing the doorway */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.02, 0.95, 1.82]} rotation={[0, s * 0.55, 0]} castShadow>
          <planeGeometry args={[0.72, 1.75]} />
          <meshStandardMaterial color={CANVAS} emissive="#2a160a" emissiveIntensity={0.14} roughness={0.95} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
      <pointLight position={[0, 1.05, 1.25]} intensity={8} color="#ffbf7a" distance={5.5} />

      {/* pitched awning over the entrance — a THIN BOX (real thickness) so it reads as a
          solid shade, not the old flat see-through sheet */}
      <mesh position={[0, 1.62, 2.95]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.07, 1.5]} />
        <meshStandardMaterial color={CANVAS_LIGHT} emissive="#341c0d" emissiveIntensity={0.18} roughness={0.9} flatShading />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.95, 3.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.9, 6]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} />
        </mesh>
      ))}
      {/* warm hanging lantern under the awning — a clear cosy focal point at the door */}
      <group position={[0, 1.4, 2.35]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 4]} />
          <meshBasicMaterial color="#2a1d12" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial color="#ffbf7a" toneMapped={false} />
        </mesh>
        <pointLight intensity={3.5} color="#ffcf8a" distance={3.5} />
      </group>

      {/* apex finial + banner */}
      <mesh position={[0, 3.15, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
        <meshStandardMaterial color="#241832" />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <octahedronGeometry args={[0.17]} />
        <meshBasicMaterial color="#ffd07a" toneMapped={false} />
      </mesh>
      <Banner />

      {/* guy ropes + pegs for tent read */}
      {[0.9, 2.3, 3.9, 5.4].map((a, i) => {
        const x = Math.cos(a) * 2.9
        const z = Math.sin(a) * 2.9
        const ex = Math.cos(a) * 2.0
        const ez = Math.sin(a) * 2.0
        const mx = (x + ex) / 2
        const mz = (z + ez) / 2
        const len = Math.hypot(x - ex, z - ez, 1.4)
        return (
          <mesh key={i} position={[mx, 0.7, mz]} rotation={[0, -a, Math.atan2(Math.hypot(x - ex, z - ez), 1.4)]}>
            <cylinderGeometry args={[0.012, 0.012, len, 4]} />
            <meshStandardMaterial color="#2a1d12" />
          </mesh>
        )
      })}

      {/* a crate by the entrance */}
      <mesh position={[1.5, 0.28, 2.4]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color="#4a2f1a" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** A hanging banner with a glowing rune — Astra's guild mark. */
function Banner() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (mat.current) {
      const t = performance.now() * 0.001
      mat.current.emissiveIntensity = 0.5 + Math.sin(t * 1.4) * 0.15
    }
  })
  return (
    <group position={[-1.35, 1.9, 1.4]} rotation={[0, 0.4, 0.05]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 6]} />
        <meshStandardMaterial color="#3a2416" />
      </mesh>
      <mesh>
        <planeGeometry args={[0.72, 1.15]} />
        <meshStandardMaterial ref={mat} color="#5a2f8f" emissive="#7a2ffb" emissiveIntensity={0.55} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* rune */}
      <mesh position={[0, 0.08, 0.02]}>
        <ringGeometry args={[0.13, 0.17, 24]} />
        <meshBasicMaterial color="#e6c8ff" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.08, 0.02]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#e6c8ff" toneMapped={false} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- Campfire */

const FIRE_POS: [number, number, number] = [3.9, 0, 4.4]

export function Campfire() {
  const light = useRef<THREE.PointLight>(null)
  const flames = useRef<(THREE.Mesh | null)[]>([])

  const stones = useMemo(() => {
    const n = 9
    return Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2
      return { x: Math.cos(a) * 0.66, z: Math.sin(a) * 0.66, s: 0.17 + ((i * 37) % 5) * 0.03, rot: a + (i % 3) }
    })
  }, [])

  // Overlapping flame tongues (wide warm base -> bright yellow core) that flicker and sway.
  const flameLayers = useMemo(
    () => [
      { r: 0.58, h: 0.95, y: 0.5, c: '#ff4a12', o: 0.7, sp: 9, sway: 0.06 },
      { r: 0.44, h: 1.15, y: 0.62, c: '#ff7a1e', o: 0.8, sp: 12, sway: 0.09 },
      { r: 0.3, h: 0.85, y: 0.58, c: '#ffb038', o: 0.9, sp: 15, sway: 0.05 },
      { r: 0.17, h: 0.62, y: 0.5, c: '#ffe487', o: 1.0, sp: 19, sway: 0.04 },
    ],
    []
  )

  useFrame(() => {
    const t = performance.now() * 0.001
    for (let i = 0; i < flames.current.length; i++) {
      const m = flames.current[i]
      if (!m) continue
      const L = flameLayers[i]
      const f = 0.82 + Math.sin(t * L.sp + i) * 0.16 + Math.sin(t * (L.sp * 2.3) + i * 5) * 0.05
      m.scale.set(1 + Math.sin(t * 7 + i) * 0.07, f, 1 + Math.cos(t * 6 + i) * 0.07)
      m.position.x = Math.sin(t * (5 + i * 2)) * L.sway
      m.rotation.y = t * (0.6 + i * 0.2)
    }
    if (light.current) light.current.intensity = 22 + Math.sin(t * 11) * 4 + Math.sin(t * 19) * 2.5
  })

  return (
    <group position={FIRE_POS}>
      {/* stone ring */}
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.s * 0.5, s.z]} rotation={[0.2, s.rot, 0.15]} scale={[s.s, s.s * 0.8, s.s]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#3a3550' : '#2c2842'} roughness={1} flatShading />
        </mesh>
      ))}
      {/* charred logs */}
      {[0.5, -0.5, 1.55].map((rot, i) => (
        <mesh key={i} position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, rot]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.2, 6]} />
          <meshStandardMaterial color="#2a1a10" emissive="#ff5a1c" emissiveIntensity={0.4} roughness={1} />
        </mesh>
      ))}
      {/* glowing coal bed */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.4, 14, 8]} />
        <meshBasicMaterial color="#ff8a2c" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.24, 12, 8]} />
        <meshBasicMaterial color="#ffd07a" toneMapped={false} />
      </mesh>
      {/* flame tongues */}
      {flameLayers.map((f, i) => (
        <mesh key={i} ref={(el) => (flames.current[i] = el)} position={[0, f.y, 0]}>
          <coneGeometry args={[f.r, f.h, 9]} />
          <meshBasicMaterial color={f.c} transparent opacity={f.o} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {/* warm ground scorch glow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#ff8a3c" transparent opacity={0.16} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.1, 0]} intensity={22} color="#ff9a4c" distance={14} />
    </group>
  )
}
