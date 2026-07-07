import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * The "Metrics Plaza" landmark — the centrepiece of Foundations Camp (reference photo 1).
 * A weathered wooden signboard header spanning four glowing holographic metric cards
 * (Precision · Recall · NDCG · Ranking Quality), each with a procedural icon and a plain-English
 * question. It stands behind Guide Astra, facing the camera (+Z), and doubles as her presentation
 * backdrop during the lesson cinematic.
 *
 * Self-placed at absolute world coordinates — drop <MetricsPlaza/> into the scene with no props.
 */

const ORIGIN: [number, number, number] = [3.6, 0, -0.6]

type Metric = {
  key: string
  title: string
  question: string
  color: string
  x: number
  icon: 'precision' | 'recall' | 'ndcg' | 'ranking'
}

const METRICS: Metric[] = [
  { key: 'precision', title: 'Precision', question: 'Of the items you retrieved, how many were relevant?', color: '#7ad0ff', x: -2.55, icon: 'precision' },
  { key: 'recall', title: 'Recall', question: 'Of the relevant items, how many did you retrieve?', color: '#c86bff', x: -0.85, icon: 'recall' },
  { key: 'ndcg', title: 'NDCG', question: 'Are the most relevant items ranked higher?', color: '#ff6bd0', x: 0.85, icon: 'ndcg' },
  { key: 'ranking', title: 'Ranking Quality', question: 'How good is your overall ranking?', color: '#ffd36b', x: 2.55, icon: 'ranking' },
]

export function MetricsPlaza() {
  return (
    <group position={ORIGIN}>
      <SignFrame />
      {METRICS.map((m) => (
        <MetricCard key={m.key} m={m} />
      ))}
      {/* plaza floor emblem right in front of the boards */}
      <mesh position={[0, 0.33, 1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.72, 48]} />
        <meshBasicMaterial color="#9b6bff" transparent opacity={0.45} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Weathered wooden gantry that carries the "Metrics Plaza" banner over the four cards. */
function SignFrame() {
  const halfW = 3.5
  return (
    <group>
      {/* two carved posts */}
      {[-halfW, halfW].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 3.6, 8]} />
            <meshStandardMaterial color="#3a2416" roughness={0.95} />
          </mesh>
          {/* post cap crystal */}
          <mesh position={[0, 3.75, 0]}>
            <octahedronGeometry args={[0.2]} />
            <meshStandardMaterial color="#c86bff" emissive="#a855ff" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* top beam */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[halfW * 2 + 0.5, 0.34, 0.34]} />
        <meshStandardMaterial color="#4a2f1a" roughness={0.9} />
      </mesh>
      {/* banner plaque */}
      <mesh position={[0, 3.02, 0.02]} castShadow>
        <boxGeometry args={[3.9, 0.7, 0.14]} />
        <meshStandardMaterial color="#2a1a3e" emissive="#3a1f5c" emissiveIntensity={0.5} roughness={0.7} />
      </mesh>
      {/* banner glowing edge */}
      <mesh position={[0, 3.02, 0.1]}>
        <planeGeometry args={[3.94, 0.74]} />
        <meshBasicMaterial color="#7a2ffb" transparent opacity={0.18} toneMapped={false} />
      </mesh>
      <Text position={[0, 3.02, 0.14]} fontSize={0.42} letterSpacing={0.02} color="#f6ecff" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#1a0e30">
        Metrics Plaza
      </Text>
      {/* diamond emblem crowning the beam */}
      <mesh position={[0, 3.95, 0.02]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.26, 0.26, 0.08]} />
        <meshBasicMaterial color="#c86bff" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** One holographic metric card: glowing translucent panel + icon + title + question. */
function MetricCard({ m }: { m: Metric }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const grp = useRef<THREE.Group>(null)
  const seed = m.x
  useFrame(() => {
    const t = performance.now() * 0.001 + seed
    if (glow.current) glow.current.opacity = 0.5 + Math.sin(t * 1.6) * 0.12
    if (grp.current) grp.current.position.y = Math.sin(t * 0.8) * 0.03 // subtle holo float
  })
  return (
    <group position={[m.x, 1.92, 0]}>
      <group ref={grp}>
        {/* glowing border frame */}
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[1.4, 2.1]} />
          <meshBasicMaterial ref={glow} color={m.color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
        {/* dark glass fill */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.3, 2.0]} />
          <meshBasicMaterial color="#180f2e" transparent opacity={0.82} toneMapped={false} />
        </mesh>
        {/* inner emissive wash for the holo tint */}
        <mesh position={[0, 0, -0.015]}>
          <planeGeometry args={[1.3, 2.0]} />
          <meshBasicMaterial color={m.color} transparent opacity={0.1} toneMapped={false} />
        </mesh>

        {/* icon */}
        <group position={[0, 0.58, 0.02]}>
          <MetricIcon icon={m.icon} color={m.color} />
        </group>

        {/* title */}
        <Text position={[0, 0.02, 0.03]} fontSize={0.16} maxWidth={1.2} color="#f4ecff" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#12082a">
          {m.title}
        </Text>
        {/* question */}
        <Text position={[0, -0.5, 0.03]} fontSize={0.088} lineHeight={1.25} maxWidth={1.08} color="#c9bbe8" anchorX="center" anchorY="middle">
          {m.question}
        </Text>
      </group>
    </group>
  )
}

/** Procedural glowing icons matching the reference cards. */
function MetricIcon({ icon, color }: { icon: Metric['icon']; color: string }) {
  const mat = <meshBasicMaterial color={color} toneMapped={false} />
  if (icon === 'precision') {
    // concentric target rings + bullseye
    return (
      <group>
        <mesh>
          <ringGeometry args={[0.24, 0.29, 40]} />
          {mat}
        </mesh>
        <mesh>
          <ringGeometry args={[0.13, 0.17, 32]} />
          {mat}
        </mesh>
        <mesh>
          <circleGeometry args={[0.06, 20]} />
          {mat}
        </mesh>
      </group>
    )
  }
  if (icon === 'recall') {
    // outer ring + solid captured core
    return (
      <group>
        <mesh>
          <ringGeometry args={[0.23, 0.28, 40]} />
          {mat}
        </mesh>
        <mesh>
          <circleGeometry args={[0.14, 24]} />
          {mat}
        </mesh>
      </group>
    )
  }
  if (icon === 'ndcg') {
    // ascending bar chart
    const bars = [
      [-0.21, 0.16],
      [-0.07, 0.26],
      [0.07, 0.4],
      [0.21, 0.56],
    ] as const
    return (
      <group position={[0, -0.12, 0]}>
        {bars.map(([x, h], i) => (
          <mesh key={i} position={[x, h / 2, 0]}>
            <planeGeometry args={[0.1, h]} />
            {i === 0 ? <meshBasicMaterial color={color} toneMapped={false} /> : mat}
          </mesh>
        ))}
      </group>
    )
  }
  // ranking quality — star on a podium
  return (
    <group>
      <mesh geometry={STAR_GEO} position={[0, 0.04, 0]}>
        {mat}
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <planeGeometry args={[0.44, 0.12]} />
        {mat}
      </mesh>
    </group>
  )
}

const STAR_GEO = (() => {
  const s = new THREE.Shape()
  const outer = 0.26
  const inner = 0.11
  const pts = 5
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.center()
  return g
})()
