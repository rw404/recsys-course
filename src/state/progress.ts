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

export type NodeKind = 'lesson' | 'widget' | 'quiz' | 'npc' | 'campfire' | 'bridge' | 'arena'

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

export type ArtifactId = 'metric-compass' | 'vector-core' | 'attention-lens' | 'policy-controller'

export interface CourseNode {
  id: NodeId
  kind: NodeKind
  title: string
  subtitle: string
  worldId: string
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
    position: [4.4, 0, 0.6],
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
}

export const NODE_ORDER: NodeId[] = [
  'npc-guide',
  'week01-station',
  'ranking-sandbox',
  'quiz-gate',
  'retrieval-bridge',
]

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
  mode: PlayerMode
  nearbyNodeId: NodeId | null
  activeNodeId: NodeId | null
  reducedMotion: boolean
  /** current slide index of the open lesson — drives the 3D narrator's per-page gesture */
  lessonPage: number

  // derived helpers
  getNodeState: (id: NodeId) => ProgressNodeState
  nextRequiredAction: () => NextRequiredAction
  totalArtifacts: number
  collectedArtifacts: () => number

  // actions
  setNearby: (id: NodeId | null) => void
  setLessonPage: (n: number) => void
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
})

const emptyArtifacts = (): Record<ArtifactId, boolean> => ({
  'metric-compass': false,
  'vector-core': false,
  'attention-lens': false,
  'policy-controller': false,
})

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const useProgress = create<ProgressState>((set, get) => ({
  completed: emptyCompleted(),
  artifacts: emptyArtifacts(),
  talkedToGuide: false,
  mode: 'explore',
  nearbyNodeId: null,
  activeNodeId: null,
  reducedMotion: prefersReducedMotion(),
  lessonPage: 0,
  totalArtifacts: 4,

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
    // everything required is done in this slice
    if (s.completed['quiz-gate'] && !s.completed['retrieval-bridge']) {
      return { nodeId: 'retrieval-bridge', label: 'Cross the Retrieval Bridge' }
    }
    return { nodeId: null, label: 'Foundations Camp complete — next region coming soon' }
  },

  collectedArtifacts: () => {
    const a = get().artifacts
    return Object.values(a).filter(Boolean).length
  },

  setNearby: (id) => {
    if (get().nearbyNodeId !== id) set({ nearbyNodeId: id })
  },

  setLessonPage: (n) => {
    if (get().lessonPage !== n) set({ lessonPage: n })
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

    // completion effects for this slice
    if (id === 'ranking-sandbox' && !already) {
      set((st) => ({ artifacts: { ...st.artifacts, 'metric-compass': true } }))
      return { spawnArtifact: 'metric-compass', highlightNextPath: true }
    }
    if (id === 'quiz-gate' && !already) {
      // completing the checkpoint lights the bridge
      set((st) => ({ completed: { ...st.completed, 'retrieval-bridge': false } }))
      return { unlockBridge: 'retrieval-bridge', highlightNextPath: true }
    }
    return { highlightNextPath: true }
  },

  talkToGuide: () => set({ talkedToGuide: true }),

  setReducedMotion: (v) => set({ reducedMotion: v }),

  reset: () =>
    set({
      completed: emptyCompleted(),
      artifacts: emptyArtifacts(),
      talkedToGuide: false,
      mode: 'explore',
      nearbyNodeId: null,
      activeNodeId: null,
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
