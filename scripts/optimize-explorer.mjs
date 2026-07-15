#!/usr/bin/env node
// Reduce Meshy output to one textured base model plus lightweight animation-only GLBs.
import fs from 'node:fs'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const OUTPUT = 'public/models/explorer'
const SOURCE = fs.existsSync('public/models/explorer-v4') ? 'public/models/explorer-v4' : OUTPUT
const BASE_TEXTURE_SIZE = 1024
const ANIMATIONS = ['walking', 'running', 'idle', 'wave', 'chat']

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  })
fs.mkdirSync(OUTPUT, { recursive: true })

function sizeKb(filename) {
  return Math.round(fs.statSync(filename).size / 1024)
}

async function optimizeBase() {
  const source = path.join(SOURCE, 'character.glb')
  const target = path.join(OUTPUT, 'character.glb')
  const before = sizeKb(source)
  const document = await io.read(source)

  const transforms = [dedup(), weld(), prune()]
  if (SOURCE !== OUTPUT) {
    transforms.push(
      textureCompress({
        targetFormat: 'webp',
        resize: [BASE_TEXTURE_SIZE, BASE_TEXTURE_SIZE],
        quality: 82,
      }),
    )
  }
  transforms.push(meshopt({ encoder: MeshoptEncoder, level: 'high' }))

  await document.transform(...transforms)
  await io.write(target, document)
  console.log(`base ${before} KB -> ${sizeKb(target)} KB`)
}

async function extractAnimation(name) {
  const source = path.join(SOURCE, `${name}.glb`)
  const target = path.join(OUTPUT, `${name}.glb`)
  const before = sizeKb(source)
  const document = await io.read(source)
  const root = document.getRoot()

  for (const node of root.listNodes()) {
    if (node.getMesh()) node.setMesh(null)
    if (node.getCamera()) node.setCamera(null)
    if (node.getSkin()) node.setSkin(null)
  }

  for (const mesh of [...root.listMeshes()]) mesh.dispose()
  for (const material of [...root.listMaterials()]) material.dispose()
  for (const texture of [...root.listTextures()]) texture.dispose()
  for (const skin of [...root.listSkins()]) skin.dispose()

  await document.transform(
    prune({ keepLeaves: true }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  )
  await io.write(target, document)
  console.log(`${name} ${before} KB -> ${sizeKb(target)} KB`)
}

await optimizeBase()
for (const name of ANIMATIONS) await extractAnimation(name)
