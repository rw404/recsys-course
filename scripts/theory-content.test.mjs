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

const journeyContracts = {
  'foundations-camp': { minutes: 45, experiment: 'ranking-sandbox', template: 'fast', checkpoint: 'quiz-gate' },
  'retrieval-valley': { minutes: 45, experiment: 'retrieval-sandbox', template: 'personalized', checkpoint: 'negatives-quiz' },
  'sequential-city': { minutes: 45, experiment: 'attention-lab', template: 'deep', checkpoint: 'attention-quiz' },
  'policy-tower': { minutes: 45, experiment: 'bandit-lab', template: 'adaptive', checkpoint: 'policy-quiz' },
  'ecosystem-garden': { minutes: 45, experiment: 'diversity-lab', template: 'hybrid', checkpoint: 'ecosystem-quiz' },
  'final-arena': { minutes: 60, experiment: 'capstone-arena', template: 'deep', checkpoint: 'champion' },
}

for (const [worldId, expected] of Object.entries(journeyContracts)) {
  const world = manifest.worlds[worldId]
  assert.ok(world, `missing world contract: ${worldId}`)
  assert.equal(world.screenPlacement, 'center')
  assert.equal(world.journey.estimatedMinutes, expected.minutes)
  assert.equal(world.journey.outcomes.length, 3)
  assert.deepEqual(
    world.journey.activities.map((activity) => activity.kind),
    ['theory', 'experiment', 'foundry', 'checkpoint'],
  )
  assert.equal(world.journey.activities[0].nodeId, world.lessonNodeId)
  assert.equal(world.journey.activities[1].nodeId, expected.experiment)
  assert.equal(world.journey.activities[2].templateId, expected.template)
  assert.equal(world.journey.activities[3].nodeId, expected.checkpoint)
  assert.ok(world.journey.activities.every((activity) => activity.title && activity.summary))
  const activityIds = world.journey.activities.map((activity) => activity.id)
  assert.ok(activityIds.every(Boolean))
  assert.equal(new Set(activityIds).size, activityIds.length)
}


const foundations = manifest.worlds['foundations-camp']
assert.ok(foundations)
assert.equal(foundations.screenPlacement, 'center')
assert.equal(foundations.journey.estimatedMinutes, 45)
assert.equal(foundations.journey.outcomes.length, 3)
assert.deepEqual(
  foundations.journey.activities.map((activity) => activity.kind),
  ['theory', 'experiment', 'foundry', 'checkpoint'],
)
assert.equal(foundations.journey.activities[2].templateId, 'fast')
assert.ok(foundations.concepts.every((concept) => concept.video?.mp4 && concept.video?.webm))
assert.ok(foundations.concepts[0].figures.some((figure) => figure.id === 'decision-loop'))

console.log('Theory content manifest tests passed')
