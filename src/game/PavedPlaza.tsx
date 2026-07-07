import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PavedPlaza — a warm lantern-lit cobblestone floor laid over the hub, replacing the
 * "flat dark void" ground feel. It is a FLAT overlay: a CanvasTexture cobblestone disc
 * with a soft radial alpha falloff into the dark island top, plus additive warm/cool
 * glow decals (warm at the campfire, cool at the Metrics Plaza) and a couple of faint
 * glowing seam lines. No colliders. Sits at y ~= 0.31, just above the island top (0.30).
 */
export function PavedPlaza() {
  return (
    <group>
      {/* base cobblestone disc */}
      <Cobblestone center={[3, 0.31, 1]} radius={11} />
      {/* warm hearth glow under the campfire */}
      <GlowDecal position={[3.9, 0.315, 4.4]} radius={5.5} color="#ff8a3c" opacity={0.55} seed={0.3} />
      {/* fainter cool glow near the Metrics Plaza board */}
      <GlowDecal position={[3.5, 0.315, 0.6]} radius={3.6} color="#7ad0ff" opacity={0.28} seed={2.1} />
      {/* subtle glowing seam lines threading through the plaza */}
      <SeamLines center={[3, 0.318, 1]} />
    </group>
  )
}

/**
 * Draws an irregular warm cobblestone tile pattern onto an offscreen canvas, maps it onto
 * a circle, and fades the edges out with a radial alpha map so it blends into the ground.
 */
function Cobblestone({ center, radius }: { center: [number, number, number]; radius: number }) {
  // deterministic pseudo-random so the layout is stable across reloads
  const rng = useMemo(() => {
    let s = 1337
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return ((s >>> 0) % 100000) / 100000
    }
  }, [])

  const colorTex = useMemo(() => {
    const S = 512
    const c = document.createElement('canvas')
    c.width = c.height = S
    const ctx = c.getContext('2d')!

    // dark warm grout backdrop
    ctx.fillStyle = '#2a1d12'
    ctx.fillRect(0, 0, S, S)

    // warm stone palette (browns / tans)
    const stones = ['#6b5233', '#5a4a2e', '#5a3a22', '#7a6038', '#4a3a24', '#6b4a2c']

    // lay irregular rounded tiles on a jittered grid so grout gaps stay even-ish
    const cells = 9
    const step = S / cells
    for (let gy = -1; gy < cells + 1; gy++) {
      for (let gx = -1; gx < cells + 1; gx++) {
        // brick-style row offset + per-tile jitter
        const off = (gy & 1) * step * 0.5
        const cx = gx * step + off + step * 0.5 + (rng() - 0.5) * step * 0.28
        const cy = gy * step + step * 0.5 + (rng() - 0.5) * step * 0.28
        const w = step * (0.66 + rng() * 0.24)
        const h = step * (0.62 + rng() * 0.24)
        const r = Math.min(w, h) * (0.18 + rng() * 0.18)

        const base = stones[Math.floor(rng() * stones.length)]
        // per-tile value variation via a vertical gradient (top-lit look)
        const v = 0.82 + rng() * 0.3
        const col = shade(base, v)
        const colDark = shade(base, v * 0.66)

        const g = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2)
        g.addColorStop(0, col)
        g.addColorStop(1, colDark)
        ctx.fillStyle = g
        roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r)
        ctx.fill()

        // faint warm top highlight edge
        ctx.strokeStyle = `rgba(255,215,160,${0.05 + rng() * 0.06})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
    }

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [rng])

  // radial alpha map: opaque center, soft fade to transparent at the rim
  const alphaTex = useMemo(() => {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S / 2)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.7, '#e8e8e8')
    g.addColorStop(0.92, '#3a3a3a')
    g.addColorStop(1, '#000000')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  }, [])

  return (
    <mesh position={center} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial
        map={colorTex}
        alphaMap={alphaTex}
        color="#c8a878" /* gentle warm tint over the stones */
        emissive="#3a2410"
        emissiveIntensity={0.35}
        roughness={0.95}
        metalness={0.02}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
}

/** Additive radial glow decal laid flat on the plaza, gently pulsing. */
function GlowDecal({
  position,
  radius,
  color,
  opacity,
  seed,
}: {
  position: [number, number, number]
  radius: number
  color: string
  opacity: number
  seed: number
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const texture = useMemo(() => {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame(() => {
    if (mat.current) {
      const t = performance.now() * 0.001 + seed
      mat.current.opacity = opacity * (0.85 + Math.sin(t * 1.6) * 0.15)
    }
  })

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        ref={mat}
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** A few faint glowing seam lines radiating through the plaza for a paved-path feel. */
function SeamLines({ center }: { center: [number, number, number] }) {
  // deterministic ring of thin glowing spokes
  const spokes = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4
        const len = 8 + (i % 3) * 1.4
        return {
          x: Math.cos(a) * len * 0.5,
          z: Math.sin(a) * len * 0.5,
          rot: a,
          len,
          c: i % 2 === 0 ? '#ffb15a' : '#9b6bff',
        }
      }),
    []
  )
  return (
    <group position={center} rotation={[-Math.PI / 2, 0, 0]}>
      {spokes.map((s, i) => (
        <mesh key={i} position={[s.x, s.z, 0]} rotation={[0, 0, -s.rot]}>
          <planeGeometry args={[s.len, 0.08]} />
          <meshBasicMaterial
            color={s.c}
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ---- canvas helpers ----

/** Rounded-rectangle path (older canvas impls lack ctx.roundRect). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Multiply a #rrggbb hex color by a scalar value (clamped) → new hex string. */
function shade(hex: string, mul: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * mul))
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * mul))
  const b = Math.min(255, Math.round((n & 0xff) * mul))
  return `rgb(${r},${g},${b})`
}
