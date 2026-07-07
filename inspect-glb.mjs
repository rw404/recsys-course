import fs from 'fs'

function readGlbJson(path) {
  const buf = fs.readFileSync(path)
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not glb')
  const version = buf.readUInt32LE(4)
  let offset = 12
  let json = null
  let binLen = 0
  while (offset < buf.length) {
    const chunkLen = buf.readUInt32LE(offset)
    const chunkType = buf.readUInt32LE(offset + 4)
    const dataStart = offset + 8
    if (chunkType === 0x4e4f534a /* JSON */) {
      json = JSON.parse(buf.toString('utf8', dataStart, dataStart + chunkLen))
    } else if (chunkType === 0x004e4942 /* BIN */) {
      binLen = chunkLen
    }
    offset = dataStart + chunkLen
  }
  return { version, json, binLen }
}

for (const path of process.argv.slice(2)) {
  const { version, json, binLen } = readGlbJson(path)
  const anims = (json.animations || []).map((a) => ({
    name: a.name,
    channels: a.channels.length,
  }))
  const skins = json.skins || []
  const bones = new Set()
  skins.forEach((s) => (s.joints || []).forEach((j) => bones.add(json.nodes[j]?.name)))
  const meshNodes = (json.nodes || []).filter((n) => n.mesh !== undefined)
  const materials = (json.materials || []).map((m) => m.name)
  const images = (json.images || []).map((i) => i.mimeType || i.uri || 'embedded')
  // rough scene bounds via node scales / first node
  const roots = json.scenes?.[0]?.nodes || []
  console.log('════', path.split('/').pop(), `(glTF v${version}, bin ${(binLen / 1024) | 0}KB)`)
  console.log('  animations:', JSON.stringify(anims))
  console.log('  skins:', skins.length, ' joints:', skins[0]?.joints?.length ?? 0)
  console.log('  meshNodes:', meshNodes.length, ' materials:', JSON.stringify(materials))
  console.log('  images:', json.images?.length || 0, JSON.stringify(images))
  console.log('  rootNodes:', roots.map((i) => json.nodes[i]?.name))
  const boneList = [...bones].filter(Boolean)
  console.log('  boneCount:', boneList.length, ' sample:', boneList.slice(0, 8).join(', '))
  // detect scene scale from root node transforms
  roots.forEach((i) => {
    const n = json.nodes[i]
    if (n && (n.scale || n.translation)) {
      console.log('   root', n.name, 'scale', n.scale, 'pos', n.translation)
    }
  })
}
