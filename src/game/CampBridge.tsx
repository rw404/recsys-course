import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

/**
 * CampBridge — a prominent, lantern-lit rope bridge on the RIGHT edge of Foundations
 * Camp, crossing a shadowed ravine toward Retrieval Valley. It replaces the old dark
 * rune-arch: instead of an unreadable silhouette, this is a clear "the path continues
 * onward" landmark the player can actually read up close.
 *
 * Built from primitives so it stays crisp and cheap: sagging plank deck, four rope
 * curves (two hand-ropes + two deck ropes) as TubeGeometry, vertical rope hangers,
 * warm hanging lanterns, two rocky anchor bluffs, and a dark ravine beneath. A warm
 * point light lifts it out of the dark. No path-blocking colliders except the two
 * anchor rocks.
 */

// Span endpoints (world space). Placed on the camp's front-RIGHT edge where the old
// rune-arch stood (~x7,z10) so it reads in the explore view, and — critically — BOTH
// ends sit BEHIND the lesson camera (at 8.3,2.6,5.7, looking -x/-z) so no rope rail
// ever slashes across the composed lesson two-shot.
const A = new THREE.Vector3(8.0, 1.6, 11.0)
const B = new THREE.Vector3(15.5, 1.35, 4.5)
const SAG = 0.95 // mid-span dip below the straight line

function bridgePoint(t: number, out: THREE.Vector3): THREE.Vector3 {
  out.copy(A).lerp(B, t)
  out.y -= SAG * 4 * t * (1 - t) // parabolic sag, zero at ends
  return out
}

// bridge direction + horizontal side vector (for rails/planks), computed once
const DIR = new THREE.Vector3().subVectors(B, A).setY(0).normalize()
const SIDE = new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 1, 0)).normalize()
const YAW = Math.atan2(B.x - A.x, B.z - A.z)
const HALF_W = 0.62 // half deck width

export function CampBridge() {
  return (
    <group>
      <Ravine />
      <AnchorRocks />
      <Deck />
      <Ropes />
      <Lanterns />
      {/* warm read light so the bridge never sinks into a dark blob like the old arch */}
      <pointLight position={[(A.x + B.x) / 2, 3.2, (A.z + B.z) / 2]} intensity={22} color="#ffca82" distance={12} decay={2} />
    </group>
  )
}

/** Sagging wooden plank deck. */
function Deck() {
  const planks = useMemo(() => {
    const count = 22
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
      m.lookAt(new THREE.Vector3(0, 0, 0), dir, up)
      quat.setFromRotationMatrix(m)
      return {
        position: [p.x, p.y, p.z] as [number, number, number],
        quaternion: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
      }
    })
  }, [])
  return (
    <group>
      {planks.map((pl, i) => (
        <mesh key={i} position={pl.position} quaternion={pl.quaternion} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.08, HALF_W * 2]} />
          <meshStandardMaterial color={i % 2 ? '#5a3a1f' : '#4a2f1a'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/** Two hand-rope rails + two deck-edge ropes + vertical rope hangers. */
function Ropes() {
  const { rails, hangers } = useMemo(() => {
    const a = new THREE.Vector3()
    const makeRail = (offset: number, yLift: number) => {
      const pts: THREE.Vector3[] = []
      const steps = 28
      for (let i = 0; i <= steps; i++) {
        bridgePoint(i / steps, a)
        pts.push(new THREE.Vector3(a.x + SIDE.x * offset, a.y + yLift, a.z + SIDE.z * offset))
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      return new THREE.TubeGeometry(curve, steps, 0.03, 5, false)
    }
    const rails = {
      handL: makeRail(HALF_W, 0.72),
      handR: makeRail(-HALF_W, 0.72),
      deckL: makeRail(HALF_W, 0.05),
      deckR: makeRail(-HALF_W, 0.05),
    }
    // vertical rope hangers connecting deck rope to hand rope at intervals, both sides
    const hangers: { pos: [number, number, number]; h: number }[] = []
    const N = 9
    for (let i = 1; i < N; i++) {
      const t = i / N
      bridgePoint(t, a)
      for (const s of [HALF_W, -HALF_W]) {
        hangers.push({ pos: [a.x + SIDE.x * s, a.y + 0.385, a.z + SIDE.z * s], h: 0.67 })
      }
    }
    return { rails, hangers }
  }, [])

  return (
    <group>
      {Object.values(rails).map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color="#2a1d12" roughness={1} />
        </mesh>
      ))}
      {hangers.map((hg, i) => (
        <mesh key={i} position={hg.pos}>
          <cylinderGeometry args={[0.012, 0.012, hg.h, 4]} />
          <meshStandardMaterial color="#2a1d12" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Warm lantern orbs hanging from the hand-ropes, gently pulsing. */
function Lanterns() {
  const spots = useMemo(() => {
    const p = new THREE.Vector3()
    return [0.2, 0.5, 0.8].map((t) => {
      bridgePoint(t, p)
      return [p.x + SIDE.x * HALF_W, p.y + 0.72, p.z + SIDE.z * HALF_W] as [number, number, number]
    })
  }, [])
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (mat.current) mat.current.opacity = 0.82 + Math.sin(performance.now() * 0.0022) * 0.15
  })
  return (
    <group>
      {spots.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.32, 4]} />
            <meshBasicMaterial color="#2a1d12" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshBasicMaterial ref={i === 0 ? mat : undefined} color="#ffb15a" transparent opacity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Rocky anchor bluffs at each end (with colliders so the player can't clip through). */
function AnchorRocks() {
  const rocks: { pos: [number, number, number]; s: [number, number, number]; rot: number }[] = [
    { pos: [A.x + 0.3, 0.2, A.z + 0.2], s: [1.5, 2.2, 1.5], rot: 0.5 },
    { pos: [B.x - 0.2, 0.0, B.z - 0.3], s: [1.8, 2.4, 1.8], rot: -0.7 },
  ]
  return (
    <group>
      {rocks.map((r, i) => (
        <group key={i}>
          <mesh position={r.pos} rotation={[0.1, r.rot, 0.08]} scale={r.s} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i ? '#241a40' : '#2a2048'} roughness={1} flatShading />
          </mesh>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[r.s[0] * 0.5, 1.5, r.s[2] * 0.5]} position={[r.pos[0], 0.75, r.pos[2]]} />
          </RigidBody>
        </group>
      ))}
      {/* far-side landing platform the bridge lands on */}
      <mesh position={[B.x + 0.6, 0.9, B.z - 0.9]} rotation={[0, YAW, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.5, 2.2]} />
        <meshStandardMaterial color="#241a40" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

/** A dark recessed ravine under the span so the bridge visibly crosses a gap. */
function Ravine() {
  const midX = (A.x + B.x) / 2
  const midZ = (A.z + B.z) / 2
  const len = A.distanceTo(B) + 2
  const mistRef = useRef<THREE.MeshBasicMaterial>(null)
  const mistTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(150,170,220,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(() => {
    if (mistRef.current) mistRef.current.opacity = 0.3 + Math.sin(performance.now() * 0.0005) * 0.1
  })
  return (
    <group position={[midX, 0, midZ]} rotation={[0, YAW, 0]}>
      {/* dark trench floor, sunk below the play surface */}
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[3.0, 2.6, len]} />
        <meshStandardMaterial color="#0d0a1e" roughness={1} />
      </mesh>
      {/* rocky banks flanking the trench */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.7, -0.15, 0]} rotation={[0, 0, s * 0.25]} scale={[1.1, 1.0, len * 0.5]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1a1130" roughness={1} flatShading />
        </mesh>
      ))}
      {/* faint mist rising from the chasm */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, len]} />
        <meshBasicMaterial ref={mistRef} map={mistTex} color="#9fb0e0" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
