import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Pines — stylized low-poly dark-green conifers that FRAME the camp diorama (a tall
 * silhouette ring around the play area, denser/taller toward the back). Each pine is a
 * slim trunk + three stacked cone tiers with faint frosted tips. Deterministic layout,
 * purely decorative (no colliders), instanced so the whole grove is a few draw calls.
 *
 * Placement avoids the central hub (x 0..6, z -2..5), the water pool (~-13,10) and the
 * rope-bridge span on the right, sitting instead along the island's rim to read as a
 * forest edge behind the camp.
 */

// [x, z, height] — height in world units (trunk base at y=0).
const PINE_SPOTS: [number, number, number][] = [
  // back ridge (tall, frames the top of the frame)
  [-14, -12, 6.0], [-9.5, -13.5, 6.6], [-4.5, -14.5, 5.6], [1, -15, 6.2],
  [6.5, -14, 5.4], [11, -13.5, 6.0], [15.5, -12, 5.2], [19.5, -9, 4.8],
  // left flank
  [-16.5, 2, 4.6], [-15.5, -4, 5.2], [-13, -9, 4.4],
  // right flank (beyond the bridge landing)
  [19.5, -3, 4.8], [18.5, -8.5, 5.2], [21, -12.5, 4.4],
  // nearer foreground corners for depth framing
  [-15.5, 8.5, 4.0], [18, 8, 4.2], [-11, 12, 3.6], [14, 11, 3.8],
]

// two deep-green tints (flat-shaded), matching the diorama's bush green
const TINTS = ['#173324', '#1e3b2a'] as const

function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

type Tier = { pos: [number, number, number]; scale: [number, number, number]; tint: number }

export function Pines() {
  const { trunks, tiers, tips } = useMemo(() => {
    const trunks: { pos: [number, number, number]; scale: [number, number, number] }[] = []
    const tiers: Tier[] = []
    const tips: { pos: [number, number, number]; s: number }[] = []
    PINE_SPOTS.forEach(([x, z, h], i) => {
      const r = 0.5 * (h / 5) * (0.9 + hash(i * 3.1) * 0.25) // base radius scales with height
      const tint = i % 2
      // trunk
      const trunkH = h * 0.26
      trunks.push({ pos: [x, trunkH / 2, z], scale: [r * 0.32, trunkH, r * 0.32] })
      // three stacked cone tiers (bottom widest)
      const tierSpec: [number, number, number][] = [
        // [yBase fraction, radiusScale, heightFraction]
        [0.2, 1.0, 0.42],
        [0.46, 0.74, 0.36],
        [0.7, 0.46, 0.34],
      ]
      tierSpec.forEach(([yf, rs, hf], k) => {
        const th = h * hf
        tiers.push({ pos: [x, h * yf + th / 2, z], scale: [r * rs, th, r * rs], tint })
      })
      // frosted tip
      tips.push({ pos: [x, h * 0.99, z], s: r * 0.2 })
    })
    return { trunks, tiers, tips }
  }, [])

  const green0 = tiers.filter((t) => t.tint === 0)
  const green1 = tiers.filter((t) => t.tint === 1)

  const tipMat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (tipMat.current) tipMat.current.emissiveIntensity = 0.3 + Math.sin(performance.now() * 0.0009) * 0.12
  })

  return (
    <group>
      {/* trunks */}
      <Instances limit={Math.max(1, trunks.length)} range={trunks.length} castShadow>
        <cylinderGeometry args={[0.5, 0.7, 1, 5]} />
        <meshStandardMaterial color="#2a1c10" roughness={1} flatShading />
        {trunks.map((t, i) => (
          <Instance key={i} position={t.pos} scale={t.scale} />
        ))}
      </Instances>

      {/* foliage tiers — one instanced draw call per tint */}
      {[green0, green1].map((grp, gi) => (
        <Instances key={gi} limit={Math.max(1, grp.length)} range={grp.length} castShadow>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color={TINTS[gi]} roughness={0.92} flatShading />
          {grp.map((t, i) => (
            <Instance key={i} position={t.pos} scale={t.scale} />
          ))}
        </Instances>
      ))}

      {/* faint frosted tips (subtle bloom catch so pines don't go pure black) */}
      <Instances limit={Math.max(1, tips.length)} range={tips.length}>
        <coneGeometry args={[1, 2, 6]} />
        <meshStandardMaterial ref={tipMat} color="#a9d8c0" emissive="#5fbf94" emissiveIntensity={0.3} roughness={0.7} flatShading />
        {tips.map((t, i) => (
          <Instance key={i} position={t.pos} scale={[t.s, t.s, t.s]} />
        ))}
      </Instances>
    </group>
  )
}
