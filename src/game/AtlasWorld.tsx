import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { Ambiance } from './Ambiance'
import { useProgress, type WorldId } from '../state/progress'

/**
 * The Journey — a single continuous epic vista of the whole course (the combined "all worlds in one
 * scene" view). Instead of a flat top-down board, it reads like the reference hero shot: the player
 * stands on a foreground plateau and looks OUT over a dusk landscape where the five regions recede
 * into the distance along a winding glowing path, with the Final Arena crowning a far mountain peak
 * under a sunset sky, layered ranges and drifting cloud for depth. Walkable in WASD (one flat island;
 * the drama is in the backdrop + the hero camera, not in climbing). Rendered by World.tsx when
 * `atlasOpen`; the hero framing lives in Camera.tsx's atlas branch.
 */

interface Region {
  n: string
  name: string
  tag: string
  world: WorldId
  pos: [number, number, number]
  accent: string
  url: string
  h: number
  rotY: number
}

// five walkable regions on the island, laid out as a journey from the near-left camp into the depth
const REGIONS: Region[] = [
  { n: '1', name: 'Foundations Camp', tag: 'Metrics · Signals · Rankings', world: 'foundations-camp', pos: [-17, 0, 11], accent: '#b98bff', url: '/models/props/crystal-shrine-textured.glb', h: 4.4, rotY: 0.3 },
  { n: '2', name: 'Retrieval Valley', tag: 'Embeddings · ANN · Two-Tower', world: 'retrieval-valley', pos: [-9, 0, 2], accent: '#6bd0ff', url: '/models/props/two-tower-gate.glb', h: 5.6, rotY: 0.1 },
  { n: '3', name: 'Sequential City', tag: 'Sequences · Attention · Transformers', world: 'sequential-city', pos: [1, 0, -8], accent: '#ff5fd0', url: '/models/props/transformer-gate.glb', h: 6.6, rotY: -0.1 },
  { n: '4', name: 'Policy Factory', tag: 'Generative · Beam Search · Control', world: 'policy-tower', pos: [13, 0, -3], accent: '#ffb04f', url: '/models/props/policy-tower.glb', h: 6.0, rotY: 0.25 },
  { n: '5', name: 'Ecosystem Garden', tag: 'Debias · Feedback · Growth', world: 'ecosystem-garden', pos: [18, 0, 8], accent: '#8affc9', url: '/models/props/greenhouse.glb', h: 5.0, rotY: -0.4 },
]

function setCursor(on: boolean) {
  if (typeof document !== 'undefined') document.body.style.cursor = on ? 'pointer' : 'auto'
}
/** enter a region from the Journey map (a click on its marker fast-travels you into that world) */
function travelToWorld(world: WorldId) {
  // the marker unmounts on travel (atlas closes), so onPointerOut never fires — clear the cursor here
  setCursor(false)
  useProgress.getState().travelTo(world)
}

const ARENA_POS: [number, number, number] = [3, 10.5, -34] // far peak, backdrop

export function AtlasScene() {
  // ensure the hover cursor never survives the map closing (Esc / Exit / travel while hovered)
  useEffect(() => () => setCursor(false), [])
  return (
    <>
      <JourneySky />
      <DepthFog />

      {/* dusk key + warm sunset rim + cool fill */}
      <ambientLight intensity={0.62} color="#a99ce6" />
      <hemisphereLight args={['#c2b0ff', '#221a34', 1.0]} />
      <directionalLight
        position={[18, 20, -20]}
        intensity={1.5}
        color="#ffdcc0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-bias={-0.0004}
      />
      {/* warm sunset glow low on the right horizon (matches the reference) */}
      <pointLight position={[30, 8, -34]} intensity={60} color="#ff7a6b" distance={70} />
      <pointLight position={[3, 16, -34]} intensity={50} color="#c86bff" distance={44} />

      {/* far backdrop → near foreground */}
      <DistantRanges />
      <ArenaPeak />

      <JourneyGround />
      <JourneyBoundary />

      <JourneyPath />

      {REGIONS.map((r) => (
        <RegionMarker key={r.n} region={r} />
      ))}

      {/* diegetic detail from the reference */}
      <CampMetricBoards />
      <EmbeddingClusters />
      <Clouds />

      {/* hero structures (streamed behind Suspense) */}
      <Suspense fallback={null}>
        {REGIONS.map((r) => (
          <MeshyProp key={r.n} url={r.url} position={[r.pos[0], r.pos[1], r.pos[2] - 2.2]} targetHeight={r.h} rotationY={r.rotY} emissiveBoost={0.45} solid colliderScale={0.4} />
        ))}
        {/* the Final Arena crowning the far peak (backdrop, not walkable) */}
        <MeshyProp url="/models/props/final-arena.glb" position={ARENA_POS} targetHeight={9} rotationY={-0.3} emissiveBoost={0.6} />
      </Suspense>

      <Ambiance />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Sky + atmosphere                                                    */
/* ------------------------------------------------------------------ */

function JourneySky() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#0a0822') // zenith
    g.addColorStop(0.45, '#1a1244')
    g.addColorStop(0.72, '#3a2160')
    g.addColorStop(0.88, '#6e3a72') // dusk band
    g.addColorStop(0.96, '#b8586a') // warm sunset near horizon
    g.addColorStop(1, '#d67a5e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 256)
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

function DepthFog() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const prev = scene.fog
    // haze that swallows the far ranges → depth (violet, matched to the dusk band)
    scene.fog = new THREE.Fog('#2a1d50', 26, 88)
    return () => {
      scene.fog = prev
    }
  }, [scene])
  return null
}

function Clouds() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(180,150,220,0.5)')
    g.addColorStop(0.5, 'rgba(120,90,180,0.18)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => texture.dispose(), [texture]) // release the GPU texture on atlas close
  const spots = useMemo(
    () => [
      { p: [-18, 15, -40] as [number, number, number], s: 22 },
      { p: [14, 18, -44] as [number, number, number], s: 26 },
      { p: [0, 22, -50] as [number, number, number], s: 30 },
      { p: [26, 12, -36] as [number, number, number], s: 18 },
    ],
    []
  )
  const grp = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (grp.current) grp.current.position.x = Math.sin(state.clock.elapsedTime * 0.03) * 3
  })
  return (
    <group ref={grp}>
      {spots.map((c, i) => (
        <mesh key={i} position={c.p}>
          <planeGeometry args={[c.s, c.s * 0.5]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={0.7} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function DistantRanges() {
  // three layered low-poly ridges receding into the fog for depth
  const layers = useMemo(() => {
    const out: { peaks: { pos: [number, number, number]; s: [number, number, number] }[]; color: string }[] = []
    const defs = [
      { z: -30, base: 4, h: 9, spread: 30, color: '#3a2a5e', n: 9 },
      { z: -42, base: 6, h: 13, spread: 40, color: '#2c2050', n: 8 },
      { z: -54, base: 8, h: 17, spread: 52, color: '#221842', n: 7 },
    ]
    for (const d of defs) {
      const peaks = []
      for (let i = 0; i < d.n; i++) {
        const x = -d.spread + (i / (d.n - 1)) * d.spread * 2 + ((i * 53) % 7) - 3
        const h = d.h * (0.7 + ((i * 37) % 6) / 10)
        peaks.push({ pos: [x, h / 2 - 3, d.z] as [number, number, number], s: [d.base * (1 + ((i * 29) % 4) / 6), h, d.base] as [number, number, number] })
      }
      out.push({ peaks, color: d.color })
    }
    return out
  }, [])
  return (
    <group>
      {layers.map((l, li) => (
        <group key={li}>
          {l.peaks.map((p, i) => (
            <mesh key={i} position={p.pos} scale={p.s} rotation={[0, (i % 2) * 0.4, 0]}>
              <coneGeometry args={[1, 2, 4]} />
              <meshStandardMaterial color={l.color} roughness={1} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function ArenaPeak() {
  const glow = useRef<THREE.PointLight>(null)
  useFrame((state) => {
    if (glow.current) glow.current.intensity = 26 + Math.sin(state.clock.elapsedTime * 1.5) * 6
  })
  const [ax, ay, az] = ARENA_POS
  // a switchback glowing path climbing the peak toward the arena (visual, leads the eye like the ref)
  const steps = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = []
    const n = 16
    for (let i = 0; i < n; i++) {
      const t = i / n
      const y = 1 + t * (ay - 1)
      const x = ax - 6 + Math.sin(t * Math.PI * 3) * 4
      const z = az + 8 - t * 8
      out.push({ pos: [x, y, z], yaw: Math.sin(t * Math.PI * 3) })
    }
    return out
  }, [ax, ay, az])
  return (
    <group>
      {/* the mountain — lit by the dusk sky so the climax reads clearly against the sky */}
      <mesh position={[ax, ay / 2 - 2, az]} scale={[16, ay + 6, 16]}>
        <coneGeometry args={[1, 1.4, 6]} />
        <meshStandardMaterial color="#4a3a7e" roughness={1} flatShading />
      </mesh>
      <mesh position={[ax, ay / 2 - 2, az]} scale={[16.2, ay + 6, 16.2]} rotation={[0, 0.5, 0]}>
        <coneGeometry args={[1, 1.35, 6]} />
        <meshStandardMaterial color="#3a2c66" roughness={1} flatShading transparent opacity={0.7} />
      </mesh>
      {/* glowing crown of light around the peak + a rising beacon (the reference's lit castle) */}
      <mesh position={[ax, ay + 0.6, az]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 5.4, 32]} />
        <meshBasicMaterial color="#e0a6ff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[ax + (k - 1) * 1.6, ay + 5, az]}>
          <cylinderGeometry args={[0.12, 0.02, 6, 6]} />
          <meshBasicMaterial color="#e6b0ff" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      {/* glowing switchback path up to the arena */}
      {steps.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.yaw, 0]}>
          <boxGeometry args={[1.4, 0.15, 0.4]} />
          <meshStandardMaterial color="#c86bff" emissive="#e0a6ff" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      <pointLight ref={glow} position={[ax, ay + 2, az + 1]} intensity={26} color="#e0a6ff" distance={48} />
      <pointLight position={[ax, ay + 3, az - 2]} intensity={30} color="#ff8ad0" distance={30} />
      {/* clickable travel-catcher over the peak → fast-travel into the Final Arena */}
      <mesh
        position={[ax, ay + 2, az]}
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); travelToWorld('final-arena') }}
        onPointerOver={(e) => { e.stopPropagation(); setCursor(true) }}
        onPointerOut={() => setCursor(false)}
      >
        <sphereGeometry args={[7, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Billboard position={[ax + 9, ay + 4, az]}>
        <Text fontSize={1.0} color="#f2eaff" anchorX="left" outlineWidth={0.02} outlineColor="#140b26">
          Arena
        </Text>
        <Text position={[0, -0.9, 0]} fontSize={0.5} color="#c9b8ff" anchorX="left">
          Prove mastery · Compete
        </Text>
        <Text position={[0, -1.6, 0]} fontSize={0.42} color="#ffe27a" anchorX="left">
          ▶ click to travel here
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Walkable ground                                                     */
/* ------------------------------------------------------------------ */

const CENTER: [number, number] = [0, 0]
const GR = 26

function JourneyGround() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, GR]} position={[CENTER[0], -3, CENTER[1]]} />
      </RigidBody>

      <mesh position={[CENTER[0], 0, CENTER[1]]} receiveShadow>
        <cylinderGeometry args={[GR, GR, 0.6, 72]} />
        <meshStandardMaterial color="#241c48" roughness={0.95} metalness={0.04} />
      </mesh>
      <mesh position={[CENTER[0], -3.4, CENTER[1]]}>
        <cylinderGeometry args={[GR - 0.5, GR - 10, 6.4, 52]} />
        <meshStandardMaterial color="#171236" roughness={1} />
      </mesh>
      {/* cliff face down into the mist on the near side (foreground depth) */}
      <mesh position={[CENTER[0], -8.8, CENTER[1]]}>
        <coneGeometry args={[GR - 10, 9, 44]} />
        <meshStandardMaterial color="#0e0a26" roughness={1} />
      </mesh>

      <mesh position={[CENTER[0], 0.32, CENTER[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GR - 1.6, GR - 1.0, 72]} />
        <meshBasicMaterial color="#8f6bff" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <GroundGlow />
      <RimRocks />
    </group>
  )
}

function GroundGlow() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0.4)')
    g.addColorStop(0.4, 'rgba(150,120,255,0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => texture.dispose(), [texture]) // release the GPU texture on atlas close
  return (
    <mesh position={[CENTER[0], 0.31, CENTER[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[GR * 2, GR * 2]} />
      <meshBasicMaterial map={texture} color="#8a5fd0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function RimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 26
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = GR - 1.2 + ((i * 37) % 5) * 0.5
      const x = CENTER[0] + Math.cos(a) * rad
      const z = CENTER[1] + Math.sin(a) * rad
      const up = 0.7 + ((i * 53) % 7) * 0.3
      const w = 1.7 + ((i * 29) % 5) * 0.5
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

function JourneyBoundary() {
  // round fence following the island edge so you can't stroll off on any bearing
  const segs = useMemo(() => {
    const N = 30
    const R = GR - 0.6
    const half = (Math.PI * R) / N + 0.35
    return Array.from({ length: N }).map((_, i) => {
      const a = (i / N) * Math.PI * 2
      return { pos: [CENTER[0] + Math.cos(a) * R, 1.6, CENTER[1] + Math.sin(a) * R] as [number, number, number], yaw: -a, half }
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
/* Winding path + region markers                                       */
/* ------------------------------------------------------------------ */

function JourneyPath() {
  const planks = useMemo(() => {
    const pts = REGIONS.map((r) => new THREE.Vector3(r.pos[0], 0.36, r.pos[2]))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    const N = 90
    const out: { pos: [number, number, number]; yaw: number; phase: number }[] = []
    let prev = curve.getPoint(0)
    for (let i = 1; i <= N; i++) {
      const t = i / N
      const p = curve.getPoint(t)
      const yaw = Math.atan2(p.x - prev.x, p.z - prev.z)
      out.push({ pos: [p.x, 0.36, p.z], yaw, phase: t })
      prev = p
    }
    return out
  }, [])
  const mats = useRef<THREE.MeshStandardMaterial[]>([])
  useFrame(() => {
    const time = performance.now() * 0.0016
    mats.current.forEach((m, i) => {
      if (!m) return
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 - planks[i].phase * Math.PI * 8)
      m.emissiveIntensity = 1.0 + pulse * 1.9
    })
  })
  return (
    <group>
      {planks.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.yaw, 0]}>
          <boxGeometry args={[1.7, 0.12, 0.34]} />
          <meshStandardMaterial ref={(m) => { if (m) mats.current[i] = m }} color="#b83f9f" emissive="#ff6bd0" emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function RegionMarker({ region }: { region: Region }) {
  const [x, y, z] = region.pos
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((state) => {
    if (ring.current) ring.current.opacity = 0.32 + Math.sin(state.clock.elapsedTime * 1.6 + x) * 0.12
  })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.7, 44]} />
        <meshBasicMaterial ref={ring} color={region.accent} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.6, 40]} />
        <meshBasicMaterial color={region.accent} transparent opacity={0.1} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* invisible click-catcher (sits just above the ground disc + stopPropagation so it wins over
          click-to-move): click a region on the map → fast-travel straight into that world */}
      <mesh
        position={[0, 0.42, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); travelToWorld(region.world) }}
        onPointerOver={(e) => { e.stopPropagation(); setCursor(true) }}
        onPointerOut={() => setCursor(false)}
      >
        <circleGeometry args={[3.6, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={16} color={region.accent} distance={13} />

      {/* numbered badge + name + tagline, like the reference callouts */}
      <Billboard position={[0, 5.6, 2.4]}>
        <mesh position={[-1.15, 0.02, -0.01]}>
          <circleGeometry args={[0.34, 24]} />
          <meshBasicMaterial color={region.accent} toneMapped={false} />
        </mesh>
        <Text position={[-1.15, 0.02, 0]} fontSize={0.4} color="#140b26" anchorX="center" anchorY="middle">{region.n}</Text>
        <Text position={[-0.6, 0.16, 0]} fontSize={0.44} color="#f4eeff" anchorX="left" anchorY="middle" outlineWidth={0.012} outlineColor="#0b0618">{region.name}</Text>
        <Text position={[-0.6, -0.28, 0]} fontSize={0.24} color={region.accent} anchorX="left" anchorY="middle">{region.tag}</Text>
        <Text position={[-0.6, -0.62, 0]} fontSize={0.2} color="#ffe27a" anchorX="left" anchorY="middle">▶ click to travel here</Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Diegetic detail (metric boards + embedding clusters)                */
/* ------------------------------------------------------------------ */

function CampMetricBoards() {
  const boards = [
    { label: 'Precision', v: '0.87', dx: -3.0 },
    { label: 'Recall', v: '0.82', dx: -1.0 },
    { label: 'NDCG', v: '0.91', dx: 1.0 },
  ]
  const camp = REGIONS[0].pos
  return (
    <group position={[camp[0] + 1.5, 0, camp[2] - 1]}>
      {boards.map((b, i) => (
        <group key={i} position={[b.dx, 2.4 + (i % 2) * 0.35, 0]} rotation={[0, 0.5, 0]}>
          <mesh>
            <planeGeometry args={[1.5, 1.0]} />
            <meshBasicMaterial color="#1a1236" transparent opacity={0.86} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.6, 1.1]} />
            <meshBasicMaterial color="#8f6bff" transparent opacity={0.18} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <Text position={[0, 0.26, 0.02]} fontSize={0.18} color="#c9b8ff" anchorX="center">{b.label}</Text>
          <Text position={[0, -0.12, 0.02]} fontSize={0.34} color="#f4eeff" anchorX="center">{b.v}</Text>
        </group>
      ))}
    </group>
  )
}

function EmbeddingClusters() {
  // the reference's glowing purple/blue "embedding trees" near Retrieval Valley
  const clusters = useMemo(() => {
    const out: { pos: [number, number, number]; color: string; pts: [number, number, number][] }[] = []
    const defs = [
      { c: [-13, 0, 8] as [number, number, number], color: '#a86bff' },
      { c: [-11, 0, 5] as [number, number, number], color: '#6b8bff' },
      { c: [-6, 0, 7] as [number, number, number], color: '#6bd0ff' },
    ]
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (const d of defs) {
      const pts: [number, number, number][] = []
      for (let i = 0; i < 22; i++) {
        const a = rnd() * Math.PI * 2
        const r = rnd() * 1.3
        pts.push([Math.cos(a) * r, 0.4 + rnd() * 2.0, Math.sin(a) * r])
      }
      out.push({ pos: d.c, color: d.color, pts })
    }
    return out
  }, [])
  return (
    <group>
      {clusters.map((cl, ci) => (
        <group key={ci} position={cl.pos}>
          {cl.pts.map((p, i) => (
            <mesh key={i} position={p}>
              <octahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial color={cl.color} emissive={cl.color} emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
          ))}
          <pointLight position={[0, 1.4, 0]} intensity={5} color={cl.color} distance={5} />
        </group>
      ))}
    </group>
  )
}
