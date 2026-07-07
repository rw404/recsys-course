import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'fs'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const kb = p => (fs.statSync(p).size/1024|0)
for (const f of ['crystal-shrine-textured','transformer-tower','two-tower-gate']) {
  const path = `public/models/props/${f}.glb`
  const before = kb(path)
  const doc = await io.read(path)
  await doc.transform(weld(), dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024,1024] }), prune())
  await io.write(path, doc)
  console.log(`${f}: ${before}KB -> ${kb(path)}KB`)
}
