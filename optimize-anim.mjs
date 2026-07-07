// Strip the redundant skinned mesh + texture from CLIP-ONLY glbs, keeping the skeleton (bones)
// and the animation. The rendered mesh comes from the base character glb; these files are only
// read for their AnimationClip, so the 5.9MB texture + mesh are dead weight.
import { NodeIO } from '@gltf-transform/core'
import { prune } from '@gltf-transform/functions'
import fs from 'fs'

const FILES = [
  // second batch — richer gesture palette
  'public/models/astra-rigged/talk-lefthip.glb',
  'public/models/astra-rigged/talk-leftraise.glb',
  'public/models/astra-rigged/hand-on-hip.glb',
  'public/models/astra-rigged/wave.glb',
  'public/models/astra-rigged/think.glb',
  'public/models/astra-rigged/cheer.glb',
]

const io = new NodeIO()
for (const f of FILES) {
  const before = (fs.statSync(f).size / 1024 | 0)
  const doc = await io.read(f)
  const root = doc.getRoot()
  const chansBefore = root.listAnimations().reduce((n, a) => n + a.listChannels().length, 0)
  // detach meshes from nodes (bones stay — they are animation targets) and drop skins
  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null)
  for (const skin of root.listSkins()) skin.dispose()
  for (const mesh of root.listMeshes()) mesh.dispose()
  // prune orphaned materials/textures/accessors but KEEP nodes (animation targets)
  await doc.transform(prune({ keepLeaves: true, keepAttributes: false }))
  await io.write(f, doc)
  const after = (fs.statSync(f).size / 1024 | 0)
  const chansAfter = doc.getRoot().listAnimations().reduce((n, a) => n + a.listChannels().length, 0)
  console.log(`${f}: ${before}KB -> ${after}KB  channels ${chansBefore}->${chansAfter}`)
}
