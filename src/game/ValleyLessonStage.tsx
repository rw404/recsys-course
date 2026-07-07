import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { VALLEY_STAGE } from './shared'
import { useProgress } from '../state/progress'
import { PorterGLB } from './PorterGLB'
import { VectorSmithGLB } from './VectorSmithGLB'

/** True while the Week-02 Two-Tower lecture is open. */
function useValleyLessonActive() {
  return useProgress((s) => s.mode === 'study' && s.activeNodeId === 'two-tower-lesson')
}

/**
 * The Retrieval Valley lecture set — the World-02 twin of <LessonStage/>. Vector Smith stands at
 * the ANN-lab mark (he is the interactable for the two-tower lesson); while lecturing he narrates
 * with a per-page talking animation, the player appears in the near foreground with their back to
 * us, and cool key/rim lights lift the two-shot.
 */
export function ValleyLessonStage() {
  const active = useValleyLessonActive()
  const s = VALLEY_STAGE.smith
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[s.pos.x, s.pos.y, s.pos.z]} rotation={[0, s.yaw, 0]}>
        <CuboidCollider args={[0.35, 0.85, 0.35]} position={[0, 0.85, 0]} />
        <VectorSmithGLB />
      </RigidBody>
      {active && (
        <>
          {/* +0.9 lifts the model to the standing height the physics capsule gives the real player */}
          <group position={[VALLEY_STAGE.player.pos.x, VALLEY_STAGE.player.pos.y + 0.9, VALLEY_STAGE.player.pos.z]} rotation={[0, VALLEY_STAGE.player.yaw, 0]}>
            <PorterGLB />
          </group>
          {/* cool key on Vector Smith's face + violet rim, only while lecturing */}
          <pointLight position={[-6.6, 2.6, 4.0]} intensity={16} color="#cfe0ff" distance={11} />
          <pointLight position={[-9.5, 2.4, -1.2]} intensity={10} color="#8ab4ff" distance={12} />
          {/* HERO over-the-shoulder rake light on the porter's hood + blue pack */}
          <pointLight position={[-5.3, 3.4, 5.6]} intensity={30} color="#bcd4ff" distance={5.0} decay={2} />
          <pointLight position={[-8.9, 3.0, 3.5]} intensity={16} color="#c9b8ff" distance={4.4} decay={2} />
        </>
      )}
    </>
  )
}
