import { useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from './shared'
import { useProgress } from '../state/progress'

/**
 * RPG-style click-to-move. An invisible disc over the island's walkable surface catches ground
 * clicks/taps and writes the world point to `runtime.moveTarget`; the Player steers there. A
 * pulsing ring marks the destination until the player arrives (or WASD cancels it). Sized/placed
 * per world so clicks only register on that island's ground.
 */
export function ClickGround({
  center,
  radius,
  y = 0.3,
}: {
  center: [number, number]
  radius: number
  y?: number
}) {
  const marker = useRef<THREE.Group>(null)
  const markerMat = useRef<THREE.MeshBasicMaterial>(null)

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    // only the primary button, and only while exploring (not during a lesson/lab/quiz)
    if (e.button !== 0) return
    if (useProgress.getState().mode !== 'explore') return
    e.stopPropagation()
    const p = e.point
    // a fresh vector each click so the Player can detect a new destination (resets its stall timer)
    runtime.moveTarget = new THREE.Vector3(p.x, 0, p.z)
  }

  useFrame(() => {
    if (!marker.current) return
    const t = runtime.moveTarget
    marker.current.visible = !!t
    if (t) {
      marker.current.position.set(t.x, y + 0.02, t.z)
      const s = 1 + Math.sin(performance.now() * 0.006) * 0.18
      marker.current.scale.set(s, s, s)
      if (markerMat.current) markerMat.current.opacity = 0.5 + Math.sin(performance.now() * 0.006) * 0.25
    }
  })

  return (
    <group>
      {/* invisible click-catcher disc over the walkable surface */}
      <mesh position={[center[0], y, center[1]]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onDown}>
        <circleGeometry args={[radius, 56]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* destination marker */}
      <group ref={marker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.46, 32]} />
          <meshBasicMaterial ref={markerMat} color="#8fd8ff" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.12, 20]} />
          <meshBasicMaterial color="#d9f2ff" transparent opacity={0.8} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
