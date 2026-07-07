import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
const CANVAS = '#5b4a86'
const CANVAS_LIGHT = '#6f5ca6'

export function AstraTent() {
  return (
    <group position={TENT_POS} rotation={[0, 0.5, 0]}>
      {/* canvas wall (octagonal bell tent) */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.15, 1.2, 8, 1, true]} />
        <meshStandardMaterial color={CANVAS} emissive="#2e1d55" emissiveIntensity={0.28} roughness={0.9} side={THREE.DoubleSide} flatShading />
      </mesh>
      {/* peaked canvas roof */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[2.5, 1.8, 8]} />
        <meshStandardMaterial color={CANVAS_LIGHT} emissive="#3a2568" emissiveIntensity={0.32} roughness={0.85} flatShading />
      </mesh>
      {/* roof seam ring (lighter band where wall meets roof) */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.02, 2.16, 8]} />
        <meshBasicMaterial color="#8a75c8" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* dark interior for entrance depth */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[1.55, 12, 10]} />
        <meshBasicMaterial color="#150a24" side={THREE.BackSide} />
      </mesh>

      {/* ENTRANCE facing +z: doorway posts + dark opening + warm interior glow + tied-back flaps */}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.85, 1.95]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.7, 6]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.8, 1.9]}>
        <planeGeometry args={[1.3, 1.6]} />
        <meshBasicMaterial color="#1a0f2c" />
      </mesh>
      <mesh position={[0, 0.8, 1.94]}>
        <planeGeometry args={[1.0, 1.3]} />
        <meshBasicMaterial color="#ffb15a" transparent opacity={0.28} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* tied-back canvas flaps on each side of the doorway */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.05, 0.85, 1.8]} rotation={[0, s * 0.5, 0]}>
          <planeGeometry args={[0.7, 1.6]} />
          <meshStandardMaterial color={CANVAS} emissive="#2e1d55" emissiveIntensity={0.2} roughness={0.9} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
      <pointLight position={[0, 1.0, 1.2]} intensity={6} color="#ffbf7a" distance={5} />

      {/* awning canopy over the entrance on two poles */}
      <mesh position={[0, 1.55, 3.0]} rotation={[-0.62, 0, 0]} castShadow>
        <planeGeometry args={[2.6, 1.5]} />
        <meshStandardMaterial color={CANVAS_LIGHT} emissive="#3a2568" emissiveIntensity={0.26} roughness={0.85} side={THREE.DoubleSide} flatShading />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.9, 3.55]} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 1.8, 6]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} />
        </mesh>
      ))}

      {/* apex finial + banner */}
      <mesh position={[0, 3.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
        <meshStandardMaterial color="#241832" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <octahedronGeometry args={[0.17]} />
        <meshBasicMaterial color="#c86bff" toneMapped={false} />
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
