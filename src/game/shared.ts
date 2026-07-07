import * as THREE from 'three'

/**
 * Runtime, high-frequency world state that must NOT trigger React re-renders.
 * Read/written inside useFrame only. Discrete/progress state lives in the zustand store.
 */
// Optional spawn override via ?px=&pz=(&py=) — used by showcase captures to place the
// character on the path. No effect in normal play.
function spawnOverride(): THREE.Vector3 {
  const base = new THREE.Vector3(-6, 0.9, 8)
  if (typeof window === 'undefined') return base
  const q = new URLSearchParams(window.location.search)
  if (q.has('px') || q.has('pz')) {
    base.set(Number(q.get('px') ?? base.x), Number(q.get('py') ?? base.y), Number(q.get('pz') ?? base.z))
  }
  return base
}

export const runtime = {
  playerPosition: spawnOverride(),
  playerFacing: 0, // yaw in radians
  playerSpeed: 0, // planar speed (m/s) — drives the character's walk/run/idle blend
  cameraSkip: false, // set true to snap camera (skip cinematic)
}

export const GROUND_Y = 0

/**
 * The lesson "stage": a deliberately-composed cinematic OVER-THE-SHOULDER two-shot.
 *  - The holographic theory panel (DOM) owns the LEFT ~40% of the screen.
 *  - The hero (porter) sits in the near RIGHT foreground, back to the camera, big blue pack
 *    reading clearly — the classic over-the-shoulder framing the player looks past.
 *  - Guide Astra stands in the mid-ground centre, FACING the camera, gesturing per page, with
 *    the Metrics Plaza signboard (banner + 4 cards) as her backdrop.
 * The camera is pulled back/up and to the hero's right so BOTH read: the earlier tight framing
 * lost the hero behind a foreground terrain mound. Every value is URL-overridable
 * (lcx/lcy/lcz, llx/lly/llz, lfov, lax/laz/lay, lpx/lpz/lpy) so the framing can be re-tuned with
 * headless captures; the defaults below are the baked result of that tuning (variant "F4").
 */
const LQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const ln = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)

// Pulled back to the hero's right (lcx 8.3) and up (lcy 2.6) so the shot looks over his right
// shoulder toward Astra — the hero stays clearly in frame instead of vanishing behind the
// foreground mound the old tight camera framed him against.
const CAM_V = new THREE.Vector3(ln('lcx', 8.3), ln('lcy', 2.6), ln('lcz', 5.7))
const ASTRA_POS_V = new THREE.Vector3(ln('lax', 3.9), 0, ln('laz', 2.0))
// Astra's native front is +Z; to face the camera she must yaw to atan2(dx, dz) of the
// camera-relative offset. Deriving it means she ALWAYS looks at the viewer when the lesson
// opens, regardless of how the framing is retuned. `lay` still overrides for manual tweaks.
const FACE_CAM = Math.atan2(CAM_V.x - ASTRA_POS_V.x, CAM_V.z - ASTRA_POS_V.z)

export const LESSON_STAGE = {
  cam: CAM_V,
  look: new THREE.Vector3(ln('llx', 3.7), ln('lly', 1.35), ln('llz', 1.9)),
  fov: ln('lfov', 45),
  astra: {
    // mid-ground centre so she reads as the focal narrator and never sits behind the DOM theory
    // panel (left ~40%)
    pos: ASTRA_POS_V,
    yaw: ln('lay', FACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: ln('lasc', 1.07), // matches the porter's height (both rigs measured: astra 1.5, porter 1.6)
    feetY: ln('lafy', 0), // plant the rig's feet on the ground
  },
  player: {
    // near-right foreground, back to camera, turned 3/4 toward Astra — the over-the-shoulder
    // student, clearly visible (blue pack + hood) without occluding Astra
    pos: new THREE.Vector3(ln('lpx', 6.2), 0, ln('lpz', 3.5)),
    yaw: ln('lpy', 0.6), // back to camera, angled toward Astra (over-the-shoulder read)
  },
}

// Backwards-compatible alias (Astra's resting spot in the world).
export const NARRATOR = {
  pos: LESSON_STAGE.astra.pos,
  facing: LESSON_STAGE.astra.yaw,
}
