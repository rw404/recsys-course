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
 * World 02 · Retrieval Valley — the region across the lit bridge. It stages the two-tower
 * retrieval story spatially: a cyan cloud of USER embeddings on the left, a violet cloud of
 * ITEM embeddings on the right, a glowing purple Retrieval Bridge threading between them toward
 * the Two-Tower Gate, an ANN Lab pavilion where the lesson is taught, and an Embeddings board
 * diagramming the shared vector space. Built from primitives + a few textured GLBs, in the same
 * dusk palette as Foundations Camp.
 */
export function RetrievalValley() {
  return (
    <>
      <ValleyBackground />

      {/* lighting — deep dusk, bluer than the camp to read as a colder valley */}
      <ambientLight intensity={0.66} color="#8ea0e6" />
      <hemisphereLight args={['#aebcff', '#241a44', 1.0]} />
      <directionalLight
        position={[10, 22, 8]}
        intensity={1.55}
        color="#eaf0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0004}
      />
      {/* cyan key over the user cloud, violet key over the item cloud */}
      <pointLight position={[-6, 7, -3]} intensity={34} color="#4f8bff" distance={26} />
      <pointLight position={[9, 7, -3]} intensity={34} color="#a86bff" distance={26} />
      {/* warm read light on the ANN Lab so the pavilion + engineer pop */}
      <pointLight position={[-9, 4, 4]} intensity={20} color="#ffca82" distance={14} />
      {/* rim from behind the gate for silhouette */}
      <pointLight position={[3, 8, -16]} intensity={40} color="#7b6bff" distance={34} />
      {/* warm glow at each floating magic lantern */}
      <pointLight position={[-0.5, 2.5, 7.5]} intensity={7} color="#ffc27a" distance={6} />
      <pointLight position={[-2.4, 2.7, -3.5]} intensity={7} color="#ffc27a" distance={6} />
      <pointLight position={[6.5, 2.5, -8]} intensity={7} color="#ffc27a" distance={6} />

      <ValleyTerrain />
      <ValleyBoundaries />

      {/* rich set-dressing toward the reference: crystals, lanterns, flora, waterfalls, banners */}
      <ValleyDecor />

      {/* embedding clouds — the heart of the reference image */}
      <EmbeddingCloud
        kind="users"
        center={[-6, 2.3, -4]}
        color="#5b93ff"
        label="Users (Embeddings)"
      />
      <EmbeddingCloud
        kind="items"
        center={[9.5, 2.4, -3.5]}
        color="#b06bff"
        label="Items (Embeddings)"
      />

      {/* the glowing purple walkway between the clouds, leading to the gate */}
      <RetrievalWalkway />

      {/* Embeddings vector-space board (bottom-right in the reference) */}
      <EmbeddingsBoard position={[8.5, 0, 6.5]} rotationY={-0.5} />

      {/* the arrival landing where the camp bridge deposits the player */}
      <ArrivalLanding />

      {/* completed-region signposts, like the reference's left-edge signs */}
      <ValleySignposts />

      {/* GLB-backed props stream in behind their own Suspense so the primitive scene (clouds,
          bridge, terrain) never blanks while a model is still loading — no black flash on entry. */}
      <Suspense fallback={null}>
        {/* ANN Lab pavilion + its lantern (the lesson is taught here; Vector Smith, the rigged
            narrator, stands at the two-tower-lesson mark — rendered by <ValleyLessonStage/>) */}
        <AnnLab />
        {/* Two-Tower Gate (textured GLB) framing the exit onward */}
        <TwoTowerGate />
        {/* arcane runic "index" tower — a landmark on the item side (Meshy) */}
        <MeshyProp url="/models/props/transformer-tower.glb" position={[14, 0, -6]} targetHeight={6.8} rotationY={-0.5} emissiveBoost={0.4} solid colliderScale={0.5} />
        {/* glowing data-crystal monuments — the embedding-space centrepieces (Meshy) */}
        <MeshyProp url="/models/props/data-crystal.glb" position={[-2.5, 0, 6.5]} targetHeight={3.0} rotationY={0.6} emissiveBoost={0.5} solid colliderScale={0.55} />
        <MeshyProp url="/models/props/data-crystal.glb" position={[6.2, 0, 3.2]} targetHeight={2.4} rotationY={-1.1} emissiveBoost={0.5} solid colliderScale={0.55} />
        {/* detailed Meshy crystal-shard formations scattered as glowing landmarks */}
        <MeshyProp url="/models/props/crystal-shards.glb" position={[-13.5, 0, 6]} targetHeight={2.6} rotationY={0.3} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/crystal-shards.glb" position={[13.6, 0, 4]} targetHeight={2.3} rotationY={-0.8} emissiveBoost={0.45} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/crystal-shards.glb" position={[-4.5, 0, -9.5]} targetHeight={1.9} rotationY={1.4} emissiveBoost={0.45} solid colliderScale={0.5} />
        {/* bioluminescent mushroom clusters (Meshy) — magical valley-floor flora */}
        <MeshyProp url="/models/props/mushrooms.glb" position={[-4.5, 0, 8.6]} targetHeight={1.5} rotationY={0.5} emissiveBoost={0.3} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[6.5, 0, 7.2]} targetHeight={1.3} rotationY={-1.2} emissiveBoost={0.3} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[-11.8, 0, -2.5]} targetHeight={1.6} rotationY={2.0} emissiveBoost={0.3} solid colliderScale={0.5} />
        <MeshyProp url="/models/props/mushrooms.glb" position={[12.6, 0, 1.5]} targetHeight={1.35} rotationY={0.9} emissiveBoost={0.3} solid colliderScale={0.5} />
        {/* ornate floating magic lanterns (Meshy) — warm hero accents near the paths */}
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-0.5, 2.5, 7.5]} targetHeight={1.0} idleMotion />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[-2.4, 2.7, -3.5]} targetHeight={0.9} idleMotion />
        <MeshyProp url="/models/props/magic-lantern.glb" position={[6.5, 2.5, -8]} targetHeight={0.95} idleMotion />
        {/* framing conifers, tinted dark-green to match the camp grove */}
        <MeshyProp url="/models/props/pine-conifer.glb" position={[-15, 0, 8]} targetHeight={6.0} rotationY={0.4} tint="#20482f" tintAmount={0.62} solid colliderScale={0.3} />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[15, 0, 9]} targetHeight={6.5} rotationY={-1.0} tint="#20482f" tintAmount={0.62} solid colliderScale={0.3} />
        <MeshyProp url="/models/props/pine-conifer.glb" position={[16, 0, -8]} targetHeight={5.6} rotationY={2.1} tint="#20482f" tintAmount={0.62} solid colliderScale={0.3} />
      </Suspense>

      <Ambiance />
      <RoutePath world="retrieval-valley" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Background + terrain                                                */
/* ------------------------------------------------------------------ */

function ValleyBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#080a24') // zenith — deep blue-indigo
    g.addColorStop(0.55, '#141a44')
    g.addColorStop(0.82, '#2a2a5e')
    g.addColorStop(1, '#4a3a72') // warm violet horizon
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

const VR = 24 // valley island radius

function ValleyTerrain() {
  return (
    <group>
      {/* physics floor: a DEEP slab (top at y≈0, extends to y=-6) so a body can't tunnel through a
          thin floor while the valley scene is still mounting on entry. */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3, VR]} position={[1, -3, -2]} />
      </RigidBody>

      {/* top play surface */}
      <mesh position={[1, 0, -2]} receiveShadow>
        <cylinderGeometry args={[VR, VR, 0.6, 64]} />
        <meshStandardMaterial color="#20244e" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* rocky body into the fog */}
      <mesh position={[1, -3.4, -2]}>
        <cylinderGeometry args={[VR - 0.5, VR - 8, 6.4, 48]} />
        <meshStandardMaterial color="#161a38" roughness={1} />
      </mesh>
      <mesh position={[1, -8.5, -2]}>
        <coneGeometry args={[VR - 8, 8, 40]} />
        <meshStandardMaterial color="#0e1028" roughness={1} />
      </mesh>

      {/* glowing central plaza + ring under the clouds */}
      <PlazaGlow position={[2, 0.32, -3]} radius={15} color="#5a5fd0" />
      <mesh position={[2, 0.33, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.6, 14.2, 64]} />
        <meshBasicMaterial color="#8f7bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <ValleyRimRocks />
    </group>
  )
}

function ValleyRimRocks() {
  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2
      const rad = VR - 1.4 + ((i * 37) % 5) * 0.5
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
          <meshStandardMaterial color={i % 3 === 0 ? '#242a52' : '#1b1f42'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function ValleyBoundaries() {
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
/* Embedding clouds                                                    */
/* ------------------------------------------------------------------ */

/**
 * A drifting lattice of embedding "nodes". Users render as small glowing octahedra with faint
 * neighbour links (a k-NN graph); items render as floating cubes. Deterministic seeded layout.
 */
function EmbeddingCloud({
  kind,
  center,
  color,
  label,
}: {
  kind: 'users' | 'items'
  center: [number, number, number]
  color: string
  label: string
}) {
  const group = useRef<THREE.Group>(null)
  const N = 22

  const nodes = useMemo(() => {
    let seed = kind === 'users' ? 11 : 91
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const out: { p: THREE.Vector3; s: number; ph: number }[] = []
    for (let i = 0; i < N; i++) {
      const x = (rnd() - 0.5) * 7.2
      const y = (rnd() - 0.5) * 4.4
      const z = (rnd() - 0.5) * 5.4
      out.push({ p: new THREE.Vector3(x, y, z), s: 0.16 + rnd() * 0.13, ph: rnd() * Math.PI * 2 })
    }
    return out
  }, [kind])

  // neighbour links (users only) — connect each node to its 2 nearest for a graph look
  const linkGeo = useMemo(() => {
    if (kind !== 'users') return null
    const pts: number[] = []
    nodes.forEach((a, i) => {
      const near = nodes
        .map((b, j) => ({ j, d: a.p.distanceTo(b.p) }))
        .filter((o) => o.j !== i)
        .sort((u, v) => u.d - v.d)
        .slice(0, 2)
      near.forEach((o) => {
        pts.push(a.p.x, a.p.y, a.p.z, nodes[o.j].p.x, nodes[o.j].p.y, nodes[o.j].p.z)
      })
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [nodes, kind])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.rotation.y = Math.sin(t * 0.12) * 0.14
    group.current.children.forEach((child, i) => {
      const n = nodes[i]
      if (n && child.type === 'Mesh') {
        child.position.y = n.p.y + Math.sin(t * 0.8 + n.ph) * 0.12
        if (kind === 'items') child.rotation.x = child.rotation.y = t * 0.4 + n.ph
      }
    })
  })

  return (
    <group position={center}>
      <group ref={group}>
        {nodes.map((n, i) => (
          <mesh key={i} position={[n.p.x, n.p.y, n.p.z]}>
            {kind === 'users' ? (
              <octahedronGeometry args={[n.s, 0]} />
            ) : (
              <boxGeometry args={[n.s * 1.4, n.s * 1.4, n.s * 1.4]} />
            )}
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {linkGeo && (
        <lineSegments geometry={linkGeo}>
          <lineBasicMaterial color={color} transparent opacity={0.28} toneMapped={false} />
        </lineSegments>
      )}
      {/* soft volume glow */}
      <mesh>
        <sphereGeometry args={[4.4, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} side={THREE.BackSide} toneMapped={false} depthWrite={false} />
      </mesh>
      <Billboard position={[0, 3.6, 0]}>
        <Text fontSize={0.5} color="#eaf0ff" anchorX="center" outlineWidth={0.016} outlineColor="#0b0e24">
          {label}
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Retrieval walkway (glowing purple bridge)                          */
/* ------------------------------------------------------------------ */

const WALK_A = new THREE.Vector3(-1.5, 0.36, 4.5)
const WALK_B = new THREE.Vector3(3, 0.36, -10.5)

function RetrievalWalkway() {
  const planks = useMemo(() => {
    const count = 26
    const dir = new THREE.Vector3().subVectors(WALK_B, WALK_A)
    const len = dir.length()
    const yaw = Math.atan2(dir.x, dir.z)
    const p = new THREE.Vector3()
    return { yaw, len, spots: Array.from({ length: count }).map((_, i) => {
      const t = (i + 0.5) / count
      p.copy(WALK_A).lerp(WALK_B, t)
      return { pos: [p.x, p.y, p.z] as [number, number, number], t }
    }) }
  }, [])

  const matRef = useRef<THREE.MeshStandardMaterial[]>([])
  useFrame(() => {
    const time = performance.now() * 0.0016
    matRef.current.forEach((m, i) => {
      if (!m) return
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 - (i / 26) * Math.PI * 2)
      m.emissiveIntensity = 1.1 + pulse * 1.8
    })
  })

  return (
    <group>
      {/* base deck */}
      {planks.spots.map((pl, i) => (
        <mesh key={i} position={pl.pos} rotation={[0, planks.yaw, 0]}>
          <boxGeometry args={[1.9, 0.12, 0.34]} />
          <meshStandardMaterial
            ref={(m) => { if (m) matRef.current[i] = m }}
            color="#7b3ff7"
            emissive="#a86bff"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* side rails as faint glowing tubes */}
      {[0.95, -0.95].map((off) => {
        const dir = new THREE.Vector3().subVectors(WALK_B, WALK_A).setY(0).normalize()
        const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).multiplyScalar(off)
        const a = new THREE.Vector3().copy(WALK_A).add(side).setY(0.55)
        const b = new THREE.Vector3().copy(WALK_B).add(side).setY(0.55)
        const mid = new THREE.Vector3().lerpVectors(a, b, 0.5)
        const len = a.distanceTo(b)
        const yaw = Math.atan2(b.x - a.x, b.z - a.z)
        return (
          <mesh key={off} position={[mid.x, mid.y, mid.z]} rotation={[0, yaw, 0]}>
            <boxGeometry args={[0.06, 0.06, len]} />
            <meshBasicMaterial color="#c9a6ff" transparent opacity={0.6} toneMapped={false} />
          </mesh>
        )
      })}
      <Billboard position={[(WALK_A.x + WALK_B.x) / 2 - 1.5, 1.5, (WALK_A.z + WALK_B.z) / 2 + 1]}>
        <Text fontSize={0.34} color="#e7d7ff" anchorX="center" outlineWidth={0.012} outlineColor="#160a2c">
          Retrieval Bridge
        </Text>
      </Billboard>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* ANN Lab, Two-Tower Gate, Embeddings board, landing, signs          */
/* ------------------------------------------------------------------ */

function AnnLab() {
  return (
    <group position={[-9.5, 0, 1.5]}>
      {/* domed lab pavilion (reuse the ornate pavilion GLB, cool-tinted) */}
      <MeshyProp url="/models/props/pavilion.glb" position={[0, 0, 0]} targetHeight={4.2} rotationY={0.5} emissiveBoost={0.35} tint="#3a4a8f" tintAmount={0.3} solid colliderScale={0.65} />
      {/* warm lab lantern — hung on the pavilion's FAR side so it never sits in the lesson
          two-shot sightline (camera looks at Vector Smith from the near/front) */}
      <group position={[-1.7, 2.5, -1.6]}>
        <mesh>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
        </mesh>
        <pointLight intensity={7} color="#ffca82" distance={7} />
      </group>
      <Billboard position={[0, 5.0, 0]}>
        <Text fontSize={0.5} color="#eaf0ff" anchorX="center" outlineWidth={0.016} outlineColor="#0b0e24">
          ANN Lab
        </Text>
      </Billboard>
    </group>
  )
}

function TwoTowerGate() {
  return (
    <group position={[3, 0, -15]}>
      <MeshyProp url="/models/props/two-tower-gate.glb" position={[0, 0, 0]} targetHeight={7.5} rotationY={0} emissiveBoost={0.45} solid colliderScale={0.4} />
      <Billboard position={[0, 8.4, 0]}>
        <Text fontSize={0.52} color="#eaf0ff" anchorX="center" outlineWidth={0.016} outlineColor="#0b0e24">
          Two-Tower Gate
        </Text>
      </Billboard>
    </group>
  )
}

/** A holographic board diagramming the shared embedding space (3 axes + a scatter). */
function EmbeddingsBoard({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const dots = useMemo(() => {
    let seed = 5
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    return Array.from({ length: 14 }).map(() => ({
      x: (rnd() - 0.5) * 1.5,
      y: (rnd() - 0.3) * 1.1,
      c: rnd() > 0.5 ? '#7ad0ff' : '#b98cff',
      s: 0.05 + rnd() * 0.04,
    }))
  }, [])
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* posts */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
          <meshStandardMaterial color="#2a2048" roughness={0.9} />
        </mesh>
      ))}
      {/* holographic panel */}
      <mesh position={[0, 2.1, 0]}>
        <planeGeometry args={[3, 1.9]} />
        <meshBasicMaterial color="#122045" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* axes */}
      <group position={[0, 2.1, 0.02]}>
        {[[0, 0, 0.9, 0], [0, 0, 0, 0.7], [0, 0, -0.6, -0.5]].map((a, i) => (
          <mesh key={i} position={[a[2] / 2, a[3] / 2, 0]} rotation={[0, 0, Math.atan2(a[3], a[2])]}>
            <boxGeometry args={[Math.hypot(a[2], a[3]), 0.02, 0.02]} />
            <meshBasicMaterial color="#6f8bff" toneMapped={false} />
          </mesh>
        ))}
        {dots.map((d, i) => (
          <mesh key={i} position={[d.x, d.y, 0.02]}>
            <sphereGeometry args={[d.s, 8, 8]} />
            <meshBasicMaterial color={d.c} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Billboard position={[0, 3.4, 0]}>
        <Text fontSize={0.4} color="#eaf0ff" anchorX="center" outlineWidth={0.014} outlineColor="#0b0e24">
          Embeddings
        </Text>
      </Billboard>
    </group>
  )
}

/** Stone landing where the camp bridge deposits the player (near the spawn). */
function ArrivalLanding() {
  return (
    <group position={[1, 0, 12]}>
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.5, 24]} />
        <meshStandardMaterial color="#2a2f58" roughness={0.9} />
      </mesh>
      {/* glowing threshold arc */}
      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.7, 40]} />
        <meshBasicMaterial color="#8f7bff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ValleySignposts() {
  const signs: { pos: [number, number, number]; title: string; sub: string; rot: number }[] = [
    { pos: [-6.5, 0, 10.5], title: 'Foundations Camp', sub: 'Completed ✓', rot: 0.4 },
    { pos: [-4.5, 0, 12], title: 'Retrieval Valley', sub: 'You are here', rot: 0.2 },
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
            <Text fontSize={0.18} color="#ffe9c9" anchorX="center" anchorY="middle" maxWidth={1.5}>
              {s.title}
            </Text>
            <Text position={[0, -0.24, 0]} fontSize={0.13} color="#8affc9" anchorX="center" anchorY="middle">
              {s.sub}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* shared plaza glow (copy of Terrain's, kept local to the valley)    */
/* ------------------------------------------------------------------ */
function PlazaGlow({ position, radius, color }: { position: [number, number, number]; radius: number; color: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.4, 'rgba(150,130,255,0.24)')
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
