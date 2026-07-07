import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * ValleyDecor — procedural set-dressing that fills Retrieval Valley toward the reference diorama:
 * scattered glowing crystal clusters, rim waterfalls spilling into the fog, lantern posts along
 * the paths, banners on the Two-Tower Gate, low glowing flora, and distant floating islands for
 * background depth. All primitive + emissive (bloom-friendly), deterministic seeded layout, no
 * colliders except the crystal clusters (so the plaza still reads as walkable).
 */
export function ValleyDecor() {
  return (
    <>
      <CrystalClusters />
      <LanternPosts />
      <GroundFlora />
      <RimWaterfalls />
      <BackgroundIslands />
      <GateBanners />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Glowing crystal clusters                                            */
/* ------------------------------------------------------------------ */

// hand-placed cluster anchors in empty areas (avoiding the walkway, stations and clouds)
const CRYSTAL_SPOTS: { p: [number, number, number]; c: string; s: number }[] = [
  { p: [-13, 0, 4], c: '#7a5bff', s: 1.3 },
  { p: [-12, 0, -6], c: '#5b93ff', s: 1.1 },
  { p: [-4, 0, -9], c: '#b06bff', s: 1.0 },
  { p: [11.5, 0, 4.5], c: '#a86bff', s: 1.2 },
  { p: [13, 0, 1], c: '#6a7bff', s: 0.9 },
  { p: [6, 0, -12], c: '#8a6bff', s: 1.15 },
  { p: [-9, 0, -10], c: '#5b93ff', s: 0.85 },
  { p: [17, 0, -2], c: '#9b6bff', s: 1.0 },
  { p: [-15, 0, 0], c: '#6f8bff', s: 1.0 },
  { p: [10, 0, 8], c: '#b06bff', s: 0.8 },
]

function CrystalClusters() {
  return (
    <group>
      {CRYSTAL_SPOTS.map((spot, i) => (
        <CrystalCluster key={i} anchor={spot.p} color={spot.c} scale={spot.s} seed={i * 7 + 3} />
      ))}
    </group>
  )
}

function CrystalCluster({
  anchor,
  color,
  scale,
  seed,
}: {
  anchor: [number, number, number]
  color: string
  scale: number
  seed: number
}) {
  const shards = useMemo(() => {
    let s = seed
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const n = 3 + Math.floor(rnd() * 3)
    return Array.from({ length: n }).map(() => ({
      dx: (rnd() - 0.5) * 1.4,
      dz: (rnd() - 0.5) * 1.4,
      h: (0.7 + rnd() * 1.3) * scale,
      r: (0.12 + rnd() * 0.14) * scale,
      tilt: (rnd() - 0.5) * 0.5,
      rot: rnd() * Math.PI,
    }))
  }, [seed, scale])

  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (matRef.current) {
      const t = performance.now() * 0.001
      matRef.current.emissiveIntensity = 0.9 + Math.sin(t * 1.3 + seed) * 0.35
    }
  })

  return (
    <group position={anchor}>
      {shards.map((sh, i) => (
        <mesh
          key={i}
          position={[sh.dx, sh.h * 0.5 - 0.1, sh.dz]}
          rotation={[sh.tilt, sh.rot, sh.tilt * 0.5]}
          castShadow
        >
          <coneGeometry args={[sh.r, sh.h, 5]} />
          <meshStandardMaterial
            ref={i === 0 ? matRef : undefined}
            color={color}
            emissive={color}
            emissiveIntensity={1.0}
            roughness={0.25}
            metalness={0.1}
            flatShading
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* base glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.3 * scale, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Lantern posts                                                       */
/* ------------------------------------------------------------------ */

const LANTERN_SPOTS: [number, number, number][] = [
  [-3.5, 0, 8.5],
  [4.5, 0, 6],
  [-6, 0, -6.5],
  [7.5, 0, -9],
  [-0.5, 0, -6],
  [6.5, 0, -2],
]

function LanternPosts() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (matRef.current) matRef.current.opacity = 0.8 + Math.sin(performance.now() * 0.002) * 0.15
  })
  return (
    <group>
      {LANTERN_SPOTS.map((pos, i) => (
        <group key={i} position={pos}>
          {/* post */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 1.5, 6]} />
            <meshStandardMaterial color="#241a40" roughness={0.9} />
          </mesh>
          {/* arm */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.4]} />
            <meshStandardMaterial color="#241a40" roughness={0.9} />
          </mesh>
          {/* glowing orb */}
          <mesh position={[0, 1.42, 0.22]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshBasicMaterial ref={i === 0 ? matRef : undefined} color="#8fd0ff" transparent opacity={0.9} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 1.42, 0.22]} intensity={5} color="#7ec8ff" distance={5} />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Ground flora (small glowing tufts)                                  */
/* ------------------------------------------------------------------ */

function GroundFlora() {
  const tufts = useMemo(() => {
    let s = 42
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const out: { p: [number, number, number]; c: string; h: number }[] = []
    for (let i = 0; i < 46; i++) {
      const ang = rnd() * Math.PI * 2
      const rad = 4 + rnd() * 15
      const x = 1 + Math.cos(ang) * rad
      const z = -2 + Math.sin(ang) * rad
      // keep off the central walkway corridor
      if (Math.abs(x - 1) < 2.2 && z < 6 && z > -11) continue
      out.push({
        p: [x, 0, z],
        c: rnd() > 0.5 ? '#6fb0ff' : '#b98cff',
        h: 0.2 + rnd() * 0.3,
      })
    }
    return out
  }, [])
  return (
    <group>
      {tufts.map((t, i) => (
        <mesh key={i} position={[t.p[0], t.h * 0.5, t.p[2]]}>
          <coneGeometry args={[0.05, t.h, 4]} />
          <meshBasicMaterial color={t.c} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Rim waterfalls + distant islands (background depth)                 */
/* ------------------------------------------------------------------ */

function useFallTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, 'rgba(170,210,255,0.7)')
    g.addColorStop(0.5, 'rgba(190,225,255,0.4)')
    g.addColorStop(1, 'rgba(120,170,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 128)
    const t = new THREE.CanvasTexture(c)
    t.wrapT = THREE.RepeatWrapping
    return t
  }, [])
}

const FALLS: { pos: [number, number, number]; rotY: number; size: [number, number] }[] = [
  { pos: [-20, -3, 6], rotY: Math.PI / 2, size: [4, 9] },
  { pos: [-16, -3.5, -12], rotY: 1.1, size: [3.4, 11] },
  { pos: [18, -3, 10], rotY: -1.2, size: [3.6, 8] },
  { pos: [16, -4, -14], rotY: -0.7, size: [3, 12] },
]

function RimWaterfalls() {
  const tex = useFallTexture()
  useFrame(() => {
    tex.offset.y = (performance.now() * 0.0006) % 1
  })
  return (
    <group>
      {FALLS.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          <planeGeometry args={f.size} />
          <meshBasicMaterial map={tex} transparent opacity={0.6} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Distant floating rock islets with crystal tips + soft mist, purely for background depth. */
function BackgroundIslands() {
  const isles = useMemo(
    () => [
      { p: [-26, 3, -18], s: 2.6 },
      { p: [28, 1, -20], s: 3.0 },
      { p: [22, 5, 16], s: 2.2 },
      { p: [-24, 6, 14], s: 2.0 },
    ],
    []
  )
  return (
    <group>
      {isles.map((is, i) => (
        <group key={i} position={is.p as [number, number, number]} scale={is.s}>
          {/* floating rock */}
          <mesh position={[0, 0, 0]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#1a1f42" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, -1.1, 0]}>
            <coneGeometry args={[0.9, 2.2, 6]} />
            <meshStandardMaterial color="#12162e" roughness={1} flatShading />
          </mesh>
          {/* crystal tip */}
          <mesh position={[0, 1.0, 0]}>
            <coneGeometry args={[0.28, 1.0, 5]} />
            <meshBasicMaterial color={i % 2 ? '#7ad0ff' : '#b06bff'} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Two-Tower Gate banners                                              */
/* ------------------------------------------------------------------ */

/** Hanging banners flanking the Two-Tower Gate (positioned at the gate ~(3,0,-15)). */
function GateBanners() {
  const bannerRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (bannerRef.current) {
      const t = performance.now() * 0.001
      bannerRef.current.children.forEach((c, i) => {
        c.rotation.z = Math.sin(t * 1.2 + i) * 0.04
      })
    }
  })
  const banners: { pos: [number, number, number] }[] = [
    { pos: [-1.4, 4.6, -13.6] },
    { pos: [7.4, 4.6, -13.6] },
  ]
  return (
    <group ref={bannerRef}>
      {banners.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* banner cloth */}
          <mesh position={[0, -1.4, 0]}>
            <planeGeometry args={[1.0, 2.8]} />
            <meshStandardMaterial color="#3a1f66" emissive="#7b3ff7" emissiveIntensity={0.35} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          {/* glowing glyph */}
          <mesh position={[0, -1.0, 0.03]}>
            <ringGeometry args={[0.18, 0.28, 6]} />
            <meshBasicMaterial color="#c9a6ff" side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          {/* pointed hem */}
          <mesh position={[0, -3.0, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.5, 0.5, 3]} />
            <meshStandardMaterial color="#3a1f66" emissive="#7b3ff7" emissiveIntensity={0.35} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
