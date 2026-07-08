import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { Ambiance } from './Ambiance'
import { ValleyDecor } from './ValleyDecor'
import { RoutePath } from './Environment'

/**
 * World 04 · Policy Tower — the region beyond the Policy Bridge. It stages sequential
 * decision-making: the Policy Tower structure on the left (Guide Astra narrates in front of it),
 * a Bandit Lab console on the right (a literal multi-armed machine), a Beam-Search holo board and
 * a Slate Generator arcade in the foreground, steampunk pipe-works threading the plaza, and the
 * Garden Gate leading onward. A warm brass-and-violet steampunk palette matches the reference.
 */
export function PolicyTower() {
  return (
    <>
      <TowerBackground />

      {/* lighting — violet key with a warmer brass fill for the steampunk read */}
      <ambientLight intensity={0.6} color="#b199e6" />
      <hemisphereLight args={['#c4a6ff', '#2a1d40', 1.0]} />
      <directionalLight
        position={[10, 22, 8]}
        intensity={1.5}
        color="#ffefe0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0004}
      />
      {/* violet key over the Policy Tower, amber key over the Bandit Lab console */}
      <pointLight position={[-6, 9, -3]} intensity={40} color="#b06bff" distance={30} />
      <pointLight position={[9, 8, -3]} intensity={32} color="#ffb04f" distance={26} />
      {/* warm read light where Astra stands */}
      <pointLight position={[-6.5, 4, 4]} intensity={18} color="#ffca82" distance={13} />
      {/* rim from behind the gate for silhouette */}
      <pointLight position={[2, 8, -16]} intensity={38} color="#7b6bff" distance={34} />

      <TowerTerrain />
      <TowerBoundaries />

      <ValleyDecor />

      {/* Policy Tower structure + floating crystal + label (behind Astra, center-left) */}
      <PolicyTowerStructure />

      {/* Bandit Lab — the multi-armed machine console with a glowing entrance (right) */}
      <BanditConsole />

      {/* Beam-Search holo board + Slate Generator arcade in the foreground */}
      <BeamSearchBoard position={[-1.5, 0, 6.4]} />
      <SlateGenerator position={[3.4, 0, 5.6]} />

      {/* the glowing purple walkway threading from the arrival toward the lab */}
      <TowerWalkway />

      {/* completed-region signposts */}
      <TowerSignposts />

      {/* GLB props behind their own Suspense so the primitive scene never blanks while they load */}
      <Suspense fallback={null}>
        {/* the Policy Tower building itself (Meshy) as the physical structure */}
        <MeshyProp url="/models/props/policy-tower.glb" position={[-7, 0, -3.8]} targetHeight={9.5} rotationY={0.15} emissiveBoost={0.42} solid colliderScale={0.4} />
        {/* multi-armed bandit machine (Meshy) at the Bandit Lab mark */}
        <MeshyProp url="/models/props/bandit-machine.glb" position={[9, 0, -2.4]} targetHeight={2.6} rotationY={-0.35} emissiveBoost={0.5} solid colliderScale={0.5} />
        {/* steampunk pipe-works clusters for the industrial vibe */}
        <MeshyProp url="/models/props/pipeworks.glb" position={[-12.5, 0, -2]} targetHeight={4.2} rotationY={0.5} emissiveBoost={0.4} solid colliderScale={0.4} />
        <MeshyProp url="/models/props/pipeworks.glb" position={[13.5, 0, -6]} targetHeight={3.8} rotationY={-0.9} emissiveBoost={0.4} solid colliderScale={0.4} />
        <MeshyProp url="/models/props/pipeworks.glb" position={[-3, 0, -9]} targetHeight={3.2} rotationY={1.4} emissiveBoost={0.4} solid colliderScale={0.4} />
        {/* reused decorative props */}
        <MeshyProp url="/models/props/crystal-shards.glb" position={[-13.5, 0, 5]} targetHeight={2.6} rotationY={0.3} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/crystal-shards.glb" position={[13.6, 0, 5]} targetHeight={2.3} rotationY={-0.8} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[-4.5, 0, 8.6]} targetHeight={1.5} rotationY={0.5} emissiveBoost={0.3} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-2.4, 2.7, -2.5]} targetHeight={0.95} idleMotion />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[6.5, 2.5, -6]} targetHeight={0.95} idleMotion />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[-15, 0, 8]} targetHeight={6.0} rotationY={0.4} tint="#2a2050" tintAmount={0.5} solid colliderScale={0.3} />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[16, 0, 9]} targetHeight={6.5} rotationY={-1.0} tint="#2a2050" tintAmount={0.5} solid colliderScale={0.3} />
      </Suspense>

      <Ambiance />
      <RoutePath world="policy-tower" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Background + terrain                                                */
/* ------------------------------------------------------------------ */

function TowerBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#0b0820')
    g.addColorStop(0.5, '#1b1246')
    g.addColorStop(0.8, '#361f5e')
    g.addColorStop(1, '#5a3568')
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

const TR = 24

function TowerTerrain() {
  return (
    <group>
      {/* deep physics slab (top at y≈0, extends to -6) so a fast body can't tunnel through */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, TR]} position={[1, -3, -2]} />
      </RigidBody>

      <mesh position={[1, 0, -2]} receiveShadow>
        <cylinderGeometry args={[TR, TR, 0.6, 64]} />
        <meshStandardMaterial color="#2a2050" roughness={0.92} metalness={0.06} />
      </mesh>
      <mesh position={[1, -3.4, -2]}>
        <cylinderGeometry args={[TR - 0.5, TR - 8, 6.4, 48]} />
        <meshStandardMaterial color="#1a1440" roughness={1} />
      </mesh>
      <mesh position={[1, -8.5, -2]}>
        <coneGeometry args={[TR - 8, 8, 40]} />
        <meshStandardMaterial color="#100b28" roughness={1} />
      </mesh>

      <PlazaGlow position={[2, 0.32, -3]} radius={15} color="#8a5fd0" />
      <mesh position={[2, 0.33, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.6, 14.2, 64]} />
        <meshBasicMaterial color="#b07bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <TowerRimRocks />
    </group>
  )
}

function TowerRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = TR - 1.4 + ((i * 37) % 5) * 0.5
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
          <meshStandardMaterial color={i % 3 === 0 ? '#2e2458' : '#221c48'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function TowerBoundaries() {
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
/* Policy Tower structure — floating crystal + label                   */
/* ------------------------------------------------------------------ */

function PolicyTowerStructure() {
  const crystalRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (crystalRef.current) {
      const t = state.clock.elapsedTime
      crystalRef.current.rotation.y = t * 0.5
      crystalRef.current.position.y = 8.6 + Math.sin(t) * 0.18
    }
  })
  return (
    <group position={[-7, 0, -3.8]}>
      {/* the giant glowing violet crystal crowning the tower (matches the reference) */}
      <mesh ref={crystalRef} position={[0, 8.6, 0]}>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#c06bff" emissive="#c06bff" emissiveIntensity={1.7} toneMapped={false} transparent opacity={0.88} />
      </mesh>
      <pointLight position={[0, 8.6, 0]} intensity={12} color="#c06bff" distance={10} />

      <Billboard position={[0, 6.4, 0]}>
        <Text fontSize={0.55} color="#f2eaff" anchorX="center" outlineWidth={0.018} outlineColor="#140b26">
          Policy Tower
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Bandit Lab console — multi-armed machine entrance                   */
/* ------------------------------------------------------------------ */

function BanditConsole() {
  const arms = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (arms.current) {
      const t = state.clock.elapsedTime
      arms.current.children.forEach((c, i) => {
        c.rotation.x = Math.sin(t * 1.6 + i * 1.3) * 0.5
      })
    }
  })
  return (
    <group position={[9, 0, -1.5]}>
      {/* three glowing "levers" hovering above the machine — the multi-armed bandit motif */}
      <group ref={arms} position={[0, 2.2, 0.6]}>
        {[-0.7, 0, 0.7].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
            <meshStandardMaterial color="#ffcf6b" emissive="#ffb04f" emissiveIntensity={1.3} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* glowing entrance ring (the "Press E") */}
      <mesh position={[0, 1.3, 0.9]} rotation={[-0.2, 0, 0]}>
        <torusGeometry args={[0.85, 0.1, 12, 36]} />
        <meshBasicMaterial color="#ffb04f" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.6, 1.2]} intensity={12} color="#ffb867" distance={7} />
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.42} color="#fff0dc" anchorX="center" outlineWidth={0.014} outlineColor="#231206">
          Bandit Lab
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Beam-Search holo board                                              */
/* ------------------------------------------------------------------ */

// a small beam-search tree: 1 root → 2 → 4 → keep the top beams (highlighted leaves)
const BEAM_LEVELS: { y: number; xs: number[]; keep?: number[] }[] = [
  { y: 1.9, xs: [0] },
  { y: 1.2, xs: [-0.7, 0.7] },
  { y: 0.5, xs: [-1.2, -0.4, 0.4, 1.2], keep: [0, 2] },
]

function BeamSearchBoard({ position }: { position: [number, number, number] }) {
  const glow = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    glow.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.0 + Math.sin(t * 2.5 - i * 0.6) * 0.6
    })
  })
  const nodes = useMemo(() => {
    const out: { x: number; y: number; keep: boolean }[] = []
    for (const lvl of BEAM_LEVELS) {
      lvl.xs.forEach((x, i) => out.push({ x, y: lvl.y, keep: !!lvl.keep?.includes(i) }))
    }
    return out
  }, [])
  const links = useMemo(() => {
    const pts: number[] = []
    // root → level 1
    for (const x of BEAM_LEVELS[1].xs) pts.push(0, 1.9, 0.01, x, 1.2, 0.01)
    // level 1 → level 2
    BEAM_LEVELS[2].xs.forEach((x, i) => {
      const parent = i < 2 ? -0.7 : 0.7
      pts.push(parent, 1.2, 0.01, x, 0.5, 0.01)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      {/* frame + holo backing */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[3.4, 2.6, 0.14]} />
        <meshStandardMaterial color="#241a44" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.3, 0.09]}>
        <planeGeometry args={[3.1, 2.3]} />
        <meshBasicMaterial color="#150e30" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <Text position={[0, 2.28, 0.11]} fontSize={0.24} color="#eadcff" anchorX="center">Beam Search</Text>

      <group position={[0, 0, 0.12]}>
        <lineSegments geometry={links}>
          <lineBasicMaterial color="#b79bff" transparent opacity={0.55} toneMapped={false} />
        </lineSegments>
        {nodes.map((n, i) => (
          <mesh key={i} position={[n.x, n.y, 0]} ref={(m) => { if (m) glow.current[i] = m }}>
            <sphereGeometry args={[n.keep ? 0.13 : 0.1, 16, 16]} />
            <meshStandardMaterial
              color={n.keep ? '#ff6bd0' : '#8f6bff'}
              emissive={n.keep ? '#ff6bd0' : '#8f6bff'}
              emissiveIntensity={1.2}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* "Top Beams" kept slots */}
        <Text position={[0, 0.02, 0]} fontSize={0.14} color="#ffb3e6" anchorX="center">Top Beams ★</Text>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Slate Generator arcade console                                      */
/* ------------------------------------------------------------------ */

function SlateGenerator({ position }: { position: [number, number, number] }) {
  const cells = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    cells.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.4 + Math.max(0, Math.sin(t * 1.8 - i * 1.1)) * 1.6
    })
  })
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      {/* cabinet */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.5, 1.1, 0.8]} />
        <meshStandardMaterial color="#2a1c14" roughness={0.6} metalness={0.35} />
      </mesh>
      {/* angled screen */}
      <mesh position={[0, 1.2, 0.18]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.25, 0.72, 0.06]} />
        <meshStandardMaterial color="#0e1030" emissive="#2a3a8f" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <Billboard position={[0, 1.95, 0]}>
        <Text fontSize={0.2} color="#cfe0ff" anchorX="center">Slate Generator</Text>
        <Text position={[0, -0.26, 0]} fontSize={0.12} color="#7fb0ff" anchorX="center">Generate Candidate Slates</Text>
      </Billboard>
      {/* three candidate-slate cells that light up in sequence */}
      <group position={[0, 1.2, 0.42]} rotation={[-0.5, 0, 0]}>
        {[-0.34, 0, 0.34].map((x, i) => (
          <mesh key={x} position={[x, -0.12, 0]} ref={(m) => { if (m) cells.current[i] = m }}>
            <boxGeometry args={[0.22, 0.22, 0.04]} />
            <meshStandardMaterial color="#6bd0ff" emissive="#6bd0ff" emissiveIntensity={0.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Walkway + signposts                                                 */
/* ------------------------------------------------------------------ */

const WALK_A = new THREE.Vector3(1.5, 0.36, 8)
const WALK_B = new THREE.Vector3(7.5, 0.36, -1.5)

function TowerWalkway() {
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
            color="#7b3ff7"
            emissive="#b06bff"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function TowerSignposts() {
  const signs: { pos: [number, number, number]; title: string; sub: string; rot: number }[] = [
    { pos: [-4.5, 0, 11], title: 'Sequential City', sub: 'Completed ✓', rot: 0.4 },
    { pos: [-2.5, 0, 12], title: 'Policy Tower', sub: 'You are here', rot: 0.2 },
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
