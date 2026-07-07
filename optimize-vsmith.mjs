// Optimize the rigged Vector Smith narrator: keep character.glb mesh (WebP texture),
// strip the 6 clip glbs to skeleton+animation (mesh comes from character.glb).
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'fs'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const DIR = 'public/models/vector-smith-rigged'
const kb = (p) => (fs.statSync(p).size / 1024) | 0

// 1) character.glb — keep mesh, compress texture
{
  const doc = await io.read(`${DIR}/character.glb`)
  await doc.transform(weld(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }), prune())
  await io.write(`${DIR}/character.glb`, doc)
  console.log('character.glb ->', kb(`${DIR}/character.glb`) + 'KB')
}

// 2) clip glbs — strip everything but skeleton + animation
const CLIPS = ['idle', 'talk-open', 'talk-passion', 'talk-right', 'agree', 'think']
for (const name of CLIPS) {
  const f = `${DIR}/${name}.glb`
  const before = kb(f)
  const doc = await io.read(f)
  const root = doc.getRoot()
  const chans = root.listAnimations().reduce((n, a) => n + a.listChannels().length, 0)
  root.listNodes().forEach((n) => { n.setMesh(null); n.setSkin(null) })
  root.listSkins().forEach((s) => s.dispose())
  root.listMeshes().forEach((m) => m.dispose())
  root.listMaterials().forEach((m) => m.dispose())
  root.listTextures().forEach((t) => t.dispose())
  await doc.transform(prune({ keepLeaves: true, keepAttributes: false }))
  await io.write(f, doc)
  console.log(`${name}.glb: ${before}KB -> ${kb(f)}KB  channels=${chans}`)
}
const total = ['character', ...CLIPS].reduce((s, n) => s + kb(`${DIR}/${n}.glb`), 0)
console.log('TOTAL vector-smith-rigged:', total + 'KB')
