import * as THREE from 'three'

/**
 * ATLAS_SPAWN — where the player stands when they open the Course Atlas (the single combined
 * overview scene of all six regions). Placed on the Foundations-Camp zone, facing into the map.
 * (Defined before spawnOverride so the ?atlas=1 deep-link can start the player here.)
 */
export const ATLAS_SPAWN: [number, number, number] = [-14, 0.9, -3]

/**
 * Runtime, high-frequency world state that must NOT trigger React re-renders.
 * Read/written inside useFrame only. Discrete/progress state lives in the zustand store.
 */
// Optional spawn override via ?px=&pz=(&py=) — used by showcase captures to place the
// character on the path. No effect in normal play. ?atlas=1 starts on the Atlas island's Camp zone.
function spawnOverride(): THREE.Vector3 {
  const base = new THREE.Vector3(-6, 0.9, 8)
  if (typeof window === 'undefined') return base
  const q = new URLSearchParams(window.location.search)
  if (q.has('px') || q.has('pz')) {
    base.set(Number(q.get('px') ?? base.x), Number(q.get('py') ?? base.y), Number(q.get('pz') ?? base.z))
  } else if (q.has('atlas')) {
    base.set(ATLAS_SPAWN[0], ATLAS_SPAWN[1], ATLAS_SPAWN[2])
  }
  return base
}

export const runtime = {
  playerPosition: spawnOverride(),
  playerFacing: 0, // yaw in radians
  playerSpeed: 0, // planar speed (m/s) — drives the character's walk/run/idle blend
  cameraSkip: false, // set true to snap camera (skip cinematic)
  // RPG-style click-to-move destination (world XZ). Set by <ClickGround/> on a ground click,
  // consumed + cleared by the Player. WASD/joystick input cancels it.
  moveTarget: null as THREE.Vector3 | null,
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
// Vector Smith stands a bit RIGHT of and IN FRONT of the ANN-Lab pavilion, on the flat path — he
// used to stand on the pavilion's raised base and clipped one boot into it (was vsx -8, vsz 1).
const VSMITH_POS_V = new THREE.Vector3(vn('vsx', -6.5), 0, vn('vsz', 1.8))
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

/**
 * CITY_STAGE — the World-03 (Sequential City) lecture set. Guide Astra returns as the narrator; she
 * stands at the transformer-lesson mark in front of the Transformer Tower and delivers the same
 * composed over-the-shoulder two-shot. `c…`-prefixed URL overrides tune it headlessly.
 */
const cn = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)
const CCAM_V = new THREE.Vector3(cn('ccx', -2.6), cn('ccy', 2.6), cn('ccz', 6.0))
const CASTRA_POS_V = new THREE.Vector3(cn('csx', -6.4), 0, cn('csz', 2.4))
const CFACE_CAM = Math.atan2(CCAM_V.x - CASTRA_POS_V.x, CCAM_V.z - CASTRA_POS_V.z)

export const CITY_STAGE = {
  cam: CCAM_V,
  look: new THREE.Vector3(cn('clx', -12.5), cn('cly', 0.5), cn('clz', 1.8)),
  fov: cn('cfov', 40),
  astra: {
    pos: CASTRA_POS_V,
    yaw: cn('csy', CFACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: cn('cssc', 1.07),
    feetY: cn('csfy', 0.35), // plant on the visible city surface (same lift as the valley)
  },
  player: {
    pos: new THREE.Vector3(cn('cpx', -6.4), 0, cn('cpz', 5.4)),
    yaw: cn('cpy', 1.1),
  },
}

/**
 * TOWER_STAGE — the World-04 (Policy Tower) lecture set. Guide Astra returns as the narrator; she
 * stands at the policy-lesson mark in front of the Policy Tower and delivers the same composed
 * over-the-shoulder two-shot. `t…`-prefixed URL overrides tune it headlessly.
 */
const tn = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)
const TCAM_V = new THREE.Vector3(tn('tcx', -2.6), tn('tcy', 2.6), tn('tcz', 6.0))
const TASTRA_POS_V = new THREE.Vector3(tn('tsx', -6.4), 0, tn('tsz', 2.4))
const TFACE_CAM = Math.atan2(TCAM_V.x - TASTRA_POS_V.x, TCAM_V.z - TASTRA_POS_V.z)

export const TOWER_STAGE = {
  cam: TCAM_V,
  look: new THREE.Vector3(tn('tlx', -12.5), tn('tly', 0.5), tn('tlz', 1.8)),
  fov: tn('tfov', 40),
  astra: {
    pos: TASTRA_POS_V,
    yaw: tn('tsy', TFACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: tn('tssc', 1.07),
    feetY: tn('tsfy', 0.35), // plant on the visible tower-plaza surface (same lift as the city)
  },
  player: {
    pos: new THREE.Vector3(tn('tpx', -6.4), 0, tn('tpz', 5.4)),
    yaw: tn('tpy', 1.1),
  },
}

/**
 * GARDEN_STAGE — the World-05 (Ecosystem Garden) lecture set. Guide Astra narrates the finale from
 * under the great blossom tree. Same composed over-the-shoulder two-shot; `g…`-prefixed URL
 * overrides tune it headlessly.
 */
const gn = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)
const GCAM_V = new THREE.Vector3(gn('gcx', -2.6), gn('gcy', 2.6), gn('gcz', 6.0))
const GASTRA_POS_V = new THREE.Vector3(gn('gsx', -6.4), 0, gn('gsz', 2.4))
const GFACE_CAM = Math.atan2(GCAM_V.x - GASTRA_POS_V.x, GCAM_V.z - GASTRA_POS_V.z)

export const GARDEN_STAGE = {
  cam: GCAM_V,
  look: new THREE.Vector3(gn('glx', -12.5), gn('gly', 0.5), gn('glz', 1.8)),
  fov: gn('gfov', 40),
  astra: {
    pos: GASTRA_POS_V,
    yaw: gn('gsy', GFACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: gn('gssc', 1.07),
    feetY: gn('gsfy', 0.35), // plant on the visible garden surface (same lift as the tower)
  },
  player: {
    pos: new THREE.Vector3(gn('gpx', -6.4), 0, gn('gpz', 5.4)),
    yaw: gn('gpy', 1.1),
  },
}

/**
 * ARENA_STAGE — the World-06 (Final Arena) capstone-recap set. Guide Astra delivers the closing recap
 * in front of the great arena. Same composed over-the-shoulder two-shot; `a…`-prefixed URL overrides.
 */
const an = (k: string, d: number) => (LQ.has(k) ? Number(LQ.get(k)) : d)
const ACAM_V = new THREE.Vector3(an('acx', -2.6), an('acy', 2.6), an('acz', 6.0))
const AASTRA_POS_V = new THREE.Vector3(an('asx', -6.4), 0, an('asz', 2.4))
const AFACE_CAM = Math.atan2(ACAM_V.x - AASTRA_POS_V.x, ACAM_V.z - AASTRA_POS_V.z)

export const ARENA_STAGE = {
  cam: ACAM_V,
  look: new THREE.Vector3(an('alx', -12.5), an('aly', 0.5), an('alz', 1.8)),
  fov: an('afov', 40),
  astra: {
    pos: AASTRA_POS_V,
    yaw: an('asy', AFACE_CAM), // faces the camera (auto-derived)
    targetHeight: 1.75,
    scale: an('assc', 1.07),
    feetY: an('asfy', 0.35), // plant on the visible arena-plaza surface (same lift as the garden)
  },
  player: {
    pos: new THREE.Vector3(an('apx', -6.4), 0, an('apz', 5.4)),
    yaw: an('apy', 1.1),
  },
}
