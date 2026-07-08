// Headless logic tests for the parts that carry real bugs:
// the metric math and the progress-store state machine.
import {
  ndcg, recallAtK, coverage, dcg, SANDBOX_ITEMS, SLATE_SIZE,
  simulateBandit, REGRET_BUDGET,
  mmrSelect, diversityPass, slateRelevance, slateDiversity, REL_FLOOR, DIV_FLOOR,
  CAPSTONE_QUESTIONS, CAPSTONE_PER_Q, CAPSTONE_PASS, capstoneRank, HALL_OF_MASTERY,
} from './src/data/course'
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

// cross the bridge → enter Retrieval Valley (World 02) and the ANN lesson becomes next
s().completeNode('retrieval-bridge')
assert('crossing the bridge enters retrieval-valley', s().currentWorld === 'retrieval-valley')
assert('objective now the two-tower lesson', s().nextRequiredAction().nodeId === 'two-tower-lesson')
assert('retrieval-sandbox still locked before lesson', s().getNodeState('retrieval-sandbox') === 'locked_for_credit')

// World 02: lesson → retrieval lab (forges vector-core) → negatives quiz → gate
s().completeNode('two-tower-lesson')
assert('retrieval-sandbox now next_required', s().getNodeState('retrieval-sandbox') === 'next_required')
const eff3 = s().completeNode('retrieval-sandbox')
assert('retrieval lab forges vector-core', eff3?.spawnArtifact === 'vector-core')
assert('vector-core collected (2 artifacts total)', s().artifacts['vector-core'] === true && s().collectedArtifacts() === 2)
assert('negatives-quiz now next_required', s().getNodeState('negatives-quiz') === 'next_required')
const eff4 = s().completeNode('negatives-quiz')
assert('quiz unlocks the two-tower gate', eff4?.unlockBridge === 'world3-gate')
assert('objective now the two-tower gate', s().nextRequiredAction().nodeId === 'world3-gate')

// cross the Two-Tower Gate → enter Sequential City (World 03)
s().completeNode('world3-gate')
assert('crossing the gate enters sequential-city', s().currentWorld === 'sequential-city')
assert('objective now the transformer lesson', s().nextRequiredAction().nodeId === 'transformer-lesson')
assert('attention-lab still locked before lesson', s().getNodeState('attention-lab') === 'locked_for_credit')

// World 03: lesson → flash attention lab (forges attention-lens) → quiz → gate
s().completeNode('transformer-lesson')
assert('attention-lab now next_required', s().getNodeState('attention-lab') === 'next_required')
const eff5 = s().completeNode('attention-lab')
assert('flash lab forges attention-lens', eff5?.spawnArtifact === 'attention-lens')
assert('attention-lens collected (3 artifacts total)', s().artifacts['attention-lens'] === true && s().collectedArtifacts() === 3)
assert('attention-quiz now next_required', s().getNodeState('attention-quiz') === 'next_required')
const eff6 = s().completeNode('attention-quiz')
assert('quiz unlocks the world-4 gate', eff6?.unlockBridge === 'world4-gate')
assert('objective now the retrieval bridge onward', s().nextRequiredAction().nodeId === 'world4-gate')

// cross the Policy Bridge → enter Policy Tower (World 04)
s().completeNode('world4-gate')
assert('crossing the bridge enters policy-tower', s().currentWorld === 'policy-tower')
assert('objective now the policy lesson', s().nextRequiredAction().nodeId === 'policy-lesson')
assert('bandit-lab still locked before lesson', s().getNodeState('bandit-lab') === 'locked_for_credit')

// World 04: lesson → bandit lab (forges policy-controller) → quiz → gate
s().completeNode('policy-lesson')
assert('bandit-lab now next_required', s().getNodeState('bandit-lab') === 'next_required')
const eff7 = s().completeNode('bandit-lab')
assert('bandit lab forges policy-controller', eff7?.spawnArtifact === 'policy-controller')
assert('policy-controller collected (4 artifacts total)', s().artifacts['policy-controller'] === true && s().collectedArtifacts() === 4)
assert('policy-quiz now next_required', s().getNodeState('policy-quiz') === 'next_required')
const eff8 = s().completeNode('policy-quiz')
assert('quiz unlocks the garden gate', eff8?.unlockBridge === 'world5-gate')
assert('objective now the garden gate', s().nextRequiredAction().nodeId === 'world5-gate')

// cross the Garden Gate → enter Ecosystem Garden (World 05)
s().completeNode('world5-gate')
assert('crossing the gate enters ecosystem-garden', s().currentWorld === 'ecosystem-garden')
assert('objective now the ecosystem lesson', s().nextRequiredAction().nodeId === 'ecosystem-lesson')
assert('diversity-lab still locked before lesson', s().getNodeState('diversity-lab') === 'locked_for_credit')

// World 05: lesson → diversity lab (forges diversity-seed) → quiz → graduation
s().completeNode('ecosystem-lesson')
assert('diversity-lab now next_required', s().getNodeState('diversity-lab') === 'next_required')
const eff9 = s().completeNode('diversity-lab')
assert('diversity lab forges diversity-seed', eff9?.spawnArtifact === 'diversity-seed')
assert('diversity-seed collected (5 artifacts total)', s().artifacts['diversity-seed'] === true && s().collectedArtifacts() === 5)
assert('ecosystem-quiz now next_required', s().getNodeState('ecosystem-quiz') === 'next_required')
const eff10 = s().completeNode('ecosystem-quiz')
assert('quiz unlocks graduation', eff10?.unlockBridge === 'graduation')
assert('objective now the course summit', s().nextRequiredAction().nodeId === 'graduation')

// cross the Final Arena Gate → enter Final Arena (World 06)
s().completeNode('graduation')
assert('crossing the gate enters final-arena', s().currentWorld === 'final-arena')
assert('objective now the capstone lesson', s().nextRequiredAction().nodeId === 'capstone-lesson')
assert('capstone-arena still locked before recap', s().getNodeState('capstone-arena') === 'locked_for_credit')

// World 06: capstone recap → capstone arena → champion (course complete)
s().completeNode('capstone-lesson')
assert('capstone-arena now next_required', s().getNodeState('capstone-arena') === 'next_required')
const eff11 = s().completeNode('capstone-arena')
assert('capstone arena unlocks champion', eff11?.unlockBridge === 'champion')
assert('objective now the champion finale', s().nextRequiredAction().nodeId === 'champion')

// claim the crown → course complete
s().completeNode('champion')
assert('course complete → no required action', s().nextRequiredAction().nodeId === null)
assert('champion label', s().nextRequiredAction().label.includes('Champion'))

// capstone scoring: 5 correct tops the Hall of Mastery, 3 correct clears the pass
{
  const perfect = CAPSTONE_QUESTIONS.length * CAPSTONE_PER_Q
  assert('perfect capstone = 100k', perfect === 100000)
  assert('perfect run is rank #1', capstoneRank(perfect) === 1)
  assert('perfect beats the top of the hall', perfect > HALL_OF_MASTERY[0].score)
  assert('3/5 clears the pass, 2/5 does not', 3 * CAPSTONE_PER_Q >= CAPSTONE_PASS && 2 * CAPSTONE_PER_Q < CAPSTONE_PASS)
  s().setCapstoneScore(perfect)
  assert('capstoneScore keeps the best', s().capstoneScore === perfect)
  s().setCapstoneScore(40000)
  assert('a lower score does not overwrite the best', s().capstoneScore === perfect)
}

// bandit sim sanity: greedy stalls (high regret), UCB clears the budget
{
  const g = simulateBandit('greedy')
  const u = simulateBandit('ucb')
  assert('greedy regret exceeds the budget', g.regret >= REGRET_BUDGET, { greedy: g.regret })
  assert('ucb regret clears the budget', u.regret < REGRET_BUDGET, { ucb: u.regret })
}

// diversity lab: a balanced MMR slate passes; pure-relevance & pure-diversity extremes fail
{
  const balanced = mmrSelect(0.6)
  const bubble = mmrSelect(1)
  const scattered = mmrSelect(0)
  assert('balanced MMR slate clears both floors', diversityPass(balanced), { rel: slateRelevance(balanced), div: slateDiversity(balanced) })
  assert('pure-relevance slate fails diversity floor', slateDiversity(bubble) < DIV_FLOOR)
  assert('pure-diversity slate fails relevance floor', slateRelevance(scattered) < REL_FLOOR)
}

// sanity: every node has a valid position + radius, and worldId is one of the six regions
const WORLDS = ['foundations-camp', 'retrieval-valley', 'sequential-city', 'policy-tower', 'ecosystem-garden', 'final-arena']
assert('all nodes have interaction radius > 0', Object.values(NODES).every((n) => n.interactionRadius > 0))
assert('all nodes belong to a known world', Object.values(NODES).every((n) => WORLDS.includes(n.worldId)))

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
