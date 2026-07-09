// Measure Astra's rig foot offset so we can plant her feet on the floor.
// The AstraGLB group applies: worldY = feetY + scale * localY  (scale = LESSON_STAGE.astra.scale).
// We want the lowest point (feet) at worldY = 0, so: feetY = -scale * bbox.min.y
// (globals set BEFORE importing three-stdlib, which touches `self` at module-eval time)
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

const SCALE = 1.07 // LESSON_STAGE.astra.scale
const path = 'public/models/astra-rigged/character.glb'
const buf = readFileSync(path)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

const loader = new GLTFLoader()
loader.parse(ab, '', (gltf) => {
  const scene = gltf.scene
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3(); box.getSize(size)
  console.log('rig bind-pose bbox min.y=%s max.y=%s  height(local)=%s', box.min.y.toFixed(4), box.max.y.toFixed(4), size.y.toFixed(4))
  console.log('scaled height (x%s) = %s', SCALE, (size.y * SCALE).toFixed(4))
  const feetY = -SCALE * box.min.y
  console.log('=> to plant feet at y=0, feetY (lafy) = %s', feetY.toFixed(4))
  scene.traverse((o) => {
    if (o.isSkinnedMesh || o.isMesh) {
      const b = new THREE.Box3().setFromObject(o)
      console.log('   mesh "%s" min.y=%s max.y=%s', o.name || '(unnamed)', b.min.y.toFixed(4), b.max.y.toFixed(4))
    }
  })
}, (err) => { console.error('parse error:', err?.message || err) })
