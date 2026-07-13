import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html, PerspectiveCamera, RoundedBox, Sparkles } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '../state/progress'
import {
  SIGNAL_CONTENT_GROUP_POSITION,
  SIGNAL_CONTENT_GROUP_ROTATION_Y,
  SIGNAL_CONTENT_PEDESTALS,
  SIGNAL_REPLAY_CONSOLE_POSITION,
} from './signalStageLayout'

type SignalTheoryStageProps = {
  accent: string
  accentDark: string
}

const WORLD01_MANIM_CLIPS = [
  'W01_00_Foundations',
  'W01_01_UsefulSlate',
  'W01_02_CoreEntities',
  'W01_03_SignalsEvidence',
  'W01_04_ProductionPipeline',
  'W01_05_LabelsFeaturesScores',
  'W01_06_FeedbackLoop',
  'W01_07_ColdStart',
  'W01_08_OrderMatters',
  'W01_09_NDCG',
  'W01_10_RecallCoverage',
] as const

const SCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SCREEN_GLAZE_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    float side = smoothstep(0.58, 1.0, abs(vUv.x - 0.5) * 2.0);
    float horizontalRim = smoothstep(0.9, 1.0, abs(vUv.y - 0.5) * 2.0);
    float alpha = side * 0.105 + horizontalRim * 0.025;
    vec3 tint = mix(vec3(0.015, 0.055, 0.075), vec3(0.12, 0.48, 0.52), horizontalRim);
    gl_FragColor = vec4(tint, alpha);
  }
`

const SCREEN_HALF_WIDTH = 4.6
const SCREEN_CURVE_DEPTH = 0.86
const SCREEN_ASPECT = 9.2 / 4.25
const FINAL_FRAME_HOLD_SECONDS = 1.05

function screenCurveDepth(x: number): number {
  const normalized = x / SCREEN_HALF_WIDTH
  return SCREEN_CURVE_DEPTH * normalized * normalized
}

function curvedScreenGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(9.2, 4.25, 48, 12)
  const positions = geometry.attributes.position as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    positions.setZ(index, screenCurveDepth(x))
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function curvedScreenRailGeometry(): THREE.TubeGeometry {
  const points = Array.from({ length: 49 }, (_, index) => {
    const x = -4.78 + (index / 48) * 9.56
    return new THREE.Vector3(x, 0, screenCurveDepth(x) + 0.055)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.085, 8, false)
}

function CurvedScreenFallback({ geometry }: { geometry: THREE.PlaneGeometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#07131d"
        emissive="#102d39"
        emissiveIntensity={0.52}
        roughness={0.16}
        metalness={0.02}
        clearcoat={0.7}
        clearcoatRoughness={0.22}
      />
    </mesh>
  )
}

function CurvedManimScreen({
  geometry,
  page,
  onFinished,
}: {
  geometry: THREE.PlaneGeometry
  page: number
  onFinished: () => void
}) {
  const clip = WORLD01_MANIM_CLIPS[page] ?? WORLD01_MANIM_CLIPS[0]
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const [contentScale, setContentScale] = useState<[number, number]>([1, 1])
  const anisotropy = useThree((state) => Math.min(8, state.gl.capabilities.getMaxAnisotropy()))

  useEffect(() => {
    const video = document.createElement('video')
    const supportsWebm = video.canPlayType('video/webm; codecs="vp9"') !== ''
    video.src = `/video/manim/world01/${clip}.${supportsWebm ? 'webm' : 'mp4'}`
    video.crossOrigin = 'anonymous'
    video.autoplay = true
    video.loop = false
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.colorSpace = THREE.SRGBColorSpace
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.anisotropy = anisotropy
    videoTexture.generateMipmaps = false
    videoTexture.wrapS = THREE.ClampToEdgeWrapping
    videoTexture.wrapT = THREE.ClampToEdgeWrapping

    let textureVisible = false
    let playbackFinished = false
    const showTexture = () => {
      if (textureVisible) return
      textureVisible = true
      const videoAspect = video.videoWidth > 0 && video.videoHeight > 0
        ? video.videoWidth / video.videoHeight
        : SCREEN_ASPECT
      if (videoAspect > SCREEN_ASPECT) {
        setContentScale([1, SCREEN_ASPECT / videoAspect])
      } else if (videoAspect < SCREEN_ASPECT) {
        setContentScale([videoAspect / SCREEN_ASPECT, 1])
      } else {
        setContentScale([1, 1])
      }
      setTexture(videoTexture)
      void video.play().catch(() => undefined)
    }
    const finishPlayback = () => {
      if (playbackFinished || !Number.isFinite(video.duration)) return
      const holdAt = Math.max(0, video.duration - FINAL_FRAME_HOLD_SECONDS)
      if (!video.ended && video.currentTime < holdAt) return
      playbackFinished = true
      video.pause()
      if (Math.abs(video.currentTime - holdAt) > 0.04) video.currentTime = holdAt
      onFinished()
    }

    setTexture(null)
    setContentScale([1, 1])
    video.addEventListener('loadeddata', showTexture, { once: true })
    video.addEventListener('canplay', showTexture, { once: true })
    video.addEventListener('timeupdate', finishPlayback)
    video.addEventListener('ended', finishPlayback)
    video.load()
    void video.play().catch(() => undefined)

    return () => {
      video.removeEventListener('loadeddata', showTexture)
      video.removeEventListener('canplay', showTexture)
      video.removeEventListener('timeupdate', finishPlayback)
      video.removeEventListener('ended', finishPlayback)
      video.pause()
      video.removeAttribute('src')
      video.load()
      videoTexture.dispose()
    }
  }, [anisotropy, clip, onFinished])

  if (!texture) return <CurvedScreenFallback geometry={geometry} />

  return (
    <>
      <CurvedScreenFallback geometry={geometry} />
      <mesh
        geometry={geometry}
        position={[0, 0, 0.012]}
        scale={[contentScale[0], contentScale[1], 1]}
        castShadow
        receiveShadow
      >
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, 0.028]} renderOrder={3}>
        <shaderMaterial
          vertexShader={SCREEN_VERTEX_SHADER}
          fragmentShader={SCREEN_GLAZE_SHADER}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

export function SignalTheoryStage({ accent, accentDark }: SignalTheoryStageProps) {
  const stage = useRef<THREE.Group>(null)
  const screen = useRef<THREE.Group>(null)
  const portal = useRef<THREE.Group>(null)
  const age = useRef(0)
  const [replayVersion, setReplayVersion] = useState(0)
  const [videoComplete, setVideoComplete] = useState(false)
  const { size } = useThree()
  const portrait = size.height > size.width * 1.08
  const screenY = portrait ? 4.5 : 3.05
  const screenScale = portrait ? 0.47 : 1
  const page = useProgress((state) => state.lessonPage)
  const mode = useProgress((state) => state.mode)
  const screenGeometry = useMemo(curvedScreenGeometry, [])
  const screenRailGeometry = useMemo(curvedScreenRailGeometry, [])
  const showingTheory = mode === 'study'
  const handleVideoFinished = useCallback(() => setVideoComplete(true), [])
  const replayVideo = useCallback(() => {
    setVideoComplete(false)
    setReplayVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    setVideoComplete(false)
  }, [page, showingTheory])

  useEffect(() => () => {
    screenGeometry.dispose()
    screenRailGeometry.dispose()
  }, [screenGeometry, screenRailGeometry])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    age.current += dt
    const reveal = 1 - Math.pow(1 - THREE.MathUtils.clamp(age.current / 0.9, 0, 1), 3)

    if (stage.current) {
      stage.current.scale.setScalar(0.88 + reveal * 0.12)
      stage.current.position.y = (1 - reveal) * -0.35
    }
    if (screen.current) {
      screen.current.position.y = screenY + (1 - reveal) * 0.42
      screen.current.scale.setScalar(screenScale)
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

      <group ref={screen} position={[0, screenY, -2.9]} scale={screenScale}>
        {showingTheory ? (
          <CurvedManimScreen
            key={`${page}-${replayVersion}`}
            geometry={screenGeometry}
            page={page}
            onFinished={handleVideoFinished}
          />
        ) : (
          <mesh geometry={screenGeometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#edf8fb"
              emissive="#d9f4f7"
              emissiveIntensity={0.24}
              roughness={0.22}
              metalness={0.02}
              clearcoat={0.7}
              clearcoatRoughness={0.22}
            />
          </mesh>
        )}
        <mesh geometry={screenRailGeometry} position={[0, 2.18, 0]} castShadow>
          <meshStandardMaterial color="#fdfefe" metalness={0.18} roughness={0.28} />
        </mesh>
        <mesh geometry={screenRailGeometry} position={[0, -2.18, 0]} castShadow>
          <meshStandardMaterial color="#dfeceb" metalness={0.14} roughness={0.34} />
        </mesh>
        {[-1, 1].map((side) => (
          <RoundedBox
            key={side}
            args={[0.18, 4.48, 0.23]}
            radius={0.07}
            smoothness={4}
            position={[side * 4.7, 0, screenCurveDepth(4.7)]}
            rotation={[0, side * -0.36, 0]}
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
      {showingTheory && (
        <ReplayConsole
          accent={accent}
          ready={videoComplete}
          replayVersion={replayVersion}
          onReplay={replayVideo}
        />
      )}

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
    <group
      position={[SIGNAL_CONTENT_GROUP_POSITION[0], 0.4, SIGNAL_CONTENT_GROUP_POSITION[1]]}
      rotation={[0, SIGNAL_CONTENT_GROUP_ROTATION_Y, 0]}
    >
      {SIGNAL_CONTENT_PEDESTALS.map(({ x, z }, index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
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

function ReplayConsole({
  accent,
  ready,
  replayVersion,
  onReplay,
}: {
  accent: string
  ready: boolean
  replayVersion: number
  onReplay: () => void
}) {
  const root = useRef<THREE.Group>(null)
  const button = useRef<THREE.Group>(null)
  const orbit = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const pressed = useRef(0)
  const playShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.085, -0.12)
    shape.lineTo(0.14, 0)
    shape.lineTo(-0.085, 0.12)
    shape.closePath()
    return shape
  }, [])

  useEffect(() => () => {
    if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
  }, [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    if (root.current) {
      root.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 1.7) * 0.018
    }
    if (orbit.current) {
      orbit.current.rotation.y += dt * (ready ? 1.6 : 0.48)
    }
    if (button.current) {
      pressed.current = Math.max(0, pressed.current - dt * 5.5)
      const idlePulse = ready ? Math.sin(state.clock.elapsedTime * 3.2) * 0.025 : 0
      const targetScale = (hovered ? 1.08 : 1) + idlePulse - pressed.current * 0.12
      const nextScale = THREE.MathUtils.damp(button.current.scale.x, targetScale, 14, dt)
      button.current.scale.setScalar(nextScale)
    }
  })

  return (
    <group
      ref={root}
      position={[SIGNAL_REPLAY_CONSOLE_POSITION[0], 0.4, SIGNAL_REPLAY_CONSOLE_POSITION[1]]}
      rotation={[0, 0.08, 0]}
      onPointerDown={(event) => {
        event.stopPropagation()
        pressed.current = 1
        onReplay()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.64, 0.28, 32]} />
        <meshStandardMaterial color="#eef7f5" metalness={0.12} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.47, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={ready ? 0.42 : 0.18} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.53, 0]} center distanceFactor={8} zIndexRange={[18, 12]}>
        <button
          type="button"
          className="signal-replay-hit"
          aria-label="Replay theory animation"
          data-playback={ready ? 'ready' : 'playing'}
          data-replay-version={replayVersion}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            pressed.current = 1
            onReplay()
          }}
        />
      </Html>
      <group ref={button} position={[0, 0.43, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.34, 0.39, 0.14, 32]} />
          <meshStandardMaterial
            color={ready ? '#ffffff' : '#dff1ef'}
            emissive={accent}
            emissiveIntensity={ready ? 0.48 : 0.18}
            metalness={0.08}
            roughness={0.28}
          />
        </mesh>
        <group ref={orbit} position={[0, 0.081, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0.42]}>
            <torusGeometry args={[0.215, 0.027, 8, 36, Math.PI * 1.62]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
          <mesh position={[0.18, 0.006, -0.12]} rotation={[-Math.PI / 2, 0, -0.15]}>
            <shapeGeometry args={[playShape]} />
            <meshBasicMaterial color={accent} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <pointLight
        position={[0, 0.62, 0]}
        color={accent}
        intensity={ready ? 3.2 : 1.1}
        distance={2.2}
        decay={2}
      />
    </group>
  )
}

export function SignalImaxCamera({ worldPosition }: { worldPosition: [number, number, number] }) {
  const camera = useRef<THREE.PerspectiveCamera>(null)
  const { size } = useThree()
  const portrait = size.height > size.width * 1.08
  const target = useMemo(
    () => new THREE.Vector3(worldPosition[0], 2.28, worldPosition[2] - 0.9),
    [worldPosition],
  )
  const position = useMemo<[number, number, number]>(
    () => [
      worldPosition[0] + (portrait ? 0 : 0.8),
      4.65,
      worldPosition[2] + 10.2,
    ],
    [portrait, worldPosition],
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
      position={position}
    />
  )
}
