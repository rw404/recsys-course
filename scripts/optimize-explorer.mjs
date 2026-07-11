#!/usr/bin/env node
// Reduce Meshy output to one textured base model plus lightweight animation-only GLBs.
import fs from 'node:fs'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, textureCompress, weld } from '@gltf-transform/functions'

const SOURCE = 'public/models/explorer-v4'
const OUTPUT = 'public/models/explorer'
const BASE_TEXTURE_SIZE = 1024
const ANIMATIONS = ['walking', 'running', 'idle', 'wave', 'chat']

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
fs.mkdirSync(OUTPUT, { recursive: true })

function sizeKb(filename) {
  return Math.round(fs.statSync(filename).size / 1024)
}

async function optimizeBase() {
  const source = path.join(SOURCE, 'character.glb')
  const target = path.join(OUTPUT, 'character.glb')
  const document = await io.read(source)

  await document.transform(
    dedup(),
    weld(),
    prune(),
    textureCompress({
      targetFormat: 'webp',
      resize: [BASE_TEXTURE_SIZE, BASE_TEXTURE_SIZE],
      quality: 82,
    }),
  )

  await io.write(target, document)
  console.log(`base ${sizeKb(source)} KB -> ${sizeKb(target)} KB`)
}

async function extractAnimation(name) {
  const source = path.join(SOURCE, `${name}.glb`)
  const target = path.join(OUTPUT, `${name}.glb`)
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

  await document.transform(prune({ keepLeaves: true }))
  await io.write(target, document)
  console.log(`${name} ${sizeKb(source)} KB -> ${sizeKb(target)} KB`)
}

await optimizeBase()
for (const name of ANIMATIONS) await extractAnimation(name)
