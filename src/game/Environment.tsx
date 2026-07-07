import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { NODES, NODE_ORDER, useProgress, type NodeId } from '../state/progress'
import { MeshyProp } from './MeshyProp'
import { Obstacles } from './Obstacles'
import { Terrain } from './Terrain'
import { Decor } from './Decor'
import { PavedPlaza } from './PavedPlaza'
import { CampHearth } from './CampHearth'
import { MetricsPlaza } from './MetricsPlaza'
import { CampFlora } from './CampFlora'
import { Pines } from './Pines'
import { CampSignposts } from './CampSignposts'
import { CampBridge } from './CampBridge'
import { RetrievalVista } from './RetrievalVista'
import { Ambiance } from './Ambiance'

// Bold double-chevron arrow (points +Y in shape space) for the route.
const CHEVRON_GEO = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.55, -0.2)
  s.lineTo(0, 0.5)
  s.lineTo(0.55, -0.2)
  s.lineTo(0.55, -0.55)
  s.lineTo(0, 0.15)
  s.lineTo(-0.55, -0.55)
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.center()
  return g
})()

export function Environment() {
  return (
    <>
      <TwilightBackground />

      {/* dusk lighting — brighter than pitch-black, still moody */}
      <ambientLight intensity={0.7} color="#8f7ce6" />
      <hemisphereLight args={['#c2adff', '#2a1a4a', 1.02]} />
      <directionalLight
        position={[12, 20, 10]}
        intensity={1.7}
        color="#efe6ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0004}
      />
      {/* cool rim from behind for silhouette pop */}
      <pointLight position={[-10, 8, -12]} intensity={45} color="#4f7bff" distance={44} />
      {/* soft violet fill over the camp */}
      <pointLight position={[3, 8, 0]} intensity={38} color="#a878ff" distance={30} />
      {/* warm key on Guide Astra so she reads in the explore view (the lesson adds its own) */}
      <pointLight position={[6.2, 3.0, 5.2]} intensity={17} color="#ffd9b4" distance={13} />
      {/* cool violet fill from her tent side to shape the face */}
      <pointLight position={[1.6, 2.6, 2.4]} intensity={7} color="#b98cff" distance={9} />

      <Terrain />
      <PavedPlaza />
      <Boundaries />
      <Decor />
      <Obstacles />
      <CampFlora />
      {/* dark-green conifer pines framing the camp (forest-edge silhouette) */}
      <Pines />
      {/* Foundations Camp hub: Astra's tent + campfire, the Metrics Plaza signboard, and framing signs */}
      <CampHearth />
      <MetricsPlaza />
      <CampSignposts />
      {/* near hero rope bridge on the right (replaces the old dark rune-arch), leading
          toward the distant Retrieval Valley the path continues to */}
      <CampBridge />
      {/* distant Retrieval Valley (rope bridge + castle) the path leads toward */}
      <RetrievalVista />
      {/* living atmosphere: fireflies, embers, drifting motes */}
      <Ambiance />
      {/* Meshy-generated ornate landmark structures (textured) */}
      <MeshyProp url="/models/props/crystal-shrine-textured.glb" position={[-12, 0, 3]} targetHeight={3} rotationY={0.5} emissiveBoost={0.5} solid colliderScale={0.7} />
      <MeshyProp url="/models/props/hero-tree.glb" position={[-9, 0, -4]} targetHeight={5.5} rotationY={0.6} emissiveBoost={0.25} solid colliderScale={0.45} />
      {/* detailed Meshy conifer hero pines anchoring the framing grove — tinted dark green
          (the raw model is frosty/light) so they match the "тёмно-зелёные сосны" brief */}
      <MeshyProp url="/models/props/pine-conifer.glb" position={[-12.5, 0, 7]} targetHeight={6.5} rotationY={0.3} tint="#20482f" tintAmount={0.62} solid colliderScale={0.3} />
      <MeshyProp url="/models/props/pine-conifer.glb" position={[17, 0, 4]} targetHeight={6.0} rotationY={-1.2} tint="#20482f" tintAmount={0.62} solid colliderScale={0.3} />
      <MeshyProp url="/models/props/pavilion.glb" position={[14, 1.6, -12]} targetHeight={3.8} rotationY={-0.4} emissiveBoost={0.3} solid colliderScale={0.7} />
      {/* Guide Astra is rendered by <LessonStage/> (she doubles as the lecture narrator). */}
      <RoutePath />
    </>
  )
}

/** Dusk gradient sky set as the scene background (twilight, not black). */
function TwilightBackground() {
  const scene = useThree((s) => s.scene)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#0c0824') // zenith — deep indigo
    g.addColorStop(0.55, '#1b1140') // mid dusk
    g.addColorStop(0.82, '#331b52') // horizon violet
    g.addColorStop(1, '#5a2f6e') // warm horizon glow
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

/** Invisible perimeter so the player can never walk off the island diorama. */
function Boundaries() {
  const walls: [number, number, number, number, number, number][] = [
    [3, 1.5, 22, 26, 3, 0.5], // +z
    [3, 1.5, -27, 26, 3, 0.5], // -z
    [-20, 1.5, -2, 0.5, 3, 25], // -x
    [26, 1.5, -2, 0.5, 3, 25], // +x
  ]
  return (
    <RigidBody type="fixed" colliders={false}>
      {walls.map((w, i) => (
        <CuboidCollider key={i} args={[w[3], w[4], w[5]]} position={[w[0], w[1], w[2]]} />
      ))}
    </RigidBody>
  )
}


/**
 * Glowing route drawn as chevrons along the node sequence.
 * The segment leading to the current next-required action pulses brighter.
 */
function RoutePath() {
  const nextId = useProgress((s) => s.nextRequiredAction().nodeId)
  const completed = useProgress((s) => s.completed)

  const segments = useMemo(() => {
    const segs: { from: NodeId; to: NodeId; chevrons: THREE.Vector3[]; yaw: number }[] = []
    for (let i = 0; i < NODE_ORDER.length - 1; i++) {
      const from = NODE_ORDER[i]
      const to = NODE_ORDER[i + 1]
      const a = new THREE.Vector3(...NODES[from].position)
      const b = new THREE.Vector3(...NODES[to].position)
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      dir.normalize()
      const yaw = Math.atan2(dir.x, dir.z)
      const count = Math.max(2, Math.floor(len / 1.6))
      const chevrons: THREE.Vector3[] = []
      for (let c = 1; c < count; c++) {
        const t = c / count
        chevrons.push(new THREE.Vector3().lerpVectors(a, b, t).setY(0.03))
      }
      segs.push({ from, to, chevrons, yaw })
    }
    return segs
  }, [])

  return (
    <group>
      {segments.map((seg) => {
        const isActive = seg.to === nextId || seg.from === nextId
        const isDone = completed[seg.to]
        const color = isActive ? '#ff4fa3' : isDone ? '#4be3a0' : '#5a3a8f'
        return (
          <group key={`${seg.from}-${seg.to}`}>
            {seg.chevrons.map((p, i) => (
              <Chevron
                key={i}
                position={p}
                yaw={seg.yaw}
                color={color}
                active={isActive}
                done={isDone}
                phase={i / Math.max(1, seg.chevrons.length)}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

/** A route chevron. Active segments get a bright pulse that flows from → to. */
function Chevron({
  position,
  yaw,
  color,
  active,
  done,
  phase,
}: {
  position: THREE.Vector3
  yaw: number
  color: string
  active: boolean
  done: boolean
  phase: number
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!mat.current || !mesh.current) return
    if (active) {
      const t = performance.now() * 0.0016
      const pulse = 0.5 + 0.5 * Math.sin((t - phase) * Math.PI * 2)
      mat.current.emissiveIntensity = 1.0 + pulse * 2.0
      mat.current.opacity = 0.55 + pulse * 0.45
      const s = 1 + pulse * 0.18
      mesh.current.scale.set(s, s, 1)
    } else {
      mat.current.emissiveIntensity = done ? 0.7 : 0.32
      mat.current.opacity = 0.55
    }
  })
  return (
    <mesh ref={mesh} geometry={CHEVRON_GEO} position={[position.x, 0.06, position.z]} rotation={[-Math.PI / 2, 0, yaw]} scale={1.15}>
      <meshStandardMaterial
        ref={mat}
        color={color}
        emissive={color}
        emissiveIntensity={active ? 1.8 : done ? 0.8 : 0.4}
        transparent
        opacity={0.75}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
