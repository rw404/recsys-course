import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { GroundDressing } from './GroundDressing'
import { worldTheme } from './worldThemes'
import { DecorScatter, scatterGrid } from './DecorScatter'
import { Ambiance } from './Ambiance'
import { ValleyDecor } from './ValleyDecor'
import { RoutePath } from './Environment'
import { GardenDynamics } from './GardenDynamics'

/**
 * World 05 · Ecosystem Garden — the final region, beyond the Garden Gate. An enchanted night garden
 * about keeping the recommender ecosystem alive: a Debias fountain-shrine (center-left), a "Live
 * Signals" feedback-loop of rising arcs (center), a glowing Churn & Growth greenhouse (right), a
 * hazy Churn Fog drop-off zone (far right), a diverse flower field, drifting butterflies, and — the
 * interactive heart of it — pushable seed orbs you herd into a Diversity Planter (GardenDynamics).
 * Guide Astra narrates the finale from under the great blossom tree (rendered by GardenLessonStage).
 */
export function EcosystemGarden() {
  return (
    <>
      <GardenBackground />

      {/* lighting — bioluminescent: violet key, cyan + magenta fills */}
      <ambientLight intensity={0.58} color="#a99ce6" />
      <hemisphereLight args={['#b8a6ff', '#1d2a34', 1.0]} />
      <directionalLight
        position={[8, 22, 10]}
        intensity={1.35}
        color="#e8e0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0004}
      />
      {/* violet key over the blossom tree, cyan over Live Signals, warm over the greenhouse */}
      <pointLight position={[-9, 8, 3]} intensity={30} color="#b06bff" distance={26} />
      <pointLight position={[2, 7, -3]} intensity={26} color="#5fd0ff" distance={24} />
      <pointLight position={[11, 7, -2]} intensity={26} color="#ffb367" distance={24} />
      <pointLight position={[-6.5, 4, 4]} intensity={16} color="#ffca82" distance={13} />
      {/* rim from behind the gate for silhouette */}
      <pointLight position={[2, 8, -16]} intensity={34} color="#7b6bff" distance={34} />

      <GardenTerrain />
      <GroundDressing theme={worldTheme('ecosystem-garden')} center={[1, 0, -2]} radius={21} />
      <GardenBoundaries />

      <ValleyDecor />

      {/* Debias fountain-shrine on the raised round platform (center-left, behind Astra) */}
      <DebiasFountain />

      {/* "Live Signals" — the feedback-loop of rising & falling arcs (center) */}
      <FeedbackSignals position={[2, 0, -2.5]} />

      {/* Churn Fog — the unpredictable drop-off zone (far right corner) */}
      <ChurnFog position={[15, 0, -9]} />

      {/* a diverse field of glowing flowers (foreground-right) */}
      <FlowerField />

      {/* a glowing flower sealed under glass — "growth under glass" (foreground-right) */}
      <GlassTerrarium position={[9.5, 0, 4.5]} />

      {/* drifting butterflies for life */}
      <Butterflies />

      {/* the glowing walkway + signposts */}
      <GardenWalkway />
      <GardenSignposts />

      {/* the interactive seed-orbs + Diversity Planter */}
      <GardenDynamics />

      {/* GLB props behind their own Suspense so the primitive scene never blanks while they load */}
      <Suspense fallback={null}>
        {/* the great blossom tree (reused hero-tree), violet-tinted, over Astra on the left */}
        <MeshyProp url="/models/props/hero-tree.glb" position={[-10.5, 0, 3.5]} targetHeight={9.5} rotationY={0.5} tint="#6a3aa0" tintAmount={0.5} emissiveBoost={0.3} solid colliderScale={0.25} />
        {/* Debias fountain structure (Meshy) */}
        <MeshyProp url="/models/props/debias-fountain.glb" position={[-6.5, 0.3, -3.4]} targetHeight={4.4} rotationY={0.2} emissiveBoost={0.5} solid colliderScale={0.45} />
        {/* Churn & Growth greenhouse (Meshy) on the right */}
        <MeshyProp url="/models/props/greenhouse.glb" position={[11, 0, -3.5]} targetHeight={7.6} rotationY={-0.5} emissiveBoost={0.45} solid colliderScale={0.5} />
        {/* reused decorative props */}
        <MeshyProp url="/models/props/crystal-shards.glb" position={[-13.5, 0, 6]} targetHeight={2.4} rotationY={0.3} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[-3.5, 0, 8.8]} targetHeight={1.5} rotationY={0.5} emissiveBoost={0.35} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[6.5, 0, 7.6]} targetHeight={1.3} rotationY={-0.6} emissiveBoost={0.35} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-8.8, 3.0, 3.0]} targetHeight={0.95} idleMotion />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-7.6, 2.6, 5.0]} targetHeight={0.85} idleMotion />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[-15, 0, 9]} targetHeight={6.0} rotationY={0.4} tint="#213a2e" tintAmount={0.55} solid colliderScale={0.3} />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[16, 0, 8]} targetHeight={6.5} rotationY={-1.0} tint="#213a2e" tintAmount={0.55} solid colliderScale={0.3} />
      </Suspense>

      <Ambiance />
      <RoutePath world="ecosystem-garden" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Background + terrain                                                */
/* ------------------------------------------------------------------ */

function GardenBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#080a1e')
    g.addColorStop(0.5, '#141238')
    g.addColorStop(0.82, '#241b4e')
    g.addColorStop(1, '#3a2a5e')
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

const GR = 24

function GardenTerrain() {
  return (
    <group>
      {/* deep physics slab (top at y≈0, extends to -6) so a fast body can't tunnel through */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, GR]} position={[1, -3, -2]} />
      </RigidBody>

      <mesh position={[1, 0, -2]} receiveShadow>
        <cylinderGeometry args={[GR, GR, 0.6, 64]} />
        <meshStandardMaterial color="#26224e" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[1, -3.4, -2]}>
        <cylinderGeometry args={[GR - 0.5, GR - 8, 6.4, 48]} />
        <meshStandardMaterial color="#181436" roughness={1} />
      </mesh>
      <mesh position={[1, -8.5, -2]}>
        <coneGeometry args={[GR - 8, 8, 40]} />
        <meshStandardMaterial color="#0e0b24" roughness={1} />
      </mesh>

      <PlazaGlow position={[2, 0.32, -3]} radius={15} color="#7f66c8" />
      <mesh position={[2, 0.33, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.6, 14.2, 64]} />
        <meshBasicMaterial color="#9d7bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <GardenRimRocks />
    </group>
  )
}

function GardenRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = GR - 1.4 + ((i * 37) % 5) * 0.5
      const x = 1 + Math.cos(a) * rad
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
          <meshStandardMaterial color={i % 3 === 0 ? '#26304a' : '#20263e'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function GardenBoundaries() {
  const walls: [number, number, number, number, number, number][] = [
    [1, 1.5, 20, 24, 3, 0.5],
    [1, 1.5, -24, 24, 3, 0.5],
    [-22, 1.5, -2, 0.5, 3, 24],
    [24, 1.5, -2, 0.5, 3, 24],
  ]
  return (
    <RigidBody type="fixed" colliders={false}>
      {walls.map((w, i) => (
        <CuboidCollider key={i} args={[w[3], w[4], w[5]]} position={[w[0], w[1], w[2]]} />
      ))}
    </RigidBody>
  )
}

/* ------------------------------------------------------------------ */
/* Debias fountain — rising light beams                                */
/* ------------------------------------------------------------------ */

function DebiasFountain() {
  const beams = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (beams.current) {
      const t = state.clock.elapsedTime
      beams.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh
        const phase = (t * 0.6 + i * 0.5) % 1
        mesh.position.y = 0.6 + phase * 3.4
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = (1 - phase) * 0.8
        mesh.scale.setScalar(1 - phase * 0.4)
      })
    }
  })
  return (
    <group position={[-6.5, 0, -3.4]}>
      {/* raised round platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.3, 40]} />
        <meshStandardMaterial color="#2a2150" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.5, 40]} />
        <meshBasicMaterial color="#b06bff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* rising debias light beams */}
      <group ref={beams}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9]}>
              <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
              <meshBasicMaterial color="#c9a6ff" transparent opacity={0.7} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
      <pointLight position={[0, 2.4, 0]} intensity={10} color="#b06bff" distance={9} />
      <Billboard position={[0, 4.9, 0]}>
        <Text fontSize={0.42} color="#eee6ff" anchorX="center" outlineWidth={0.014} outlineColor="#140b26">
          Debias
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Live Signals — feedback-loop arcs                                   */
/* ------------------------------------------------------------------ */

function FeedbackSignals({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null)
  const arcs = useMemo(() => {
    // fountain of parabolic arcs (the feedback loop: signals rise, arc over, feed back)
    const out: { geo: THREE.TubeGeometry }[] = []
    const n = 7
    for (let i = 0; i < n; i++) {
      const spread = 0.6 + i * 0.34
      const height = 2.6 - i * 0.14
      const pts: THREE.Vector3[] = []
      for (let s = 0; s <= 20; s++) {
        const u = s / 20
        const x = (u - 0.5) * spread * 2
        const y = height * (1 - (2 * u - 1) * (2 * u - 1)) // parabola
        pts.push(new THREE.Vector3(x, y, 0))
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      out.push({ geo: new THREE.TubeGeometry(curve, 24, 0.045, 6, false) })
    }
    return out
  }, [])
  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime
      group.current.children.forEach((c, i) => {
        c.rotation.y = t * 0.25 + (i * Math.PI) / arcs.length
        const mesh = c as THREE.Mesh
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = 0.45 + Math.sin(t * 2 + i) * 0.3
      })
    }
  })
  return (
    <group position={position}>
      <group ref={group}>
        {arcs.map((a, i) => (
          <mesh key={i} geometry={a.geo}>
            <meshBasicMaterial color="#5fd0ff" transparent opacity={0.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* base pool glow */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color="#3a7fd0" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} intensity={9} color="#5fd0ff" distance={8} />
      <Billboard position={[0, 3.4, 0]}>
        <Text fontSize={0.34} color="#dbf1ff" anchorX="center" outlineWidth={0.012} outlineColor="#0b1424">
          Feedback · Live Signals
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Churn Fog — unpredictable drop-off zone                             */
/* ------------------------------------------------------------------ */

function ChurnFog({ position }: { position: [number, number, number] }) {
  const puffs = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (puffs.current) {
      const t = state.clock.elapsedTime
      puffs.current.children.forEach((c, i) => {
        c.position.y = 1.2 + Math.sin(t * 0.5 + i * 1.3) * 0.5
        const mesh = c as THREE.Mesh
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = 0.12 + Math.sin(t * 0.4 + i) * 0.06
      })
    }
  })
  return (
    <group position={position}>
      {/* hazy fog puffs */}
      <group ref={puffs}>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2
          const r = 1.5 + (i % 3) * 0.7
          return (
            <mesh key={i} position={[Math.cos(a) * r, 1.2, Math.sin(a) * r]}>
              <sphereGeometry args={[1.6 + (i % 3) * 0.4, 12, 12]} />
              <meshBasicMaterial color="#8a5fd0" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
      {/* faint drop-off spires under the fog */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4
        return (
          <mesh key={i} position={[Math.cos(a) * 2.2, 1.0, Math.sin(a) * 2.2]} rotation={[0, a, 0]}>
            <coneGeometry args={[0.4, 2.6, 5]} />
            <meshStandardMaterial color="#3a2a5e" emissive="#7b4fd0" emissiveIntensity={0.5} roughness={1} flatShading />
          </mesh>
        )
      })}
      <pointLight position={[0, 2.5, 0]} intensity={8} color="#9d6bff" distance={12} />
      <Billboard position={[0, 4.6, 0]}>
        <Text fontSize={0.3} color="#e6d9ff" anchorX="center" outlineWidth={0.012} outlineColor="#140b26">
          Churn Fog
        </Text>
        <Text position={[0, -0.34, 0]} fontSize={0.16} color="#b79bff" anchorX="center">
          unpredictable drop-off
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Diverse flower field                                                */
/* ------------------------------------------------------------------ */

/** A lush flowerbed of DETAILED flower-cluster GLBs (replacing the old icosahedron-blob field). */
function FlowerField() {
  const items = useMemo(() => scatterGrid(5, 2, 8.5, 6.5, 11, [1.0, 1.55], 91), [])
  return <DecorScatter url="/models/props/flower-cluster.glb" items={items} emissiveBoost={0.35} />
}

/* ------------------------------------------------------------------ */
/* Glass terrarium — a glowing flower under glass                      */
/* ------------------------------------------------------------------ */

function GlassTerrarium({ position }: { position: [number, number, number] }) {
  const bloom = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (bloom.current) {
      const t = state.clock.elapsedTime
      bloom.current.position.y = 0.95 + Math.sin(t * 1.5) * 0.05
      bloom.current.rotation.y = t * 0.5
      const mat = bloom.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.1 + Math.sin(t * 2) * 0.3
    }
  })
  return (
    <group position={position}>
      {/* bronze base + rim */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 20]} />
        <meshStandardMaterial color="#5a4326" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.05, 8, 24]} />
        <meshStandardMaterial color="#caa06e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* the glowing flower inside */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 5]} />
        <meshStandardMaterial color="#3f7a4a" emissive="#2f5a3a" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={bloom} position={[0, 0.95, 0]}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color="#ff6bd0" emissive="#ff6bd0" emissiveIntensity={1.2} toneMapped={false} flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * 0.2, 0.88, Math.sin(a) * 0.2]}>
            <icosahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={1.0} toneMapped={false} flatShading />
          </mesh>
        )
      })}
      {/* glass dome (hemisphere) + finial */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.62, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#a9d4ff" transparent opacity={0.16} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#caa06e" metalness={0.7} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 0.95, 0]} intensity={5} color="#ff9be0" distance={4} />
      <Billboard position={[0, 1.7, 0]}>
        <Text fontSize={0.16} color="#ffd9f0" anchorX="center">Growth</Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Butterflies                                                         */
/* ------------------------------------------------------------------ */

function Butterflies() {
  const flyers = useMemo(
    () => [
      { center: new THREE.Vector3(7, 1.4, 4), r: 2.2, speed: 0.6, color: '#6bd0ff' },
      { center: new THREE.Vector3(3, 1.6, 3), r: 1.6, speed: 0.9, color: '#ff6bd0' },
      { center: new THREE.Vector3(9, 1.2, 2), r: 1.9, speed: 0.7, color: '#ffd36b' },
    ],
    []
  )
  const refs = useRef<THREE.Group[]>([])
  const wings = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    flyers.forEach((f, i) => {
      const g = refs.current[i]
      if (g) {
        const a = t * f.speed + i * 2
        g.position.set(f.center.x + Math.cos(a) * f.r, f.center.y + Math.sin(a * 1.7) * 0.4, f.center.z + Math.sin(a) * f.r)
        g.rotation.y = -a
      }
      const w = wings.current[i]
      if (w) w.scale.x = 0.5 + Math.abs(Math.sin(t * 12 + i)) * 0.6
    })
  })
  return (
    <group>
      {flyers.map((f, i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g }}>
          <mesh ref={(w) => { if (w) wings.current[i] = w }}>
            <planeGeometry args={[0.34, 0.22]} />
            <meshBasicMaterial color={f.color} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Walkway + signposts                                                 */
/* ------------------------------------------------------------------ */

const WALK_A = new THREE.Vector3(1.5, 0.36, 8)
const WALK_B = new THREE.Vector3(7.0, 0.36, -1.0)

function GardenWalkway() {
  const planks = useMemo(() => {
    const count = 22
    const dir = new THREE.Vector3().subVectors(WALK_B, WALK_A)
    const yaw = Math.atan2(dir.x, dir.z)
    const p = new THREE.Vector3()
    return {
      yaw,
      spots: Array.from({ length: count }).map((_, i) => {
        const t = (i + 0.5) / count
        p.copy(WALK_A).lerp(WALK_B, t)
        return [p.x, p.y, p.z] as [number, number, number]
      }),
    }
  }, [])
  const mats = useRef<THREE.MeshStandardMaterial[]>([])
  useFrame(() => {
    const time = performance.now() * 0.0016
    mats.current.forEach((m, i) => {
      if (!m) return
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 - (i / 22) * Math.PI * 2)
      m.emissiveIntensity = 1.1 + pulse * 1.8
    })
  })
  return (
    <group>
      {planks.spots.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, planks.yaw, 0]}>
          <boxGeometry args={[1.8, 0.12, 0.32]} />
          <meshStandardMaterial
            ref={(m) => { if (m) mats.current[i] = m }}
            color="#b83f9f"
            emissive="#ff6bd0"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function GardenSignposts() {
  const signs: { pos: [number, number, number]; title: string; sub: string; rot: number }[] = [
    { pos: [-4.5, 0, 11], title: 'Policy Tower', sub: 'Completed ✓', rot: 0.4 },
    { pos: [-2.5, 0, 12], title: 'Ecosystem Garden', sub: 'You are here', rot: 0.2 },
  ]
  return (
    <group>
      {signs.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, s.rot, 0]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 1.4, 6]} />
            <meshStandardMaterial color="#3a2a1a" roughness={1} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <boxGeometry args={[1.7, 0.7, 0.08]} />
            <meshStandardMaterial color="#4a3320" roughness={0.95} />
          </mesh>
          <Billboard position={[0, 1.35, 0.08]}>
            <Text fontSize={0.18} color="#ffe9c9" anchorX="center" anchorY="middle" maxWidth={1.5}>{s.title}</Text>
            <Text position={[0, -0.24, 0]} fontSize={0.13} color="#8affc9" anchorX="center" anchorY="middle">{s.sub}</Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}

/* shared plaza glow (local copy) */
function PlazaGlow({ position, radius, color }: { position: [number, number, number]; radius: number; color: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.4, 'rgba(150,120,255,0.24)')
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
