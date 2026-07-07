import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * RetrievalVista — the dramatic far-background "Retrieval Valley" the course path
 * leads toward. A sagging rope bridge crosses a chasm from the back plateau toward
 * a distant floating castle, with waterfalls spilling into the fog.
 *
 * It sits back-right in the fog, so silhouettes + emissive windows/lanterns carry
 * the read; fine detail is intentionally sparse. No colliders — the player never
 * reaches it. Emissive materials use meshBasicMaterial toneMapped={false} so the
 * PostFX bloom makes windows and lanterns twinkle.
 */
export function RetrievalVista() {
  return (
    <group>
      <RopeBridge />
      <FloatingCastle position={[35, 5, -27]} />
      <VistaWaterfalls />
      <MistPlane />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Rope bridge                                                         */
/* ------------------------------------------------------------------ */

// Bridge span endpoints (world space). Starts at the back plateau edge and
// crosses the chasm toward the floating castle.
const BRIDGE_A = new THREE.Vector3(20, 1.7, -14)
const BRIDGE_B = new THREE.Vector3(30, 0.4, -22)
const BRIDGE_SAG = 1.9 // how far the middle dips below the straight line

/** Point on the bridge curve for t in [0,1] (linear lerp + catenary-ish sag). */
function bridgePoint(t: number, out: THREE.Vector3): THREE.Vector3 {
  out.copy(BRIDGE_A).lerp(BRIDGE_B, t)
  // parabolic sag, zero at ends, max at middle
  out.y -= BRIDGE_SAG * 4 * t * (1 - t)
  return out
}

function RopeBridge() {
  // Precompute plank transforms (position + orientation) along the sagging curve.
  const planks = useMemo(() => {
    const count = 14
    const p = new THREE.Vector3()
    const next = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const dir = new THREE.Vector3()
    const m = new THREE.Matrix4()
    return Array.from({ length: count }).map((_, i) => {
      const t = (i + 0.5) / count
      bridgePoint(t, p)
      bridgePoint(Math.min(1, t + 0.001), next)
      dir.copy(next).sub(p).normalize()
      // orient the plank's local +x along the bridge direction
      m.lookAt(new THREE.Vector3(0, 0, 0), dir, up)
      quat.setFromRotationMatrix(m)
      return {
        position: [p.x, p.y, p.z] as [number, number, number],
        quaternion: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
      }
    })
  }, [])

  // Rope rail curves (two offset TubeGeometries following the same sag).
  const railGeos = useMemo(() => {
    const side = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const makeRail = (offset: number, yLift: number) => {
      const pts: THREE.Vector3[] = []
      const steps = 24
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        bridgePoint(t, a)
        bridgePoint(Math.min(1, t + 0.001), b)
        dir.copy(b).sub(a).normalize()
        side.copy(dir).cross(up).normalize().multiplyScalar(offset)
        pts.push(new THREE.Vector3(a.x + side.x, a.y + yLift, a.z + side.z))
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      return new THREE.TubeGeometry(curve, steps, 0.045, 5, false)
    }
    return {
      left: makeRail(0.55, 0.55),
      right: makeRail(-0.55, 0.55),
      deckLeft: makeRail(0.55, 0.02),
      deckRight: makeRail(-0.55, 0.02),
    }
  }, [])

  // Lantern orbs hanging along the rails.
  const lanterns = useMemo(() => {
    const p = new THREE.Vector3()
    return [0.18, 0.42, 0.68, 0.9].map((t) => {
      bridgePoint(t, p)
      return [p.x, p.y + 0.62, p.z] as [number, number, number]
    })
  }, [])

  const lanternMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (lanternMat.current) {
      const t = performance.now() * 0.001
      lanternMat.current.opacity = 0.8 + Math.sin(t * 2.1) * 0.15
    }
  })

  return (
    <group>
      {/* wooden planks */}
      {planks.map((pl, i) => (
        <mesh key={i} position={pl.position} quaternion={pl.quaternion}>
          <boxGeometry args={[0.16, 0.06, 1.15]} />
          <meshStandardMaterial color="#4a2f1a" roughness={0.95} />
        </mesh>
      ))}

      {/* rope rails (top hand-ropes) */}
      <mesh geometry={railGeos.left}>
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh geometry={railGeos.right}>
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      {/* rope rails (deck-level guide ropes) */}
      <mesh geometry={railGeos.deckLeft}>
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh geometry={railGeos.deckRight}>
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>

      {/* hanging warm lantern orbs */}
      {lanterns.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.36, 4]} />
            <meshBasicMaterial color="#2a1d12" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshBasicMaterial ref={i === 0 ? lanternMat : undefined} color="#ffb15a" transparent opacity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Distant floating castle                                            */
/* ------------------------------------------------------------------ */

function FloatingCastle({ position }: { position: [number, number, number] }) {
  // Seeded tower cluster: base cylinders with conical roofs, deterministic layout.
  const towers = useMemo(() => {
    const spec: {
      x: number
      z: number
      r: number
      h: number
      roof: number
    }[] = [
      { x: 0, z: 0, r: 1.9, h: 6.5, roof: 3.2 }, // central keep
      { x: -2.6, z: 0.8, r: 1.1, h: 4.4, roof: 2.2 },
      { x: 2.4, z: -0.6, r: 1.2, h: 5.0, roof: 2.4 },
      { x: 1.0, z: 2.4, r: 0.9, h: 3.6, roof: 1.9 },
      { x: -1.4, z: -2.2, r: 0.85, h: 3.2, roof: 1.8 },
      { x: 3.2, z: 1.8, r: 0.7, h: 2.6, roof: 1.6 },
    ]
    return spec
  }, [])

  // Seeded emissive windows scattered over the towers (purple/cyan twinkle).
  const windows = useMemo(() => {
    const out: { pos: [number, number, number]; color: string; s: number }[] = []
    let seed = 7
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    towers.forEach((tw) => {
      const rows = Math.max(2, Math.floor(tw.h / 1.3))
      const perRow = 4
      for (let ri = 0; ri < rows; ri++) {
        for (let wi = 0; wi < perRow; wi++) {
          if (rnd() > 0.62) continue // sparse
          const ang = (wi / perRow) * Math.PI * 2 + ri * 0.4
          const y = 0.9 + ri * 1.25
          const wx = tw.x + Math.cos(ang) * (tw.r + 0.02)
          const wz = tw.z + Math.sin(ang) * (tw.r + 0.02)
          out.push({
            pos: [wx, y, wz],
            color: rnd() > 0.5 ? '#9b6bff' : '#7ad0ff',
            s: 0.13 + rnd() * 0.08,
          })
        }
      }
    })
    return out
  }, [towers])

  const crownRef = useRef<THREE.MeshBasicMaterial>(null)
  const windowGroup = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = performance.now() * 0.001
    if (crownRef.current) crownRef.current.opacity = 0.28 + Math.sin(t * 0.9) * 0.08
    // gentle twinkle: modulate scale of the whole window group very slightly
    if (windowGroup.current) {
      const s = 1 + Math.sin(t * 1.7) * 0.03
      windowGroup.current.scale.setScalar(s)
    }
  })

  // Distant → scale the whole island up so it reads large through the fog.
  const scale = 1.6

  const crownTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(200,160,255,0.55)')
    g.addColorStop(0.5, 'rgba(140,110,255,0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  return (
    <group position={position} scale={scale}>
      {/* rocky floating underside (tapered cone) */}
      <mesh position={[0, -2.6, 0]}>
        <coneGeometry args={[3.4, 5.5, 10]} />
        <meshStandardMaterial color="#1a1130" roughness={1} flatShading />
      </mesh>
      {/* island top disc the towers stand on */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[3.6, 3.4, 0.4, 12]} />
        <meshStandardMaterial color="#201640" roughness={1} flatShading />
      </mesh>

      {/* towers with conical spires */}
      {towers.map((tw, i) => (
        <group key={i} position={[tw.x, 0.3, tw.z]}>
          <mesh position={[0, tw.h / 2, 0]}>
            <cylinderGeometry args={[tw.r, tw.r * 1.08, tw.h, 8]} />
            <meshStandardMaterial color="#2a2048" roughness={0.95} flatShading />
          </mesh>
          {/* spire roof */}
          <mesh position={[0, tw.h + tw.roof / 2, 0]}>
            <coneGeometry args={[tw.r * 1.15, tw.roof, 8]} />
            <meshStandardMaterial color="#201640" roughness={1} flatShading />
          </mesh>
          {/* tiny emissive finial on top */}
          <mesh position={[0, tw.h + tw.roof + 0.15, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshBasicMaterial color={i % 2 ? '#7ad0ff' : '#9b6bff'} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* emissive windows (twinkle group) */}
      <group ref={windowGroup}>
        {windows.map((w, i) => (
          <mesh key={i} position={[w.pos[0], w.pos[1] + 0.3, w.pos[2]]}>
            <boxGeometry args={[w.s, w.s * 1.4, w.s]} />
            <meshBasicMaterial color={w.color} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* soft crowning glow above the keep */}
      <mesh position={[0, 8.5, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial
          ref={crownRef}
          map={crownTex}
          color="#b06bff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Waterfalls + mist                                                  */
/* ------------------------------------------------------------------ */

/** Shared scrolling blue-white water texture (vertical gradient). */
function useWaterfallTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, 'rgba(160,205,255,0.7)')
    g.addColorStop(0.5, 'rgba(190,225,255,0.45)')
    g.addColorStop(1, 'rgba(120,170,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 128)
    const t = new THREE.CanvasTexture(c)
    t.wrapT = THREE.RepeatWrapping
    return t
  }, [])
}

// Thin water sheets spilling off the far island edges into the fog (back-right).
const FALL_SPOTS: { pos: [number, number, number]; rotY: number; size: [number, number]; speed: number }[] = [
  { pos: [32.5, 1.0, -25.5], rotY: 0.5, size: [3, 8], speed: 0.0007 },
  { pos: [37.5, 0.5, -28.5], rotY: -0.3, size: [2.4, 10], speed: 0.0009 },
  { pos: [34.5, 2.0, -30.0], rotY: 0.9, size: [2, 7], speed: 0.0006 },
]

function VistaWaterfalls() {
  const tex = useWaterfallTexture()
  useFrame(() => {
    // single shared texture scroll (all sheets share offset — cheap and reads fine at distance)
    tex.offset.y = (performance.now() * 0.0007) % 1
  })
  return (
    <group>
      {FALL_SPOTS.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          <planeGeometry args={f.size} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Faint horizontal mist plane hanging in the chasm between bridge and castle. */
function MistPlane() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(180,190,230,0.35)')
    g.addColorStop(0.6, 'rgba(150,160,210,0.14)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  const ref = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (ref.current) ref.current.opacity = 0.4 + Math.sin(performance.now() * 0.0004) * 0.08
  })
  return (
    <mesh position={[31, -0.6, -24]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[22, 18]} />
      <meshBasicMaterial
        ref={ref}
        map={tex}
        color="#9fd0ff"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
