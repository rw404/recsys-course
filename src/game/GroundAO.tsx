import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * A soft dark contact-shadow / ambient-occlusion decal laid on the ground under a prop or station.
 * Cheap (one shared 128px texture, no extra render pass) but it "seats" every asset on the floor so
 * nothing looks pasted on — the single highest-ROI grounding win from the art audit.
 */
let sharedTex: THREE.CanvasTexture | null = null
function aoTexture(): THREE.CanvasTexture {
  if (sharedTex) return sharedTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.6)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  sharedTex = new THREE.CanvasTexture(c)
  return sharedTex
}

export function GroundAO({ radius = 1.6, y = 0.03, opacity = 0.9 }: { radius?: number; y?: number; opacity?: number }) {
  const tex = useMemo(() => aoTexture(), [])
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} color="#000000" transparent depthWrite={false} opacity={opacity} />
    </mesh>
  )
}
