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

// Pulled back to the hero's right (lcx 8.3) and up (lcy 2.6). The aim is swung hard-LEFT
// (look.x -5) so Astra — anchored at world (3.9,0,2) — is pushed to the RIGHT ~4/5 of the
// frame (the composition the reference calls for), with the Metrics Plaza cards behind her.
// The hero then sits in the near LEFT foreground (back to camera) so he never overlaps her.
// The aim is also pitched DOWN (look.y 0.4, below Astra's mid) so she rides higher in frame
// and reads full-body instead of sinking off the bottom edge behind the HUD.
const CAM_V = new THREE.Vector3(ln('lcx', 8.3), ln('lcy', 2.6), ln('lcz', 5.7))
const ASTRA_POS_V = new THREE.Vector3(ln('lax', 3.9), 0, ln('laz', 2.0))
// Astra's native front is +Z; to face the camera she must yaw to atan2(dx, dz) of the
// camera-relative offset. Deriving it means she ALWAYS looks at the viewer when the lesson
// opens, regardless of how the framing is retuned. `lay` still overrides for manual tweaks.
const FACE_CAM = Math.atan2(CAM_V.x - ASTRA_POS_V.x, CAM_V.z - ASTRA_POS_V.z)

export const LESSON_STAGE = {
  cam: CAM_V,
  look: new THREE.Vector3(ln('llx', -5), ln('lly', 0.4), ln('llz', 1.0)),
  fov: ln('lfov', 40),
  astra: {
    // pushed to the RIGHT ~4/5 of frame (not centre) by the hard-left aim — she reads as the
    // focal narrator with the Metrics Plaza cards as her backdrop, well clear of both the DOM
    // theory panel (left ~40%) and the foreground hero
    pos: ASTRA_POS_V,
    yaw: ln('lay', FACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: ln('lasc', 1.07), // matches the porter's height (both rigs measured: astra 1.5, porter 1.6)
    // Plant the rig's feet on the VISIBLE ground. Her rig's feet sit at local y≈0, but the
    // walkable surface the camp reads as "the floor" stands above the physics collider top
    // (Terrain's play-surface mesh), so feetY=0 sank her ~to the shins. 0.18 lifts her boots
    // onto the plaza surface (verified in-lesson across talk poses; sweep showed 0=sunk,
    // 0.15-0.20=planted, 0.30+=floating). Override with ?lafy=.
    feetY: ln('lafy', 0.18),
  },
  player: {
    // near LEFT foreground, back to camera, turned 3/4 toward Astra — the over-the-shoulder
    // student (hood + blue pack), clearly visible yet with a clean gap to Astra (no overlap)
    pos: new THREE.Vector3(ln('lpx', 4.6), 0, ln('lpz', 4.9)),
    yaw: ln('lpy', 1.1), // back to camera, angled toward Astra (over-the-shoulder read)
  },
}

// Backwards-compatible alias (Astra's resting spot in the world).
export const NARRATOR = {
  pos: LESSON_STAGE.astra.pos,
  facing: LESSON_STAGE.astra.yaw,
}

/**
 * VALLEY_STAGE — the World-02 (Retrieval Valley) equivalent of LESSON_STAGE. Vector Smith, the
 * ANN engineer, is the rigged talking narrator here; he stands at the two-tower-lesson mark and
 * delivers the same composed over-the-shoulder two-shot (DOM theory panel left, narrator right
 * ~4/5, hero in the near-left foreground). Every value is URL-overridable with a `v…` prefix so
 * the framing can be re-tuned headlessly, exactly like the camp stage.
 */
const vn = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)
const VCAM_V = new THREE.Vector3(vn('vcx', -3.2), vn('vcy', 2.6), vn('vcz', 5.4))
const VSMITH_POS_V = new THREE.Vector3(vn('vsx', -8), 0, vn('vsz', 1.0))
const VFACE_CAM = Math.atan2(VCAM_V.x - VSMITH_POS_V.x, VCAM_V.z - VSMITH_POS_V.z)

export const VALLEY_STAGE = {
  cam: VCAM_V,
  look: new THREE.Vector3(vn('vlx', -13.5), vn('vly', 0.5), vn('vlz', 1.4)),
  fov: vn('vfov', 40),
  smith: {
    pos: VSMITH_POS_V,
    yaw: vn('vsy', VFACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: vn('vssc', 1.0),
    // plant boots on the VISIBLE valley surface. Vector Smith's rig has feet lower in local
    // space than Astra's, so he needs more lift than her 0.18 (empirical sweep: 0.18=shins sunk,
    // 0.35=boots planted, 0.5=floating). See [[headless-webgl-screenshots]] for the capture method.
    feetY: vn('vsfy', 0.35),
  },
  player: {
    pos: new THREE.Vector3(vn('vpx', -7.3), 0, vn('vpz', 4.9)),
    yaw: vn('vpy', 1.1),
  },
}
