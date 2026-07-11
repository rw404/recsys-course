import { create } from 'zustand'

/**
 * ProgressStore is the single source of truth for course progression.
 * The 3D world only VISUALIZES this state — it never decides progression itself.
 */

export type NodeId =
  | 'npc-guide'
  | 'week01-station'
  | 'ranking-sandbox'
  | 'quiz-gate'
  | 'retrieval-bridge'
  // World 02 · Retrieval Valley
  | 'ann-guide'
  | 'two-tower-lesson'
  | 'retrieval-sandbox'
  | 'negatives-quiz'
  | 'world3-gate'
  // World 03 · Sequential City
  | 'astra-city-guide'
  | 'transformer-lesson'
  | 'attention-lab'
  | 'attention-quiz'
  | 'world4-gate'
  // World 04 · Policy Tower
  | 'astra-tower-guide'
  | 'policy-lesson'
  | 'bandit-lab'
  | 'policy-quiz'
  | 'world5-gate'
  // World 05 · Ecosystem Garden
  | 'astra-garden-guide'
  | 'ecosystem-lesson'
  | 'diversity-lab'
  | 'ecosystem-quiz'
  | 'graduation'
  // World 06 · Final Arena
  | 'astra-arena-guide'
  | 'capstone-lesson'
  | 'capstone-arena'
  | 'champion'

export type NodeKind = 'lesson' | 'widget' | 'quiz' | 'npc' | 'campfire' | 'bridge' | 'arena'

/** Explorable regions the player walks between across bridges/gates. */
export type WorldId = 'foundations-camp' | 'retrieval-valley' | 'sequential-city' | 'policy-tower' | 'ecosystem-garden' | 'final-arena'

export type ProgressNodeState =
  | 'locked_for_credit' // prerequisite not met — cannot be entered for credit
  | 'available'         // can be entered
  | 'in_progress'
  | 'next_required'     // the single most important thing to do next
  | 'completed'
  | 'overdue'
  | 'review_pending'
  | 'failed_needs_retry'

export type PlayerMode = 'explore' | 'interact' | 'study' | 'lab' | 'quiz' | 'cinematic'

export type ArtifactId = 'metric-compass' | 'vector-core' | 'attention-lens' | 'policy-controller' | 'diversity-seed'

export interface CourseNode {
  id: NodeId
  kind: NodeKind
  title: string
  subtitle: string
  worldId: WorldId
  weekId?: string
  /** world-space position [x, y, z] */
  position: [number, number, number]
  /** node ids that must be `completed` before this becomes `available` */
  requires: NodeId[]
  /** whether completing this is required to progress the course */
  requiredAction: boolean
  interactionRadius: number
  action: 'talk' | 'open_lesson' | 'open_lab' | 'open_quiz' | 'unlock_bridge'
}

export interface CompletionEffect {
  spawnArtifact?: ArtifactId
  unlockBridge?: NodeId
  clearFog?: string
  highlightNextPath?: boolean
}

/** Static graph for the Foundations Camp vertical slice. */
export const NODES: Record<NodeId, CourseNode> = {
  'npc-guide': {
    id: 'npc-guide',
    kind: 'npc',
    title: 'Metric Keeper',
    subtitle: 'Guide',
    worldId: 'foundations-camp',
    position: [-6, 0, 4],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.2,
    action: 'talk',
  },
  'week01-station': {
    id: 'week01-station',
    kind: 'lesson',
    title: 'Week 01 · Ranking & Metrics',
    subtitle: 'Lesson',
    worldId: 'foundations-camp',
    weekId: 'week-01',
    // co-located with Guide Astra (LESSON_STAGE.astra.pos): she IS the station marker, so E is
    // pressed at the narrator, not at a separate statue. The holo-board renders behind her.
    position: [3.9, 0, 2.0],
    requires: [],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'ranking-sandbox': {
    id: 'ranking-sandbox',
    kind: 'widget',
    title: 'Ranking Sandbox',
    subtitle: 'Lab',
    worldId: 'foundations-camp',
    weekId: 'week-01',
    position: [9, 0, -1],
    requires: ['week01-station'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lab',
  },
  'quiz-gate': {
    id: 'quiz-gate',
    kind: 'quiz',
    title: 'Metrics Quiz Gate',
    subtitle: 'Checkpoint',
    worldId: 'foundations-camp',
    weekId: 'week-01',
    position: [13, 0, -9],
    requires: ['ranking-sandbox'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_quiz',
  },
  'retrieval-bridge': {
    id: 'retrieval-bridge',
    kind: 'bridge',
    title: 'Bridge to Retrieval Valley',
    subtitle: 'Next Region',
    worldId: 'foundations-camp',
    position: [18, 0, -15],
    requires: ['quiz-gate'],
    requiredAction: false,
    interactionRadius: 3.4,
    action: 'unlock_bridge',
  },

  // ---- World 02 · Retrieval Valley -------------------------------------------------
  // invisible welcome waypoint near the arrival landing (Vector Smith himself stands, rigged, at
  // the two-tower-lesson mark — this node just fires his greeting when you step off the bridge)
  'ann-guide': {
    id: 'ann-guide',
    kind: 'npc',
    title: 'Vector Smith',
    subtitle: 'ANN Engineer',
    worldId: 'retrieval-valley',
    position: [1.5, 0, 9.5],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.0,
    action: 'talk',
  },
  'two-tower-lesson': {
    id: 'two-tower-lesson',
    kind: 'lesson',
    title: 'ANN & Negative Sampling',
    subtitle: 'Lesson',
    worldId: 'retrieval-valley',
    weekId: 'week-02',
    position: [-8, 0, 1],
    requires: ['retrieval-bridge'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'retrieval-sandbox': {
    id: 'retrieval-sandbox',
    kind: 'widget',
    title: 'Retrieval Sandbox',
    subtitle: 'Lab',
    worldId: 'retrieval-valley',
    weekId: 'week-02',
    position: [2, 0, -1],
    requires: ['two-tower-lesson'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lab',
  },
  'negatives-quiz': {
    id: 'negatives-quiz',
    kind: 'quiz',
    title: 'Two-Tower Gate Quiz',
    subtitle: 'Checkpoint',
    worldId: 'retrieval-valley',
    weekId: 'week-02',
    position: [9, 0, -5.5],
    requires: ['retrieval-sandbox'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_quiz',
  },
  'world3-gate': {
    id: 'world3-gate',
    kind: 'bridge',
    title: 'Two-Tower Gate',
    subtitle: 'Next Region',
    worldId: 'retrieval-valley',
    position: [3, 0, -13],
    requires: ['negatives-quiz'],
    requiredAction: false,
    interactionRadius: 3.6,
    action: 'unlock_bridge',
  },

  // ---- World 03 · Sequential City --------------------------------------------------
  // invisible welcome waypoint near the arrival (Guide Astra herself stands, rigged, at the
  // transformer-lesson mark — this node fires her greeting as you step off the gate)
  'astra-city-guide': {
    id: 'astra-city-guide',
    kind: 'npc',
    title: 'Guide Astra',
    subtitle: 'Course Guide',
    worldId: 'sequential-city',
    position: [1, 0, 9.5],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.0,
    action: 'talk',
  },
  'transformer-lesson': {
    id: 'transformer-lesson',
    kind: 'lesson',
    title: 'Attention & Transformers',
    subtitle: 'Lesson',
    worldId: 'sequential-city',
    weekId: 'week-03',
    position: [-7, 0, 2],
    requires: ['world3-gate'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'attention-lab': {
    id: 'attention-lab',
    kind: 'widget',
    title: 'Flash Attention Lab',
    subtitle: 'Lab',
    worldId: 'sequential-city',
    weekId: 'week-03',
    position: [9, 0, -1.5],
    requires: ['transformer-lesson'],
    requiredAction: true,
    interactionRadius: 3.2,
    action: 'open_lab',
  },
  'attention-quiz': {
    id: 'attention-quiz',
    kind: 'quiz',
    title: 'Attention Checkpoint',
    subtitle: 'Checkpoint',
    worldId: 'sequential-city',
    weekId: 'week-03',
    position: [5, 0, 4],
    requires: ['attention-lab'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_quiz',
  },
  'world4-gate': {
    id: 'world4-gate',
    kind: 'bridge',
    title: 'Policy Bridge',
    subtitle: 'Next Region',
    worldId: 'sequential-city',
    position: [2, 0, -13],
    requires: ['attention-quiz'],
    requiredAction: false,
    interactionRadius: 3.6,
    action: 'unlock_bridge',
  },

  // ---- World 04 · Policy Tower -----------------------------------------------------
  // invisible welcome waypoint at the arrival (Guide Astra herself stands, rigged, at the
  // policy-lesson mark — this node fires her greeting as you step off the bridge)
  'astra-tower-guide': {
    id: 'astra-tower-guide',
    kind: 'npc',
    title: 'Guide Astra',
    subtitle: 'Course Guide',
    worldId: 'policy-tower',
    position: [1, 0, 9.5],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.0,
    action: 'talk',
  },
  'policy-lesson': {
    id: 'policy-lesson',
    kind: 'lesson',
    title: 'Bandits, Policies & Slates',
    subtitle: 'Lesson',
    worldId: 'policy-tower',
    weekId: 'week-04',
    position: [-7, 0, 2],
    requires: ['world4-gate'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'bandit-lab': {
    id: 'bandit-lab',
    kind: 'widget',
    title: 'Bandit Lab',
    subtitle: 'Lab',
    worldId: 'policy-tower',
    weekId: 'week-04',
    position: [9, 0, -1.5],
    requires: ['policy-lesson'],
    requiredAction: true,
    interactionRadius: 3.2,
    action: 'open_lab',
  },
  'policy-quiz': {
    id: 'policy-quiz',
    kind: 'quiz',
    title: 'Policy Checkpoint',
    subtitle: 'Checkpoint',
    worldId: 'policy-tower',
    weekId: 'week-04',
    position: [5, 0, 4],
    requires: ['bandit-lab'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_quiz',
  },
  'world5-gate': {
    id: 'world5-gate',
    kind: 'bridge',
    title: 'Garden Gate',
    subtitle: 'Next Region',
    worldId: 'policy-tower',
    position: [2, 0, -13],
    requires: ['policy-quiz'],
    requiredAction: false,
    interactionRadius: 3.6,
    action: 'unlock_bridge',
  },

  // ---- World 05 · Ecosystem Garden -------------------------------------------------
  // invisible welcome waypoint at the arrival (Guide Astra herself stands, rigged, at the
  // ecosystem-lesson mark — this node fires her greeting as you step off the gate)
  'astra-garden-guide': {
    id: 'astra-garden-guide',
    kind: 'npc',
    title: 'Guide Astra',
    subtitle: 'Course Guide',
    worldId: 'ecosystem-garden',
    position: [1, 0, 9.5],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.0,
    action: 'talk',
  },
  'ecosystem-lesson': {
    id: 'ecosystem-lesson',
    kind: 'lesson',
    title: 'Ecosystems, Diversity & Feedback',
    subtitle: 'Lesson',
    worldId: 'ecosystem-garden',
    weekId: 'week-05',
    position: [-7, 0, 2],
    requires: ['world5-gate'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'diversity-lab': {
    id: 'diversity-lab',
    kind: 'widget',
    title: 'Diversity Lab',
    subtitle: 'Lab',
    worldId: 'ecosystem-garden',
    weekId: 'week-05',
    position: [9, 0, -1.5],
    requires: ['ecosystem-lesson'],
    requiredAction: true,
    interactionRadius: 3.2,
    action: 'open_lab',
  },
  'ecosystem-quiz': {
    id: 'ecosystem-quiz',
    kind: 'quiz',
    title: 'Ecosystem Checkpoint',
    subtitle: 'Checkpoint',
    worldId: 'ecosystem-garden',
    weekId: 'week-05',
    position: [5, 0, 4],
    requires: ['diversity-lab'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_quiz',
  },
  'graduation': {
    id: 'graduation',
    kind: 'bridge',
    title: 'Final Arena Gate',
    subtitle: 'Next Region',
    worldId: 'ecosystem-garden',
    position: [2, 0, -13],
    requires: ['ecosystem-quiz'],
    requiredAction: false,
    interactionRadius: 3.6,
    action: 'unlock_bridge',
  },

  // ---- World 06 · Final Arena ------------------------------------------------------
  // invisible welcome waypoint at the arrival (Guide Astra herself stands, rigged, at the
  // capstone-lesson mark — this node fires her greeting as you step off the gate)
  'astra-arena-guide': {
    id: 'astra-arena-guide',
    kind: 'npc',
    title: 'Guide Astra',
    subtitle: 'Course Guide',
    worldId: 'final-arena',
    position: [1, 0, 9.5],
    requires: [],
    requiredAction: false,
    interactionRadius: 3.0,
    action: 'talk',
  },
  'capstone-lesson': {
    id: 'capstone-lesson',
    kind: 'lesson',
    title: 'Capstone · Prove Your Mastery',
    subtitle: 'Recap',
    worldId: 'final-arena',
    weekId: 'capstone',
    position: [-7, 0, 2],
    requires: ['graduation'],
    requiredAction: true,
    interactionRadius: 3.0,
    action: 'open_lesson',
  },
  'capstone-arena': {
    id: 'capstone-arena',
    kind: 'arena',
    title: 'Capstone Arena',
    subtitle: 'Final Challenge',
    worldId: 'final-arena',
    weekId: 'capstone',
    position: [9, 0, -1.5],
    requires: ['capstone-lesson'],
    requiredAction: true,
    interactionRadius: 3.4,
    action: 'open_lab',
  },
  'champion': {
    id: 'champion',
    kind: 'bridge',
    title: 'Hall of Champions',
    subtitle: 'Course Complete',
    worldId: 'final-arena',
    position: [2, 0, -13],
    requires: ['capstone-arena'],
    requiredAction: false,
    interactionRadius: 3.6,
    action: 'unlock_bridge',
  },
}

export const NODE_ORDER: NodeId[] = [
  'npc-guide',
  'week01-station',
  'ranking-sandbox',
  'quiz-gate',
  'retrieval-bridge',
  'ann-guide',
  'two-tower-lesson',
  'retrieval-sandbox',
  'negatives-quiz',
  'world3-gate',
  'astra-city-guide',
  'transformer-lesson',
  'attention-lab',
  'attention-quiz',
  'world4-gate',
  'astra-tower-guide',
  'policy-lesson',
  'bandit-lab',
  'policy-quiz',
  'world5-gate',
  'astra-garden-guide',
  'ecosystem-lesson',
  'diversity-lab',
  'ecosystem-quiz',
  'graduation',
  'astra-arena-guide',
  'capstone-lesson',
  'capstone-arena',
  'champion',
]

/** Where the player is (re)spawned when they first enter a world. */
export const WORLD_SPAWN: Record<WorldId, [number, number, number]> = {
  'foundations-camp': [-6, 0.9, 8],
  'retrieval-valley': [1, 0.9, 12],
  'sequential-city': [1, 0.9, 11],
  'policy-tower': [1, 0.9, 11],
  'ecosystem-garden': [1, 0.9, 11],
  'final-arena': [1, 0.9, 11],
}

export interface NextRequiredAction {
  nodeId: NodeId | null
  label: string
}

interface ProgressState {
  /** per-node completion flags */
  completed: Record<NodeId, boolean>
  artifacts: Record<ArtifactId, boolean>
  talkedToGuide: boolean

  // runtime UI / player state (kept here so HUD + world share one store)
  currentWorld: WorldId
  mode: PlayerMode
  nearbyNodeId: NodeId | null
  activeNodeId: NodeId | null
  reducedMotion: boolean
  /** current slide index of the open lesson — drives the 3D narrator's per-page gesture */
  lessonPage: number
  /** best score achieved in the Final Arena capstone (for the Hall of Mastery "Your Best") */
  capstoneScore: number
  /** the Course Atlas overview scene (all six regions in one connected diorama) is open */
  atlasOpen: boolean

  // derived helpers
  getNodeState: (id: NodeId) => ProgressNodeState
  nextRequiredAction: () => NextRequiredAction
  totalArtifacts: number
  collectedArtifacts: () => number

  // actions
  enterWorld: (id: WorldId) => void
  /** free fast-travel to any region from anywhere (HUD world chips + Journey map) */
  travelTo: (id: WorldId) => void
  setNearby: (id: NodeId | null) => void
  setLessonPage: (n: number) => void
  setCapstoneScore: (n: number) => void
  toggleAtlas: () => void
  openNode: (id: NodeId) => void
  closeNode: () => void
  completeNode: (id: NodeId) => CompletionEffect | null
  talkToGuide: () => void
  setReducedMotion: (v: boolean) => void
  reset: () => void
}

const emptyCompleted = (): Record<NodeId, boolean> => ({
  'npc-guide': false,
  'week01-station': false,
  'ranking-sandbox': false,
  'quiz-gate': false,
  'retrieval-bridge': false,
  'ann-guide': false,
  'two-tower-lesson': false,
  'retrieval-sandbox': false,
  'negatives-quiz': false,
  'world3-gate': false,
  'astra-city-guide': false,
  'transformer-lesson': false,
  'attention-lab': false,
  'attention-quiz': false,
  'world4-gate': false,
  'astra-tower-guide': false,
  'policy-lesson': false,
  'bandit-lab': false,
  'policy-quiz': false,
  'world5-gate': false,
  'astra-garden-guide': false,
  'ecosystem-lesson': false,
  'diversity-lab': false,
  'ecosystem-quiz': false,
  'graduation': false,
  'astra-arena-guide': false,
  'capstone-lesson': false,
  'capstone-arena': false,
  'champion': false,
})

const emptyArtifacts = (): Record<ArtifactId, boolean> => ({
  'metric-compass': false,
  'vector-core': false,
  'attention-lens': false,
  'policy-controller': false,
  'diversity-seed': false,
})

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** ?world=valley starts the session already in Retrieval Valley (used by showcase captures). */
function initialWorld(): WorldId {
  if (typeof window === 'undefined') return 'foundations-camp'
  const w = new URLSearchParams(window.location.search).get('world')
  if (w === 'valley' || w === 'retrieval-valley') return 'retrieval-valley'
  if (w === 'city' || w === 'sequential-city') return 'sequential-city'
  if (w === 'tower' || w === 'policy-tower') return 'policy-tower'
  if (w === 'garden' || w === 'ecosystem-garden') return 'ecosystem-garden'
  if (w === 'arena' || w === 'final-arena') return 'final-arena'
  return 'foundations-camp'
}

export const useProgress = create<ProgressState>((set, get) => ({
  completed: emptyCompleted(),
  artifacts: emptyArtifacts(),
  talkedToGuide: false,
  currentWorld: initialWorld(),
  mode: 'explore',
  nearbyNodeId: null,
  activeNodeId: null,
  reducedMotion: prefersReducedMotion(),
  lessonPage: 0,
  capstoneScore: 0,
  // The course opens as one readable world map. A ?world= deep-link starts focused instead.
  atlasOpen: typeof window === 'undefined'
    ? true
    : !new URLSearchParams(window.location.search).has('world'),
  totalArtifacts: 5,

  getNodeState: (id) => {
    const s = get()
    const node = NODES[id]
    if (s.completed[id]) return 'completed'
    const unlocked = node.requires.every((r) => s.completed[r])
    if (!unlocked) return 'locked_for_credit'
    // unlocked & not complete → is it the next required action?
    const next = s.nextRequiredAction()
    if (next.nodeId === id) return 'next_required'
    if (s.activeNodeId === id) return 'in_progress'
    return 'available'
  },

  nextRequiredAction: () => {
    const s = get()
    for (const id of NODE_ORDER) {
      const node = NODES[id]
      if (!node.requiredAction) continue
      if (s.completed[id]) continue
      const unlocked = node.requires.every((r) => s.completed[r])
      if (unlocked) {
        return { nodeId: id, label: labelForAction(node) }
      }
    }
    // bridges are not requiredAction nodes, so surface them explicitly between regions
    if (s.completed['quiz-gate'] && !s.completed['retrieval-bridge']) {
      return { nodeId: 'retrieval-bridge', label: 'Cross the Retrieval Bridge' }
    }
    if (s.completed['negatives-quiz'] && !s.completed['world3-gate']) {
      return { nodeId: 'world3-gate', label: 'Pass the Two-Tower Gate' }
    }
    if (s.completed['attention-quiz'] && !s.completed['world4-gate']) {
      return { nodeId: 'world4-gate', label: 'Cross the Policy Bridge' }
    }
    if (s.completed['policy-quiz'] && !s.completed['world5-gate']) {
      return { nodeId: 'world5-gate', label: 'Pass the Garden Gate' }
    }
    if (s.completed['ecosystem-quiz'] && !s.completed['graduation']) {
      return { nodeId: 'graduation', label: 'Enter the Final Arena' }
    }
    if (s.completed['capstone-arena'] && !s.completed['champion']) {
      return { nodeId: 'champion', label: 'Claim your place in the Hall of Champions' }
    }
    if (s.completed['champion']) {
      return { nodeId: null, label: '★ Champion — course complete' }
    }
    return { nodeId: null, label: 'The Final Arena — prove your mastery' }
  },

  collectedArtifacts: () => {
    const a = get().artifacts
    return Object.values(a).filter(Boolean).length
  },

  enterWorld: (id) => {
    if (get().currentWorld === id) return
    // teleport the player to the new region's spawn and snap the camera (handled in Player/Camera
    // via the runtime flags set by the caller wiring below)
    set({ currentWorld: id, nearbyNodeId: null, activeNodeId: null, mode: 'explore' })
  },

  travelTo: (id) => {
    // free fast-travel: jump into any region from anywhere (closes the Journey map + any panel).
    // Directly set currentWorld (bypassing enterWorld's same-world early return) so the Player's
    // useFrame detects the change (or the atlas-close transition) and teleports to that spawn.
    set({ currentWorld: id, atlasOpen: false, mode: 'explore', activeNodeId: null, nearbyNodeId: null })
  },

  setNearby: (id) => {
    if (get().nearbyNodeId !== id) set({ nearbyNodeId: id })
  },

  setLessonPage: (n) => {
    if (get().lessonPage !== n) set({ lessonPage: n })
  },

  setCapstoneScore: (n) => {
    // keep the best score achieved (the Hall of Mastery "Your Best")
    if (n > get().capstoneScore) set({ capstoneScore: n })
  },

  toggleAtlas: () => {
    // opening the Atlas closes any open panel and returns to explore mode (the Player teleports
    // to/from the atlas island in its own useFrame by watching this flag)
    set({ atlasOpen: !get().atlasOpen, mode: 'explore', activeNodeId: null, nearbyNodeId: null })
  },

  openNode: (id) => {
    const node = NODES[id]
    const mode: PlayerMode =
      node.action === 'open_lesson'
        ? 'study'
        : node.action === 'open_lab'
        ? 'lab'
        : node.action === 'open_quiz'
        ? 'quiz'
        : 'interact'
    set({ activeNodeId: id, mode, lessonPage: 0 })
  },

  closeNode: () => set({ activeNodeId: null, mode: 'explore' }),

  completeNode: (id) => {
    const already = get().completed[id]
    set((st) => ({ completed: { ...st.completed, [id]: true } }))
    if (id === 'npc-guide') set({ talkedToGuide: true })

    // completion effects across both regions
    if (id === 'ranking-sandbox' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'metric-compass': true } }))
      return { spawnArtifact: 'metric-compass', highlightNextPath: true }
    }
    if (id === 'quiz-gate' && !already) {
      // completing the checkpoint lights the bridge
      set((st) => ({ completed: { ...st.completed, 'retrieval-bridge': false } }))
      return { unlockBridge: 'retrieval-bridge', highlightNextPath: true }
    }
    // crossing the lit bridge carries the player into Retrieval Valley
    if (id === 'retrieval-bridge') {
      get().enterWorld('retrieval-valley')
      return { clearFog: 'retrieval-valley', highlightNextPath: true }
    }
    // the retrieval lab forges the Vector Core
    if (id === 'retrieval-sandbox' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'vector-core': true } }))
      return { spawnArtifact: 'vector-core', highlightNextPath: true }
    }
    if (id === 'negatives-quiz' && !already) {
      return { unlockBridge: 'world3-gate', highlightNextPath: true }
    }
    // crossing the Two-Tower Gate carries the player into Sequential City (World 03)
    if (id === 'world3-gate') {
      get().enterWorld('sequential-city')
      return { clearFog: 'sequential-city', highlightNextPath: true }
    }
    // the Flash Attention lab forges the Attention Lens
    if (id === 'attention-lab' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'attention-lens': true } }))
      return { spawnArtifact: 'attention-lens', highlightNextPath: true }
    }
    if (id === 'attention-quiz' && !already) {
      return { unlockBridge: 'world4-gate', highlightNextPath: true }
    }
    // crossing the Policy Bridge carries the player into the Policy Tower (World 04)
    if (id === 'world4-gate') {
      get().enterWorld('policy-tower')
      return { clearFog: 'policy-tower', highlightNextPath: true }
    }
    // the Bandit Lab forges the Policy Controller
    if (id === 'bandit-lab' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'policy-controller': true } }))
      return { spawnArtifact: 'policy-controller', highlightNextPath: true }
    }
    if (id === 'policy-quiz' && !already) {
      return { unlockBridge: 'world5-gate', highlightNextPath: true }
    }
    // crossing the Garden Gate carries the player into the Ecosystem Garden (World 05)
    if (id === 'world5-gate') {
      get().enterWorld('ecosystem-garden')
      return { clearFog: 'ecosystem-garden', highlightNextPath: true }
    }
    // the Diversity Lab forges the Diversity Seed (the 5th and final artifact)
    if (id === 'diversity-lab' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'diversity-seed': true } }))
      return { spawnArtifact: 'diversity-seed', highlightNextPath: true }
    }
    if (id === 'ecosystem-quiz' && !already) {
      return { unlockBridge: 'graduation', highlightNextPath: true }
    }
    // crossing the Final Arena Gate carries the player into the Final Arena (World 06)
    if (id === 'graduation') {
      get().enterWorld('final-arena')
      return { clearFog: 'final-arena', highlightNextPath: true }
    }
    if (id === 'capstone-arena' && !already) {
      return { unlockBridge: 'champion', highlightNextPath: true }
    }
    // champion is the course finale — no further region
    return { highlightNextPath: true }
  },

  talkToGuide: () => set({ talkedToGuide: true }),

  setReducedMotion: (v) => set({ reducedMotion: v }),

  reset: () =>
    set({
      completed: emptyCompleted(),
      artifacts: emptyArtifacts(),
      talkedToGuide: false,
      currentWorld: 'foundations-camp',
      mode: 'explore',
      nearbyNodeId: null,
      activeNodeId: null,
      capstoneScore: 0,
      atlasOpen: false,
    }),
}))

function labelForAction(node: CourseNode): string {
  switch (node.action) {
    case 'open_lesson':
      return `Study: ${node.title}`
    case 'open_lab':
      return `Complete the ${node.title}`
    case 'open_quiz':
      return `Pass the ${node.title}`
    case 'talk':
      return `Talk to ${node.title}`
    default:
      return node.title
  }
}
