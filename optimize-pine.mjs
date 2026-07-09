import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'fs'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const kb = p => (fs.statSync(p).size/1024|0)
const src = 'public/models/props/pine-conifer-raw.glb'
const out = 'public/models/props/pine-conifer.glb'
const before = kb(src)
const doc = await io.read(src)
await doc.transform(weld(), dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024,1024] }), prune())
await io.write(out, doc)
console.log(`pine: ${before}KB -> ${kb(out)}KB`)
