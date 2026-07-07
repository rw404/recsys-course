import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * The "bring it to life" atmosphere layer: drifting fireflies, rising campfire
 * embers and slow floating dust motes. Everything is a single THREE.Points system
 * (three total), additive + toneMapped-false so bloom picks them up, and animated
 * purely by mutating buffer attributes in useFrame — no React re-renders, no
 * per-frame allocations. Deterministic seeded layout (no Math.random for placement).
 */
export function Ambiance() {
  return (
    <>
      <Fireflies />
      <Embers />
      <Motes />
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared soft radial sprite (a bright center fading to transparent edges).
// Built once as a CanvasTexture and reused by every Points system.
// ---------------------------------------------------------------------------
function makeSoftDot(inner = 0.15): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(inner, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

// Small seeded pseudo-random helper for deterministic layout.
function seeded(i: number, salt: number): number {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return s - Math.floor(s) // 0..1
}

// ---------------------------------------------------------------------------
// FIREFLIES — ~140 soft glowing sprites scattered across the whole camp.
// Each bobs on its own sine phase and slowly twinkles (per-point base color is
// scaled up/down by a twinkle factor written into the color attribute).
// ---------------------------------------------------------------------------
const FIREFLY_COUNT = 140
const FIREFLY_COLORS = ['#ffd9a0', '#9fd0ff', '#ff9fe0', '#8affc9']

function Fireflies() {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const sprite = useMemo(() => makeSoftDot(0.2), [])

  // Deterministic per-firefly data: home position, bob params, base color.
  const data = useMemo(() => {
    const positions = new Float32Array(FIREFLY_COUNT * 3)
    const colors = new Float32Array(FIREFLY_COUNT * 3)
    const baseColors = new Float32Array(FIREFLY_COUNT * 3) // un-twinkled reference
    const homeX = new Float32Array(FIREFLY_COUNT)
    const homeY = new Float32Array(FIREFLY_COUNT)
    const homeZ = new Float32Array(FIREFLY_COUNT)
    const phase = new Float32Array(FIREFLY_COUNT) // bob phase
    const bobAmp = new Float32Array(FIREFLY_COUNT) // vertical bob amplitude
    const bobSpd = new Float32Array(FIREFLY_COUNT) // bob speed
    const swayAmp = new Float32Array(FIREFLY_COUNT) // horizontal sway amplitude
    const twkPhase = new Float32Array(FIREFLY_COUNT) // twinkle phase

    const col = new THREE.Color()
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      // Spread across x -14..20, z -16..10, y 0.3..3.2
      const x = -14 + seeded(i, 1) * 34
      const y = 0.3 + seeded(i, 2) * 2.9
      const z = -16 + seeded(i, 3) * 26
      homeX[i] = x
      homeY[i] = y
      homeZ[i] = z
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      phase[i] = seeded(i, 4) * Math.PI * 2
      bobAmp[i] = 0.18 + seeded(i, 5) * 0.32
      bobSpd[i] = 0.5 + seeded(i, 6) * 0.9
      swayAmp[i] = 0.12 + seeded(i, 7) * 0.3
      twkPhase[i] = seeded(i, 8) * Math.PI * 2

      col.set(FIREFLY_COLORS[i % FIREFLY_COLORS.length])
      baseColors[i * 3] = col.r
      baseColors[i * 3 + 1] = col.g
      baseColors[i * 3 + 2] = col.b
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    return {
      positions,
      colors,
      baseColors,
      homeX,
      homeY,
      homeZ,
      phase,
      bobAmp,
      bobSpd,
      swayAmp,
      twkPhase,
    }
  }, [])

  useFrame(() => {
    const g = geomRef.current
    if (!g) return
    const t = performance.now() * 0.001
    const pos = g.attributes.position.array as Float32Array
    const col = g.attributes.color.array as Float32Array
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const ph = data.phase[i]
      // Gentle organic bob + slow horizontal drift on two different frequencies.
      pos[i * 3] = data.homeX[i] + Math.sin(t * 0.4 * data.bobSpd[i] + ph) * data.swayAmp[i]
      pos[i * 3 + 1] = data.homeY[i] + Math.sin(t * data.bobSpd[i] + ph) * data.bobAmp[i]
      pos[i * 3 + 2] =
        data.homeZ[i] + Math.cos(t * 0.35 * data.bobSpd[i] + ph) * data.swayAmp[i] * 0.7

      // Twinkle: scale the base color brightness between ~0.35 and 1.0.
      const tw = 0.68 + Math.sin(t * 2.2 + data.twkPhase[i]) * 0.32
      col[i * 3] = data.baseColors[i * 3] * tw
      col[i * 3 + 1] = data.baseColors[i * 3 + 1] * tw
      col[i * 3 + 2] = data.baseColors[i * 3 + 2] * tw
    }
    g.attributes.position.needsUpdate = true
    g.attributes.color.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={FIREFLY_COUNT}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={FIREFLY_COUNT}
          array={data.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.55}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

// ---------------------------------------------------------------------------
// EMBERS — ~34 tiny warm points rising from the campfire, drifting up ~2.5
// units then recycling to the base, fading (via color) as they rise.
// Campfire base: (3.9, 0.2, 4.4).
// ---------------------------------------------------------------------------
const EMBER_COUNT = 34
const EMBER_BASE = new THREE.Vector3(3.9, 0.2, 4.4)
const EMBER_RISE = 2.5
const EMBER_WARM = ['#ffb15a', '#ff8a3c']

function Embers() {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const sprite = useMemo(() => makeSoftDot(0.15), [])

  const data = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3)
    const colors = new Float32Array(EMBER_COUNT * 3)
    const baseColors = new Float32Array(EMBER_COUNT * 3)
    const offset = new Float32Array(EMBER_COUNT) // start jitter along the rise (0..1)
    const speed = new Float32Array(EMBER_COUNT) // rise speed
    const drift = new Float32Array(EMBER_COUNT) // sway radius
    const phase = new Float32Array(EMBER_COUNT) // sway phase
    const spawnR = new Float32Array(EMBER_COUNT) // base spawn radius

    const col = new THREE.Color()
    for (let i = 0; i < EMBER_COUNT; i++) {
      offset[i] = seeded(i, 11)
      speed[i] = 0.3 + seeded(i, 12) * 0.35
      drift[i] = 0.1 + seeded(i, 13) * 0.35
      phase[i] = seeded(i, 14) * Math.PI * 2
      spawnR[i] = seeded(i, 15) * 0.35

      col.set(EMBER_WARM[i % EMBER_WARM.length])
      baseColors[i * 3] = col.r
      baseColors[i * 3 + 1] = col.g
      baseColors[i * 3 + 2] = col.b
      // seed initial positions so first frame isn't all at the base
      const a = seeded(i, 16) * Math.PI * 2
      positions[i * 3] = EMBER_BASE.x + Math.cos(a) * spawnR[i]
      positions[i * 3 + 1] = EMBER_BASE.y + offset[i] * EMBER_RISE
      positions[i * 3 + 2] = EMBER_BASE.z + Math.sin(a) * spawnR[i]
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    return { positions, colors, baseColors, offset, speed, drift, phase, spawnR }
  }, [])

  useFrame(() => {
    const g = geomRef.current
    if (!g) return
    const t = performance.now() * 0.001
    const pos = g.attributes.position.array as Float32Array
    const col = g.attributes.color.array as Float32Array
    for (let i = 0; i < EMBER_COUNT; i++) {
      // Progress 0..1 up the rise; recycle via fractional part.
      const prog = (data.offset[i] + t * data.speed[i]) % 1
      const rise = prog * EMBER_RISE
      // Sway widens slightly as it rises, like heat convection.
      const sway = data.drift[i] * (0.3 + prog)
      pos[i * 3] = EMBER_BASE.x + Math.cos(t * 1.6 + data.phase[i]) * sway
      pos[i * 3 + 1] = EMBER_BASE.y + rise
      pos[i * 3 + 2] = EMBER_BASE.z + Math.sin(t * 1.3 + data.phase[i]) * sway

      // Fade out toward the top (1 at base, ~0 at top) with a flicker.
      const fade = (1 - prog) * (0.7 + Math.sin(t * 9 + data.phase[i]) * 0.3)
      col[i * 3] = data.baseColors[i * 3] * fade
      col[i * 3 + 1] = data.baseColors[i * 3 + 1] * fade
      col[i * 3 + 2] = data.baseColors[i * 3 + 2] * fade
    }
    g.attributes.position.needsUpdate = true
    g.attributes.color.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={EMBER_COUNT}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={EMBER_COUNT}
          array={data.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.22}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

// ---------------------------------------------------------------------------
// MOTES — ~40 faint slow-falling dust/petal motes over the whole camp. Very
// low opacity, gentle horizontal drift, recycling to the top when they reach
// the ground. Cool pale tint so they read as dust in the neon dusk.
// ---------------------------------------------------------------------------
const MOTE_COUNT = 40
const MOTE_TOP = 4.5
const MOTE_TINT = new THREE.Color('#cbd6ff')

function Motes() {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const sprite = useMemo(() => makeSoftDot(0.05), [])

  const data = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3)
    const colors = new Float32Array(MOTE_COUNT * 3)
    const homeX = new Float32Array(MOTE_COUNT)
    const homeZ = new Float32Array(MOTE_COUNT)
    const startY = new Float32Array(MOTE_COUNT) // 0..1 progress down the column
    const fallSpd = new Float32Array(MOTE_COUNT)
    const swayAmp = new Float32Array(MOTE_COUNT)
    const phase = new Float32Array(MOTE_COUNT)

    for (let i = 0; i < MOTE_COUNT; i++) {
      const x = -14 + seeded(i, 21) * 34
      const z = -16 + seeded(i, 22) * 26
      homeX[i] = x
      homeZ[i] = z
      startY[i] = seeded(i, 23)
      fallSpd[i] = 0.03 + seeded(i, 24) * 0.05
      swayAmp[i] = 0.25 + seeded(i, 25) * 0.5
      phase[i] = seeded(i, 26) * Math.PI * 2

      positions[i * 3] = x
      positions[i * 3 + 1] = startY[i] * MOTE_TOP
      positions[i * 3 + 2] = z
      colors[i * 3] = MOTE_TINT.r
      colors[i * 3 + 1] = MOTE_TINT.g
      colors[i * 3 + 2] = MOTE_TINT.b
    }
    return { positions, colors, homeX, homeZ, startY, fallSpd, swayAmp, phase }
  }, [])

  useFrame(() => {
    const g = geomRef.current
    if (!g) return
    const t = performance.now() * 0.001
    const pos = g.attributes.position.array as Float32Array
    for (let i = 0; i < MOTE_COUNT; i++) {
      const ph = data.phase[i]
      // Fall downward, recycling from the top. prog: 1 at top -> 0 at ground.
      const prog = (data.startY[i] - t * data.fallSpd[i]) % 1
      const y = (prog < 0 ? prog + 1 : prog) * MOTE_TOP
      pos[i * 3] = data.homeX[i] + Math.sin(t * 0.35 + ph) * data.swayAmp[i]
      pos[i * 3 + 1] = y + 0.3
      pos[i * 3 + 2] = data.homeZ[i] + Math.cos(t * 0.3 + ph) * data.swayAmp[i] * 0.8
    }
    g.attributes.position.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={MOTE_COUNT}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={MOTE_COUNT}
          array={data.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.3}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
