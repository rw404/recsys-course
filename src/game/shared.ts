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
 * The lesson "stage": a deliberately-composed cinematic set for the theory lecture.
 *  - The holographic theory panel (DOM) owns the LEFT of the screen.
 *  - Guide Astra stands by the station on the RIGHT, FACING the camera, and gestures per page.
 *  - The player stands in the near-right foreground with their BACK to the camera, watching.
 * Every value is URL-overridable (lcx/lcy/lcz, llx/lly/llz, lfov, lax/laz/lay, lpx/lpz/lpy)
 * so the framing can be tuned with headless captures; the defaults are the baked result.
 */
const LQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const ln = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)

// Raised + tilted down (lcy 2.1) so the porter in the near foreground reads as an
// over-the-shoulder student (his feet drop out of frame) instead of a body that looms over
// Astra. Astra then becomes the clear focal narrator.
const CAM_V = new THREE.Vector3(ln('lcx', 7.0), ln('lcy', 2.1), ln('lcz', 5.0))
const ASTRA_POS_V = new THREE.Vector3(ln('lax', 3.9), 0, ln('laz', 2.0))
// Astra's native front is +Z; to face the camera she must yaw to atan2(dx, dz) of the
// camera-relative offset. Deriving it means she ALWAYS looks at the viewer when the lesson
// opens, regardless of how the framing is retuned. `lay` still overrides for manual tweaks.
const FACE_CAM = Math.atan2(CAM_V.x - ASTRA_POS_V.x, CAM_V.z - ASTRA_POS_V.z)

export const LESSON_STAGE = {
  cam: CAM_V,
  look: new THREE.Vector3(ln('llx', 3.9), ln('lly', 1.25), ln('llz', 2.0)),
  fov: ln('lfov', 44),
  astra: {
    // right-of-centre (right third) so she reads as the focal narrator and never sits behind
    // the DOM theory panel (left ~40%)
    pos: ASTRA_POS_V,
    yaw: ln('lay', FACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: ln('lasc', 1.07), // matches the porter's height (both rigs measured: astra 1.5, porter 1.6)
    feetY: ln('lafy', 0), // plant the rig's feet on the ground
  },
  player: {
    // near-right foreground, back to camera — the student watching, clearly visible but not
    // occluding Astra
    pos: new THREE.Vector3(ln('lpx', 6.6), 0, ln('lpz', 4.0)),
    yaw: ln('lpy', 0.15), // back to camera, turned slightly toward Astra (the student watching)
  },
}

// Backwards-compatible alias (Astra's resting spot in the world).
export const NARRATOR = {
  pos: LESSON_STAGE.astra.pos,
  facing: LESSON_STAGE.astra.yaw,
}
