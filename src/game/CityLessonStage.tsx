import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { CITY_STAGE } from './shared'
import { useProgress } from '../state/progress'
import { PorterGLB } from './PorterGLB'
import { RiggedNarrator } from './RiggedNarrator'

const DIR = '/models/astra-rigged'
// Astra's calm talking clips (the same low-arm set the camp lesson uses — no awkward raised arms).
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
  ['talkPassion', 'talkRight', 'talkOpen'], // 1 attention QKV
  ['talkLeftHip', 'talkOpen', 'talkPassion'], // 2 multi-head
  ['think', 'talkRight', 'talkLeftHip'], // 3 transformer block
  ['talkPassion', 'talkOpen', 'talkRight'], // 4 flash attention
]

/** The Sequential City lecture set — Guide Astra narrates the Attention & Transformers lesson. */
export function CityLessonStage() {
  const active = useProgress((s) => s.mode === 'study' && s.activeNodeId === 'transformer-lesson')
  const a = CITY_STAGE.astra
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[a.pos.x, a.pos.y, a.pos.z]} rotation={[0, a.yaw, 0]}>
        <CuboidCollider args={[0.35, 0.85, 0.35]} position={[0, 0.85, 0]} />
        <RiggedNarrator
          dir={DIR}
          clips={ASTRA_CLIPS}
          pageGestures={PAGE_GESTURES}
          activeNode="transformer-lesson"
          scale={a.scale}
          feetY={a.feetY}
          emissive="#3a2168"
          forceParam="cac"
        />
      </RigidBody>
      {active && (
        <>
          <group position={[CITY_STAGE.player.pos.x, CITY_STAGE.player.pos.y + 0.9, CITY_STAGE.player.pos.z]} rotation={[0, CITY_STAGE.player.yaw, 0]}>
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
