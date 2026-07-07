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

export const LESSON_STAGE = {
  cam: new THREE.Vector3(ln('lcx', 8.4), ln('lcy', 1.5), ln('lcz', 5.9)),
  look: new THREE.Vector3(ln('llx', 2.8), ln('lly', 1.35), ln('llz', 1.2)),
  fov: ln('lfov', 47),
  astra: {
    // firmly right-of-centre (right third) so she reads as the focal narrator and never sits
    // behind the DOM theory panel (left ~40%)
    pos: new THREE.Vector3(ln('lax', 4.4), 0, ln('laz', 0.6)),
    yaw: ln('lay', 1.45), // rigged mesh's native front is +Z; ~1.45rad turns her to face the camera
    targetHeight: 1.75,
    scale: ln('lasc', 1.9), // rigged mesh is authored small; 1.9 reads as the focal narrator
    feetY: ln('lafy', 0), // plant the rig's feet on the ground (tuned via capture)
  },
  player: {
    // far-right foreground corner, back to camera — the student watching, clearly visible but
    // not occluding Astra
    pos: new THREE.Vector3(ln('lpx', 7.0), 0, ln('lpz', 2.2)),
    yaw: ln('lpy', 0), // back to camera (the student watching the lecture)
  },
}

// Backwards-compatible alias (Astra's resting spot in the world).
export const NARRATOR = {
  pos: LESSON_STAGE.astra.pos,
  facing: LESSON_STAGE.astra.yaw,
}
