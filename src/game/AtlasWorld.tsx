import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { Ambiance } from './Ambiance'

/**
 * Course Atlas — the single combined overview scene. All six regions sit on ONE continuous
 * isometric island, laid out in an S from Foundations Camp to the Final Arena and joined by a
 * glowing walkway, so the whole course reads at a glance. Each zone shows its signature hero
 * structure, palette and label. Deliberately curated (one hero prop + light primitive decor per
 * zone) so it stays stylish without dragging in all six full scenes. Walkable in WASD (no jumps —
 * the surface is one flat island); rendered by World.tsx when `atlasOpen` is set.
 */

interface Zone {
  n: string
  name: string
  pos: [number, number] // x, z
  accent: string
  url: string
  h: number
  rotY: number
}

const ZONES: Zone[] = [
  { n: '01', name: 'Foundations Camp', pos: [-15, -7], accent: '#a86bff', url: '/models/props/crystal-shrine-textured.glb', h: 4.6, rotY: 0.3 },
  { n: '02', name: 'Retrieval Valley', pos: [-1, -7], accent: '#6bd0ff', url: '/models/props/two-tower-gate.glb', h: 5.4, rotY: 0.0 },
  { n: '03', name: 'Sequential City', pos: [13, -7], accent: '#b06bff', url: '/models/props/transformer-gate.glb', h: 5.4, rotY: -0.2 },
  { n: '04', name: 'Policy Tower', pos: [13, 7], accent: '#ffb04f', url: '/models/props/policy-tower.glb', h: 6.2, rotY: 0.2 },
  { n: '05', name: 'Ecosystem Garden', pos: [-1, 7], accent: '#8affc9', url: '/models/props/greenhouse.glb', h: 5.0, rotY: -0.4 },
  { n: '06', name: 'Final Arena', pos: [-15, 7], accent: '#e6b85a', url: '/models/props/final-arena.glb', h: 6.4, rotY: 0.35 },
]

export function AtlasScene() {
  return (
    <>
      <AtlasBackground />

      {/* soft, even lighting so every region reads */}
      <ambientLight intensity={0.66} color="#a99ce6" />
      <hemisphereLight args={['#c0a6ff', '#241a44', 1.0]} />
      <directionalLight
        position={[6, 26, 12]}
        intensity={1.35}
        color="#efe6ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-bias={-0.0004}
      />

      <AtlasGround />
      <AtlasBoundaries />

      {/* the glowing walkway threading the six zones in course order */}
      <AtlasWalkway />

      {/* per-zone primitive decor + label + accent light */}
      {ZONES.map((z) => (
        <AtlasZone key={z.n} zone={z} />
      ))}

      {/* signature hero structures behind their own Suspense (streamed, never blank the scene) */}
      <Suspense fallback={null}>
        {ZONES.map((z) => (
          <MeshyProp
            key={z.n}
            url={z.url}
            position={[z.pos[0], 0, z.pos[1] - 2.2]}
            targetHeight={z.h}
            rotationY={z.rotY}
            emissiveBoost={0.4}
            solid
            colliderScale={0.4}
          />
        ))}
      </Suspense>

      {/* sky title */}
      <Billboard position={[-1, 12.5, 0]}>
        <Text fontSize={1.4} color="#f2eaff" anchorX="center" outlineWidth={0.03} outlineColor="#140b26">
          Course Atlas
        </Text>
        <Text position={[0, -1.1, 0]} fontSize={0.5} color="#c9b8ff" anchorX="center">
          all six regions · one journey
        </Text>
      </Billboard>

      <Ambiance />
    </>
  )
}

/* ------------------------------------------------------------------ */

function AtlasBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#090720')
    g.addColorStop(0.5, '#161042')
    g.addColorStop(0.82, '#2a1d56')
    g.addColorStop(1, '#46306e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 8, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  useEffect(() => {
    const prev = scene.background
    scene.background = texture
    return () => {
      scene.background = prev
      texture.dispose()
    }
  }, [scene, texture])
  return null
}

const CENTER: [number, number] = [-1, 0]
const GR = 24

function AtlasGround() {
  return (
    <group>
      {/* one deep physics slab (top at y≈0) — the whole atlas is a single flat walkable island */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, GR]} position={[CENTER[0], -3, CENTER[1]]} />
      </RigidBody>

      <mesh position={[CENTER[0], 0, CENTER[1]]} receiveShadow>
        <cylinderGeometry args={[GR, GR, 0.6, 72]} />
        <meshStandardMaterial color="#241c4c" roughness={0.94} metalness={0.05} />
      </mesh>
      <mesh position={[CENTER[0], -3.4, CENTER[1]]}>
        <cylinderGeometry args={[GR - 0.5, GR - 9, 6.4, 52]} />
        <meshStandardMaterial color="#161238" roughness={1} />
      </mesh>
      <mesh position={[CENTER[0], -8.6, CENTER[1]]}>
        <coneGeometry args={[GR - 9, 8, 44]} />
        <meshStandardMaterial color="#0e0a26" roughness={1} />
      </mesh>

      <mesh position={[CENTER[0], 0.32, CENTER[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GR - 1.4, GR - 0.9, 72]} />
        <meshBasicMaterial color="#9d7bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <AtlasRimRocks />
    </group>
  )
}

function AtlasRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 26
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = GR - 1.2 + ((i * 37) % 5) * 0.5
      const x = CENTER[0] + Math.cos(a) * rad
      const z = CENTER[1] + Math.sin(a) * rad
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
          <meshStandardMaterial color={i % 3 === 0 ? '#282050' : '#1e1842'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function AtlasBoundaries() {
  // A ROUND fence that follows the circular island edge (a square wall would leave the four
  // diagonal arcs — exactly where the corner zones sit — unguarded, letting you walk off the rim).
  // A ring of overlapping tangent boxes at radius GR-0.6 stops the player on every bearing.
  const segs = useMemo(() => {
    const N = 28
    const R = GR - 0.6
    const half = (Math.PI * R) / N + 0.35 // half-length along the tangent, with overlap → no gaps
    return Array.from({ length: N }).map((_, i) => {
      const a = (i / N) * Math.PI * 2
      return {
        pos: [CENTER[0] + Math.cos(a) * R, 1.6, CENTER[1] + Math.sin(a) * R] as [number, number, number],
        yaw: -a, // local +x radial (thin), local +z tangent (length)
        half,
      }
    })
  }, [])
  return (
    <RigidBody type="fixed" colliders={false}>
      {segs.map((s, i) => (
        <CuboidCollider key={i} args={[0.4, 2.4, s.half]} position={s.pos} rotation={[0, s.yaw, 0]} />
      ))}
    </RigidBody>
  )
}

/* ------------------------------------------------------------------ */

function AtlasZone({ zone }: { zone: Zone }) {
  const [x, z] = zone.pos
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const crystals = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ring.current) ring.current.opacity = 0.35 + Math.sin(t * 1.6 + x) * 0.12
    crystals.current.forEach((m, i) => {
      if (m) m.rotation.y = t * 0.5 + i
    })
  })
  const crystalSpots = useMemo(
    () => [
      { dx: -3.2, dz: 1.6, s: 1.0 },
      { dx: 3.0, dz: 1.9, s: 0.8 },
      { dx: 0.2, dz: 3.2, s: 0.7 },
    ],
    []
  )
  return (
    <group position={[x, 0, z]}>
      {/* tinted zone glow disc */}
      <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 40]} />
        <meshBasicMaterial color={zone.accent} transparent opacity={0.12} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.9, 4.2, 44]} />
        <meshBasicMaterial ref={ring} color={zone.accent} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* a few glowing crystal accents (cheap primitives) */}
      {crystalSpots.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => { if (m) crystals.current[i] = m }}
          position={[c.dx, 0.4 + c.s * 0.4, c.dz]}
          scale={c.s}
        >
          <coneGeometry args={[0.22, 1.0, 5]} />
          <meshStandardMaterial color={zone.accent} emissive={zone.accent} emissiveIntensity={1.1} toneMapped={false} flatShading />
        </mesh>
      ))}

      <pointLight position={[0, 4.5, 0]} intensity={16} color={zone.accent} distance={13} />

      {/* label */}
      <Billboard position={[0, 5.9, 2.6]}>
        <Text fontSize={0.62} color={zone.accent} anchorX="center" outlineWidth={0.014} outlineColor="#0b0618">
          {zone.n}
        </Text>
        <Text position={[0, -0.62, 0]} fontSize={0.42} color="#f2eaff" anchorX="center" outlineWidth={0.014} outlineColor="#0b0618">
          {zone.name}
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */

function AtlasWalkway() {
  const segs = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; phase: number }[] = []
    for (let i = 0; i < ZONES.length - 1; i++) {
      const a = new THREE.Vector3(ZONES[i].pos[0], 0.36, ZONES[i].pos[1])
      const b = new THREE.Vector3(ZONES[i + 1].pos[0], 0.36, ZONES[i + 1].pos[1])
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      const yaw = Math.atan2(dir.x, dir.z)
      const count = Math.max(3, Math.floor(len / 1.5))
      const p = new THREE.Vector3()
      for (let c = 1; c < count; c++) {
        const tt = c / count
        p.copy(a).lerp(b, tt)
        out.push({ pos: [p.x, p.y, p.z], yaw, phase: c / count })
      }
    }
    return out
  }, [])
  const mats = useRef<THREE.MeshStandardMaterial[]>([])
  useFrame(() => {
    const time = performance.now() * 0.0016
    mats.current.forEach((m, i) => {
      if (!m) return
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 - segs[i].phase * Math.PI * 4)
      m.emissiveIntensity = 1.0 + pulse * 1.7
    })
  })
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.yaw, 0]}>
          <boxGeometry args={[1.5, 0.12, 0.3]} />
          <meshStandardMaterial
            ref={(m) => { if (m) mats.current[i] = m }}
            color="#7b3ff7"
            emissive="#b06bff"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
