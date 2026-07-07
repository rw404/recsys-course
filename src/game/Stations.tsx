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
  return (
    <group>
      {NODE_ORDER.map((id) => (
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
      return <GuideNPC color={color} />
    case 'lesson':
      // offset behind Guide Astra (who stands at the node origin) so the board reads as the
      // theory station she presents at, not a statue you interact with instead of her.
      return (
        <RigidBody type="fixed" colliders={false} position={[-0.4, 0, -1.25]}>
          <CuboidCollider args={[0.6, 1, 0.6]} position={[0, 1, 0]} />
          {/* pedestal */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.1, 0.3, 8]} />
            <meshStandardMaterial color="#241833" />
          </mesh>
          {/* holo board */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[1.3, 1.7, 0.12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissive}
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 2.7, 0]}>
            <octahedronGeometry args={[0.25]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </RigidBody>
      )
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
      return <BridgeBody state={state} color={color} />
    default:
      return null
  }
}

function GuideNPC({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null)
  const arm = useRef<THREE.Group>(null)
  const nearby = useProgress((s) => s.nearbyNodeId === 'npc-guide')
  useFrame(() => {
    const t = performance.now()
    if (g.current) g.current.position.y = 0.9 + Math.sin(t * 0.002) * 0.04
    // wave hello when the player is close, otherwise arm rests at the side
    if (arm.current) {
      const targetZ = nearby ? -2.3 + Math.sin(t * 0.012) * 0.4 : -0.15
      arm.current.rotation.z += (targetZ - arm.current.rotation.z) * 0.12
    }
  })
  return (
    <group>
      {/* campfire */}
      <mesh position={[1.4, 0.15, 0.6]}>
        <coneGeometry args={[0.3, 0.5, 6]} />
        <meshStandardMaterial color="#ff8a3c" emissive="#ff5a1c" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[1.4, 0.6, 0.6]} intensity={6} color="#ff8a3c" distance={6} />
      <group ref={g}>
        {/* body */}
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.42, 0.5, 0.3]} />
          <meshStandardMaterial color="#3a2b5c" />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.4, 0.38, 0.38]} />
          <meshStandardMaterial color="#e7b58c" />
        </mesh>
        {/* goggles */}
        <mesh position={[0, 0.62, 0.18]}>
          <boxGeometry args={[0.42, 0.1, 0.06]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
        {/* tablet */}
        <mesh position={[-0.26, 0.05, 0.2]} rotation={[0.3, 0, -0.2]}>
          <boxGeometry args={[0.24, 0.32, 0.03]} />
          <meshStandardMaterial color="#7b2ff7" emissive="#7b2ff7" emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
        {/* waving arm (pivots at the shoulder) */}
        <group ref={arm} position={[0.26, 0.34, 0.04]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <boxGeometry args={[0.09, 0.34, 0.09]} />
            <meshStandardMaterial color="#3a2b5c" />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#e7b58c" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function BridgeBody({ state, color }: { state: ProgressNodeState; color: string }) {
  const unlocked = state !== 'locked_for_credit'
  const planks = 7
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
          {unlocked ? '→ Retrieval Valley' : '🔒 Locked'}
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
  if (node.kind === 'bridge') return null
  const badge =
    state === 'completed' ? '✓ ' : state === 'locked_for_credit' ? '🔒 ' : state === 'next_required' ? '★ ' : ''
  return (
    <Billboard position={[0, node.kind === 'quiz' ? 3.6 : node.kind === 'npc' ? 1.7 : 3.3, 0]}>
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
