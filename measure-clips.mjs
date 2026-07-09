// Inspect Astra's talk/idle clip tracks: which have position/scale tracks that could sink her,
// and — after stripping Hips.position + .scale as AstraGLB does — how low do her feet go when posed?
globalThis.self = globalThis
globalThis.window = globalThis
if (typeof globalThis.URL.createObjectURL !== 'function') globalThis.URL.createObjectURL = () => ''
if (typeof globalThis.fetch !== 'function') globalThis.fetch = () => Promise.reject(new Error('no fetch'))
class FakeImage { set src(_) {} }
if (typeof globalThis.Image !== 'function') globalThis.Image = FakeImage
if (typeof globalThis.createImageBitmap !== 'function') globalThis.createImageBitmap = () => Promise.reject(new Error('no bitmap'))

const THREE = await import('three')
const { GLTFLoader } = await import('three-stdlib')
const { readFileSync } = await import('node:fs')

const DIR = 'public/models/astra-rigged'
const CHAR = `${DIR}/character.glb`
const CLIPS = ['idle', 'talk-open', 'talk-passion', 'talk-right', 'talk-lefthip', 'talk-leftraise']
const SCALE = 1.07

function loadGLB(path) {
  const buf = readFileSync(path)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej))
}

const charGltf = await loadGLB(CHAR)
const scene = charGltf.scene
scene.updateMatrixWorld(true)

for (const name of CLIPS) {
  let g
  try { g = await loadGLB(`${DIR}/${name}.glb`) } catch (e) { console.log(`${name}: LOAD FAIL ${e?.message||e}`); continue }
  const clip = g.animations?.[0]
  if (!clip) { console.log(`${name}: no clip`); continue }
  // list position/scale tracks (the ones that could translate/scale the whole rig)
  const posScale = clip.tracks.filter(t => t.name.endsWith('.position') || t.name.endsWith('.scale')).map(t => t.name)
  console.log(`\n== ${name}  dur=${clip.duration.toFixed(2)}  tracks=${clip.tracks.length}`)
  console.log('   position/scale tracks:', posScale.length ? posScale.join(', ') : '(none)')

  // Reproduce AstraGLB's strip, then pose the skeleton at several times and measure min.y
  const cl = clip.clone()
  cl.tracks = cl.tracks.filter(t => !t.name.endsWith('.scale') && t.name !== 'Hips.position')
  const mixer = new THREE.AnimationMixer(scene)
  const action = mixer.clipAction(cl); action.play()
  let lowest = Infinity, lowestT = 0
  const N = 12
  for (let i = 0; i <= N; i++) {
    const t = (clip.duration * i) / N
    mixer.setTime(t)
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    if (box.min.y < lowest) { lowest = box.min.y; lowestT = t }
  }
  mixer.stopAllAction()
  console.log(`   lowest posed min.y = ${lowest.toFixed(4)} at t=${lowestT.toFixed(2)}  => world sink = ${(SCALE*lowest).toFixed(4)} (feetY needed = ${(-SCALE*lowest).toFixed(4)})`)
}
