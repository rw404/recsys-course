import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { TOWER_STAGE } from './shared'
import { useProgress } from '../state/progress'
import { PorterGLB } from './PorterGLB'
import { RiggedNarrator } from './RiggedNarrator'

const DIR = '/models/astra-rigged'
// Astra's calm talking clips (the same low-arm set the camp/city lessons use — no raised arms).
const ASTRA_CLIPS: [string, string][] = [
  ['idle', `${DIR}/idle.glb`],
  ['talkOpen', `${DIR}/talk-open.glb`],
  ['talkPassion', `${DIR}/talk-passion.glb`],
  ['talkRight', `${DIR}/talk-right.glb`],
  ['talkLeftHip', `${DIR}/talk-lefthip.glb`],
  ['think', `${DIR}/think.glb`],
]
const PAGE_GESTURES: string[][] = [
  ['talkOpen', 'talkRight', 'talkLeftHip'], // 0 intro
  ['talkPassion', 'talkRight', 'talkOpen'], // 1 explore vs exploit
  ['think', 'talkLeftHip', 'talkPassion'], // 2 UCB / Thompson
  ['talkOpen', 'talkPassion', 'talkRight'], // 3 policies
  ['talkRight', 'talkLeftHip', 'talkOpen'], // 4 slates & beam search
]

/** The Policy Tower lecture set — Guide Astra narrates the Bandits, Policies & Slates lesson. */
export function TowerLessonStage() {
  const active = useProgress((s) => s.mode === 'study' && s.activeNodeId === 'policy-lesson')
  const a = TOWER_STAGE.astra
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[a.pos.x, a.pos.y, a.pos.z]} rotation={[0, a.yaw, 0]}>
        <CuboidCollider args={[0.35, 0.85, 0.35]} position={[0, 0.85, 0]} />
        <RiggedNarrator
          dir={DIR}
          clips={ASTRA_CLIPS}
          pageGestures={PAGE_GESTURES}
          activeNode="policy-lesson"
          scale={a.scale}
          feetY={a.feetY}
          emissive="#3a2168"
          forceParam="tac"
        />
      </RigidBody>
      {active && (
        <>
          <group position={[TOWER_STAGE.player.pos.x, TOWER_STAGE.player.pos.y + 0.9, TOWER_STAGE.player.pos.z]} rotation={[0, TOWER_STAGE.player.yaw, 0]}>
            <PorterGLB />
          </group>
          {/* warm key on Astra's face + cool violet rim, only while lecturing */}
          <pointLight position={[-5.0, 2.6, 4.2]} intensity={16} color="#ffd9b0" distance={11} />
          <pointLight position={[-8.0, 2.4, -1.0]} intensity={10} color="#8ab4ff" distance={12} />
          {/* hero over-the-shoulder rake light on the porter's hood + blue pack */}
          <pointLight position={[-4.6, 3.4, 5.9]} intensity={30} color="#bcd4ff" distance={5.0} decay={2} />
          <pointLight position={[-8.2, 3.0, 3.7]} intensity={16} color="#c9b8ff" distance={4.4} decay={2} />
        </>
      )}
    </>
  )
}
