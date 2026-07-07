import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Two hand-painted wooden signposts that frame the cosy camp hub:
 *  1) a broad WELCOME plank on twin posts facing the camera, and
 *  2) a tall NEXT-STOP post with an arrow-shaped plank pointing toward the bridge (+x).
 * Warm weathered wood + crisp glowing neon accents (bloom-driven, no extra lights).
 */
export function CampSignposts() {
  return (
    <>
      <WelcomeSign />
      <NextStopSign />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 1) WELCOME SIGN — twin posts + horizontal plank, faces +z (camera) */
/* ------------------------------------------------------------------ */

function WelcomeSign() {
  const rune = useRef<THREE.MeshBasicMaterial>(null)

  // gentle breathing pulse on the little rune emblem
  useFrame(() => {
    if (rune.current) {
      const t = performance.now() * 0.001
      rune.current.opacity = 0.8 + Math.sin(t * 2.0) * 0.18
    }
  })

  const boardW = 2.8
  const boardH = 1.5
  const boardY = 1.55 // centre height of the plank
  const postX = boardW / 2 - 0.3 // posts tucked just inside the plank ends

  return (
    // rotation-y = 0 → the board's front normal (+z) points at the camera
    <group position={[-2.5, 0, 7.5]} rotation={[0, 0, 0]}>
      {/* twin support posts (dark warm wood) */}
      {[-postX, postX].map((x, i) => (
        <mesh key={i} position={[x, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.7, 7]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} />
        </mesh>
      ))}

      {/* horizontal plank board (slightly weathered wood) */}
      <mesh position={[0, boardY, 0]} castShadow receiveShadow>
        <boxGeometry args={[boardW, boardH, 0.14]} />
        <meshStandardMaterial color="#4a2f1a" roughness={0.9} />
      </mesh>
      {/* thin darker frame lip along top & bottom for a carved-plank feel */}
      {[-boardH / 2 + 0.05, boardH / 2 - 0.05].map((y, i) => (
        <mesh key={i} position={[0, boardY + y, 0.075]}>
          <boxGeometry args={[boardW - 0.06, 0.06, 0.02]} />
          <meshStandardMaterial color="#2a1a0e" roughness={1} />
        </mesh>
      ))}

      {/* glowing diamond rune emblem at the top centre */}
      <mesh position={[0, boardY + boardH / 2 + 0.2, 0.05]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.18, 0.18, 0.05]} />
        <meshBasicMaterial ref={rune} color="#c86bff" transparent opacity={0.9} toneMapped={false} />
      </mesh>

      {/* --- carved text lines (sit just in front of the plank face) --- */}
      <group position={[0, boardY, 0.09]}>
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.16}
          color="#c9b8e8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor="#0b0618"
        >
          Welcome to
        </Text>
        <Text
          position={[0, 0.16, 0]}
          fontSize={0.32}
          color="#f2e9ff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.012}
          outlineColor="#0b0618"
        >
          Foundations Camp
        </Text>
        <Text
          position={[0, -0.34, 0]}
          fontSize={0.12}
          color="#9d8fc8"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={2.4}
          lineHeight={1.15}
          outlineWidth={0.004}
          outlineColor="#0b0618"
        >
          Every great journey starts with clear foundations.
        </Text>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 2) NEXT-STOP SIGNPOST — tall post + arrow plank pointing toward +x  */
/* ------------------------------------------------------------------ */

function NextStopSign() {
  const board = useRef<THREE.Group>(null)
  const chevron = useRef<THREE.MeshBasicMaterial>(null)

  // arrow-shaped board outline (a rectangle with a pointed right end), pointing +x
  const arrowShape = useMemo(() => {
    const w = 1.9 // rectangular body length
    const h = 0.62 // full board height
    const tip = 0.45 // extra length of the pointed (+x) end
    const s = new THREE.Shape()
    s.moveTo(-w / 2, -h / 2)
    s.lineTo(w / 2, -h / 2)
    s.lineTo(w / 2 + tip, 0)
    s.lineTo(w / 2, h / 2)
    s.lineTo(-w / 2, h / 2)
    s.closePath()
    return s
  }, [])

  const arrowGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.1, bevelEnabled: false })
    g.center()
    return g
  }, [arrowShape])

  const boardBaseY = 1.55

  useFrame(() => {
    const t = performance.now() * 0.001
    // subtle idle bob of the whole arrow plank
    if (board.current) {
      board.current.position.y = boardBaseY + Math.sin(t * 1.4) * 0.05
    }
    // gentle pulse of the pink chevron glow
    if (chevron.current) {
      chevron.current.opacity = 0.7 + Math.sin(t * 3.2) * 0.28
    }
  })

  return (
    <group position={[9.5, 0, 3]}>
      {/* single tall wooden post */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.14, 1.9, 8]} />
        <meshStandardMaterial color="#3a2416" roughness={0.95} />
      </mesh>
      {/* carved cap on the post */}
      <mesh position={[0, 1.92, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.14, 8]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.9} />
      </mesh>

      {/* arrow-shaped plank (bobs), tip already points toward +x */}
      <group ref={board} position={[0.55, boardBaseY, 0]}>
        <mesh castShadow receiveShadow>
          <primitive object={arrowGeo} attach="geometry" />
          <meshStandardMaterial color="#4a2f1a" roughness={0.9} />
        </mesh>

        {/* bright glowing pink chevron at the pointing (+x) end */}
        <group position={[0.98, 0, 0.07]}>
          {[-0.14, 0.14].map((oy, i) => (
            <mesh key={i} position={[0, oy, 0]} rotation={[0, 0, i === 0 ? -0.7 : 0.7]}>
              <boxGeometry args={[0.34, 0.09, 0.04]} />
              <meshBasicMaterial ref={i === 0 ? chevron : undefined} color="#ff4fa3" transparent opacity={0.95} toneMapped={false} />
            </mesh>
          ))}
        </group>

        {/* labels — shifted slightly left so they clear the chevron */}
        <Text
          position={[-0.35, 0.16, 0.07]}
          fontSize={0.13}
          color="#ffb6dd"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.004}
          outlineColor="#0b0618"
        >
          Next Stop
        </Text>
        <Text
          position={[-0.35, -0.13, 0.07]}
          fontSize={0.2}
          color="#f2e9ff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          maxWidth={1.5}
          outlineWidth={0.008}
          outlineColor="#0b0618"
        >
          Retrieval Bridge
        </Text>
      </group>
    </group>
  )
}
