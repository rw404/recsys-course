import { useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
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
import { MeshyProp } from './MeshyProp'

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

    // Click-to-interact: a station was clicked; walk there (moveTarget already set) and open it
    // once we arrive within its interaction radius. Cancel if the walk was abandoned.
    const pending = runtime.pendingOpen as NodeId | null
    if (pending) {
      const pn = NODES[pending]
      if (pn && pn.worldId === st.currentWorld) {
        const dx = p.x - pn.position[0]
        const dz = p.z - pn.position[2]
        if (Math.hypot(dx, dz) <= pn.interactionRadius) {
          runtime.pendingOpen = null
          runtime.moveTarget = null
          openNode(pending)
        } else if (!runtime.moveTarget) {
          runtime.pendingOpen = null // walk cancelled before arriving
        }
      } else {
        runtime.pendingOpen = null
      }
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
  const openNode = useProgress((s) => s.openNode)
  const color = STATE_COLOR[state]
  const clickable = isInteractable(id, state)

  // Click a station → point-and-click RPG behaviour: if already in range, open it; else walk there
  // (moveTarget) and the InteractionSystem auto-opens it on arrival.
  const onClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const p = runtime.playerPosition
    const d = Math.hypot(p.x - node.position[0], p.z - node.position[2])
    if (d <= node.interactionRadius) {
      runtime.pendingOpen = null
      openNode(id)
    } else {
      runtime.moveTarget = new THREE.Vector3(node.position[0], 0, node.position[2])
      runtime.pendingOpen = id
    }
  }

  return (
    <group position={node.position}>
      <StationBody node={node} state={state} color={color} />
      <FloatingLabel node={node} state={state} color={color} highlight={nearby} />
      {state === 'next_required' && <Beacon color="#ff4fa3" />}
      {(state === 'available' || state === 'in_progress') && <GlowRing color={color} />}
      {clickable && <StationInteract onClick={onClick} tall={node.kind === 'quiz' || node.kind === 'bridge'} />}
    </group>
  )
}

/** Invisible click/hover volume over a station so you can click it to interact (a tall column so a
 *  low camera hits it, and stopPropagation so it wins over click-to-move). */
function StationInteract({ onClick, tall }: { onClick: (e: ThreeEvent<PointerEvent>) => void; tall?: boolean }) {
  useEffect(() => () => { if (typeof document !== 'undefined') document.body.style.cursor = 'auto' }, [])
  const h = tall ? 4.4 : 3.2
  return (
    <mesh
      position={[0, h / 2, 0]}
      onPointerDown={onClick}
      onPointerOver={(e) => { e.stopPropagation(); if (typeof document !== 'undefined') document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'auto' }}
    >
      <cylinderGeometry args={[1.9, 1.9, h, 16]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
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
      // detailed arcane holo-console (replaces the old primitive box) + a state-coloured base glow
      return (
        <group>
          <MeshyProp url="/models/props/arcane-console.glb" position={[0, 0, 0]} targetHeight={2.2} emissiveBoost={locked ? 0 : 0.35} solid colliderScale={0.55} />
          <StationBaseGlow color={color} />
        </group>
      )
    case 'quiz':
      // detailed rune checkpoint gateway (replaces the old primitive gate-posts) + base glow
      return (
        <group>
          <MeshyProp url="/models/props/checkpoint-arch.glb" position={[0, 0, 0]} targetHeight={3.8} emissiveBoost={locked ? 0 : 0.4} solid colliderScale={0.4} />
          <StationBaseGlow color={color} />
        </group>
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
    node.id === 'champion'
      ? '★ Course Complete'
      : node.id === 'graduation'
      ? '→ Final Arena'
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
  // bridge has its own banner; everything else (incl. the guide + lesson, which used to render
  // NOTHING — a wayfinding hole) gets a floating title so a first-timer sees what each station is.
  if (node.kind === 'bridge') return null
  const badge =
    state === 'completed' ? '✓ ' : state === 'locked_for_credit' ? '🔒 ' : state === 'next_required' ? '★ ' : ''
  const kindTag = node.kind === 'npc' ? '💬 Talk' : node.kind === 'lesson' ? '📖 Study' : node.kind === 'widget' ? '⚗ Lab' : node.kind === 'quiz' ? '✦ Checkpoint' : ''
  return (
    <Billboard position={[0, node.kind === 'quiz' ? 4.4 : node.kind === 'widget' ? 3.6 : 3.3, 0]}>
      <Text fontSize={0.3} color="#f2e9ff" anchorX="center" outlineWidth={0.012} outlineColor="#0b0618">
        {badge + node.title}
      </Text>
      <Text position={[0, -0.34, 0]} fontSize={0.19} color={color} anchorX="center">
        {kindTag || node.subtitle}
      </Text>
      {highlight && (
        <Text position={[0, -0.66, 0]} fontSize={0.22} color="#ffe27a" anchorX="center">
          ▸ Click or press E
        </Text>
      )}
    </Billboard>
  )
}

/** The objective BEACON — marks the single next-required station so "where do I go?" is obvious from
 *  anywhere: an expanding ground ring + a tall translucent light column + a bobbing gem + arrow. */
function Beacon({ color }: { color: string }) {
  const ring = useRef<THREE.Mesh>(null)
  const gem = useRef<THREE.Group>(null)
  const column = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const now = performance.now() * 0.001
    if (ring.current) {
      const t = now % 1.6
      const s = 0.6 + t * 1.7
      ring.current.scale.set(s, s, s)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - t * 0.47)
    }
    if (gem.current) {
      gem.current.position.y = 4.2 + Math.sin(now * 2) * 0.22
      gem.current.rotation.y = now * 1.4
    }
    if (column.current) {
      ;(column.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(state.clock.elapsedTime * 2.5) * 0.05
    }
  })
  return (
    <group>
      {/* expanding ground pulse */}
      <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.05, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* tall light column visible from across the world */}
      <mesh ref={column} position={[0, 3, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 6, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* bobbing gem + downward arrow marker */}
      <group ref={gem} position={[0, 4.2, 0]}>
        <mesh>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.4, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 3, 0]} intensity={9} color={color} distance={9} />
    </group>
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

/** A state-coloured glow footprint under a detailed station model, so its status still reads. */
function StationBaseGlow({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.1, 44]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.4, 0]} intensity={6} color={color} distance={6} />
    </group>
  )
}
