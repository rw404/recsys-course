import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import {
  NODES,
  NODE_ORDER,
  useProgress,
  type CourseNode,
  type NodeId,
  type ProgressNodeState,
} from '../state/progress'
import { useInput } from './useInput'
import { runtime } from './shared'
import { touchControls } from './controls'

const STATE_COLOR: Record<ProgressNodeState, string> = {
  locked_for_credit: '#4a3b6b',
  available: '#9b6bff',
  in_progress: '#ffb347',
  next_required: '#ff4fa3',
  completed: '#4be3a0',
  overdue: '#ff5a5a',
  review_pending: '#ffd24f',
  failed_needs_retry: '#ff5a5a',
}

/** Detects the nearest interactable node and handles the E key. Renders nothing. */
export function InteractionSystem() {
  const input = useInput()
  const setNearby = useProgress((s) => s.setNearby)
  const openNode = useProgress((s) => s.openNode)

  useFrame(() => {
    const st = useProgress.getState()
    // Do not scan while a panel is open.
    if (st.mode !== 'explore') {
      // still consume interact so it does not fire on close
      input.current.interactPressed = false
      touchControls.interactEdge = false
      return
    }

    const p = runtime.playerPosition
    let best: NodeId | null = null
    let bestDist = Infinity
    for (const id of NODE_ORDER) {
      const node = NODES[id]
      if (node.worldId !== st.currentWorld) continue
      const state = st.getNodeState(id)
      if (!isInteractable(id, state)) continue
      const dx = p.x - node.position[0]
      const dz = p.z - node.position[2]
      const d = Math.hypot(dx, dz)
      if (d <= node.interactionRadius && d < bestDist) {
        best = id
        bestDist = d
      }
    }
    setNearby(best)

    const interact = input.current.interactPressed || touchControls.interactEdge
    if (interact) {
      input.current.interactPressed = false
      touchControls.interactEdge = false
      if (best) openNode(best)
    }
    // map toggle handled by HUD via store; clear here to avoid leaks
    input.current.mapToggled = false
  })

  return null
}

function isInteractable(id: NodeId, state: ProgressNodeState): boolean {
  if (id === 'npc-guide') return true
  return state !== 'locked_for_credit'
}

export function Stations() {
  const world = useProgress((s) => s.currentWorld)
  return (
    <group>
      {NODE_ORDER.filter((id) => NODES[id].worldId === world).map((id) => (
        <StationNode key={id} id={id} />
      ))}
    </group>
  )
}

function StationNode({ id }: { id: NodeId }) {
  const node = NODES[id]
  const state = useProgress((s) => s.getNodeState(id))
  const nearby = useProgress((s) => s.nearbyNodeId === id)
  const color = STATE_COLOR[state]

  return (
    <group position={node.position}>
      <StationBody node={node} state={state} color={color} />
      <FloatingLabel node={node} state={state} color={color} highlight={nearby} />
      {state === 'next_required' && <NextIndicator color="#ff4fa3" />}
      {(state === 'available' || state === 'in_progress') && <GlowRing color={color} />}
    </group>
  )
}

function StationBody({
  node,
  state,
  color,
}: {
  node: CourseNode
  state: ProgressNodeState
  color: string
}) {
  const locked = state === 'locked_for_credit'
  const emissive = locked ? 0.15 : 0.9
  switch (node.kind) {
    case 'npc':
      // The guide is now the rigged Guide Astra (rendered by <LessonStage/> at the lesson node);
      // this node stays only as an invisible entry waypoint for the route path.
      return null
    case 'lesson':
      // The lesson station's visual IS the Metrics Plaza signboard (rendered by <MetricsPlaza/>
      // in Environment, standing behind Guide Astra who is the interactable). No separate statue.
      return null
    case 'widget':
      return (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.9, 0.7, 0.6]} position={[0, 0.7, 0]} />
          {/* arcade console */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.7, 1, 0.9]} />
            <meshStandardMaterial color="#1c1330" />
          </mesh>
          <mesh position={[0, 1.15, 0.2]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[1.4, 0.8, 0.08]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissive}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <torusGeometry args={[0.3, 0.06, 8, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </RigidBody>
      )
    case 'quiz':
      return (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.3, 1.4, 0.3]} position={[-1.3, 1.4, 0]} />
          <CuboidCollider args={[0.3, 1.4, 0.3]} position={[1.3, 1.4, 0]} />
          {/* gate posts */}
          {[-1.3, 1.3].map((x) => (
            <mesh key={x} position={[x, 1.4, 0]} castShadow>
              <boxGeometry args={[0.5, 2.8, 0.5]} />
              <meshStandardMaterial color="#221636" />
            </mesh>
          ))}
          {/* lintel + energy field */}
          <mesh position={[0, 2.9, 0]} castShadow>
            <boxGeometry args={[3.2, 0.5, 0.6]} />
            <meshStandardMaterial color="#221636" />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <planeGeometry args={[2.4, 2.6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissive}
              transparent
              opacity={state === 'completed' ? 0.15 : 0.4}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </RigidBody>
      )
    case 'bridge':
      return <BridgeBody node={node} state={state} color={color} />
    default:
      return null
  }
}

function BridgeBody({ node, state, color }: { node: CourseNode; state: ProgressNodeState; color: string }) {
  const unlocked = state !== 'locked_for_credit'
  const planks = 7
  const target =
    node.id === 'graduation'
      ? '★ Course Summit'
      : node.id === 'world5-gate'
      ? '→ Ecosystem Garden'
      : node.id === 'world4-gate'
      ? '→ Policy Tower'
      : node.id === 'world3-gate'
      ? '→ Sequential City'
      : '→ Retrieval Valley'
  return (
    <group>
      {/* chasm hint: two towers */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]} castShadow>
          <boxGeometry args={[0.7, 2.8, 0.7]} />
          <meshStandardMaterial color="#1d1333" />
        </mesh>
      ))}
      {/* planks light up sequentially when unlocked */}
      {Array.from({ length: planks }).map((_, i) => {
        const t = i / (planks - 1)
        const x = THREE.MathUtils.lerp(-2, 2, t)
        return (
          <mesh key={i} position={[x, 0.2, 0]}>
            <boxGeometry args={[0.45, 0.1, 1.6]} />
            <meshStandardMaterial
              color={unlocked ? color : '#241833'}
              emissive={unlocked ? color : '#000000'}
              emissiveIntensity={unlocked ? 1.0 : 0}
              toneMapped={false}
            />
          </mesh>
        )
      })}
      <Billboard position={[0, 3.6, 0]}>
        <Text fontSize={0.34} color={unlocked ? '#ffd9ec' : '#6a5a8f'} anchorX="center">
          {unlocked ? target : '🔒 Locked'}
        </Text>
      </Billboard>
    </group>
  )
}

function FloatingLabel({
  node,
  state,
  color,
  highlight,
}: {
  node: CourseNode
  state: ProgressNodeState
  color: string
  highlight: boolean
}) {
  // bridge has its own banner; the npc waypoint is invisible; the lesson's title is carried by the
  // Metrics Plaza signboard + HUD, so it would only clutter the plaza banner.
  if (node.kind === 'bridge' || node.kind === 'npc' || node.kind === 'lesson') return null
  const badge =
    state === 'completed' ? '✓ ' : state === 'locked_for_credit' ? '🔒 ' : state === 'next_required' ? '★ ' : ''
  return (
    <Billboard position={[0, node.kind === 'quiz' ? 3.6 : 3.3, 0]}>
      <Text fontSize={0.3} color="#f2e9ff" anchorX="center" outlineWidth={0.012} outlineColor="#0b0618">
        {badge + node.title}
      </Text>
      <Text position={[0, -0.34, 0]} fontSize={0.19} color={color} anchorX="center">
        {node.subtitle}
      </Text>
      {highlight && (
        <Text position={[0, -0.64, 0]} fontSize={0.2} color="#ffe27a" anchorX="center">
          Press E
        </Text>
      )}
    </Billboard>
  )
}

function NextIndicator({ color }: { color: string }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!ring.current) return
    const t = (performance.now() * 0.001) % 1.6
    const s = 0.6 + t * 1.6
    ring.current.scale.set(s, s, s)
    const mat = ring.current.material as THREE.MeshBasicMaterial
    mat.opacity = Math.max(0, 0.7 - t * 0.45)
  })
  return (
    <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.05, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function GlowRing({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.35, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}
