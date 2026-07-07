import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { LESSON_STAGE } from './shared'
import { useProgress } from '../state/progress'
import { PorterGLB } from './PorterGLB'
import { AstraGLB } from './AstraGLB'

/** True while the Week 01 theory lecture is open. */
function useLessonActive() {
  return useProgress((s) => s.mode === 'study')
}

/**
 * The staged lecture set. Guide Astra always stands by the station (she is the interactable
 * marker for the lesson); during a lesson she narrates with a real per-page talking animation,
 * the player appears in the foreground with their back to us, and a soft key light lifts her face.
 */
export function LessonStage() {
  const active = useLessonActive()
  const a = LESSON_STAGE.astra
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[a.pos.x, a.pos.y, a.pos.z]} rotation={[0, a.yaw, 0]}>
        <CuboidCollider args={[0.35, 0.85, 0.35]} position={[0, 0.85, 0]} />
        <AstraGLB />
      </RigidBody>
      {active && (
        <>
          {/* +0.9 lifts the model to the same standing height the physics capsule gives the
              real player (PorterGLB plants its feet relative to that body centre). */}
          <group position={[LESSON_STAGE.player.pos.x, LESSON_STAGE.player.pos.y + 0.9, LESSON_STAGE.player.pos.z]} rotation={[0, LESSON_STAGE.player.yaw, 0]}>
            <PorterGLB />
          </group>
          {/* warm key light on Astra's face + cool rim, only while lecturing */}
          <pointLight position={[5.2, 2.6, 4.2]} intensity={16} color="#ffd9b0" distance={11} />
          <pointLight position={[0.5, 2.4, -1.5]} intensity={10} color="#8ab4ff" distance={12} />
          {/* HERO over-the-shoulder read. He now sits in the near LEFT foreground at ~(4.6,0,4.9)
              with his back to us (PorterGLB flips itself 180°). A flat wash would just smear him,
              so instead a crisp cool light from high camera-right rakes his hood + blue pack (his
              back faces the camera) so he reads as a person, and a cooler violet halo from his far
              (left) side carves the opposite edge. Both are short-range with decay so they die
              before reaching Astra and never flatten him into a dark blob. */}
          <pointLight position={[6.4, 3.4, 5.6]} intensity={30} color="#bcd4ff" distance={5.0} decay={2} />
          <pointLight position={[2.9, 3.0, 3.5]} intensity={16} color="#c9b8ff" distance={4.4} decay={2} />
        </>
      )}
    </>
  )
}
