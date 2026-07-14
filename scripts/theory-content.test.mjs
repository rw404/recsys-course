import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTheoryContent } from './build-theory-content.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const { manifest, warnings } = buildTheoryContent({ log: false })
const worlds = Object.values(manifest.worlds)

assert.equal(manifest.version, 1)
assert.equal(worlds.length, 6)
assert.equal(worlds.reduce((sum, world) => sum + world.concepts.length, 0), 55)
assert.deepEqual(warnings, [])

for (const world of worlds) {
  assert.ok(world.lessonNodeId)
  assert.ok(world.concepts.length > 0)
  world.concepts.forEach((concept, position) => {
    assert.equal(concept.index, position, `${world.folder} concept indices must be contiguous`)
    assert.equal(concept.notesFormat, 'tex')
    assert.ok(concept.notes)
    const notePath = path.join(REPO_ROOT, 'public', decodeURIComponent(concept.notes.slice(1)))
    assert.ok(fs.existsSync(notePath), `missing generated note: ${notePath}`)
    for (const figure of concept.figures) {
      const figurePath = path.join(REPO_ROOT, 'public', decodeURIComponent(figure.src.slice(1)))
      assert.ok(fs.existsSync(figurePath), `missing generated figure: ${figurePath}`)
      if (figure.source) {
        const sourcePath = path.join(REPO_ROOT, 'public', decodeURIComponent(figure.source.slice(1)))
        assert.ok(fs.existsSync(sourcePath), `missing generated TikZ source: ${sourcePath}`)
        assert.ok(figure.sourceRepositoryPath)
      }
    }
  })
}

const foundations = manifest.worlds['foundations-camp']
assert.ok(foundations)
assert.equal(foundations.screenPlacement, 'center')
assert.ok(foundations.concepts.every((concept) => concept.video?.mp4 && concept.video?.webm))
assert.ok(foundations.concepts[0].figures.some((figure) => figure.id === 'decision-loop'))

console.log('Theory content manifest tests passed')
