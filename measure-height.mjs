// Measure the bind-pose world height of each rig's skinned mesh so we can scale Astra to
// match the porter. Height = (POSITION accessor Y extent) * (mesh node world scale Y).
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
async function height(file) {
  const doc = await io.read(file)
  const root = doc.getRoot()
  let best = 0
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      const min = pos.getMin([]); const max = pos.getMax([])
      best = Math.max(best, max[1] - min[1])
    }
  }
  // find the world scale of the node carrying this skinned mesh
  let scaleY = 1
  for (const node of root.listNodes()) {
    if (node.getMesh()) {
      let n = node, s = 1
      while (n) { s *= n.getScale()[1]; n = n.getParentNode?.() || null }
      scaleY = s; break
    }
  }
  return { extent: best, scaleY, worldHeight: best * scaleY }
}
const a = await height('public/models/astra-rigged/character.glb')
const p = await height('public/models/porter-v2/walking.glb')
console.log('astra:', a)
console.log('porter:', p)
console.log('astra scale to match porter height:', (p.worldHeight / a.worldHeight).toFixed(3))
