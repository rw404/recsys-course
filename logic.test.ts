// Headless logic tests for the parts that carry real bugs:
// the metric math and the progress-store state machine.
import { ndcg, recallAtK, coverage, dcg, SANDBOX_ITEMS, SLATE_SIZE } from './src/data/course'
import { useProgress, NODES } from './src/state/progress'

let failed = 0
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log('  ✓', name)
  else {
    failed++
    console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : '')
  }
}
const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

console.log('metrics:')
// perfect ranking → ndcg 1
assert('ndcg of ideal order = 1', approx(ndcg([3, 2, 1, 0], [3, 2, 1, 0]), 1))
// reversed order < 1
assert('ndcg of reversed < ideal', ndcg([0, 1, 2, 3], [3, 2, 1, 0]) < 1)
// dcg monotonic: relevant on top beats relevant lower
assert('dcg top-heavy > bottom-heavy', dcg([3, 0]) > dcg([0, 3]))
// all-zero slate → ndcg 0 (idcg from pool is >0, dcg 0)
assert('all-zero slate ndcg = 0', approx(ndcg([0, 0], [3, 2, 1, 0]), 0))

const relevantCount = SANDBOX_ITEMS.filter((i) => i.rel > 0).length
const topRel = [...SANDBOX_ITEMS].sort((a, b) => b.rel - a.rel).slice(0, SLATE_SIZE)
assert('recall@k all-relevant slate', recallAtK(topRel, SANDBOX_ITEMS) === Math.min(SLATE_SIZE, relevantCount) / relevantCount)
assert('coverage in (0,1]', (() => { const c = coverage(topRel, SANDBOX_ITEMS); return c > 0 && c <= 1 })())

// a naive "sort by model score" slate should NOT beat a hand-tuned relevance slate on ndcg
const byScore = [...SANDBOX_ITEMS].sort((a, b) => b.score - a.score).slice(0, SLATE_SIZE)
const byRel = [...SANDBOX_ITEMS].sort((a, b) => b.rel - a.rel).slice(0, SLATE_SIZE)
const allRels = SANDBOX_ITEMS.map((i) => i.rel)
const ndScore = ndcg(byScore.map((i) => i.rel), allRels)
const ndRel = ndcg(byRel.map((i) => i.rel), allRels)
assert('relevance-sorted beats score-sorted (teaching point)', ndRel > ndScore, { ndRel, ndScore })
assert('a passing slate (ndcg>=0.85) exists', ndRel >= 0.85, { ndRel })

console.log('progress state machine:')
const s = useProgress.getState
// fresh
assert('week01 starts as next_required', s().getNodeState('week01-station') === 'next_required')
assert('ranking-sandbox starts locked', s().getNodeState('ranking-sandbox') === 'locked_for_credit')
assert('initial objective targets week01', s().nextRequiredAction().nodeId === 'week01-station')

// complete lesson → sandbox unlocks & becomes next
s().completeNode('week01-station')
assert('week01 now completed', s().getNodeState('week01-station') === 'completed')
assert('ranking-sandbox now next_required', s().getNodeState('ranking-sandbox') === 'next_required')
assert('no artifact yet', s().collectedArtifacts() === 0)

// complete lab → metric-compass forged, quiz unlocks
const eff = s().completeNode('ranking-sandbox')
assert('lab completion spawns metric-compass', eff?.spawnArtifact === 'metric-compass')
assert('metric-compass collected', s().artifacts['metric-compass'] === true && s().collectedArtifacts() === 1)
assert('quiz-gate now next_required', s().getNodeState('quiz-gate') === 'next_required')

// complete quiz → bridge unlock effect + objective becomes cross bridge
const eff2 = s().completeNode('quiz-gate')
assert('quiz completion unlocks bridge', eff2?.unlockBridge === 'retrieval-bridge')
assert('bridge no longer locked', s().getNodeState('retrieval-bridge') !== 'locked_for_credit')
assert('objective now the bridge', s().nextRequiredAction().nodeId === 'retrieval-bridge')

// finish
s().completeNode('retrieval-bridge')
assert('camp complete → no required action', s().nextRequiredAction().nodeId === null)

// sanity: every node has a valid position + radius
assert('all nodes have interaction radius > 0', Object.values(NODES).every((n) => n.interactionRadius > 0))

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
