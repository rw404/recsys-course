import { useEffect, useMemo, useRef } from 'react'
import { PerspectiveCamera, RoundedBox, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '../state/progress'

type SignalTheoryStageProps = {
  accent: string
  accentDark: string
}

function curvedScreenGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(9.2, 4.25, 48, 12)
  const positions = geometry.attributes.position as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const normalized = x / 4.6
    positions.setZ(index, 0.52 * normalized * normalized)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export function SignalTheoryStage({ accent, accentDark }: SignalTheoryStageProps) {
  const stage = useRef<THREE.Group>(null)
  const screen = useRef<THREE.Group>(null)
  const portal = useRef<THREE.Group>(null)
  const age = useRef(0)
  const page = useProgress((state) => state.lessonPage)
  const mode = useProgress((state) => state.mode)
  const screenGeometry = useMemo(curvedScreenGeometry, [])
  const showingTheory = mode === 'study'

  useEffect(() => () => screenGeometry.dispose(), [screenGeometry])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    age.current += dt
    const reveal = 1 - Math.pow(1 - THREE.MathUtils.clamp(age.current / 0.9, 0, 1), 3)

    if (stage.current) {
      stage.current.scale.setScalar(0.88 + reveal * 0.12)
      stage.current.position.y = (1 - reveal) * -0.35
    }
    if (screen.current) {
      screen.current.position.y = 3.05 + (1 - reveal) * 0.42
    }
    if (portal.current) {
      portal.current.rotation.z += dt * 0.32
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.1) * 0.035
      portal.current.scale.setScalar(pulse)
    }
  })

  const signalsActive = page === 3 || page === 6
  const streamActive = page === 4 || page === 6
  const profileActive = page === 2 || page === 5
  const contentActive = page === 0 || page === 1 || page >= 8

  return (
    <group ref={stage}>
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <cylinderGeometry args={[4.68, 4.84, 0.28, 64]} />
        <meshStandardMaterial color="#f7fbfa" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.62, 4.32, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.13} side={THREE.DoubleSide} />
      </mesh>

      <group ref={screen} position={[0, 3.05, -2.9]}>
        <mesh geometry={screenGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={showingTheory ? '#07131d' : '#edf8fb'}
            emissive={showingTheory ? '#102d39' : '#d9f4f7'}
            emissiveIntensity={showingTheory ? 0.52 : 0.24}
            roughness={showingTheory ? 0.16 : 0.22}
            metalness={0.02}
            clearcoat={0.7}
            clearcoatRoughness={0.22}
          />
        </mesh>
        <RoundedBox args={[9.56, 0.14, 0.19]} radius={0.07} smoothness={4} position={[0, 2.18, 0.24]} castShadow>
          <meshStandardMaterial color="#fdfefe" metalness={0.18} roughness={0.28} />
        </RoundedBox>
        <RoundedBox args={[9.56, 0.14, 0.19]} radius={0.07} smoothness={4} position={[0, -2.18, 0.24]} castShadow>
          <meshStandardMaterial color="#dfeceb" metalness={0.14} roughness={0.34} />
        </RoundedBox>
        {[-1, 1].map((side) => (
          <RoundedBox
            key={side}
            args={[0.18, 4.48, 0.23]}
            radius={0.07}
            smoothness={4}
            position={[side * 4.7, 0, 0.5]}
            rotation={[0, side * -0.12, 0]}
            castShadow
          >
            <meshStandardMaterial color="#f8fbfb" metalness={0.16} roughness={0.3} />
          </RoundedBox>
        ))}
        <SignalScreenIdle accent={accent} visible={!showingTheory} />
        <pointLight
          position={[0, 0, 1.1]}
          color={showingTheory ? '#58c5cc' : '#bfeef3'}
          intensity={showingTheory ? 4.2 : 7}
          distance={8}
          decay={2}
        />
      </group>

      <RoundedBox args={[1.08, 0.1, 5.5]} radius={0.05} smoothness={3} position={[0, 0.42, 0.2]} receiveShadow>
        <meshStandardMaterial color="#e5efed" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.035, 5.15]} radius={0.03} smoothness={3} position={[0, 0.49, 0.22]}>
        <meshBasicMaterial color="#74d3cf" transparent opacity={0.82} toneMapped={false} />
      </RoundedBox>

      <SignalBeaconCluster active={signalsActive} accent={accent} />
      <EventStreamChannel active={streamActive} accent={accent} />
      <ProfileObservatory active={profileActive} accent={accentDark} />
      <ContentPedestals active={contentActive} accent={accent} />

      <group ref={portal} position={[-1.75, 1.25, 2.75]} renderOrder={9}>
        {[0.78, 0.98, 1.17].map((radius, index) => (
          <mesh key={radius} rotation={[0, index * 0.16, index * 0.25]}>
            <torusGeometry args={[radius, index === 1 ? 0.045 : 0.026, 12, 72]} />
            <meshBasicMaterial
              color={index === 1 ? '#ffffff' : '#7567e5'}
              transparent
              opacity={0.64 - index * 0.12}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[0.73, 64]} />
          <meshBasicMaterial color="#cfcafd" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
        </mesh>
        <pointLight color="#8172f1" intensity={8} distance={4.8} decay={2} />
      </group>

      <Sparkles
        count={48}
        scale={[8.8, 3.8, 6.8]}
        position={[0, 2.2, -0.2]}
        size={1.8}
        speed={0.32}
        color="#b8f2ef"
        opacity={0.48}
      />
    </group>
  )
}

function SignalScreenIdle({ accent, visible }: { accent: string; visible: boolean }) {
  const packet = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!packet.current || !visible) return
    packet.current.position.x = -0.62 + (state.clock.elapsedTime * 0.46 % 1) * 1.34
  })

  return (
    <group visible={visible} position={[0, 0, 0.62]}>
      <group position={[-3.05, 0.1, 0]}>
        <mesh>
          <ringGeometry args={[0.46, 0.55, 48]} />
          <meshBasicMaterial color="#7567e5" transparent opacity={0.82} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.31, 40]} />
          <meshBasicMaterial color="#eeeafd" transparent opacity={0.94} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <circleGeometry args={[0.1, 28]} />
          <meshBasicMaterial color="#7567e5" toneMapped={false} />
        </mesh>
      </group>

      <group position={[-1.86, 0.1, 0]}>
        {Array.from({ length: 9 }, (_, index) => (
          <RoundedBox
            key={index}
            args={[0.22, 0.22, 0.05]}
            radius={0.03}
            smoothness={2}
            position={[(index % 3 - 1) * 0.29, (1 - Math.floor(index / 3)) * 0.29, 0]}
          >
            <meshBasicMaterial
              color={index % 3 === 0 ? accent : index % 3 === 1 ? '#48afba' : '#e6ad50'}
              transparent
              opacity={0.78}
              toneMapped={false}
            />
          </RoundedBox>
        ))}
      </group>

      <RoundedBox args={[1.42, 0.055, 0.045]} radius={0.025} smoothness={2} position={[0.02, 0.1, 0]}>
        <meshBasicMaterial color="#9bcfca" transparent opacity={0.7} toneMapped={false} />
      </RoundedBox>
      <mesh ref={packet} position={[-0.62, 0.1, 0.06]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshBasicMaterial color="#7567e5" toneMapped={false} />
      </mesh>

      <group position={[2.08, 0.1, 0]}>
        {[0.72, 0.12, -0.48].map((y, index) => (
          <group key={y} position={[0, y, 0]}>
            <RoundedBox args={[1.55 - index * 0.13, 0.36, 0.055]} radius={0.05} smoothness={3}>
              <meshBasicMaterial
                color={index === 0 ? accent : index === 1 ? '#49aebe' : '#e6ad50'}
                transparent
                opacity={0.84}
                toneMapped={false}
              />
            </RoundedBox>
            <mesh position={[-1.03, 0, 0.04]}>
              <circleGeometry args={[0.14, 28]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.96} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      <RoundedBox args={[5.8, 0.045, 0.035]} radius={0.02} smoothness={2} position={[0, -1.35, 0]}>
        <meshBasicMaterial color="#7ebeb9" transparent opacity={0.22} toneMapped={false} />
      </RoundedBox>
    </group>
  )
}
function SignalBeaconCluster({ active, accent }: { active: boolean; accent: string }) {
  return (
    <group position={[-3.18, 0.42, -0.15]}>
      {[-0.58, 0, 0.58].map((x, index) => (
        <group key={x} position={[x, 0, index === 1 ? -0.12 : 0.08]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.42, 0.38, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.42} />
          </mesh>
          <mesh position={[0, 0.86, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.07, 1.08, 10]} />
            <meshStandardMaterial color="#55747b" roughness={0.38} />
          </mesh>
          {[0.18, 0.34].map((radius, ring) => (
            <mesh key={radius} position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius, 0.025, 8, 36]} />
              <meshBasicMaterial
                color={ring ? '#7567e5' : accent}
                transparent
                opacity={active ? 0.92 : 0.28}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.09, 16, 14]} />
            <meshStandardMaterial color="#ffffff" emissive={active ? accent : '#8ca9a8'} emissiveIntensity={active ? 1.4 : 0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function EventStreamChannel({ active, accent }: { active: boolean; accent: string }) {
  const packets = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (packets.current) packets.current.position.x = Math.sin(state.clock.elapsedTime * 1.25) * 0.12
  })
  return (
    <group position={[0.3, 0.82, -0.25]} rotation={[0, 0.08, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.31, 0.31, 2.55, 24, 1, true]} />
        <meshPhysicalMaterial
          color="#cceff1"
          transparent
          opacity={active ? 0.44 : 0.22}
          transmission={0.42}
          roughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={packets}>
        {[-0.88, -0.42, 0.02, 0.46, 0.9].map((x, index) => (
          <mesh key={x} position={[x, Math.sin(index) * 0.08, 0]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshBasicMaterial color={index % 2 ? '#7567e5' : accent} transparent opacity={active ? 0.92 : 0.34} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ProfileObservatory({ active, accent }: { active: boolean; accent: string }) {
  return (
    <group position={[3.02, 0.4, -0.45]}>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.78, 0.88, 0.42, 32]} />
        <meshStandardMaterial color="#f9fcfb" roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.68, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#c8edf1"
          transparent
          opacity={0.54}
          transmission={0.38}
          roughness={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[-0.34, -0.12, 0.12, 0.34].map((x, index) => (
        <RoundedBox
          key={x}
          args={[0.1, 0.24 + index * 0.14, 0.1]}
          radius={0.025}
          smoothness={2}
          position={[x, 0.46 + index * 0.07, 0.08]}
        >
          <meshStandardMaterial color={index % 2 ? '#7567e5' : accent} emissive={accent} emissiveIntensity={active ? 0.7 : 0.08} />
        </RoundedBox>
      ))}
    </group>
  )
}

function ContentPedestals({ active, accent }: { active: boolean; accent: string }) {
  return (
    <group position={[2.78, 0.4, 2.15]} rotation={[0, -0.28, 0]}>
      {[-0.72, 0, 0.72].map((x, index) => (
        <group key={x} position={[x, 0, index === 1 ? -0.12 : 0.08]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.42, 0.32, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.44} />
          </mesh>
          <RoundedBox args={[0.44, 0.62, 0.08]} radius={0.05} smoothness={3} position={[0, 0.75, 0]} castShadow>
            <meshStandardMaterial
              color={index === 0 ? '#86c9b1' : index === 1 ? '#8b7be8' : '#e7a956'}
              emissive={active ? accent : '#000000'}
              emissiveIntensity={active ? 0.18 : 0}
              roughness={0.38}
            />
          </RoundedBox>
        </group>
      ))}
    </group>
  )
}

export function SignalImaxCamera({ worldPosition }: { worldPosition: [number, number, number] }) {
  const camera = useRef<THREE.PerspectiveCamera>(null)
  const target = useMemo(
    () => new THREE.Vector3(worldPosition[0], 2.28, worldPosition[2] - 0.9),
    [worldPosition],
  )

  useFrame(() => {
    camera.current?.lookAt(target)
  })

  return (
    <PerspectiveCamera
      ref={camera}
      makeDefault
      near={0.1}
      far={180}
      fov={42}
      position={[worldPosition[0] + 0.8, 4.65, worldPosition[2] + 10.2]}
    />
  )
}
