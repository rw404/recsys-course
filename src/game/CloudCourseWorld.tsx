import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Html, Line, RoundedBox, Sparkles } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COURSE_WORLDS,
  COURSE_WORLD_BY_ID,
  type CourseWorldDefinition,
} from '../data/worlds'
import {
  NODES,
  NODE_ORDER,
  useProgress,
  type CourseNode,
  type NodeId,
  type ProgressNodeState,
  type WorldId,
} from '../state/progress'
import { runtime } from './shared'
import { useInput } from './useInput'
import { touchControls } from './controls'
import { ExplorerGLB } from './ExplorerGLB'
import { TheoryImaxCamera, TheoryWorldStage } from './SignalTheoryStage'
import {
  planObstaclePath,
  projectOutsideObstacles,
  resolveObstacleCollisions,
  steerAroundObstacles,
  type NavigationObstacle,
} from './courseNavigation'
import { SIGNAL_STAGE_OBSTACLES } from './signalStageLayout'
import {
  THEORY_LESSON_BY_WORLD,
  THEORY_REPLAY_CONSOLE_OBSTACLE,
  isTheoryLesson,
  theoryStageObstacles,
} from './theoryStageLayout'

const PLAYER_Y = 0.76
// The IMAX cylinder tops out 0.25 units above the regular island surface.
const THEORY_STAGE_SURFACE_LIFT = 0.25
const THEORY_PLAYER_Y = PLAYER_Y + THEORY_STAGE_SURFACE_LIFT
const ISLAND_RADIUS = 4.75
const WALK_RADIUS = 4.44
const PORTAL_OFFSET_Z = 2.92
const CAMERA_OFFSET = new THREE.Vector3(24, 27, 34)
const FORWARD = new THREE.Vector3(-0.58, 0, -0.82)
const RIGHT = new THREE.Vector3(0.82, 0, -0.58)
const WALK_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLAYER_Y)
const THEORY_WALK_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -THEORY_PLAYER_Y)
const NODE_APPROACH_MARGIN = 0.26
const NODE_INTERACTION_DISTANCE = 1.25

const LANDMARK_RADII: Record<WorldId, number> = {
  'foundations-camp': 2.08,
  'retrieval-valley': 1.82,
  'sequential-city': 1.68,
  'policy-tower': 1.9,
  'ecosystem-garden': 1.98,
  'final-arena': 2.18,
}

const NODE_SLOTS: [number, number, number][] = [
  [-2.75, 0.32, 1.65],
  [2.75, 0.32, 1.55],
  [-2.55, 0.32, -2.15],
  [2.55, 0.32, -2.2],
]

const SIGNAL_NODE_SLOTS: [number, number, number][] = [
  [-3.65, 0.32, 2.5],
  [0, 0.32, 3.62],
  [-3.86, 0.32, -1.65],
  [3.75, 0.32, 3],
]

function nodeSlotFor(worldId: WorldId, index: number): [number, number, number] {
  return (worldId === 'foundations-camp' ? SIGNAL_NODE_SLOTS : NODE_SLOTS)[index] ?? NODE_SLOTS[0]
}

const WORLD_NODE_IDS = COURSE_WORLDS.reduce((acc, world) => {
  acc[world.id] = NODE_ORDER.filter((id) => {
    const node = NODES[id]
    return node.worldId === world.id && node.kind !== 'npc'
  })
  return acc
}, {} as Record<WorldId, NodeId[]>)

const CLOUD_BANKS: [number, number, number, number][] = [
  [-29, -2.9, 17, 3.2], [-13, -3.1, 22, 2.7], [10, -3, 22, 3], [29, -3, 16, 3.1],
  [-32, -3.1, 0, 3.5], [32, -3.1, -1, 3.5],
  [-28, -3.2, -18, 3.4], [-10, -3.2, -22, 2.9], [11, -3.1, -22, 3.1], [29, -3.2, -17, 3.3],
]

const BRIDGE_CONNECTIONS: [WorldId, WorldId][] = [
  ['foundations-camp', 'retrieval-valley'],
  ['retrieval-valley', 'sequential-city'],
  ['sequential-city', 'policy-tower'],
  ['policy-tower', 'ecosystem-garden'],
  ['ecosystem-garden', 'final-arena'],
]

type IslandTreeLayout = {
  position: [number, number, number]
  scale: number
}

const DISTRICT_LAYOUT = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2 + 0.24
  const radius = 2.28 + (index % 2) * 0.13
  return [
    Math.cos(angle) * radius,
    0.18,
    Math.sin(angle) * radius,
    0.72 + (index % 3) * 0.17,
  ] as [number, number, number, number]
})

function islandTreeLayout(world: CourseWorldDefinition): IslandTreeLayout[] {
  return Array.from({ length: 15 }, (_, index) => {
    const chapterOffset = Number(world.number) * 0.27
    const angle = (index / 15) * Math.PI * 2 + chapterOffset
    const radius = 3.34 + (index % 4) * 0.17
    return {
      position: [Math.cos(angle) * radius, 0.16, Math.sin(angle) * radius],
      scale: 0.78 + (index % 4) * 0.075,
    }
  })
}

function worldNavigationObstacles(
  worldId: WorldId,
  includeCourseNodes = true,
  useTheoryStage = false,
): NavigationObstacle[] {
  const world = COURSE_WORLD_BY_ID[worldId]
  const offsetX = world.position[0]
  const offsetZ = world.position[2]
  if (useTheoryStage) {
    return [...theoryStageObstacles(worldId), THEORY_REPLAY_CONSOLE_OBSTACLE].map((obstacle) => ({
      ...obstacle,
      x: offsetX + obstacle.x,
      z: offsetZ + obstacle.z,
    }))
  }
  if (worldId === 'foundations-camp') {
    const obstacles = SIGNAL_STAGE_OBSTACLES.map((obstacle) => ({
      ...obstacle,
      x: offsetX + obstacle.x,
      z: offsetZ + obstacle.z,
    }))
    if (includeCourseNodes) {
      WORLD_NODE_IDS[worldId].forEach((id, index) => {
        const slot = nodeSlotFor(worldId, index)
        obstacles.push({ id, x: offsetX + slot[0], z: offsetZ + slot[2], radius: 0.32 })
      })
    }
    return obstacles
  }

  const obstacles: NavigationObstacle[] = [{
    id: `${worldId}-landmark`,
    x: offsetX,
    z: offsetZ,
    radius: LANDMARK_RADII[worldId],
  }]

  islandTreeLayout(world).forEach((tree, index) => {
    obstacles.push({
      id: `${worldId}-tree-${index}`,
      x: offsetX + tree.position[0],
      z: offsetZ + tree.position[2],
      radius: 0.3 * tree.scale,
    })
  })

  DISTRICT_LAYOUT.forEach(([x, , z], index) => {
    obstacles.push({ id: `${worldId}-district-${index}`, x: offsetX + x, z: offsetZ + z, radius: 0.32 })
  })

  WORLD_NODE_IDS[worldId].forEach((id, index) => {
    const slot = NODE_SLOTS[index]
    if (slot) obstacles.push({ id, x: offsetX + slot[0], z: offsetZ + slot[2], radius: 0.32 })
  })

  return obstacles
}

function setCourseMoveTarget(worldId: WorldId, target: THREE.Vector3, targetMargin = 0.08): void {
  const world = COURSE_WORLD_BY_ID[worldId]
  const progress = useProgress.getState()
  const theoryImax = progress.mode === 'study' && isTheoryLesson(progress.activeNodeId)
  const path = planObstaclePath(
    runtime.playerPosition,
    target,
    worldNavigationObstacles(worldId, !theoryImax, theoryImax),
    targetMargin,
    { x: world.position[0], z: world.position[2], radius: WALK_RADIUS - 0.04 },
  )
  const destination = path[path.length - 1]?.clone() ?? target.clone()
  runtime.moveDestination = destination
  runtime.moveTarget = path[0] ?? null
  runtime.movePath = path.slice(1)
}

function clearCourseMoveTarget(): void {
  runtime.moveTarget = null
  runtime.movePath = []
  runtime.moveDestination = null
}

export function CloudCourseWorld() {
  const atlasOpen = useProgress((state) => state.atlasOpen)
  const currentWorld = useProgress((state) => state.currentWorld)
  const mode = useProgress((state) => state.mode)
  const activeNodeId = useProgress((state) => state.activeNodeId)
  const theoryImax = mode === 'study' && isTheoryLesson(activeNodeId)
  const theoryStageVisible = currentWorld === 'foundations-camp' || theoryImax
  return (
    <>
      <SkyDome />
      <OceanSurface />
      <ambientLight intensity={0.94} color="#dff5ff" />
      <hemisphereLight args={['#ffffff', '#315f78', 1.18]} />
      <directionalLight
        castShadow
        color="#fff6e8"
        intensity={2.4}
        position={[-14, 25, 18]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />

      <IslandBridges />
      <CourseRoute />
      {COURSE_WORLDS.map((world) => (
        <ChapterIsland key={world.id} world={world} />
      ))}

      {CLOUD_BANKS.map(([x, y, z, scale], index) => (
        <CloudCluster key={index} position={[x, y, z]} scale={scale} opacity={0.88} />
      ))}
      <Sparkles count={110} scale={[42, 10, 78]} position={[0, 2, 0]} size={1.8} speed={0.18} color="#ffffff" opacity={0.58} />

      {atlasOpen
        ? <JourneyTraveler key={`journey-traveler-${currentWorld}`} worldId={currentWorld} />
        : <CourseTraveler key={`traveler-${currentWorld}`} worldId={currentWorld} />}
      {!atlasOpen && (
        <MoveDestinationMarker
          accent={COURSE_WORLD_BY_ID[currentWorld].accent}
          y={0.21 + (theoryStageVisible ? THEORY_STAGE_SURFACE_LIFT : 0)}
        />
      )}
      <CloudReveal key={`reveal-${atlasOpen ? 'journey' : 'world'}-${currentWorld}`} worldId={currentWorld} />
      <IsometricCamera />
      {theoryImax && (
        <TheoryImaxCamera
          worldPosition={COURSE_WORLD_BY_ID[currentWorld].position}
        />
      )}
    </>
  )
}

function IsometricCamera() {
  const { camera, size } = useThree()
  const currentWorld = useProgress((state) => state.currentWorld)
  const atlasOpen = useProgress((state) => state.atlasOpen)
  const activeNodeId = useProgress((state) => state.activeNodeId)
  const mode = useProgress((state) => state.mode)
  const reducedMotion = useProgress((state) => state.reducedMotion)
  const theoryImax = mode === 'study' && isTheoryLesson(activeNodeId)
  const lookAt = useRef(new THREE.Vector3(
    COURSE_WORLD_BY_ID[currentWorld].position[0] - 2.8,
    0.35,
    COURSE_WORLD_BY_ID[currentWorld].position[2] + 1.1,
  ))
  const nextLook = useRef(new THREE.Vector3())
  const nextPosition = useRef(new THREE.Vector3())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.16)
    const portrait = size.height > size.width * 1.08
    if (theoryImax) return
    const world = COURSE_WORLD_BY_ID[currentWorld]
    if (activeNodeId) {
      nextLook.current.copy(nodeWorldPosition(activeNodeId)).addScaledVector(RIGHT, -2.35).setY(0.55)
    } else if (atlasOpen) {
      nextLook.current.set(
        world.position[0] + (portrait ? 0 : -2.8),
        portrait ? -0.8 : 0.35,
        world.position[2] + 1.1,
      )
    } else {
      nextLook.current.set(
        world.position[0],
        0.25,
        world.position[2],
      )
    }

    const ortho = camera as THREE.OrthographicCamera
    const targetZoom = activeNodeId
      ? portrait ? 29 : 72
      : atlasOpen
      ? portrait ? 29 : 49
      : portrait ? 26 : 62
    const lambda = atlasOpen ? 3.2 : 4.5
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-lambda * dt)

    lookAt.current.lerp(nextLook.current, alpha)
    nextPosition.current.copy(lookAt.current).add(CAMERA_OFFSET)
    camera.position.lerp(nextPosition.current, alpha)
    ortho.zoom = THREE.MathUtils.lerp(ortho.zoom, targetZoom, alpha)
    ortho.updateProjectionMatrix()
    camera.lookAt(lookAt.current)
  })

  return null
}

function ChapterIsland({ world }: { world: CourseWorldDefinition }) {
  const shell = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const atlasOpen = useProgress((state) => state.atlasOpen)
  const currentWorld = useProgress((state) => state.currentWorld)
  const mode = useProgress((state) => state.mode)
  const activeNodeId = useProgress((state) => state.activeNodeId)
  const travelTo = useProgress((state) => state.travelTo)
  const completed = useProgress((state) => state.completed)
  const focused = currentWorld === world.id
  const playable = !atlasOpen && focused
  const signalExperience = world.id === 'foundations-camp' && focused && !atlasOpen
  const theoryExperience = focused
    && !atlasOpen
    && mode === 'study'
    && activeNodeId === THEORY_LESSON_BY_WORLD[world.id]
  const movementEnabled = mode === 'explore' || theoryExperience
  const raisedWalkSurface = signalExperience || theoryExperience
  const nodes = WORLD_NODE_IDS[world.id]
  const visibleSignalNodes = nodes
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => !completed[id] && useProgress.getState().getNodeState(id) !== 'locked_for_credit')

  const turfColor = useMemo(
    () => new THREE.Color(world.surface).lerp(new THREE.Color(world.accent), 0.34).getStyle(),
    [world],
  )

  useFrame((_, dt) => {
    if (!shell.current) return
    const target = hovered && atlasOpen ? 1.035 : 1
    const value = THREE.MathUtils.damp(shell.current.scale.x, target, 8, dt)
    shell.current.scale.setScalar(value)
  })

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
    }
  }, [])

  const focusWorld = () => {
    if (mode !== 'explore') return
    travelTo(world.id)
  }

  const onGround = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0 || !movementEnabled) return
    event.stopPropagation()
    if (!playable) {
      focusWorld()
      return
    }
    runtime.pendingOpen = null
    runtime.pendingSceneAction = null
    const target = new THREE.Vector3()
    if (!event.ray.intersectPlane(raisedWalkSurface ? THEORY_WALK_PLANE : WALK_PLANE, target)) return
    target.y = raisedWalkSurface ? THEORY_PLAYER_Y : PLAYER_Y
    setCourseMoveTarget(world.id, target)
  }

  return (
    <group position={world.position}>
      <group ref={shell}>
        <mesh position={[0, -1.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[4.45, 3.45, 1.9, 12]} />
          <meshStandardMaterial color="#677b7e" roughness={0.84} flatShading />
        </mesh>
        <mesh position={[0, -2.55, 0]} castShadow>
          <coneGeometry args={[3.45, 2.15, 12]} />
          <meshStandardMaterial color="#53686f" roughness={0.94} flatShading />
        </mesh>
        <mesh position={[0, -0.03, 0]} castShadow receiveShadow onPointerDown={onGround}>
          <cylinderGeometry args={[ISLAND_RADIUS, 4.45, 0.28, 48]} />
          <meshStandardMaterial color={turfColor} roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.88, 4.2, 64]} />
          <meshBasicMaterial color={world.accent} transparent opacity={focused ? 0.28 : 0.14} side={THREE.DoubleSide} />
        </mesh>
        <IslandTerraces world={world} />
        <CloudRim world={world} />
        {theoryExperience ? (
          <TheoryWorldStage
            worldId={world.id}
            accent={world.accent}
            accentDark={world.accentDark}
          />
        ) : signalExperience ? (
          <>
            <TheoryWorldStage
              worldId={world.id}
              accent={world.accent}
              accentDark={world.accentDark}
            />
            {playable && mode === 'explore' && visibleSignalNodes.map(({ id, index }) => (
              <CourseNodeMarker key={id} nodeId={id} slot={nodeSlotFor(world.id, index)} world={world} />
            ))}
            {playable && mode === 'explore' && <SignalCityExhibits world={world} />}
          </>
        ) : (
          <>
            <IslandDetails world={world} focused={playable} />
            <WorldLandmark world={world} focused={focused} />
            {focused && <ArrivalPortal accent={world.accent} phase={atlasOpen ? 'journey' : 'play'} />}
            {playable && nodes.map((id, index) => (
              <CourseNodeMarker key={id} nodeId={id} slot={nodeSlotFor(world.id, index)} world={world} />
            ))}
          </>
        )}
      </group>


      {playable && (
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onGround}>
          <circleGeometry args={[6.25, 64]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      <mesh
        position={[0, 1.1, 0]}
        onPointerDown={(event) => {
          if (atlasOpen) onGround(event)
        }}
        onPointerOver={(event) => {
          if (!atlasOpen) return
          event.stopPropagation()
          setHovered(true)
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[5.15, 5.15, 2.3, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function IslandTerraces({ world }: { world: CourseWorldDefinition }) {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <cylinderGeometry args={[2.3, 2.42, 0.18, 32]} />
        <meshStandardMaterial color="#83b665" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.02, 2.24, 48]} />
        <meshBasicMaterial color={world.accent} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[0.9, 0.16, 2.3]} radius={0.08} smoothness={3} position={[side * 3.25, 0.18, 0]} rotation={[0, side * 0.13, 0]}>
          <meshStandardMaterial color="#dfcfa9" roughness={0.76} />
        </RoundedBox>
      ))}
    </group>
  )
}

function CloudRim({ world }: { world: CourseWorldDefinition }) {
  const rocks = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2
    const radius = 4.42 + (index % 3) * 0.16
    return {
      position: [Math.cos(angle) * radius, -0.42 - (index % 2) * 0.09, Math.sin(angle) * radius] as [number, number, number],
      rotation: [index * 0.31, angle, index * 0.17] as [number, number, number],
      scale: [0.62 + (index % 4) * 0.08, 0.48 + (index % 3) * 0.07, 0.66 + ((index + 2) % 4) * 0.08] as [number, number, number],
    }
  }), [])

  return (
    <group>
      {rocks.map((rock, index) => (
        <mesh key={index} position={rock.position} rotation={rock.rotation} scale={rock.scale} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial
            color={index % 3 === 0 ? '#788982' : index % 3 === 1 ? '#60777b' : world.accentDark}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((index) => {
        const angle = index * Math.PI * 0.5 + 0.4
        return (
          <CloudCluster
            key={`under-cloud-${index}`}
            position={[Math.cos(angle) * 4.1, -1.55, Math.sin(angle) * 4.1]}
            scale={0.58 + (index % 2) * 0.08}
            opacity={0.8}
            tint={index % 2 ? '#f7fbff' : world.surface}
          />
        )
      })}
    </group>
  )
}

function OceanSurface() {
  const material = useRef<THREE.MeshPhysicalMaterial>(null)
  const currents = useMemo(() => Array.from({ length: 13 }, (_, row) => {
    const z = -42 + row * 7
    return Array.from({ length: 18 }, (_, index) => {
      const x = -40 + index * 4.8
      return new THREE.Vector3(x, -0.435, z + Math.sin(index * 0.72 + row * 0.58) * 0.34)
    })
  }), [])
  useFrame((state) => {
    if (!material.current) return
    material.current.clearcoatRoughness = 0.19 + Math.sin(state.clock.elapsedTime * 0.38) * 0.035
  })
  return (
    <group>
      <mesh position={[0, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 180, 1, 1]} />
        <meshPhysicalMaterial
          ref={material}
          color="#9fd5e4"
          roughness={0.34}
          metalness={0.06}
          clearcoat={0.92}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>
      {currents.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={index % 3 === 0 ? '#f1fcff' : '#75b9cb'}
          lineWidth={index % 3 === 0 ? 0.7 : 0.45}
          transparent
          opacity={index % 3 === 0 ? 0.17 : 0.1}
        />
      ))}
      {COURSE_WORLDS.map((world, index) => (
        <mesh key={world.id} position={[world.position[0], -0.44, world.position[2]]} rotation={[-Math.PI / 2, 0, index * 0.15]}>
          <ringGeometry args={[5.15, 5.23, 80]} />
          <meshBasicMaterial color="#b9f4ff" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function IslandBridges() {
  return (
    <group>
      {BRIDGE_CONNECTIONS.map(([from, to]) => <IslandBridge key={`${from}-${to}`} from={from} to={to} />)}
    </group>
  )
}

function IslandBridge({ from, to }: { from: WorldId; to: WorldId }) {
  const geometry = useMemo(() => {
    const fromWorld = COURSE_WORLD_BY_ID[from]
    const toWorld = COURSE_WORLD_BY_ID[to]
    const fromCenter = new THREE.Vector3(fromWorld.position[0], 0.15, fromWorld.position[2])
    const toCenter = new THREE.Vector3(toWorld.position[0], 0.15, toWorld.position[2])
    const direction = toCenter.clone().sub(fromCenter).setY(0).normalize()
    const start = fromCenter.clone().addScaledVector(direction, 4.35)
    const end = toCenter.clone().addScaledVector(direction, -4.35)
    const length = start.distanceTo(end)
    const count = Math.max(3, Math.ceil(length / 0.72))
    const angle = Math.atan2(direction.x, direction.z)
    return {
      angle,
      segments: Array.from({ length: count }, (_, index) => ({
        position: start.clone().lerp(end, count === 1 ? 0.5 : index / (count - 1)),
        lift: Math.sin((index / Math.max(1, count - 1)) * Math.PI) * 0.08,
      })),
    }
  }, [from, to])

  return (
    <group>
      {geometry.segments.map((segment, index) => (
        <group key={index} position={[segment.position.x, segment.position.y + segment.lift, segment.position.z]} rotation={[0, geometry.angle, 0]}>
          <RoundedBox args={[0.86, 0.16, 0.62]} radius={0.06} smoothness={3} castShadow receiveShadow>
            <meshStandardMaterial color={index % 2 ? '#d8c59d' : '#ede0bd'} roughness={0.82} />
          </RoundedBox>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.43, 0.18, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.07, 0.34, 8]} />
              <meshStandardMaterial color="#6d7a78" roughness={0.72} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function IslandDetails({ world, focused }: { world: CourseWorldDefinition; focused: boolean }) {
  const trees = useMemo(() => islandTreeLayout(world), [world])
  const district = DISTRICT_LAYOUT

  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={tree.position} scale={tree.scale}>
          <mesh position={[0, 0.27, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 0.55, 7]} />
            <meshStandardMaterial color="#765541" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <coneGeometry args={[0.36, 0.9, 8]} />
            <meshStandardMaterial color={index % 3 === 0 ? '#2e8c57' : index % 3 === 1 ? '#3da464' : '#276f50'} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow>
            <coneGeometry args={[0.27, 0.64, 8]} />
            <meshStandardMaterial color={index % 2 ? '#4bb675' : '#359760'} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {district.map(([x, y, z, height], index) => (
        <group key={index} position={[x, y, z]} scale={focused ? 0.76 : 1}>
          <RoundedBox args={[0.52, height, 0.52]} radius={0.09} smoothness={3} position={[0, height / 2, 0]} castShadow>
            <meshStandardMaterial color={index % 2 ? world.accent : '#edf4e7'} roughness={0.48} />
          </RoundedBox>
          <mesh position={[0, height + 0.18, 0]} castShadow>
            <coneGeometry args={[0.38, 0.42, 8]} />
            <meshStandardMaterial color={world.accentDark} roughness={0.44} />
          </mesh>
          <mesh position={[0, height * 0.62, 0.28]}>
            <boxGeometry args={[0.19, 0.12, 0.03]} />
            <meshStandardMaterial color="#d9fbff" emissive={world.accent} emissiveIntensity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WorldLandmark({ world, focused }: { world: CourseWorldDefinition; focused: boolean }) {
  const scale = focused ? 1 : 0.9
  return (
    <group scale={scale}>
      {world.id === 'foundations-camp' && <FoundationsLandmark world={world} />}
      {world.id === 'retrieval-valley' && <RetrievalLandmark world={world} />}
      {world.id === 'sequential-city' && <SequenceLandmark world={world} />}
      {world.id === 'policy-tower' && <PolicyLandmark world={world} />}
      {world.id === 'ecosystem-garden' && <EcosystemLandmark world={world} />}
      {world.id === 'final-arena' && <FinalLandmark world={world} />}
    </group>
  )
}

function FoundationsLandmark({ world }: { world: CourseWorldDefinition }) {
  const orbit = useRef<THREE.Group>(null)
  const stations = useMemo(() => [
    [-1.72, -0.82],
    [1.72, -0.78],
    [-1.55, 1.15],
    [1.48, 1.22],
  ] as [number, number][], [])
  const signalPaths = useMemo(() => stations.map(([x, z]) => (
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 1.05, z),
      new THREE.Vector3(x * 0.4, 2.55, z * 0.4),
      new THREE.Vector3(0, 2.42, 0),
    ).getPoints(20)
  )), [stations])

  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y += dt * 0.46
  })

  return (
    <group position={[0, 0.32, 0]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.86, 2.05, 0.16, 32]} />
        <meshStandardMaterial color="#e8f5ed" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.48, 1.76, 48]} />
        <meshBasicMaterial color={world.accent} transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>

      <RoundedBox args={[1.12, 2.5, 1.12]} radius={0.17} smoothness={4} position={[0, 1.45, 0]} castShadow>
        <meshStandardMaterial color="#f7fbf8" roughness={0.38} metalness={0.03} />
      </RoundedBox>
      {[0.72, 1.18, 1.64, 2.1].map((y, index) => (
        <mesh key={y} position={[0, y, 0.575]}>
          <boxGeometry args={[0.62, 0.18, 0.035]} />
          <meshStandardMaterial
            color={index === 3 ? "#ffffff" : world.accent}
            emissive={world.accent}
            emissiveIntensity={index === 3 ? 0.62 : 0.16}
          />
        </mesh>
      ))}
      <mesh position={[0, 2.92, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.08, 0.92, 10]} />
        <meshStandardMaterial color={world.accentDark} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.42, 0]}>
        <sphereGeometry args={[0.16, 20, 16]} />
        <meshStandardMaterial color="#ffffff" emissive={world.accent} emissiveIntensity={1.35} toneMapped={false} />
      </mesh>

      <group ref={orbit} position={[0, 2.84, 0]}>
        {[0.78, 1.08].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2 + index * 0.23, 0, index * 0.35]}>
            <torusGeometry args={[radius, 0.035, 10, 56]} />
            <meshBasicMaterial color={index ? world.accentDark : world.accent} transparent opacity={0.58} />
          </mesh>
        ))}
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.08, 0, Math.sin(angle) * 1.08]}>
              <octahedronGeometry args={[0.105, 0]} />
              <meshBasicMaterial color={index === 0 ? "#ffffff" : world.accent} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      {stations.map(([x, z], index) => (
        <group key={index} position={[x, 0.18, z]}>
          <RoundedBox args={[0.72, 0.76, 0.72]} radius={0.12} smoothness={4} position={[0, 0.38, 0]} castShadow>
            <meshStandardMaterial color={index % 2 ? "#dff3e7" : "#ffffff"} roughness={0.48} />
          </RoundedBox>
          <mesh position={[0, 0.88, 0]} castShadow>
            <coneGeometry args={[0.42, 0.42, 8]} />
            <meshStandardMaterial color={index % 2 ? world.accentDark : world.accent} roughness={0.48} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.42, 8]} />
            <meshStandardMaterial color={world.accentDark} />
          </mesh>
          <mesh position={[0, 1.44, 0]}>
            <sphereGeometry args={[0.075, 14, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {signalPaths.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={index % 2 ? world.accentDark : world.accent}
          lineWidth={1.3}
          transparent
          opacity={0.48}
        />
      ))}
    </group>
  )
}
const SIGNAL_EXHIBITS = [
  {
    id: 'event-antenna',
    number: '01',
    title: 'Event antenna',
    subtitle: 'Clicks, watches and exposure',
    page: 3,
    visual: [-3.18, 0.42, -0.15],
    approach: [-2.15, PLAYER_Y, -1.05],
  },
  {
    id: 'event-stream',
    number: '02',
    title: 'Event stream',
    subtitle: 'From evidence to pipeline',
    page: 4,
    visual: [0.3, 0.42, -0.25],
    approach: [0.3, PLAYER_Y, 1.05],
  },
  {
    id: 'user-profile',
    number: '03',
    title: 'Profile observatory',
    subtitle: 'Features, labels and scores',
    page: 5,
    visual: [3.02, 0.4, -0.45],
    approach: [2, PLAYER_Y, -1.35],
  },
  {
    id: 'content-pedestals',
    number: '04',
    title: 'Content pedestals',
    subtitle: 'Catalogue to useful slate',
    page: 1,
    visual: [2.78, 0.4, 2.15],
    approach: [1.55, PLAYER_Y, 2.45],
  },
] as const

function SignalCityExhibits({ world }: { world: CourseWorldDefinition }) {
  return (
    <group>
      {SIGNAL_EXHIBITS.map((exhibit) => (
        <SignalCityExhibit key={exhibit.id} exhibit={exhibit} world={world} />
      ))}
    </group>
  )
}

function SignalCityExhibit({
  exhibit,
  world,
}: {
  exhibit: (typeof SIGNAL_EXHIBITS)[number]
  world: CourseWorldDefinition
}) {
  const [hovered, setHovered] = useState(false)
  const marker = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    if (!marker.current) return
    marker.current.rotation.y += dt * (hovered ? 1.15 : 0.42)
    const target = hovered ? 1.14 : 1
    const scale = THREE.MathUtils.damp(marker.current.scale.x, target, 9, dt)
    marker.current.scale.setScalar(scale * (1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.018))
  })

  const requestExhibit = () => {
    if (useProgress.getState().mode !== 'explore') return
    const approach = new THREE.Vector3(
      world.position[0] + exhibit.approach[0],
      PLAYER_Y,
      world.position[2] + exhibit.approach[2],
    )
    runtime.pendingOpen = null
    setCourseMoveTarget(world.id, approach, 0.04)
    runtime.pendingSceneAction = {
      worldId: world.id,
      target: runtime.moveDestination?.clone() ?? approach,
      radius: 0.44,
      run: () => {
        const progress = useProgress.getState()
        progress.openNode('week01-station')
        progress.setLessonPage(exhibit.page)
      },
    }
  }

  return (
    <group position={exhibit.visual}>
      <group
        ref={marker}
        position={[0, 1.62, 0]}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.stopPropagation()
          requestExhibit()
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
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.29, 0.035, 10, 44]} />
          <meshBasicMaterial color={hovered ? '#7567e5' : world.accent} transparent opacity={hovered ? 0.92 : 0.58} toneMapped={false} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial color="#ffffff" emissive={world.accent} emissiveIntensity={hovered ? 1.4 : 0.6} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.52, 20, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <Html position={[0, 2.25, 0]} center zIndexRange={[36, 14]} wrapperClass="signal-exhibit-anchor">
        <button
          type="button"
          className="signal-exhibit-label"
          style={{ '--world-accent': world.accent } as CSSProperties}
          onClick={requestExhibit}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <span>{exhibit.number}</span>
          <strong>{exhibit.title}</strong>
          <small>{exhibit.subtitle}</small>
        </button>
      </Html>
    </group>
  )
}


function RetrievalLandmark({ world }: { world: CourseWorldDefinition }) {
  const points = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.2, 2.2, 0),
      new THREE.Vector3(0, 3.35, 0),
      new THREE.Vector3(1.2, 2.2, 0),
    )
    return curve.getPoints(28)
  }, [])
  return (
    <group position={[0, 0.34, 0]}>
      {[-1.2, 1.2].map((x, index) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedBox args={[1.05, 2.25, 1.05]} radius={0.2} smoothness={4} position={[0, 1.15, 0]} castShadow>
            <meshStandardMaterial color={index === 0 ? '#d9f6f0' : world.accent} roughness={0.42} />
          </RoundedBox>
          {[0.55, 1.15, 1.75].map((y) => (
            <mesh key={y} position={[0, y, 0.55]}>
              <boxGeometry args={[0.52, 0.09, 0.04]} />
              <meshBasicMaterial color={index === 0 ? world.accentDark : '#ffffff'} />
            </mesh>
          ))}
        </group>
      ))}
      <Line points={points} color={world.accentDark} lineWidth={2.4} transparent opacity={0.72} />
      {[-0.62, 0, 0.62].map((x, index) => (
        <mesh key={x} position={[x, 2.8 - Math.abs(x) * 0.5, 0]}>
          <octahedronGeometry args={[0.13 + index * 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive={world.accent} emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  )
}

function SequenceLandmark({ world }: { world: CourseWorldDefinition }) {
  return (
    <group position={[0, 0.35, 0]}>
      {[-2, -1, 0, 1, 2].map((step, index) => {
        const height = 0.75 + (index % 3) * 0.34
        return (
          <group key={step} position={[step * 0.72, 0, Math.sin(index * 0.8) * 0.22]}>
            <RoundedBox args={[0.58, height, 0.72]} radius={0.12} smoothness={4} position={[0, height / 2, 0]} castShadow>
              <meshStandardMaterial color={index === 2 ? world.accent : '#ffe4a3'} roughness={0.5} />
            </RoundedBox>
            <mesh position={[0, height + 0.16, 0]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshBasicMaterial color={index === 2 ? '#ffffff' : world.accentDark} />
            </mesh>
          </group>
        )
      })}
      {[0, 1, 2].map((row) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-1.45, 1.25 + row * 0.22, 0),
          new THREE.Vector3(0, 2.55 + row * 0.35, -0.2),
          new THREE.Vector3(1.45, 1.25 + row * 0.22, 0),
        )
        return <Line key={row} points={curve.getPoints(24)} color={row === 1 ? world.accentDark : world.accent} lineWidth={1.5} transparent opacity={0.46} />
      })}
    </group>
  )
}

function PolicyLandmark({ world }: { world: CourseWorldDefinition }) {
  const ring = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.42
  })
  return (
    <group position={[0, 0.34, 0]}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.85, 1.25, 2.5, 12]} />
        <meshStandardMaterial color="#ffd2df" roughness={0.46} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <coneGeometry args={[0.82, 0.78, 12]} />
        <meshStandardMaterial color={world.accent} roughness={0.4} />
      </mesh>
      <group ref={ring} position={[0, 1.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.65, 0.065, 12, 64]} />
          <meshStandardMaterial color={world.accentDark} emissive={world.accent} emissiveIntensity={0.2} />
        </mesh>
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.65, 0, Math.sin(angle) * 1.65]}>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color={index === 0 ? '#ffffff' : world.accent} emissive={world.accent} emissiveIntensity={0.45} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function EcosystemLandmark({ world }: { world: CourseWorldDefinition }) {
  const orbit = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y -= dt * 0.28
  })
  return (
    <group position={[0, 0.34, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 1.7, 9]} />
        <meshStandardMaterial color="#8c694e" roughness={0.9} />
      </mesh>
      {[[0, 2.0, 0], [-0.72, 1.68, 0.12], [0.72, 1.72, -0.08], [0.05, 1.72, 0.72], [-0.1, 1.8, -0.65]].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow>
          <sphereGeometry args={[0.72 - (index % 2) * 0.08, 20, 14]} />
          <meshStandardMaterial color={index === 0 ? world.accent : index % 2 ? '#96d99e' : '#c3e9bb'} roughness={0.72} />
        </mesh>
      ))}
      <group ref={orbit} position={[0, 1.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.055, 10, 64]} />
          <meshStandardMaterial color={world.accentDark} transparent opacity={0.58} />
        </mesh>
        {[0, 1, 2, 3].map((index) => {
          const angle = index * Math.PI * 0.5
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8]}>
              <dodecahedronGeometry args={[0.17]} />
              <meshStandardMaterial color={index % 2 ? '#ffcf68' : '#ffffff'} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function FinalLandmark({ world }: { world: CourseWorldDefinition }) {
  const crystal = useRef<THREE.Mesh>(null)
  useFrame((state, dt) => {
    if (!crystal.current) return
    crystal.current.rotation.y += dt * 0.42
    crystal.current.position.y = 2.55 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12
  })
  return (
    <group position={[0, 0.34, 0]}>
      {[2.1, 1.55, 1.0].map((radius, index) => (
        <mesh key={radius} position={[0, index * 0.24, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius + 0.16, 0.25, 32]} />
          <meshStandardMaterial color={index === 2 ? world.accent : index === 1 ? '#cfcaf7' : '#ffffff'} roughness={0.5} />
        </mesh>
      ))}
      <mesh ref={crystal} position={[0, 2.55, 0]} castShadow>
        <octahedronGeometry args={[0.72, 0]} />
        <meshPhysicalMaterial color={world.accent} emissive={world.accent} emissiveIntensity={0.28} roughness={0.16} metalness={0.12} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <RoundedBox key={index} args={[0.22, 1.7, 0.22]} radius={0.08} smoothness={3} position={[Math.cos(index * Math.PI / 2) * 1.5, 1.15, Math.sin(index * Math.PI / 2) * 1.5]}>
          <meshStandardMaterial color="#ffffff" emissive={world.accent} emissiveIntensity={0.12} />
        </RoundedBox>
      ))}
    </group>
  )
}

function CourseNodeMarker({
  nodeId,
  slot,
  world,
}: {
  nodeId: NodeId
  slot: [number, number, number]
  world: CourseWorldDefinition
}) {
  const node = NODES[nodeId]
  const state = useProgress((store) => store.getNodeState(nodeId))
  const mode = useProgress((store) => store.mode)
  const [hovered, setHovered] = useState(false)
  const group = useRef<THREE.Group>(null)
  const locked = state === 'locked_for_credit'
  const actionable = !locked

  useFrame((stateFrame, dt) => {
    if (!group.current) return
    const pulse = state === 'next_required' ? 1 + Math.sin(stateFrame.clock.elapsedTime * 3.4) * 0.035 : 1
    const target = (hovered && actionable ? 1.08 : 1) * pulse
    const scale = THREE.MathUtils.damp(group.current.scale.x, target, 10, dt)
    group.current.scale.setScalar(scale)
  })

  const requestNode = () => {
    if (!actionable || useProgress.getState().mode !== 'explore') return
    const target = nodeWorldPosition(nodeId)
    runtime.pendingSceneAction = null
    runtime.pendingOpen = nodeId
    setCourseMoveTarget(world.id, target, NODE_APPROACH_MARGIN)
  }

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    requestNode()
  }

  return (
    <group ref={group} position={slot}>
      <group
        onPointerDown={onPointerDown}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          if (actionable && typeof document !== 'undefined') document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
        }}
      >
        <NodeSculpture node={node} state={state} world={world} />
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.88, 48]} />
          <meshBasicMaterial color={stateColor(state, world)} transparent opacity={state === 'next_required' ? 0.72 : 0.28} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.92, 0.92, 1.8, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {mode === 'explore' && (
        <Html position={[0, 2.05, 0]} center zIndexRange={[35, 12]} wrapperClass="lecture-label-anchor">
          <button
            type="button"
            className={`lecture-stack-label state-${state}`}
            style={{ '--world-accent': world.accent } as CSSProperties}
            onClick={requestNode}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            disabled={!actionable}
          >
            <span>{stateLabel(state, node)}</span>
            <strong>{node.title}</strong>
          </button>
        </Html>
      )}
    </group>
  )
}

function NodeSculpture({ node, state, world }: { node: CourseNode; state: ProgressNodeState; world: CourseWorldDefinition }) {
  const muted = state === 'locked_for_credit'
  const color = muted ? '#b8c3c8' : state === 'completed' ? '#48ad73' : world.accent
  const white = muted ? '#d8e0e3' : '#ffffff'

  if (node.kind === 'lesson') {
    return (
      <group position={[0, 0.16, 0]}>
        {[0, 1, 2].map((index) => (
          <RoundedBox key={index} args={[1.05 - index * 0.08, 0.14, 0.72]} radius={0.06} smoothness={3} position={[index * 0.07, index * 0.15, -index * 0.04]} rotation={[0, 0.08 - index * 0.07, 0]} castShadow>
            <meshStandardMaterial color={index === 2 ? color : white} roughness={0.52} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.72, 0.86, 0.12]} radius={0.07} smoothness={3} position={[0, 0.78, 0]} rotation={[0.08, 0, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.45} />
        </RoundedBox>
      </group>
    )
  }

  if (node.kind === 'widget' || node.kind === 'arena') {
    return (
      <group position={[0, 0.2, 0]}>
        <RoundedBox args={[0.78, 0.42, 0.78]} radius={0.12} smoothness={4} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial color={white} roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.85, 0]} castShadow>
          <octahedronGeometry args={[0.38]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={muted ? 0 : 0.2} roughness={0.32} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.53, 0.36, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  if (node.kind === 'quiz') {
    return (
      <group position={[0, 0.15, 0]}>
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.52, 0.13, 16, 48]} />
          <meshStandardMaterial color={color} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial color={white} emissive={color} emissiveIntensity={muted ? 0 : 0.32} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.58, 0.72, 0.18, 32]} />
          <meshStandardMaterial color={white} roughness={0.6} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[0, 0.12, 0]}>
      {[-0.48, 0.48].map((x) => (
        <RoundedBox key={x} args={[0.24, 1.12, 0.24]} radius={0.08} smoothness={3} position={[x, 0.56, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.46} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.86, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.82, 16]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.38, 0.08, 12, 36, Math.PI]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

function ArrivalPortal({ accent, phase }: { accent: string; phase: 'journey' | 'play' }) {
  const group = useRef<THREE.Group>(null)
  const outer = useRef<THREE.MeshBasicMaterial>(null)
  const inner = useRef<THREE.MeshBasicMaterial>(null)
  const age = useRef(0)

  useEffect(() => {
    age.current = 0
  }, [phase])

  useFrame((_, dt) => {
    age.current += Math.min(dt, 0.1)
    const reveal = 1 - Math.pow(1 - THREE.MathUtils.clamp(age.current / 0.72, 0, 1), 3)
    const fade = 1 - THREE.MathUtils.smoothstep(age.current, 1.45, 2.55)
    if (group.current) {
      group.current.scale.setScalar(0.7 + reveal * 0.42)
      group.current.rotation.y += dt * 0.34
      group.current.visible = fade > 0.01
    }
    if (outer.current) outer.current.opacity = fade * 0.76
    if (inner.current) inner.current.opacity = fade * 0.34
  })

  return (
    <group ref={group} position={[0, 1.25, PORTAL_OFFSET_Z]} renderOrder={8}>
      <mesh>
        <torusGeometry args={[0.88, 0.095, 16, 64]} />
        <meshBasicMaterial ref={outer} color={accent} transparent opacity={0.76} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.72, 48]} />
        <meshBasicMaterial ref={inner} color="#dffaff" transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 1.02, Math.sin(angle) * 1.02, 0]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshBasicMaterial color={index % 2 ? "#ffffff" : accent} transparent opacity={0.86} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function TravelerLights() {
  return (
    <>
      <pointLight position={[1.1, 2.7, 1.5]} color="#fff4df" intensity={4.2} distance={5} decay={1.8} />
      <pointLight position={[-1.2, 1.7, -0.8]} color="#bceeff" intensity={2.6} distance={4.2} decay={1.9} />
    </>
  )
}

function JourneyTraveler({ worldId }: { worldId: WorldId }) {
  const group = useRef<THREE.Group>(null)
  const visual = useRef<THREE.Group>(null)
  const age = useRef(0)
  const world = COURSE_WORLD_BY_ID[worldId]

  useEffect(() => {
    runtime.playerSpeed = 0
  }, [])

  useFrame((_, dt) => {
    age.current += Math.min(dt, 0.1)
    const reveal = 1 - Math.pow(1 - THREE.MathUtils.clamp((age.current - 0.12) / 0.72, 0, 1), 3)
    if (visual.current) {
      visual.current.scale.setScalar(Math.max(0.001, reveal * 0.94))
      visual.current.position.y = (1 - reveal) * 0.72
    }
    if (group.current) {
      group.current.position.y = PLAYER_Y + Math.sin(Math.min(age.current, 1.4) * Math.PI) * 0.04
    }
    runtime.playerSpeed = 0
  })

  return (
    <group
      ref={group}
      position={[world.position[0], PLAYER_Y, world.position[2] + PORTAL_OFFSET_Z]}
      rotation={[0, -0.42, 0]}
    >
      <TravelerLights />
      <group ref={visual} scale={0.001}>
        <ExplorerGLB />
      </group>
      <mesh position={[0, -0.57, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color={world.accentDark} transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CourseTraveler({ worldId }: { worldId: WorldId }) {
  const group = useRef<THREE.Group>(null)
  const visual = useRef<THREE.Group>(null)
  const arrival = useRef(0)
  const theoryImaxWasActive = useRef(false)
  const input = useInput()
  const mode = useProgress((state) => state.mode)
  const activeNodeId = useProgress((state) => state.activeNodeId)
  const setNearby = useProgress((state) => state.setNearby)
  const openNode = useProgress((state) => state.openNode)
  const theoryImax = mode === 'study' && isTheoryLesson(activeNodeId)
  const theoryStageVisible = worldId === 'foundations-camp' || theoryImax
  const playerY = theoryStageVisible ? THEORY_PLAYER_Y : PLAYER_Y
  const { size } = useThree()
  const portrait = size.height > size.width * 1.08
  const world = COURSE_WORLD_BY_ID[worldId]
  const center = useMemo(() => new THREE.Vector3(world.position[0], playerY, world.position[2]), [playerY, world])
  const obstacles = useMemo(
    () => worldNavigationObstacles(worldId, !theoryImax, theoryImax),
    [theoryImax, worldId],
  )
  const position = useRef(center.clone().add(new THREE.Vector3(0, 0, PORTAL_OFFSET_Z)))
  const velocity = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3())
  const delta = useRef(new THREE.Vector3())

  useEffect(() => {
    projectOutsideObstacles(position.current, obstacles)
    position.current.y = playerY
    runtime.playerPosition.copy(position.current)
    clearCourseMoveTarget()
    runtime.requestMove = (target, targetMargin) => setCourseMoveTarget(worldId, target, targetMargin)
    runtime.pendingOpen = null
    runtime.pendingSceneAction = null
    runtime.cameraSkip = true
    return () => {
      runtime.requestMove = null
      setNearby(null)
    }
  }, [obstacles, playerY, setNearby, worldId])

  useEffect(() => {
    if (theoryImax && !theoryImaxWasActive.current) {
      const theaterApron = center.clone().add(
        portrait
          ? new THREE.Vector3(-0.4, 0, 1)
          : new THREE.Vector3(-1.75, 0, 2.75),
      )
      projectOutsideObstacles(theaterApron, obstacles, 0.16)
      position.current.copy(theaterApron).setY(playerY)
      velocity.current.set(0, 0, 0)
      desired.current.set(0, 0, 0)
      runtime.playerPosition.copy(position.current)
      clearCourseMoveTarget()
      runtime.pendingOpen = null
      runtime.pendingSceneAction = null
    }
    theoryImaxWasActive.current = theoryImax
  }, [center, obstacles, playerY, portrait, theoryImax])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    if (!group.current) return
    arrival.current += dt
    const reveal = 1 - Math.pow(1 - THREE.MathUtils.clamp((arrival.current - 0.1) / 0.68, 0, 1), 3)
    if (visual.current) {
      visual.current.scale.setScalar(Math.max(0.001, reveal * 0.94))
      visual.current.position.y = (1 - reveal) * 0.7
    }

    desired.current.set(0, 0, 0)
    let autoNavigating = false
    if (mode === 'explore' || theoryImax) {
      const forward = input.current.forward + touchControls.moveY
      const strafe = input.current.strafe + touchControls.moveX
      const manual = Math.abs(forward) > 0.02 || Math.abs(strafe) > 0.02

      if (manual) {
        clearCourseMoveTarget()
        runtime.pendingOpen = null
        runtime.pendingSceneAction = null
        desired.current.addScaledVector(FORWARD, forward).addScaledVector(RIGHT, strafe)
        if (desired.current.lengthSq() > 1) desired.current.normalize()
        desired.current.multiplyScalar(input.current.run ? 5.2 : 3.35)
      } else if (runtime.moveTarget) {
        autoNavigating = true
        delta.current.copy(runtime.moveTarget).sub(position.current).setY(0)
        let distance = delta.current.length()
        let arrivalDistance = runtime.movePath.length > 0 ? 0.36 : 0.22
        while (runtime.moveTarget && distance < arrivalDistance) {
          runtime.moveTarget = runtime.movePath.shift() ?? null
          if (!runtime.moveTarget) {
            runtime.moveDestination = null
            break
          }
          delta.current.copy(runtime.moveTarget).sub(position.current).setY(0)
          distance = delta.current.length()
          arrivalDistance = runtime.movePath.length > 0 ? 0.36 : 0.22
        }
        if (runtime.moveTarget) {
          desired.current.copy(delta.current).normalize().multiplyScalar(distance > 2.4 ? 4.8 : 3.6)
        }
      }
    }

    if (!autoNavigating) steerAroundObstacles(position.current, desired.current, obstacles)
    velocity.current.lerp(desired.current, 1 - Math.exp(-11 * dt))
    position.current.addScaledVector(velocity.current, dt)
    resolveObstacleCollisions(position.current, velocity.current, obstacles)
    delta.current.copy(position.current).sub(center).setY(0)
    const boundaryDistance = delta.current.length()
    if (boundaryDistance > WALK_RADIUS) {
      delta.current.multiplyScalar(1 / boundaryDistance)
      position.current.set(
        center.x + delta.current.x * WALK_RADIUS,
        playerY,
        center.z + delta.current.z * WALK_RADIUS,
      )
      const outwardVelocity = velocity.current.dot(delta.current)
      if (outwardVelocity > 0) velocity.current.addScaledVector(delta.current, -outwardVelocity)
    }
    resolveObstacleCollisions(position.current, velocity.current, obstacles)
    position.current.y = playerY

    group.current.position.copy(position.current)
    runtime.playerPosition.copy(position.current)
    runtime.playerSpeed = velocity.current.length()
    if (runtime.playerSpeed > 0.12 && visual.current) {
      const targetYaw = Math.atan2(-velocity.current.x, -velocity.current.z)
      runtime.playerFacing = dampAngle(runtime.playerFacing, targetYaw, 12, dt)
      visual.current.rotation.y = runtime.playerFacing
    }

    if (mode === 'explore') {
      const store = useProgress.getState()
      let nearby: NodeId | null = null
      let nearbyDistance = Infinity
      for (const id of WORLD_NODE_IDS[worldId]) {
        if (store.getNodeState(id) === 'locked_for_credit') continue
        const nodePosition = nodeWorldPosition(id)
        const distance = Math.hypot(position.current.x - nodePosition.x, position.current.z - nodePosition.z)
        if (distance < 1.25 && distance < nearbyDistance) {
          nearby = id
          nearbyDistance = distance
        }
      }
      setNearby(nearby)

      const pending = runtime.pendingOpen as NodeId | null
      if (pending && NODES[pending]?.worldId === worldId) {
        const target = nodeWorldPosition(pending)
        const distance = Math.hypot(position.current.x - target.x, position.current.z - target.z)
        if (distance < NODE_INTERACTION_DISTANCE) {
          runtime.pendingOpen = null
          clearCourseMoveTarget()
          openNode(pending)
        }
      }

      const interact = input.current.interactPressed || touchControls.interactEdge
      if (interact) {
        input.current.interactPressed = false
        touchControls.interactEdge = false
        if (nearby) openNode(nearby)
      }

      const sceneAction = runtime.pendingSceneAction
      if (sceneAction && sceneAction.worldId === worldId) {
        const distance = Math.hypot(position.current.x - sceneAction.target.x, position.current.z - sceneAction.target.z)
        if (distance < sceneAction.radius) {
          runtime.pendingSceneAction = null
          clearCourseMoveTarget()
          sceneAction.run()
        }
      }
    } else {
      if (useProgress.getState().nearbyNodeId !== null) setNearby(null)
      runtime.pendingOpen = null
      runtime.pendingSceneAction = null
      input.current.interactPressed = false
      touchControls.interactEdge = false
    }

    input.current.jumpPressed = false
    touchControls.jumpEdge = false
  })

  return (
    <group ref={group} position={position.current.toArray()}>
      <TravelerLights />
      <group ref={visual} scale={0.001}>
        <ExplorerGLB />
      </group>
      <mesh position={[0, -0.57, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#476675" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CourseRoute() {
  const curve = useMemo(() => {
    const points = COURSE_WORLDS.map((world) => new THREE.Vector3(world.position[0], -0.38, world.position[2]))
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.34)
  }, [])
  const points = useMemo(() => curve.getPoints(180), [curve])

  return (
    <group>
      <Line points={points} color="#79a9b8" lineWidth={2.1} transparent opacity={0.42} dashed dashSize={0.22} gapSize={0.15} />
      {[0, 0.24, 0.48, 0.72].map((offset) => <RoutePacket key={offset} curve={curve} offset={offset} />)}
    </group>
  )
}

function RoutePacket({ curve, offset }: { curve: THREE.CatmullRomCurve3; offset: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = (state.clock.elapsedTime * 0.025 + offset) % 1
    ref.current.position.copy(curve.getPointAt(t)).setY(0.25)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#58b9ca" emissiveIntensity={0.8} />
    </mesh>
  )
}

function MoveDestinationMarker({ accent, y }: { accent: string; y: number }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const destination = runtime.moveDestination
    group.current.visible = Boolean(destination)
    if (!destination) return
    group.current.position.set(destination.x, y, destination.z)
    const pulse = 0.94 + Math.sin(clock.elapsedTime * 5.2) * 0.08
    group.current.scale.setScalar(pulse)
    group.current.rotation.y = clock.elapsedTime * 0.5
  })

  return (
    <group ref={group} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.31, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.78} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.075, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CloudReveal({ worldId }: { worldId: WorldId }) {
  const world = COURSE_WORLD_BY_ID[worldId]
  return (
    <group>
      {Array.from({ length: 12 }, (_, index) => (
        <PartingCloud key={index} world={world} index={index} />
      ))}
    </group>
  )
}

function PartingCloud({ world, index }: { world: CourseWorldDefinition; index: number }) {
  const group = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: index % 3 === 0 ? world.surface : '#ffffff',
    transparent: true,
    opacity: 0.9,
    roughness: 1,
    depthWrite: false,
  }), [index, world])
  const progress = useRef(-index * 0.025)
  const angle = (index / 12) * Math.PI * 2 + (index % 2) * 0.14
  const start = useMemo(() => new THREE.Vector3(
    world.position[0] + Math.cos(angle) * 0.9,
    4.4 + (index % 3) * 0.24,
    world.position[2] + Math.sin(angle) * 0.9,
  ), [angle, index, world])
  const end = useMemo(() => new THREE.Vector3(
    world.position[0] + Math.cos(angle) * (6.8 + (index % 3) * 0.65),
    3.2 + (index % 2) * 0.5,
    world.position[2] + Math.sin(angle) * (6.8 + (index % 3) * 0.65),
  ), [angle, index, world])

  useEffect(() => () => material.dispose(), [material])
  useFrame((_, dt) => {
    if (!group.current) return
    progress.current = Math.min(1, progress.current + dt * 0.72)
    const raw = THREE.MathUtils.clamp(progress.current, 0, 1)
    const eased = 1 - Math.pow(1 - raw, 3)
    group.current.position.lerpVectors(start, end, eased)
    group.current.scale.setScalar(1.35 + eased * 0.65)
    material.opacity = Math.max(0, 0.92 * (1 - eased))
    group.current.visible = material.opacity > 0.01
  })

  return (
    <group ref={group} position={start} renderOrder={12}>
      {[[-0.45, 0, 0], [0.35, 0.08, 0.05], [0, 0.22, -0.18], [0.08, -0.08, 0.34]].map((position, puff) => (
        <mesh key={puff} position={position as [number, number, number]} material={material}>
          <sphereGeometry args={[0.72 - puff * 0.06, 18, 14]} />
        </mesh>
      ))}
    </group>
  )
}

function CloudCluster({
  position,
  scale,
  opacity,
  tint = '#ffffff',
}: {
  position: [number, number, number]
  scale: number
  opacity: number
  tint?: string
}) {
  return (
    <group position={position} scale={scale}>
      {[[-0.58, 0, 0], [0.42, 0.05, 0.02], [-0.02, 0.24, -0.12], [0.08, -0.06, 0.4]].map((puff, index) => (
        <mesh key={index} position={puff as [number, number, number]} renderOrder={-1}>
          <sphereGeometry args={[0.72 - index * 0.06, 16, 12]} />
          <meshStandardMaterial color={tint} transparent opacity={opacity} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SkyDome() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#a8d5e8') },
      middleColor: { value: new THREE.Color('#dbeef5') },
      bottomColor: { value: new THREE.Color('#f7fbff') },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 bottomColor;
      varying vec3 vPosition;
      void main() {
        float h = normalize(vPosition).y * 0.5 + 0.5;
        vec3 lower = mix(bottomColor, middleColor, smoothstep(0.05, 0.58, h));
        vec3 color = mix(lower, topColor, smoothstep(0.58, 1.0, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh scale={85} material={material}>
      <sphereGeometry args={[1, 32, 20]} />
    </mesh>
  )
}

function nodeWorldPosition(id: NodeId): THREE.Vector3 {
  const node = NODES[id]
  const world = COURSE_WORLD_BY_ID[node.worldId]
  const index = Math.max(0, WORLD_NODE_IDS[node.worldId].indexOf(id))
  const slot = nodeSlotFor(node.worldId, index)
  return new THREE.Vector3(world.position[0] + slot[0], PLAYER_Y, world.position[2] + slot[2])
}

function stateColor(state: ProgressNodeState, world: CourseWorldDefinition): string {
  if (state === 'completed') return '#48ad73'
  if (state === 'locked_for_credit') return '#aebbc1'
  return world.accent
}

function stateLabel(state: ProgressNodeState, node: CourseNode): string {
  if (state === 'completed') return 'Completed'
  if (state === 'next_required') return 'Next field note'
  if (state === 'locked_for_credit') return 'Locked'
  return node.subtitle
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let difference = target - current
  while (difference > Math.PI) difference -= Math.PI * 2
  while (difference < -Math.PI) difference += Math.PI * 2
  return current + difference * (1 - Math.exp(-lambda * dt))
}
