import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { ARENA_STAGE } from './shared'
import { useProgress } from '../state/progress'
import { PorterGLB } from './PorterGLB'
import { RiggedNarrator } from './RiggedNarrator'

const DIR = '/models/astra-rigged'
const ASTRA_CLIPS: [string, string][] = [
  ['idle', `${DIR}/idle.glb`],
  ['talkOpen', `${DIR}/talk-open.glb`],
  ['talkPassion', `${DIR}/talk-passion.glb`],
  ['talkRight', `${DIR}/talk-right.glb`],
  ['talkLeftHip', `${DIR}/talk-lefthip.glb`],
  ['think', `${DIR}/think.glb`],
]
const PAGE_GESTURES: string[][] = [
  ['talkOpen', 'talkPassion', 'talkRight'], // 0 intro
  ['talkRight', 'talkOpen', 'talkLeftHip'], // 1 measure
  ['talkLeftHip', 'talkPassion', 'talkOpen'], // 2 retrieve
  ['talkPassion', 'talkRight', 'think'], // 3 attend
  ['talkOpen', 'talkLeftHip', 'talkRight'], // 4 decide
  ['talkPassion', 'talkOpen', 'talkRight'], // 5 sustain
]

/** The Final Arena set — Guide Astra delivers the closing capstone recap. */
export function ArenaLessonStage() {
  const active = useProgress((s) => s.mode === 'study' && s.activeNodeId === 'capstone-lesson')
  const a = ARENA_STAGE.astra
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[a.pos.x, a.pos.y, a.pos.z]} rotation={[0, a.yaw, 0]}>
        <CuboidCollider args={[0.35, 0.85, 0.35]} position={[0, 0.85, 0]} />
        <RiggedNarrator
          dir={DIR}
          clips={ASTRA_CLIPS}
          pageGestures={PAGE_GESTURES}
          activeNode="capstone-lesson"
          scale={a.scale}
          feetY={a.feetY}
          emissive="#3a2168"
          forceParam="aac"
        />
      </RigidBody>
      {active && (
        <>
          <group position={[ARENA_STAGE.player.pos.x, ARENA_STAGE.player.pos.y + 0.9, ARENA_STAGE.player.pos.z]} rotation={[0, ARENA_STAGE.player.yaw, 0]}>
            <PorterGLB />
          </group>
          <pointLight position={[-5.0, 2.6, 4.2]} intensity={16} color="#ffd9b0" distance={11} />
          <pointLight position={[-8.0, 2.4, -1.0]} intensity={10} color="#8ab4ff" distance={12} />
          <pointLight position={[-4.6, 3.4, 5.9]} intensity={30} color="#bcd4ff" distance={5.0} decay={2} />
          <pointLight position={[-8.2, 3.0, 3.7]} intensity={16} color="#c9b8ff" distance={4.4} decay={2} />
        </>
      )}
    </>
  )
}
