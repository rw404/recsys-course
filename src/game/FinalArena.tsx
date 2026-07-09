import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { GroundDressing } from './GroundDressing'
import { worldTheme } from './worldThemes'
import { Ambiance } from './Ambiance'
import { RoutePath } from './Environment'
import { useProgress } from '../state/progress'
import { HALL_OF_MASTERY, capstoneRank } from '../data/course'

/**
 * World 06 · Final Arena — the capstone region, beyond the Final Arena Gate. A grand royal colosseum
 * under a night sky: a glowing victory portal (the capstone entrance), a Hall of Mastery leaderboard,
 * crown-topped banners, a champion podium with a trophy, torch-lit stands and celebratory fireworks
 * (which erupt once the course is completed). Guide Astra delivers the closing recap under the arena
 * (rendered by ArenaLessonStage).
 */
export function FinalArena() {
  return (
    <>
      <ArenaBackground />

      {/* lighting — royal violet with warm gold torch fill */}
      <ambientLight intensity={0.55} color="#a596e6" />
      <hemisphereLight args={['#c0a6ff', '#241a3e', 1.0]} />
      <directionalLight
        position={[6, 22, 12]}
        intensity={1.4}
        color="#efe6ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0004}
      />
      {/* violet key over the arena, gold fill over the podium, portal glow */}
      <pointLight position={[9, 10, -6]} intensity={40} color="#b06bff" distance={30} />
      <pointLight position={[3, 6, 2]} intensity={22} color="#ffcf6b" distance={20} />
      <pointLight position={[9, 4, -1]} intensity={20} color="#c86bff" distance={12} />
      <pointLight position={[-6.5, 4, 4]} intensity={16} color="#ffca82" distance={13} />
      <pointLight position={[2, 8, -16]} intensity={34} color="#7b6bff" distance={34} />

      <ArenaTerrain />
      <GroundDressing theme={worldTheme('final-arena')} center={[1, 0, -2]} radius={21} />
      <ArenaBoundaries />

      {/* the glowing victory portal — the capstone challenge entrance (at the arena node) */}
      <VictoryPortal position={[9, 0, -1.5]} />

      {/* Hall of Mastery leaderboard (right) */}
      <HallOfMasteryBoard position={[13.5, 0, 3]} />

      {/* crown-topped banners flanking the approach */}
      <ChampionBanners />

      {/* champion podium + trophy + fireworks (center-front) */}
      <ChampionPodium position={[3.4, 0, 2.2]} />

      {/* torch-lit celebratory fireworks over the arena */}
      <Fireworks />

      {/* walkway + signposts */}
      <ArenaWalkway />
      <ArenaSignposts />

      {/* GLB props behind their own Suspense so the primitive scene never blanks while they load */}
      <Suspense fallback={null}>
        {/* the grand colosseum arena (Meshy) as the back-drop structure */}
        <MeshyProp url="/models/props/final-arena.glb" position={[10, 0, -7]} targetHeight={10} rotationY={-0.35} emissiveBoost={0.42} solid colliderScale={0.5} />
        {/* triumphal arch framing the portal (Meshy) */}
        <MeshyProp url="/models/props/triumph-arch.glb" position={[9, 0, -3.4]} targetHeight={6.5} rotationY={0} emissiveBoost={0.5} solid colliderScale={0.35} />
        {/* the champion trophy on the podium (Meshy) */}
        <MeshyProp url="/models/props/champion-trophy.glb" position={[3.4, 1.2, 2.2]} targetHeight={1.5} rotationY={0.3} emissiveBoost={0.6} idleMotion />
        {/* reused decorative props */}
        <MeshyProp url="/models/props/crystal-shards.glb" position={[-13, 0, 5]} targetHeight={2.6} rotationY={0.3} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/crystal-shards.glb" position={[13.6, 0, 7]} targetHeight={2.3} rotationY={-0.8} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-2.4, 2.7, -2.5]} targetHeight={0.95} idleMotion />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[6.5, 2.5, -6]} targetHeight={0.95} idleMotion />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[-15, 0, 8]} targetHeight={6.0} rotationY={0.4} tint="#2a2050" tintAmount={0.5} solid colliderScale={0.3} />
        <MeshyProp url="/models/props/hero-tree.glb" position={[-12, 0, 6]} targetHeight={7.5} rotationY={0.5} tint="#5a3a90" tintAmount={0.45} emissiveBoost={0.3} solid colliderScale={0.25} />
      </Suspense>

      <Ambiance />
      <RoutePath world="final-arena" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Background + terrain                                                */
/* ------------------------------------------------------------------ */

function ArenaBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#0a0820')
    g.addColorStop(0.5, '#181044')
    g.addColorStop(0.82, '#2e1f5e')
    g.addColorStop(1, '#4a2f72')
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

const AR = 24

function ArenaTerrain() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, AR]} position={[1, -3, -2]} />
      </RigidBody>

      <mesh position={[1, 0, -2]} receiveShadow>
        <cylinderGeometry args={[AR, AR, 0.6, 64]} />
        <meshStandardMaterial color="#2a2350" roughness={0.9} metalness={0.06} />
      </mesh>
      <mesh position={[1, -3.4, -2]}>
        <cylinderGeometry args={[AR - 0.5, AR - 8, 6.4, 48]} />
        <meshStandardMaterial color="#191340" roughness={1} />
      </mesh>
      <mesh position={[1, -8.5, -2]}>
        <coneGeometry args={[AR - 8, 8, 40]} />
        <meshStandardMaterial color="#0e0a26" roughness={1} />
      </mesh>

      {/* ceremonial gold ring inlaid in the plaza */}
      <mesh position={[2, 0.33, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12.4, 13.0, 64]} />
        <meshBasicMaterial color="#e6b85a" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <PlazaGlow position={[2, 0.32, -3]} radius={15} color="#8a5fd0" />

      <ArenaRimRocks />
    </group>
  )
}

function ArenaRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = AR - 1.4 + ((i * 37) % 5) * 0.5
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
          <meshStandardMaterial color={i % 3 === 0 ? '#2a2352' : '#211b46'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function ArenaBoundaries() {
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
/* Victory portal — the capstone entrance                              */
/* ------------------------------------------------------------------ */

function VictoryPortal({ position }: { position: [number, number, number] }) {
  const swirl = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (swirl.current) {
      swirl.current.rotation.z = t * 0.8
      const mat = swirl.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(t * 2) * 0.2
    }
    if (ring.current) ring.current.rotation.z = -t * 0.5
  })
  return (
    <group position={position}>
      {/* portal disc */}
      <mesh ref={swirl} position={[0, 1.8, 0]}>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#c26bff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 1.8, 0.05]}>
        <torusGeometry args={[1.55, 0.12, 12, 44]} />
        <meshBasicMaterial color="#e0a6ff" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.8, -0.05]}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color="#5a2f90" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.8, 0.6]} intensity={16} color="#c86bff" distance={9} />
      <Billboard position={[0, 4.0, 0]}>
        <Text fontSize={0.5} color="#f2eaff" anchorX="center" outlineWidth={0.018} outlineColor="#140b26">
          Final Arena
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Hall of Mastery leaderboard                                         */
/* ------------------------------------------------------------------ */

function HallOfMasteryBoard({ position }: { position: [number, number, number] }) {
  const best = useProgress((s) => s.capstoneScore)
  const rank = best > 0 ? capstoneRank(best) : null
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      {/* posts */}
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 3, 6]} />
          <meshStandardMaterial color="#3a2a1a" roughness={1} />
        </mesh>
      ))}
      {/* board */}
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[4.4, 2.9, 0.16]} />
        <meshStandardMaterial color="#241a44" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.9, 0.09]}>
        <planeGeometry args={[4.1, 2.6]} />
        <meshBasicMaterial color="#150e30" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <Billboard position={[0, 4.3, 0.12]} follow={false}>
        <Text fontSize={0.26} color="#ffd98a" anchorX="center" outlineWidth={0.01} outlineColor="#140b26">
          ♛ Hall of Mastery
        </Text>
      </Billboard>
      <group position={[0, 3.55, 0.12]}>
        {HALL_OF_MASTERY.map((e, i) => (
          <group key={e.name} position={[0, -i * 0.4, 0]}>
            <Text position={[-1.8, 0, 0]} fontSize={0.2} color={i === 0 ? '#ffd98a' : '#cdbff2'} anchorX="left">
              {`${i + 1}. ${e.name}`}
            </Text>
            <Text position={[1.8, 0, 0]} fontSize={0.2} color="#eadcff" anchorX="right">
              {e.score.toLocaleString()}
            </Text>
          </group>
        ))}
        <mesh position={[0, -2.02, 0]}>
          <planeGeometry args={[3.9, 0.02]} />
          <meshBasicMaterial color="#6a5a9f" toneMapped={false} />
        </mesh>
        <Text position={[-1.8, -2.34, 0]} fontSize={0.2} color="#8affc9" anchorX="left">
          Your Best
        </Text>
        <Text position={[1.8, -2.34, 0]} fontSize={0.2} color="#8affc9" anchorX="right">
          {best > 0 ? `${best.toLocaleString()}  (#${rank})` : '—'}
        </Text>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Crown banners                                                       */
/* ------------------------------------------------------------------ */

function ChampionBanners() {
  const spots: { pos: [number, number, number]; rot: number }[] = [
    { pos: [4.8, 0, -3.5], rot: 0.2 },
    { pos: [13.2, 0, -3.5], rot: -0.2 },
    { pos: [-3.5, 0, -1], rot: 0.5 },
  ]
  const flags = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    flags.current.forEach((m, i) => {
      if (m) m.rotation.y = Math.sin(t * 1.5 + i) * 0.12
    })
  })
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, s.rot, 0]}>
          <mesh position={[0, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 4.8, 8]} />
            <meshStandardMaterial color="#4a3a1a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* crown finial */}
          <mesh position={[0, 4.9, 0]}>
            <coneGeometry args={[0.18, 0.3, 5]} />
            <meshStandardMaterial color="#ffd36b" emissive="#ffb04f" emissiveIntensity={1.0} metalness={0.8} roughness={0.2} toneMapped={false} />
          </mesh>
          {/* hanging banner */}
          <mesh ref={(m) => { if (m) flags.current[i] = m }} position={[0, 3.3, 0.05]}>
            <planeGeometry args={[0.9, 2.2]} />
            <meshStandardMaterial color="#5a2f9f" emissive="#7b3ff7" emissiveIntensity={0.5} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          {/* gold laurel emblem */}
          <mesh position={[0, 3.5, 0.08]}>
            <torusGeometry args={[0.28, 0.05, 8, 20]} />
            <meshStandardMaterial color="#e6b85a" emissive="#e6b85a" emissiveIntensity={0.7} metalness={0.7} roughness={0.3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Champion podium + trophy                                            */
/* ------------------------------------------------------------------ */

function ChampionPodium({ position }: { position: [number, number, number] }) {
  const crowns = useRef<THREE.Group>(null)
  const done = useProgress((s) => s.completed['champion'])
  useFrame((state) => {
    if (crowns.current) {
      const t = state.clock.elapsedTime
      crowns.current.rotation.y = t * 0.6
      crowns.current.children.forEach((c, i) => {
        c.position.y = 2.6 + Math.sin(t * 1.5 + i * 2) * 0.12
      })
    }
  })
  return (
    <group position={position}>
      {/* tiered pedestal */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.3, 0.5, 24]} />
        <meshStandardMaterial color="#2e2450" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.85, 1.0, 0.5, 24]} />
        <meshStandardMaterial color="#3a2d5e" roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial color="#e6b85a" transparent opacity={done ? 0.9 : 0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* floating crowns (brighter once the course is completed) */}
      <group ref={crowns}>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2
          return (
            <mesh key={k} position={[Math.cos(a) * 0.9, 2.6, Math.sin(a) * 0.9]}>
              <coneGeometry args={[0.14, 0.22, 5]} />
              <meshStandardMaterial color="#ffd36b" emissive="#ffb04f" emissiveIntensity={done ? 1.6 : 0.8} metalness={0.8} roughness={0.2} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
      <pointLight position={[0, 2.2, 0]} intensity={done ? 14 : 7} color="#ffcf6b" distance={7} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Fireworks (celebratory, erupt on completion)                        */
/* ------------------------------------------------------------------ */

function Fireworks() {
  const done = useProgress((s) => s.completed['champion'])
  const bursts = useMemo(() => {
    const palette = ['#ff6bd0', '#6bd0ff', '#ffd36b', '#8affc9', '#c08bff']
    return Array.from({ length: 5 }).map((_, i) => {
      const geo = new THREE.BufferGeometry()
      const N = 40
      const pos = new Float32Array(N * 3)
      const dir = new Float32Array(N * 3)
      for (let p = 0; p < N; p++) {
        const th = Math.acos(2 * ((p + 0.5) / N) - 1)
        const ph = p * 2.399
        const dx = Math.sin(th) * Math.cos(ph)
        const dy = Math.abs(Math.cos(th)) * 0.9 + 0.2
        const dz = Math.sin(th) * Math.sin(ph)
        dir[p * 3] = dx; dir[p * 3 + 1] = dy; dir[p * 3 + 2] = dz
        pos[p * 3] = 0; pos[p * 3 + 1] = 0; pos[p * 3 + 2] = 0
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      return {
        geo, dir,
        origin: new THREE.Vector3(4 + i * 2.4, 7 + (i % 3), -7 - (i % 2) * 2),
        color: palette[i % palette.length],
        phase: i * 0.7,
      }
    })
  }, [])
  const pts = useRef<THREE.Points[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    bursts.forEach((b, i) => {
      const pt = pts.current[i]
      if (!pt) return
      const life = ((t + b.phase) % 2.4) / 2.4 // 0..1
      const attr = b.geo.getAttribute('position') as THREE.BufferAttribute
      const spread = life * 3.2
      for (let p = 0; p < b.dir.length / 3; p++) {
        attr.setXYZ(p, b.dir[p * 3] * spread, b.dir[p * 3 + 1] * spread - life * life * 1.6, b.dir[p * 3 + 2] * spread)
      }
      attr.needsUpdate = true
      const mat = pt.material as THREE.PointsMaterial
      mat.opacity = (done ? 0.9 : 0.4) * (1 - life)
      mat.size = 0.16 + life * 0.1
    })
  })
  return (
    <group>
      {bursts.map((b, i) => (
        <points key={i} frustumCulled={false} ref={(p) => { if (p) pts.current[i] = p }} geometry={b.geo} position={b.origin}>
          <pointsMaterial color={b.color} size={0.18} transparent opacity={0.5} sizeAttenuation depthWrite={false} toneMapped={false} />
        </points>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Walkway + signposts                                                 */
/* ------------------------------------------------------------------ */

const WALK_A = new THREE.Vector3(1.5, 0.36, 8)
const WALK_B = new THREE.Vector3(8.0, 0.36, -0.5)

function ArenaWalkway() {
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

function ArenaSignposts() {
  const signs: { pos: [number, number, number]; title: string; sub: string; rot: number }[] = [
    { pos: [-4.5, 0, 11], title: 'Ecosystem Garden', sub: 'Completed ✓', rot: 0.4 },
    { pos: [-2.5, 0, 12], title: 'Final Arena', sub: 'You are here', rot: 0.2 },
    { pos: [4.5, 0, 6], title: 'Compete', sub: 'Test & climb', rot: -0.5 },
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
    g.addColorStop(0.4, 'rgba(160,120,255,0.24)')
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
