import type { PipelineModuleType } from '../logic/systemSimulator'

/* ==========================================================================
   Isometric device figures (isoflow-style) for each pipeline module.
   Everything is drawn in a shared true-isometric projection so the blocks
   read as little 3D machines rather than flat cards.
   ========================================================================== */

const S = 7 // pixels per isometric unit
const A = 0.8660254 // cos(30deg)
const B = 0.5 // sin(30deg)
const OX = 70 // projection origin x (viewBox is 0..140)
const OY = 104 // projection origin y — the ground plane sits low so figures rise

// Project a 3D point (x = east, y = up, z = south) into the 2D iso plane.
function proj(x: number, y: number, z: number): [number, number] {
  return [OX + (x - z) * A * S, OY + (x + z) * B * S - y * S]
}
const pt = (x: number, y: number, z: number) => proj(x, y, z).join(',')

// Shade a base hex toward white (amt > 0) or black (amt < 0).
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const f = (c: number) => (amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt)))
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0')}`
}

interface Faces {
  top: string
  left: string
  right: string
}
function palette(base: string): Faces {
  return { top: shade(base, 0.2), left: shade(base, -0.16), right: shade(base, -0.36) }
}

// A solid isometric box with its three visible faces, drawn back-to-front.
function Box({
  x,
  z,
  w,
  d,
  y = 0,
  h,
  c,
  stroke,
}: {
  x: number
  z: number
  w: number
  d: number
  y?: number
  h: number
  c: Faces
  stroke?: string
}) {
  const x1 = x + w
  const z1 = z + d
  const y1 = y + h
  const s = stroke ?? shade(c.right, -0.25)
  const top = `${pt(x, y1, z)} ${pt(x1, y1, z)} ${pt(x1, y1, z1)} ${pt(x, y1, z1)}`
  const right = `${pt(x1, y1, z)} ${pt(x1, y1, z1)} ${pt(x1, y, z1)} ${pt(x1, y, z)}`
  const front = `${pt(x, y1, z1)} ${pt(x1, y1, z1)} ${pt(x1, y, z1)} ${pt(x, y, z1)}`
  return (
    <g strokeLinejoin="round" stroke={s} strokeWidth={0.6}>
      <polygon points={front} fill={c.left} />
      <polygon points={right} fill={c.right} />
      <polygon points={top} fill={c.top} />
    </g>
  )
}

// An isometric cylinder / drum (the ground-plane circle projects to an ellipse).
function Cyl({
  cx,
  cz,
  r,
  y = 0,
  h,
  c,
}: {
  cx: number
  cz: number
  r: number
  y?: number
  h: number
  c: Faces
}) {
  const rx = r * Math.SQRT2 * A * S
  const ry = r * Math.SQRT2 * B * S
  const [tx, ty] = proj(cx, y + h, cz)
  const [bx, by] = proj(cx, y, cz)
  const body = `M ${tx - rx} ${ty} L ${bx - rx} ${by} A ${rx} ${ry} 0 0 0 ${bx + rx} ${by} L ${tx + rx} ${ty} A ${rx} ${ry} 0 0 1 ${tx - rx} ${ty} Z`
  return (
    <g stroke={shade(c.right, -0.2)} strokeWidth={0.6} strokeLinejoin="round">
      <path d={body} fill={c.left} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={c.top} />
    </g>
  )
}

// A flat isometric ground tile the device stands on (a soft zone platform).
function Tile({ r = 4.4, c }: { r?: number; c: string }) {
  const p = [pt(r, 0, -r), pt(r, 0, r), pt(-r, 0, r), pt(-r, 0, -r)].join(' ')
  return <polygon points={p} fill={c} opacity={0.22} />
}

// A thin rectangle lying flat on a device's top plane (for grooves / details).
function topRect(x0: number, x1: number, z0: number, z1: number, y: number) {
  return [pt(x0, y, z0), pt(x1, y, z0), pt(x1, y, z1), pt(x0, y, z1)].join(' ')
}

/* --- The device catalogue --------------------------------------------------
   Each figure is authored around the origin with a small ground footprint. */

function Ratings() {
  const c = palette('#33bccd')
  return (
    <g>
      <Tile c="#1b6f7b" />
      <Cyl cx={0} cz={0} r={3} y={0} h={1.7} c={c} />
      <Cyl cx={0} cz={0} r={3} y={1.9} h={1.7} c={c} />
      <Cyl cx={0} cz={0} r={3} y={3.8} h={1.7} c={c} />
    </g>
  )
}

function Features() {
  const c = palette('#31c1b6')
  const slot = palette('#0f7d75')
  return (
    <g>
      <Tile c="#166f68" />
      <Box x={-3} z={-2.5} w={6} d={5} h={6} c={c} />
      {/* drawer slots on the front (z1) face */}
      {[0.8, 2.4, 4.0].map((yy) => (
        <Box key={yy} x={-2.4} z={2.5} w={4.8} d={0.001} y={yy} h={1} c={slot} />
      ))}
    </g>
  )
}

function Popularity() {
  const c = palette('#3fce97')
  return (
    <g>
      <Tile c="#1c7d5e" />
      <Box x={-2.6} z={-1} w={1.5} d={1.5} h={2.6} c={c} />
      <Box x={-0.75} z={-1} w={1.5} d={1.5} h={4.4} c={c} />
      <Box x={1.1} z={-1} w={1.5} d={1.5} h={6.4} c={c} />
    </g>
  )
}

function Collaborative() {
  const c = palette('#37b6cf')
  const head = palette('#8fe3ef')
  const people: Array<[number, number]> = [
    [-1.8, -0.4],
    [1.8, -0.4],
    [0, 1.8],
  ]
  return (
    <g>
      <Tile c="#1c6d84" />
      {people.map(([px, pz], i) => (
        <g key={i}>
          <Box x={px - 0.9} z={pz - 0.9} w={1.8} d={1.8} h={2.2} c={c} />
          <Cyl cx={px} cz={pz} r={0.95} y={2.2} h={1.3} c={head} />
        </g>
      ))}
    </g>
  )
}

function VectorSearch() {
  const [cx, cy] = proj(0, 3, 0)
  const r = 2.5 * Math.SQRT2 * A * S
  return (
    <g>
      <Tile c="#1c7a76" />
      <defs>
        <radialGradient id="iso-vec" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#a7f2ec" />
          <stop offset="55%" stopColor="#2ec9c0" />
          <stop offset="100%" stopColor="#127a74" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.62} fill="none" stroke="#5fe0d6" strokeWidth={1.1} opacity={0.7} transform={`rotate(26 ${cx} ${cy})`} />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.62} fill="none" stroke="#5fe0d6" strokeWidth={1.1} opacity={0.7} transform={`rotate(-26 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="url(#iso-vec)" stroke="#0f6a66" strokeWidth={0.6} />
      {[26, -26].map((ang) => {
        const rad = (ang * Math.PI) / 180
        const ex = cx + Math.cos(rad) * r
        const ey = cy + Math.sin(rad) * r * 0.62
        return <circle key={ang} cx={ex} cy={ey} r={1.6} fill="#d7fbf6" stroke="#0f6a66" strokeWidth={0.5} />
      })}
    </g>
  )
}

function Blend() {
  const c = palette('#efc24c')
  const spout = palette('#c99a2c')
  return (
    <g>
      <Tile c="#8a6a1c" />
      {/* two inlet bars merging into a mixer */}
      <Box x={-3} z={-2.4} w={1.7} d={1.7} y={2.4} h={2.2} c={c} />
      <Box x={-3} z={0.7} w={1.7} d={1.7} y={2.4} h={2.2} c={c} />
      <Box x={-0.4} z={-1.4} w={3.2} d={3} h={3.4} c={spout} />
      <Box x={2.4} z={-0.6} w={1.4} d={1.4} y={0.9} h={1.4} c={c} />
    </g>
  )
}

function SeenFilter() {
  const c = palette('#e9a836')
  const R = 3
  const rn = 0.85
  const rimS = Math.SQRT2 * A * S
  const rimT = Math.SQRT2 * B * S
  const [rx, ry] = proj(0, 5.2, 0)
  const [nx, ny] = proj(0, 2.6, 0)
  const RX = R * rimS
  const RY = R * rimT
  const NX = rn * rimS
  const NY = rn * rimT
  // cone wall (wide rim narrowing to the neck) + hollow opening + spout + drip
  const cone = `M ${rx - RX} ${ry} L ${nx - NX} ${ny} A ${NX} ${NY} 0 0 0 ${nx + NX} ${ny} L ${rx + RX} ${ry} A ${RX} ${RY} 0 0 1 ${rx - RX} ${ry} Z`
  return (
    <g stroke={shade(c.right, -0.2)} strokeWidth={0.6} strokeLinejoin="round">
      <Tile c="#b98a3a" />
      <path d={cone} fill={c.left} />
      <ellipse cx={rx} cy={ry} rx={RX} ry={RY} fill={shade('#e9a836', -0.28)} />
      <ellipse cx={rx} cy={ry} rx={RX} ry={RY} fill="none" stroke={c.top} strokeWidth={1.4} />
      <Cyl cx={0} cz={0} r={0.6} y={0.3} h={2.3} c={palette('#cf9327')} />
      <circle {...circleAt(0, -0.2, 0, 1.3)} fill="#ffe6a3" stroke="#b3841f" strokeWidth={0.5} />
    </g>
  )
}

function Ranker() {
  const knob = palette('#ffb59d')
  const panel = palette('#e07a60')
  const rows: Array<[number, number]> = [
    [-1.4, 1.3],
    [0, -0.6],
    [1.4, 0.5],
  ]
  const y = 1.4
  return (
    <g>
      <Tile c="#b56a55" />
      <Box x={-3.2} z={-2.6} w={6.4} d={5.2} h={y} c={panel} />
      {rows.map(([rz, kx], i) => (
        <g key={i}>
          {/* groove track lying on the top face */}
          <polygon points={topRect(-2.6, 2.6, rz - 0.16, rz + 0.16, y)} fill={shade('#e07a60', -0.34)} />
          {/* slider knob */}
          <Cyl cx={kx} cz={rz} r={0.62} y={y} h={0.7} c={knob} />
        </g>
      ))}
    </g>
  )
}

function Diversify() {
  const tiles: Array<[number, number, number, string]> = [
    [-2.2, -1.8, 0, '#ef8a6f'],
    [1.6, -1.4, 2.4, '#f2b48f'],
    [-1.2, 1.8, 1.4, '#e8795f'],
    [2.2, 1.4, 3.6, '#f6cbb1'],
  ]
  return (
    <g>
      <Tile c="#8a4636" />
      {tiles
        .slice()
        .sort((a, b) => a[1] - b[1])
        .map(([tx, tz, ty, col], i) => (
          <Box key={i} x={tx - 1} z={tz - 1} w={2} d={2} y={ty} h={0.7} c={palette(col)} />
        ))}
    </g>
  )
}

function Evaluator() {
  const c = palette('#54c268')
  const [cx, cy] = proj(0, 2.2, 0)
  const rx = 3.2 * Math.SQRT2 * A * S
  const ry = 3.2 * Math.SQRT2 * B * S
  return (
    <g>
      <Tile c="#2c7a3f" />
      <Box x={-3.2} z={-3.2} w={6.4} d={6.4} h={2} c={palette('#3f9c52')} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c.top} stroke={shade(c.right, -0.2)} strokeWidth={0.6} />
      {/* ticks */}
      {[-60, -20, 20, 60].map((ang) => {
        const rad = (ang * Math.PI) / 180 - Math.PI / 2
        const x1 = cx + Math.cos(rad) * rx * 0.68
        const y1 = cy + Math.sin(rad) * ry * 0.68
        const x2 = cx + Math.cos(rad) * rx * 0.92
        const y2 = cy + Math.sin(rad) * ry * 0.92
        return <line key={ang} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e5e2e" strokeWidth={0.8} />
      })}
      {/* needle */}
      <line x1={cx} y1={cy} x2={cx + rx * 0.5} y2={cy - ry * 0.55} stroke="#12421d" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={1.6} fill="#12421d" />
    </g>
  )
}

function Output() {
  const stand = palette('#33506b')
  const frame = palette('#4a6b8a')
  // screen face on the front (z1) plane
  const sx = -3
  const sz = 2.6
  const screen = [pt(sx, 5.4, sz), pt(sx + 6, 5.4, sz), pt(sx + 6, 1.4, sz), pt(sx, 1.4, sz)]
  const posters = ['#ef765f', '#e0aa35', '#27ad9f', '#6c6cc7']
  return (
    <g>
      <Tile c="#22405a" />
      <Box x={-0.8} z={-0.8} w={1.6} d={1.6} h={1.4} c={stand} />
      <Box x={-3.4} z={2.6} w={6.8} d={0.6} y={1} h={4.8} c={frame} />
      <polygon points={screen.join(' ')} fill="#0c2036" stroke="#12314e" strokeWidth={0.6} />
      {posters.map((col, i) => {
        const bx = sx + 0.6 + i * 1.35
        const bar = [pt(bx, 4.9, sz), pt(bx + 1, 4.9, sz), pt(bx + 1, 2.0, sz), pt(bx, 2.0, sz)]
        return <polygon key={i} points={bar.join(' ')} fill={col} opacity={0.92} />
      })}
    </g>
  )
}

// Helper for a small iso-plane circle placed at a 3D point.
function circleAt(x: number, y: number, z: number, r: number) {
  const [cx, cy] = proj(x, y, z)
  return { cx, cy, r }
}

const FIGURES: Record<PipelineModuleType, () => JSX.Element> = {
  ratingsSource: Ratings,
  featureStore: Features,
  popularity: Popularity,
  collaborative: Collaborative,
  vectorSearch: VectorSearch,
  blend: Blend,
  seenFilter: SeenFilter,
  ranker: Ranker,
  diversify: Diversify,
  evaluator: Evaluator,
  output: Output,
}

export function IsoModuleFigure({ type }: { type: PipelineModuleType }) {
  const Figure = FIGURES[type] ?? Ratings
  return (
    <svg className="iso-figure-svg" viewBox="0 0 140 150" role="img" aria-hidden="true">
      <Figure />
    </svg>
  )
}
