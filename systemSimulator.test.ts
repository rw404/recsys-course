import { strict as assert } from 'node:assert'
import { SANDBOX_RATINGS } from './src/data/movielensSandbox'
import { SYSTEM_TEMPLATES, type SystemTemplate, type SystemTemplateId } from './src/data/systemTemplates'
import { simulatePipeline, type PipelineNodeSpec } from './src/logic/systemSimulator'

function specs(template: SystemTemplate): PipelineNodeSpec[] {
  return template.nodes.map((node) => ({
    id: node.id,
    moduleType: node.moduleType,
    config: node.config,
  }))
}

function edges(template: SystemTemplate) {
  return template.edges.map((edge) => ({ source: edge.source, target: edge.target }))
}

function run(templateId: Exclude<SystemTemplateId, 'blank'>, viewerId = 'u104') {
  const template = SYSTEM_TEMPLATES[templateId]
  return simulatePipeline(viewerId, specs(template), edges(template))
}

console.log('foundry simulator:')

for (const templateId of ['hybrid', 'personalized', 'fast'] as const) {
  const result = run(templateId)
  assert.equal(result.error, null)
  assert.equal(result.recommendations.length, 4)
  assert.ok(result.visitedNodeIds.length >= 6)
  console.log(`  ✓ ${templateId} template produces a four-film slate`)
}

for (const viewerId of ['u104', 'u219', 'u337', 'u512']) {
  const result = run('hybrid', viewerId)
  const seen = new Set(SANDBOX_RATINGS.filter((rating) => rating.viewerId === viewerId).map((rating) => rating.movieId))
  assert.ok(result.recommendations.every((candidate) => !seen.has(candidate.movieId)))
  console.log(`  ✓ seen-film filter holds for ${viewerId}`)
}

const maya = run('hybrid', 'u104')
const leila = run('hybrid', 'u337')
assert.notDeepEqual(
  maya.recommendations.map((candidate) => candidate.movieId),
  leila.recommendations.map((candidate) => candidate.movieId),
)
assert.ok(maya.recommendations.some((candidate) => candidate.movieId === 'm09'))
console.log('  ✓ viewer profile changes the recommendation slate')

const fast = run('fast')
assert.ok(fast.metrics.latencyMs < maya.metrics.latencyMs)
console.log('  ✓ fast baseline has a shorter critical path')

for (const value of [maya.metrics.quality, maya.metrics.diversity, maya.metrics.coverage, maya.metrics.novelty]) {
  assert.ok(value >= 0 && value <= 1)
}
assert.ok(maya.metrics.diversity > 0.4)
console.log('  ✓ metrics stay normalized and hybrid diversity is meaningful')

const explained = maya.recommendations[0]
assert.equal(explained.rankBreakdown?.length, 3)
assert.ok(explained.rankBreakdown?.every((part) => part.value >= 0 && part.value <= 1))
assert.ok(Math.abs((explained.rankBreakdown ?? []).reduce((sum, part) => sum + part.weight, 0) - 1) < 0.0001)
assert.ok(Object.keys(explained.sourceScores).length >= 2)
assert.ok(explained.diversityTrace)
assert.ok((explained.diversityTrace?.maxSimilarity ?? -1) >= 0)
console.log('  ✓ each hybrid result carries rank and diversity explanations')

const topSixTemplate = SYSTEM_TEMPLATES.hybrid
const topSixNodes = specs(topSixTemplate).map((node) => node.moduleType === 'output'
  ? { ...node, config: { ...node.config, topK: 6 } }
  : node)
const topSix = simulatePipeline('u104', topSixNodes, edges(topSixTemplate))
assert.equal(topSix.recommendations.length, 6)
console.log('  ✓ top-k configuration changes slate size')

const blank = SYSTEM_TEMPLATES.blank
const blankResult = simulatePipeline('u104', specs(blank), edges(blank))
assert.match(blankResult.error ?? '', /no candidates|upstream/i)
assert.equal(blankResult.trace.slate.status, 'error')
console.log('  ✓ blank canvas reports its missing path')

const cyclic = simulatePipeline(
  'u104',
  [
    { id: 'source', moduleType: 'ratingsSource' },
    { id: 'rank', moduleType: 'ranker' },
    { id: 'filter', moduleType: 'seenFilter' },
    { id: 'out', moduleType: 'output' },
  ],
  [
    { source: 'source', target: 'rank' },
    { source: 'rank', target: 'filter' },
    { source: 'filter', target: 'rank' },
    { source: 'filter', target: 'out' },
  ],
)
assert.match(cyclic.error ?? '', /cycle/i)
console.log('  ✓ cycles are rejected before execution')

console.log('\nFOUNDRY ALL PASS')
