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
          {/* HERO over-the-shoulder read. His back is to us (PorterGLB flips itself 180°), so a
              flat wash just turns him into a pale smear. Instead: a crisp cool rim high and to
              his camera-right carves the top edge of his head + shoulder against the dark scene,
              and a second cooler rim from the far (Astra) side haloes the other edge — together
              they read as a distinct over-the-shoulder silhouette. Both are short-range so they
              die before reaching Astra and never flatten his body into a blob. */}
          <pointLight position={[8.8, 3.7, 5.0]} intensity={30} color="#aecaff" distance={5.2} decay={2} />
          <pointLight position={[7.0, 3.2, 2.4]} intensity={14} color="#c9b8ff" distance={3.4} decay={2} />
        </>
      )}
    </>
  )
}
