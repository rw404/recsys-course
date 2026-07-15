import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '../state/progress'
import { CloudCourseWorld } from './CloudCourseWorld'
import { WORLD_RENDER_CONFIG } from './quality'

const CAPTURE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')
const PERF =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf')

export interface WorldPerformanceSnapshot {
  fps: number
  calls: number
  triangles: number
  lines: number
  points: number
  geometries: number
  textures: number
  objects: number
}

export function World() {
  const mode = useProgress((state) => state.mode)
  const atlasOpen = useProgress((state) => state.atlasOpen)
  const pauseBehindOverlay = mode === 'lab' || mode === 'quiz'
  const enableShadows = !CAPTURE && WORLD_RENDER_CONFIG.shadows && !atlasOpen
  return (
    <Canvas
      orthographic
      frameloop="always"
      shadows={enableShadows}
      dpr={CAPTURE ? 1 : [1, WORLD_RENDER_CONFIG.maxDpr]}
      camera={{
        near: -120,
        far: 240,
        zoom: 20,
        position: [24, 27, 34],
      }}
      gl={{
        antialias: WORLD_RENDER_CONFIG.antialias,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: CAPTURE,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      onPointerMissed={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
      }}
    >
      <fog attach="fog" args={['#dceef3', 60, 126]} />
      <FrameLoopMode paused={pauseBehindOverlay} />
      <Suspense fallback={null}>
        <CloudCourseWorld />
        {PERF && <PerformanceProbe />}
      </Suspense>
    </Canvas>
  )
}

function FrameLoopMode({ paused }: { paused: boolean }) {
  const setFrameloop = useThree((state) => state.setFrameloop)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    setFrameloop(paused ? 'demand' : 'always')
    if (!paused) invalidate()
  }, [invalidate, paused, setFrameloop])

  return null
}

function PerformanceProbe() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const samples = useRef<number[]>([])
  const snapshot = useRef<WorldPerformanceSnapshot>({
    fps: 0,
    calls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    objects: 0,
  })

  useEffect(() => {
    const target = window as typeof window & { __recsysPerformance?: WorldPerformanceSnapshot }
    let objects = 0
    scene.traverse(() => { objects += 1 })
    snapshot.current.objects = objects
    target.__recsysPerformance = snapshot.current
    return () => { delete target.__recsysPerformance }
  }, [scene])

  useFrame((_, delta) => {
    const frameMs = delta * 1000
    if (frameMs > 0 && frameMs < 1000) {
      samples.current.push(frameMs)
      if (samples.current.length > 120) samples.current.shift()
    }
    const total = samples.current.reduce((sum, value) => sum + value, 0)
    snapshot.current.fps = total > 0 ? Math.round((samples.current.length * 10000) / total) / 10 : 0
    snapshot.current.calls = gl.info.render.calls
    snapshot.current.triangles = gl.info.render.triangles
    snapshot.current.lines = gl.info.render.lines
    snapshot.current.points = gl.info.render.points
    snapshot.current.geometries = gl.info.memory.geometries
    snapshot.current.textures = gl.info.memory.textures
  })

  return null
}
