import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { MeshyProp } from './MeshyProp'
import { GroundDressing } from './GroundDressing'
import { worldTheme } from './worldThemes'
import { Ambiance } from './Ambiance'
import { ValleyDecor } from './ValleyDecor'
import { RoutePath } from './Environment'

/**
 * World 03 · Sequential City — the region beyond the Two-Tower Gate. It stages the Transformer:
 * a Transformer Tower gateway on the left (with the block-component list Embed → Multi-Head
 * Attention → Add & Norm → Feed-Forward → Layer Norm), a domed Flash Attention Lab on the right,
 * a ground Query/Key/Value/Output attention diagram in the foreground, and the Retrieval Bridge
 * leading onward. Guide Astra narrates from in front of the tower (rendered by <CityLessonStage/>).
 */
export function SequentialCity() {
  return (
    <>
      <CityBackground />

      {/* lighting — deep violet, a touch cooler/darker than the valley */}
      <ambientLight intensity={0.62} color="#9a8ce6" />
      <hemisphereLight args={['#b6a6ff', '#241a44', 1.0]} />
      <directionalLight
        position={[10, 22, 8]}
        intensity={1.5}
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
      {/* violet key over the Transformer Tower, cyan key over the Flash Attention Lab */}
      <pointLight position={[-6, 8, -3]} intensity={36} color="#a86bff" distance={28} />
      <pointLight position={[9, 8, -3]} intensity={34} color="#6ba8ff" distance={28} />
      {/* warm read light where Astra stands */}
      <pointLight position={[-6.5, 4, 4]} intensity={18} color="#ffca82" distance={13} />
      {/* rim from behind the gate for silhouette */}
      <pointLight position={[2, 8, -16]} intensity={38} color="#7b6bff" distance={34} />

      <CityTerrain />
      <GroundDressing theme={worldTheme('sequential-city')} center={[1, 0, -2]} radius={21} />
      <CityBoundaries />

      <ValleyDecor />

      {/* Transformer Tower gateway + the block-component holo list (behind Astra, center-left) */}
      <TransformerTower />

      {/* Flash Attention Lab — the domed building with a glowing portal (right) */}
      <FlashAttentionLab />

      {/* ground Query/Key/Value/Output attention diagram (foreground) */}
      <QKVDiagram position={[0.5, 0, 6.5]} />

      {/* the glowing purple walkway threading from the arrival toward the lab */}
      <CityWalkway />

      {/* completed-region signposts */}
      <CitySignposts />

      {/* GLB props behind their own Suspense so the primitive scene never blanks while they load */}
      <Suspense fallback={null}>
        {/* ornate gateway arch (Meshy) as the Transformer Tower's physical structure */}
        <MeshyProp url="/models/props/transformer-gate.glb" position={[-7, 0, -3.5]} targetHeight={7.5} rotationY={0} emissiveBoost={0.45} solid colliderScale={0.4} />
        {/* domed Flash Attention Lab building (Meshy) */}
        <MeshyProp url="/models/props/flash-dome.glb" position={[10.5, 0, -4]} targetHeight={7.8} rotationY={-0.5} emissiveBoost={0.45} solid colliderScale={0.55} />
        {/* floating arcane orb centrepiece over the QKV diagram (Meshy) */}
        <MeshyProp url="/models/props/arcane-orb.glb" position={[0.5, 2.4, 6.5]} targetHeight={1.6} rotationY={0.4} emissiveBoost={0.5} idleMotion />
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
      <RoutePath world="sequential-city" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Background + terrain                                                */
/* ------------------------------------------------------------------ */

function CityBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#0a0722')
    g.addColorStop(0.55, '#171040')
    g.addColorStop(0.82, '#2c1e5a')
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

const CR = 24

function CityTerrain() {
  return (
    <group>
      {/* deep physics slab (top at y≈0, extends to -6) so a fast body can't tunnel through */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, CR]} position={[1, -3, -2]} />
      </RigidBody>

      <mesh position={[1, 0, -2]} receiveShadow>
        <cylinderGeometry args={[CR, CR, 0.6, 64]} />
        <meshStandardMaterial color="#241c50" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh position={[1, -3.4, -2]}>
        <cylinderGeometry args={[CR - 0.5, CR - 8, 6.4, 48]} />
        <meshStandardMaterial color="#171238" roughness={1} />
      </mesh>
      <mesh position={[1, -8.5, -2]}>
        <coneGeometry args={[CR - 8, 8, 40]} />
        <meshStandardMaterial color="#0e0a26" roughness={1} />
      </mesh>

      <PlazaGlow position={[2, 0.32, -3]} radius={15} color="#7a5fd0" />
      <mesh position={[2, 0.33, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.6, 14.2, 64]} />
        <meshBasicMaterial color="#a07bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <CityRimRocks />
    </group>
  )
}

function CityRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = CR - 1.4 + ((i * 37) % 5) * 0.5
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
          <meshStandardMaterial color={i % 3 === 0 ? '#282050' : '#1e1842'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function CityBoundaries() {
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
/* Transformer Tower — block-component holo list                       */
/* ------------------------------------------------------------------ */

const BLOCKS = ['Embed', 'Multi-Head Attention', 'Add & Norm', 'Feed Forward', 'Layer Norm']

function TransformerTower() {
  const cubeRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (cubeRef.current) {
      const t = state.clock.elapsedTime
      cubeRef.current.rotation.y = t * 0.5
      cubeRef.current.rotation.x = Math.sin(t * 0.4) * 0.2
      cubeRef.current.position.y = 6.4 + Math.sin(t) * 0.15
    }
  })
  return (
    <group position={[-7, 0, -3.5]}>
      {/* glowing crystal cube floating above the gate (matches the reference) */}
      <mesh ref={cubeRef} position={[0, 6.4, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#b06bff" emissive="#b06bff" emissiveIntensity={1.6} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, 6.4, 0]} intensity={10} color="#b06bff" distance={8} />

      {/* the transformer block-component list, as stacked glowing holo cards on the tower face */}
      <group position={[0, 4.3, 0.9]}>
        {BLOCKS.map((label, i) => (
          <group key={label} position={[0, -i * 0.72, 0]}>
            <mesh>
              <planeGeometry args={[2.5, 0.6]} />
              <meshBasicMaterial color="#2a1f5a" transparent opacity={0.72} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[2.5, 0.6]} />
              <meshBasicMaterial color="#8f6bff" transparent opacity={0.12} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <Text position={[0, 0, 0.02]} fontSize={0.24} color="#eadcff" anchorX="center" anchorY="middle" maxWidth={2.3}>
              {label}
            </Text>
          </group>
        ))}
      </group>

      <Billboard position={[0, 7.6, 0]}>
        <Text fontSize={0.5} color="#eaf0ff" anchorX="center" outlineWidth={0.016} outlineColor="#0b0e24">
          Transformer Tower
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Flash Attention Lab — glowing portal                                */
/* ------------------------------------------------------------------ */

function FlashAttentionLab() {
  const portal = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (portal.current) {
      const t = state.clock.elapsedTime
      portal.current.rotation.z = t * 0.6
      const mat = portal.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.6 + Math.sin(t * 2) * 0.2
    }
  })
  return (
    <group position={[9, 0, -1.5]}>
      {/* glowing portal ring (the "Press E" entrance) */}
      <mesh position={[0, 1.4, 0]} ref={portal}>
        <torusGeometry args={[1.0, 0.12, 12, 40]} />
        <meshBasicMaterial color="#6bd0ff" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.4, -0.05]}>
        <circleGeometry args={[0.95, 32]} />
        <meshBasicMaterial color="#3a6bd0" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.4, 0.4]} intensity={12} color="#6bd0ff" distance={7} />
      <Billboard position={[0, 3.4, 0]}>
        <Text fontSize={0.5} color="#eaf0ff" anchorX="center" outlineWidth={0.016} outlineColor="#0b0e24">
          Flash Attention Lab
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Query / Key / Value / Output ground diagram                         */
/* ------------------------------------------------------------------ */

function QKVDiagram({ position }: { position: [number, number, number] }) {
  const cols: { label: string; color: string; dx: number }[] = [
    { label: 'Query', color: '#ff6bd0', dx: -2.4 },
    { label: 'Key', color: '#b06bff', dx: -0.8 },
    { label: 'Value', color: '#8f6bff', dx: 0.8 },
    { label: 'Output', color: '#6bd0ff', dx: 2.4 },
  ]
  const linkRef = useRef<THREE.LineSegments>(null)
  const linkGeo = useMemo(() => {
    // criss-cross links from Q/K/V toward Output (the attention "mixing")
    const pts: number[] = []
    for (const src of [-2.4, -0.8, 0.8]) {
      pts.push(src, 0.05, -0.6, 2.4, 0.05, 0.6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  useFrame((state) => {
    if (linkRef.current) {
      const mat = linkRef.current.material as THREE.LineBasicMaterial
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2.5) * 0.25
    }
  })
  return (
    <group position={position} rotation={[0, -0.15, 0]}>
      {/* base glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3.4, 3.7, 48]} />
        <meshBasicMaterial color="#8f6bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {cols.map((c) => (
        <group key={c.label} position={[c.dx, 0, 0]}>
          {/* a small "matrix" of glowing cells standing on the ground */}
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 2 }).map((_, q) => (
              <mesh key={`${r}-${q}`} position={[(q - 0.5) * 0.28, 0.15 + r * 0.28, 0]}>
                <boxGeometry args={[0.22, 0.22, 0.08]} />
                <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={1.2} toneMapped={false} />
              </mesh>
            ))
          )}
          <Billboard position={[0, 1.7, 0]}>
            <Text fontSize={0.26} color="#eadcff" anchorX="center">{c.label}</Text>
          </Billboard>
        </group>
      ))}
      <lineSegments ref={linkRef} geometry={linkGeo}>
        <lineBasicMaterial color="#c9a6ff" transparent opacity={0.5} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Walkway + signposts                                                 */
/* ------------------------------------------------------------------ */

const WALK_A = new THREE.Vector3(1.5, 0.36, 8)
const WALK_B = new THREE.Vector3(7.5, 0.36, -1.5)

function CityWalkway() {
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
            emissive="#a86bff"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function CitySignposts() {
  const signs: { pos: [number, number, number]; title: string; sub: string; rot: number }[] = [
    { pos: [-4.5, 0, 11], title: 'Retrieval Valley', sub: 'Completed ✓', rot: 0.4 },
    { pos: [-2.5, 0, 12], title: 'Sequential City', sub: 'You are here', rot: 0.2 },
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
