// Shrink the rigged porter: the same 4.9MB PNG is embedded in all 3 files.
// Only walking.glb's MESH is rendered (PorterGLB clones it); running/character are used
// only for their animation clips. So: compress walking's texture to WebP, and strip
// mesh/material/texture/skin from running+character (keep skeleton + animation).
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'fs'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const DIR = 'public/models/porter-v2'

function kb(p) { return (fs.statSync(p).size / 1024) | 0 }

// 1) walking.glb — keep everything, compress texture
{
  const doc = await io.read(`${DIR}/walking.glb`)
  await doc.transform(
    weld(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    prune()
  )
  await io.write(`${DIR}/walking.glb`, doc)
  console.log('walking.glb ->', kb(`${DIR}/walking.glb`) + 'KB')
}

// 2) running.glb + character.glb — strip everything but skeleton + animation
for (const name of ['running', 'character']) {
  const doc = await io.read(`${DIR}/${name}.glb`)
  const root = doc.getRoot()
  root.listMeshes().forEach((m) => m.dispose())
  root.listSkins().forEach((s) => s.dispose())
  root.listMaterials().forEach((m) => m.dispose())
  root.listTextures().forEach((t) => t.dispose())
  // detach mesh/skin refs left on nodes, but KEEP bone nodes (animation targets them)
  root.listNodes().forEach((n) => { n.setMesh(null); n.setSkin(null) })
  await doc.transform(dedup(), prune()) // prune drops the now-orphaned mesh vertex data
  await io.write(`${DIR}/${name}.glb`, doc)
  console.log(`${name}.glb ->`, kb(`${DIR}/${name}.glb`) + 'KB',
    '| anims:', root.listAnimations().map((a) => a.getName()).join(','))
}

const total = ['character', 'walking', 'running'].reduce((s, n) => s + kb(`${DIR}/${n}.glb`), 0)
console.log('TOTAL porter-v2:', total + 'KB')
