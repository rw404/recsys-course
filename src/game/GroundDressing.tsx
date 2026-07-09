import { useMemo } from 'react'
import * as THREE from 'three'
import type { GroundPattern, WorldTheme } from './worldThemes'

/**
 * GroundDressing — a reusable TEXTURED ground overlay laid over a world's flat island top, so the
 * floor reads as stone/paving/grass/panels instead of one flat colour (the audit's biggest
 * high-area win). A procedural CanvasTexture (by pattern + palette) with a radial alpha falloff so
 * it blends into the dark island rim. Authored once, themed per world via WorldTheme.ground.
 */

// cache generated textures so re-mounting worlds does not re-rasterise
const texCache = new Map<string, THREE.CanvasTexture>()

function shade(hex: string, mul: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * mul))
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * mul))
  const b = Math.min(255, Math.round((n & 0xff) * mul))
  return `rgb(${r},${g},${b})`
}
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

function makeGroundTexture(pattern: GroundPattern, palette: [string, string, string]): THREE.CanvasTexture {
  const key = pattern + palette.join()
  const cached = texCache.get(key)
  if (cached) return cached
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  // deterministic pseudo-random for a stable, tileable-ish layout
  let s = 20260709
  const rnd = () => ((s = (s * 1664525 + 1013904223) & 0xffffffff), ((s >>> 0) % 100000) / 100000)

  ctx.fillStyle = shade(palette[1], 0.7)
  ctx.fillRect(0, 0, S, S)

  if (pattern === 'tile') {
    const cells = 9
    const step = S / cells
    for (let gy = -1; gy < cells + 1; gy++) {
      for (let gx = -1; gx < cells + 1; gx++) {
        const off = (gy & 1) * step * 0.5
        const cx = gx * step + off + step * 0.5 + (rnd() - 0.5) * step * 0.26
        const cy = gy * step + step * 0.5 + (rnd() - 0.5) * step * 0.26
        const w = step * (0.66 + rnd() * 0.24)
        const h = step * (0.62 + rnd() * 0.24)
        const r = Math.min(w, h) * (0.16 + rnd() * 0.16)
        const base = palette[Math.floor(rnd() * palette.length)]
        const v = 0.82 + rnd() * 0.32
        const g = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2)
        g.addColorStop(0, shade(base, v))
        g.addColorStop(1, shade(base, v * 0.64))
        ctx.fillStyle = g
        roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r)
        ctx.fill()
        ctx.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.04})`
        ctx.lineWidth = 1.1
        ctx.stroke()
      }
    }
  } else if (pattern === 'panel') {
    const cols = 6
    const step = S / cols
    for (let gy = 0; gy < cols; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const base = palette[(gx + gy) % palette.length]
        ctx.fillStyle = shade(base, 0.85 + rnd() * 0.3)
        ctx.fillRect(gx * step + 3, gy * step + 3, step - 6, step - 6)
        // rivets
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        for (const [rx, ry] of [[8, 8], [step - 8, 8], [8, step - 8], [step - 8, step - 8]] as const) {
          ctx.beginPath(); ctx.arc(gx * step + rx, gy * step + ry, 2.2, 0, Math.PI * 2); ctx.fill()
        }
      }
    }
    // faint circuit seams
    ctx.strokeStyle = 'rgba(180,150,255,0.14)'
    ctx.lineWidth = 2
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, S); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(S, i * step); ctx.stroke()
    }
  } else {
    // speckle: soft organic blotches (grass / soil / moss)
    for (let i = 0; i < 900; i++) {
      const x = rnd() * S
      const y = rnd() * S
      const rad = 4 + rnd() * 18
      const base = palette[Math.floor(rnd() * palette.length)]
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, shade(base, 0.9 + rnd() * 0.5))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
  }

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

// radial alpha map: opaque centre → soft fade to transparent at the rim (blend into island edge)
let alphaTex: THREE.CanvasTexture | null = null
function alphaTexture(): THREE.CanvasTexture {
  if (alphaTex) return alphaTex
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.72, '#dcdcdc')
  g.addColorStop(0.92, '#333333')
  g.addColorStop(1, '#000000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  alphaTex = new THREE.CanvasTexture(c)
  return alphaTex
}

export function GroundDressing({
  theme,
  center,
  radius,
  y = 0.32,
}: {
  theme: WorldTheme
  center: [number, number, number]
  radius: number
  y?: number
}) {
  const colorTex = useMemo(() => makeGroundTexture(theme.ground.pattern, theme.ground.palette), [theme])
  const aTex = useMemo(() => alphaTexture(), [])
  return (
    <mesh position={[center[0], y, center[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 72]} />
      <meshStandardMaterial
        map={colorTex}
        alphaMap={aTex}
        color={theme.ground.tint}
        emissive="#ffffff"
        emissiveMap={colorTex}
        emissiveIntensity={0.18}
        roughness={0.96}
        metalness={0.03}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
}
