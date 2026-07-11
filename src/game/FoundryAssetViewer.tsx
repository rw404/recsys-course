import { ContactShadows, RoundedBox } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { PipelineModuleType } from '../logic/systemSimulator'

const TYPES: PipelineModuleType[] = [
  'ratingsSource',
  'featureStore',
  'popularity',
  'collaborative',
  'vectorSearch',
  'blend',
  'seenFilter',
  'ranker',
  'diversify',
  'evaluator',
  'output',
]

const ACCENTS: Record<PipelineModuleType, string> = {
  ratingsSource: '#36b9c5',
  featureStore: '#2db6a8',
  popularity: '#42bd82',
  collaborative: '#45b8c8',
  vectorSearch: '#27bdb5',
  blend: '#ddb13f',
  seenFilter: '#e1a13c',
  ranker: '#df7862',
  diversify: '#e58a72',
  evaluator: '#54b96c',
  output: '#42657c',
}

declare global {
  interface Window {
    __foundryAssetReady?: boolean
  }
}

export default function FoundryAssetViewer() {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('type') as PipelineModuleType | null
  const type = requested && TYPES.includes(requested) ? requested : 'ratingsSource'

  useEffect(() => {
    window.__foundryAssetReady = false
    const previousBody = document.body.style.background
    const previousRoot = document.documentElement.style.background
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    const timer = window.setTimeout(() => { window.__foundryAssetReady = true }, 850)
    return () => {
      window.clearTimeout(timer)
      document.body.style.background = previousBody
      document.documentElement.style.background = previousRoot
    }
  }, [type])

  return (
    <div className="foundry-asset-render-frame" style={{ width: 328, height: 300, background: 'transparent' }}>
      <Canvas
        orthographic
        shadows
        dpr={2}
        camera={{ position: [8.4, 7.1, 8.4], zoom: 37, near: 0.1, far: 60 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <CameraRig />
        <ambientLight intensity={0.78} color="#dff5ff" />
        <hemisphereLight args={['#ffffff', '#315f78', 1.22]} />
        <directionalLight
          castShadow
          color="#fff6e8"
          intensity={2.45}
          position={[-7, 12, 9]}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0004}
        />
        <directionalLight color="#bfe8ff" intensity={0.42} position={[7, 5, -6]} />
        <group position={[0, -0.55, 0]} rotation={[0, -0.2, 0]}>
          <FoundryPlinth accent={ACCENTS[type]} />
          <Device type={type} />
        </group>
        <ContactShadows position={[0, -1.32, 0]} opacity={0.24} scale={7.2} blur={2.6} far={4.5} color="#183f46" frames={1} />
      </Canvas>
    </div>
  )
}

function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(0, 0.75, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Material({ color, emissive, emissiveIntensity = 0, roughness = 0.76 }: {
  color: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={emissiveIntensity}
      roughness={roughness}
      metalness={0.04}
      flatShading
    />
  )
}

function FoundryPlinth({ accent }: { accent: string }) {
  const rocks = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 + 0.18
    const radius = 2.5 + (index % 2) * 0.08
    return {
      position: [Math.cos(angle) * radius, -0.36 - (index % 3) * 0.05, Math.sin(angle) * radius] as [number, number, number],
      rotation: [index * 0.3, angle, index * 0.17] as [number, number, number],
      scale: 0.3 + (index % 3) * 0.045,
    }
  }), [])
  return (
    <group>
      <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.18, 0.62, 12]} />
        <Material color="#728881" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.92, 0]} castShadow>
        <coneGeometry args={[2.18, 0.82, 12]} />
        <Material color="#566f70" roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.42, 2.5, 0.2, 36]} />
        <Material color="#edf1dc" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.05, 0.045, 8, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} />
      </mesh>
      {rocks.map((rock, index) => (
        <mesh key={index} position={rock.position} rotation={rock.rotation} scale={rock.scale} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <Material color={index % 2 ? '#718a84' : '#80948b'} roughness={0.94} />
        </mesh>
      ))}
      <DataBeacon position={[-1.72, 0.2, 0.52]} color={accent} />
      <DataBeacon position={[1.72, 0.2, -0.52]} color={accent} />
    </group>
  )
}

function DataBeacon({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.34, 10]} />
        <Material color="#56716f" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <Material color={color} emissive={color} emissiveIntensity={0.55} roughness={0.5} />
      </mesh>
    </group>
  )
}

function Device({ type }: { type: PipelineModuleType }) {
  switch (type) {
    case 'ratingsSource': return <RatingsDevice />
    case 'featureStore': return <FeatureStoreDevice />
    case 'popularity': return <PopularityDevice />
    case 'collaborative': return <CollaborativeDevice />
    case 'vectorSearch': return <VectorDevice />
    case 'blend': return <BlendDevice />
    case 'seenFilter': return <FilterDevice />
    case 'ranker': return <RankerDevice />
    case 'diversify': return <DiversifyDevice />
    case 'evaluator': return <EvaluatorDevice />
    case 'output': return <OutputDevice />
  }
}

function RatingsDevice() {
  return (
    <group position={[0, 0.18, 0]}>
      {[0.48, 1.02, 1.56].map((y, index) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.84, 0.84, 0.46, 16]} />
            <Material color={index === 1 ? '#33aebe' : '#3fc0cb'} />
          </mesh>
          <mesh position={[0, y + 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.72, 0.035, 8, 32]} />
            <meshBasicMaterial color="#a8f0ed" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.91, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.62, 0.22, 12]} />
        <Material color="#d7f7ef" />
      </mesh>
    </group>
  )
}

function FeatureStoreDevice() {
  return (
    <group position={[0, 0.18, 0]}>
      <RoundedBox args={[1.58, 2.05, 1.35]} radius={0.12} smoothness={3} position={[0, 1.15, 0]} castShadow>
        <Material color="#2ca99e" />
      </RoundedBox>
      {[0.62, 1.16, 1.7].map((y, index) => (
        <group key={y} position={[0, y, 0.7]}>
          <RoundedBox args={[1.2, 0.34, 0.12]} radius={0.04} smoothness={2} castShadow>
            <Material color={index === 1 ? '#5dd0c2' : '#48c2b5'} />
          </RoundedBox>
          <mesh position={[0, 0, 0.09]}>
            <boxGeometry args={[0.36, 0.055, 0.04]} />
            <Material color="#d9f4e9" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.3, 0]}>
        <octahedronGeometry args={[0.27, 0]} />
        <Material color="#b9f1df" emissive="#55c9b9" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function PopularityDevice() {
  const bars = [
    { x: -0.72, h: 0.78, color: '#70cf9a' },
    { x: 0, h: 1.32, color: '#48bf83' },
    { x: 0.72, h: 1.92, color: '#2fac72' },
  ]
  return (
    <group position={[0, 0.2, 0]}>
      {bars.map((bar) => (
        <RoundedBox key={bar.x} args={[0.54, bar.h, 0.72]} radius={0.08} smoothness={2} position={[bar.x, bar.h / 2, 0]} castShadow>
          <Material color={bar.color} />
        </RoundedBox>
      ))}
      <mesh position={[0.72, 2.26, 0]} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
        <Material color="#f0c955" emissive="#e7b63f" emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

function MiniResearcher({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.52, 0.72, 0.48]} radius={0.12} smoothness={2} position={[0, 0.55, 0]} castShadow>
        <Material color={color} />
      </RoundedBox>
      <mesh position={[0, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 10]} />
        <Material color="#d8f1e7" />
      </mesh>
      <mesh position={[0, 1.13, 0.27]}>
        <boxGeometry args={[0.28, 0.08, 0.03]} />
        <Material color="#285b67" />
      </mesh>
    </group>
  )
}

function CollaborativeDevice() {
  return (
    <group position={[0, 0.18, 0]}>
      <MiniResearcher position={[-0.78, 0, 0.48]} color="#45b9c7" />
      <MiniResearcher position={[0.78, 0, 0.48]} color="#38a9ba" />
      <MiniResearcher position={[0, 0, -0.74]} color="#5bc7d0" />
      <mesh position={[0, 0.7, 0]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <Material color="#8fe5dc" emissive="#36b9c5" emissiveIntensity={0.52} roughness={0.45} />
      </mesh>
    </group>
  )
}

function VectorDevice() {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh position={[0, 1.22, 0]} castShadow>
        <icosahedronGeometry args={[0.82, 1]} />
        <Material color="#54d2c5" emissive="#22b9b0" emissiveIntensity={0.42} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.22, 0]} rotation={[Math.PI / 2, 0, 0.25]}>
        <torusGeometry args={[1.12, 0.055, 10, 48]} />
        <Material color="#b9f2e8" emissive="#36c7bb" emissiveIntensity={0.28} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.22, 0]} rotation={[0.25, Math.PI / 2, 0]}>
        <torusGeometry args={[1.08, 0.045, 10, 48]} />
        <Material color="#78dcd2" emissive="#25bdb5" emissiveIntensity={0.24} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.82, 0.4, 12]} />
        <Material color="#4d8d87" />
      </mesh>
    </group>
  )
}

function Pipe({ from, to, color, radius = 0.09 }: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  radius?: number
}) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const direction = end.clone().sub(start)
    return {
      midpoint: start.clone().add(end).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    }
  }, [from, to])
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <Material color={color} />
    </mesh>
  )
}

function BlendDevice() {
  return (
    <group position={[0, 0.2, 0]}>
      <RoundedBox args={[1.28, 1.18, 1.2]} radius={0.16} smoothness={3} position={[0, 0.78, 0]} castShadow>
        <Material color="#d5a436" />
      </RoundedBox>
      {[-0.92, 0.92].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.54, -0.28]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 0.72, 12]} />
            <Material color={x < 0 ? '#f0c75a' : '#e6b342'} />
          </mesh>
          <Pipe from={[x, 1.25, -0.28]} to={[x * 0.45, 1.05, 0]} color="#b7832b" />
        </group>
      ))}
      <mesh position={[0, 1.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.07, 10, 32]} />
        <Material color="#fff0a8" emissive="#e4b73f" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 1.56, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <Material color="#fff3b2" emissive="#e5b84a" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

function FilterDevice() {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[1.02, 0.28, 1.28, 16, 1, true]} />
        <meshStandardMaterial color="#e1a13c" roughness={0.7} metalness={0.04} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.02, 0.09, 10, 40]} />
        <Material color="#f4c964" />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.68, 12]} />
        <Material color="#c47e28" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.15, 12, 8]} />
        <Material color="#ffe091" emissive="#e7ad39" emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function RankerDevice() {
  const tracks = [
    { z: -0.45, x: -0.48, color: '#ffb29b' },
    { z: 0, x: 0.35, color: '#f59b82' },
    { z: 0.45, x: -0.05, color: '#ffd0bd' },
  ]
  return (
    <group position={[0, 0.2, 0]}>
      <RoundedBox args={[2.15, 0.52, 1.55]} radius={0.14} smoothness={3} position={[0, 0.48, 0]} castShadow>
        <Material color="#d96f58" />
      </RoundedBox>
      {tracks.map((track) => (
        <group key={track.z}>
          <mesh position={[0, 0.77, track.z]}>
            <boxGeometry args={[1.55, 0.045, 0.07]} />
            <Material color="#8f4439" />
          </mesh>
          <mesh position={[track.x, 0.88, track.z]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.18, 12]} />
            <Material color={track.color} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.72, 0.32, 0.12]} radius={0.05} smoothness={2} position={[0, 1.08, -0.5]} rotation={[-0.35, 0, 0]}>
        <Material color="#53384a" emissive="#ea8068" emissiveIntensity={0.22} />
      </RoundedBox>
    </group>
  )
}

function DiversifyDevice() {
  const cards = [
    { position: [-0.68, 0.6, 0.22] as [number, number, number], rotation: -0.42, color: '#e67e67' },
    { position: [-0.22, 0.82, -0.08] as [number, number, number], rotation: -0.14, color: '#efb05d' },
    { position: [0.28, 1.02, -0.12] as [number, number, number], rotation: 0.18, color: '#6bc1ae' },
    { position: [0.72, 1.22, 0.12] as [number, number, number], rotation: 0.46, color: '#f0a48d' },
  ]
  return (
    <group position={[0, 0.2, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.82, 1.05, 0.44, 12]} />
        <Material color="#b96553" />
      </mesh>
      {cards.map((card, index) => (
        <RoundedBox key={index} args={[0.78, 0.14, 1.12]} radius={0.08} smoothness={2} position={card.position} rotation={[0.12, card.rotation, -0.08]} castShadow>
          <Material color={card.color} />
        </RoundedBox>
      ))}
    </group>
  )
}

function EvaluatorDevice() {
  const ticks = [-0.7, -0.35, 0, 0.35, 0.7]
  return (
    <group position={[0, 0.2, 0]}>
      <RoundedBox args={[1.75, 0.62, 1.42]} radius={0.16} smoothness={3} position={[0, 0.45, 0]} castShadow>
        <Material color="#3e9d57" />
      </RoundedBox>
      <group position={[0, 1.35, 0.48]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.82, 0.82, 0.24, 24]} />
          <Material color="#78cf87" />
        </mesh>
        <mesh position={[0, 0, 0.14]}>
          <circleGeometry args={[0.62, 24]} />
          <Material color="#dff2d8" />
        </mesh>
        {ticks.map((x) => (
          <mesh key={x} position={[x * 0.72, 0.38 - Math.abs(x) * 0.14, 0.18]}>
            <boxGeometry args={[0.055, 0.16, 0.04]} />
            <Material color="#2c7241" />
          </mesh>
        ))}
        <Pipe from={[0, 0, 0.21]} to={[0.39, 0.34, 0.21]} color="#245c37" radius={0.035} />
        <mesh position={[0, 0, 0.23]}>
          <sphereGeometry args={[0.09, 12, 8]} />
          <Material color="#245c37" />
        </mesh>
      </group>
    </group>
  )
}

function OutputDevice() {
  const posters = ['#e77562', '#e2ae44', '#34ad9e', '#716bc3']
  return (
    <group position={[0, 0.2, 0]}>
      <RoundedBox args={[0.6, 0.48, 0.62]} radius={0.1} smoothness={2} position={[0, 0.42, 0]} castShadow>
        <Material color="#36566c" />
      </RoundedBox>
      <RoundedBox args={[2.2, 1.45, 0.34]} radius={0.14} smoothness={3} position={[0, 1.42, 0]} castShadow>
        <Material color="#42657c" />
      </RoundedBox>
      <RoundedBox args={[1.78, 1.04, 0.08]} radius={0.08} smoothness={2} position={[0, 1.42, 0.22]}>
        <Material color="#17384d" emissive="#1d5164" emissiveIntensity={0.2} />
      </RoundedBox>
      {posters.map((color, index) => (
        <RoundedBox
          key={color}
          args={[0.32, 0.7, 0.05]}
          radius={0.025}
          smoothness={2}
          position={[-0.61 + index * 0.41, 1.42, 0.29]}
        >
          <Material color={color} emissive={color} emissiveIntensity={0.08} />
        </RoundedBox>
      ))}
      <mesh position={[0, 2.32, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <Material color="#93c8cf" emissive="#4ba7b2" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}
