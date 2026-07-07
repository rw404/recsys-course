import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'

/**
 * CampFlora — dense natural ground dressing that makes the island lush and rewarding
 * to explore: glowing crystal clusters, deep-green bushes/ferns, glowing mushrooms,
 * and a few treasure chests near the course path.
 *
 * All layout is deterministic (hardcoded spot arrays + seeded local offsets — never
 * Math.random), avoids the central hub footprint (x 0..6, z -2..5) and the water pool
 * (~ -13,10), and scatters across the rest of the island (x -16..22, z -16..12).
 *
 * Purely decorative: no colliders. Crystals/bushes/mushrooms use drei <Instances> so
 * their many shards/blobs/caps share one draw call each. Emissive + toneMapped=false
 * materials let the PostFX bloom (threshold ~0.55) do the glowing.
 */
export function CampFlora() {
  return (
    <group>
      <CrystalClusters />
      <Bushes />
      <Mushrooms />
      <TreasureChests />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Tiny deterministic pseudo-random helper (hash of an integer index). *
 * Keeps layout stable across reloads without Math.random.             *
 * ------------------------------------------------------------------ */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s) // 0..1
}

/* ============================== CRYSTALS ============================== */

const CRYSTAL_SPOTS: [number, number, number][] = [
  [-10, 0, 8], [8, 0, 9], [14, 0, 4], [-14, 0, -2], [-6, 0, -8],
  [20, 0, -6], [4, 0, -12], [17, 0, -16], [-3, 0, 11], [11, 0, -3],
  [22, 0, -11], [-16, 0, 4], [9, 0, -15], [-9, 0, 3],
]

const CRYSTAL_COLORS = ['#b06bff', '#7ad0ff', '#ff6bd0'] as const

type Shard = {
  pos: [number, number, number]
  rot: [number, number, number]
  scale: number
  geo: number // 0 octa, 1 tetra, 2 icosa
}

/** ~14 spots × 3-5 angular shards each; three colour families, each one draw call. */
function CrystalClusters() {
  // Bucket shards by colour so each colour is a single instanced draw call.
  const buckets = useMemo(() => {
    const out: Shard[][] = [[], [], []]
    CRYSTAL_SPOTS.forEach((spot, si) => {
      const [sx, , sz] = spot
      const count = 3 + Math.floor(hash(si * 7.1) * 3) // 3..5
      for (let i = 0; i < count; i++) {
        const seed = si * 13.3 + i * 2.7
        const ang = hash(seed) * Math.PI * 2
        const rad = 0.15 + hash(seed + 1.1) * 0.5
        const scale = 0.2 + hash(seed + 2.2) * 0.6 // 0.2..0.8
        const tall = hash(seed + 3.3) > 0.55
        const y = (tall ? scale * 0.9 : scale * 0.45)
        const colIdx = (si + i) % 3
        out[colIdx].push({
          pos: [sx + Math.cos(ang) * rad, y, sz + Math.sin(ang) * rad],
          rot: [
            (hash(seed + 4.4) - 0.5) * 0.6,
            hash(seed + 5.5) * Math.PI,
            (hash(seed + 6.6) - 0.5) * 0.6,
          ],
          scale: tall ? scale : scale * 0.8,
          geo: Math.floor(hash(seed + 7.7) * 3),
        })
      }
    })
    return out
  }, [])

  return (
    <group>
      {buckets.map((shards, ci) => (
        <CrystalBucket key={ci} shards={shards} color={CRYSTAL_COLORS[ci]} seed={ci} />
      ))}
    </group>
  )
}

/**
 * One colour family of crystal shards. We render three <Instances> (one per geometry
 * type) but share the same material look. Cheap idle twinkle on the shared material.
 */
function CrystalBucket({ shards, color, seed }: { shards: Shard[]; color: string; seed: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (mat.current) {
      const t = performance.now() * 0.001 + seed * 1.7
      mat.current.emissiveIntensity = 1.1 + Math.sin(t * 1.6) * 0.35
    }
  })

  const octa = shards.filter((s) => s.geo === 0)
  const tetra = shards.filter((s) => s.geo === 1)
  const icosa = shards.filter((s) => s.geo === 2)

  // Shared material props (one <meshStandardMaterial> lives on the first Instances;
  // the others reuse an equivalent to keep the twinkle in sync visually).
  return (
    <group>
      <Instances limit={Math.max(1, octa.length)} range={octa.length}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.35}
          metalness={0.1}
          flatShading
          toneMapped={false}
        />
        {octa.map((s, i) => (
          <Instance key={i} position={s.pos} rotation={s.rot} scale={s.scale} />
        ))}
      </Instances>

      <Instances limit={Math.max(1, tetra.length)} range={tetra.length}>
        <tetrahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.35}
          metalness={0.1}
          flatShading
          toneMapped={false}
        />
        {tetra.map((s, i) => (
          <Instance key={i} position={s.pos} rotation={s.rot} scale={s.scale} />
        ))}
      </Instances>

      <Instances limit={Math.max(1, icosa.length)} range={icosa.length}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.35}
          metalness={0.1}
          flatShading
          toneMapped={false}
        />
        {icosa.map((s, i) => (
          <Instance key={i} position={s.pos} rotation={s.rot} scale={s.scale} />
        ))}
      </Instances>
    </group>
  )
}

/* =============================== BUSHES =============================== */

const BUSH_SPOTS: [number, number, number][] = [
  [-8, 0, 10], [6, 0, 11], [12, 0, 8], [16, 0, 1], [-12, 0, 2],
  [-15, 0, -5], [-4, 0, -9], [3, 0, -11], [10, 0, -13], [19, 0, -9],
  [21, 0, -3], [-2, 0, 8], [14, 0, -6], [-10, 0, -1], [7, 0, -6],
  [-16, 0, 7],
]

type Blob = { pos: [number, number, number]; scale: [number, number, number] }

/** ~16 clustered mounds of flattened blobs. Two instanced layers: dark body + glowing tips. */
function Bushes() {
  const { body, tips } = useMemo(() => {
    const body: Blob[] = []
    const tips: Blob[] = []
    BUSH_SPOTS.forEach((spot, si) => {
      const [sx, , sz] = spot
      const lobes = 3 + Math.floor(hash(si * 5.3) * 3) // 3..5 body blobs
      for (let i = 0; i < lobes; i++) {
        const seed = si * 9.7 + i * 3.1
        const ang = hash(seed) * Math.PI * 2
        const rad = hash(seed + 1.2) * 0.55
        const w = 0.35 + hash(seed + 2.3) * 0.4
        body.push({
          pos: [sx + Math.cos(ang) * rad, 0.16 + hash(seed + 3.1) * 0.1, sz + Math.sin(ang) * rad],
          scale: [w, w * 0.65, w], // flattened mound
        })
      }
      // a couple of glowing tips poking out of the top
      const tipCount = 2 + Math.floor(hash(si * 4.2) * 2)
      for (let i = 0; i < tipCount; i++) {
        const seed = si * 6.6 + i * 2.9 + 100
        const ang = hash(seed) * Math.PI * 2
        const rad = hash(seed + 1.4) * 0.4
        const w = 0.08 + hash(seed + 2.6) * 0.07
        tips.push({
          pos: [sx + Math.cos(ang) * rad, 0.3 + hash(seed + 3.5) * 0.15, sz + Math.sin(ang) * rad],
          scale: [w, w, w],
        })
      }
    })
    return { body, tips }
  }, [])

  const tipMat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (tipMat.current) {
      const t = performance.now() * 0.001
      tipMat.current.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.2
    }
  })

  return (
    <group>
      {/* deep-green leafy body */}
      <Instances limit={body.length} range={body.length}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#1f3a24" roughness={0.95} flatShading />
        {body.map((b, i) => (
          <Instance key={i} position={b.pos} scale={b.scale} />
        ))}
      </Instances>
      {/* faint emissive tips */}
      <Instances limit={tips.length} range={tips.length}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={tipMat}
          color="#4be3a0"
          emissive="#4be3a0"
          emissiveIntensity={0.5}
          roughness={0.7}
          flatShading
        />
        {tips.map((t, i) => (
          <Instance key={i} position={t.pos} scale={t.scale} />
        ))}
      </Instances>
    </group>
  )
}

/* ============================= MUSHROOMS ============================= */

const MUSHROOM_SPOTS: [number, number, number][] = [
  [-7, 0, 6], [9, 0, 7], [13, 0, -4], [-13, 0, 0], [-5, 0, -6],
  [18, 0, -13], [2, 0, 10], [-11, 0, 6], [15, 0, -10], [-1, 0, -8],
]

type Shroom = {
  pos: [number, number, number]
  h: number
  capR: number
  color: string
}

/** ~10 spots, a few little glowing mushrooms each. Stems + caps are two instanced layers. */
function Mushrooms() {
  const shrooms = useMemo(() => {
    const out: Shroom[] = []
    MUSHROOM_SPOTS.forEach((spot, si) => {
      const [sx, , sz] = spot
      const count = 2 + Math.floor(hash(si * 3.7) * 3) // 2..4
      for (let i = 0; i < count; i++) {
        const seed = si * 8.9 + i * 4.3
        const ang = hash(seed) * Math.PI * 2
        const rad = 0.1 + hash(seed + 1.1) * 0.45
        const h = 0.16 + hash(seed + 2.2) * 0.22
        const capR = 0.1 + hash(seed + 3.3) * 0.12
        out.push({
          pos: [sx + Math.cos(ang) * rad, 0, sz + Math.sin(ang) * rad],
          h,
          capR,
          color: hash(seed + 4.4) > 0.5 ? '#ff8ad0' : '#7ad0ff',
        })
      }
    })
    return out
  }, [])

  const pink = shrooms.filter((s) => s.color === '#ff8ad0')
  const cyan = shrooms.filter((s) => s.color === '#7ad0ff')

  const capMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (capMat.current) {
      const t = performance.now() * 0.001
      capMat.current.opacity = 0.9 + Math.sin(t * 2.1) * 0.1
    }
  })

  return (
    <group>
      {/* pale stems (shared) */}
      <Instances limit={Math.max(1, shrooms.length)} range={shrooms.length}>
        <cylinderGeometry args={[0.03, 0.045, 1, 6]} />
        <meshStandardMaterial color="#e7dcc4" roughness={0.9} />
        {shrooms.map((s, i) => (
          <Instance key={i} position={[s.pos[0], s.h / 2, s.pos[2]]} scale={[1, s.h, 1]} />
        ))}
      </Instances>

      {/* pink glowing domed caps */}
      <Instances limit={Math.max(1, pink.length)} range={pink.length}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial ref={capMat} color="#ff8ad0" transparent opacity={0.95} toneMapped={false} />
        {pink.map((s, i) => (
          <Instance key={i} position={[s.pos[0], s.h, s.pos[2]]} scale={[s.capR, s.capR * 0.8, s.capR]} />
        ))}
      </Instances>

      {/* cyan glowing domed caps */}
      <Instances limit={Math.max(1, cyan.length)} range={cyan.length}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#7ad0ff" transparent opacity={0.95} toneMapped={false} />
        {cyan.map((s, i) => (
          <Instance key={i} position={[s.pos[0], s.h, s.pos[2]]} scale={[s.capR, s.capR * 0.8, s.capR]} />
        ))}
      </Instances>
    </group>
  )
}

/* =========================== TREASURE CHESTS =========================== */

// [x, z, yaw, open?] — placed near the course path.
const CHEST_SPOTS: [number, number, number, boolean][] = [
  [6, 7, -0.4, false],
  [11, -6, 1.9, false],
  [-3, -5, 0.6, true], // open chest with floating gem
]

function TreasureChests() {
  return (
    <group>
      {CHEST_SPOTS.map(([x, z, yaw, open], i) => (
        <TreasureChest key={i} position={[x, 0, z]} yaw={yaw} open={open} seed={i} />
      ))}
    </group>
  )
}

function TreasureChest({
  position,
  yaw,
  open,
  seed,
}: {
  position: [number, number, number]
  yaw: number
  open: boolean
  seed: number
}) {
  const gem = useRef<THREE.Group>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const t = performance.now() * 0.001 + seed * 2.4
    // floating gem gently bobs + spins (open chest only)
    if (gem.current) {
      gem.current.position.y = 0.95 + Math.sin(t * 1.8) * 0.08
      gem.current.rotation.y = t * 0.8
    }
    // loot glow pulse
    if (glowMat.current) {
      glowMat.current.opacity = 0.6 + Math.sin(t * 2.2) * 0.25
    }
  })

  const bodyW = 0.7
  const bodyH = 0.42
  const bodyD = 0.5
  const lidTilt = open ? -1.15 : -0.12 // rotate lid up if open

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* wooden body */}
      <mesh position={[0, bodyH / 2, 0]} castShadow>
        <boxGeometry args={[bodyW, bodyH, bodyD]} />
        <meshStandardMaterial color="#4a2f1a" roughness={0.85} />
      </mesh>
      {/* dark metal bands on body */}
      {[-bodyW * 0.28, bodyW * 0.28].map((bx, i) => (
        <mesh key={i} position={[bx, bodyH / 2, 0]}>
          <boxGeometry args={[0.06, bodyH + 0.02, bodyD + 0.02]} />
          <meshStandardMaterial color="#1a1330" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* loot glow spilling from the top opening */}
      <mesh position={[0, bodyH + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bodyW * 0.8, bodyD * 0.8]} />
        <meshBasicMaterial ref={glowMat} color="#ffd36b" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* lid — hinged at the back edge, tilts open */}
      <group position={[0, bodyH, -bodyD / 2]} rotation={[lidTilt, 0, 0]}>
        <mesh position={[0, 0.11, bodyD / 2]} castShadow>
          <boxGeometry args={[bodyW, 0.22, bodyD]} />
          <meshStandardMaterial color="#3a2416" roughness={0.85} />
        </mesh>
        {/* lid metal bands */}
        {[-bodyW * 0.28, bodyW * 0.28].map((bx, i) => (
          <mesh key={i} position={[bx, 0.11, bodyD / 2]}>
            <boxGeometry args={[0.06, 0.24, bodyD + 0.02]} />
            <meshStandardMaterial color="#1a1330" roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* glowing keyhole on the front (closed chests read as lockable) */}
      {!open && (
        <mesh position={[0, bodyH * 0.55, bodyD / 2 + 0.01]}>
          <circleGeometry args={[0.05, 12]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      )}

      {/* floating glowing gem above the open chest */}
      {open && (
        <group ref={gem} position={[0, 0.95, 0]}>
          <mesh>
            <octahedronGeometry args={[0.12, 0]} />
            <meshBasicMaterial color="#66f0ff" toneMapped={false} />
          </mesh>
          {/* soft halo */}
          <mesh>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#7ad0ff" transparent opacity={0.25} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
