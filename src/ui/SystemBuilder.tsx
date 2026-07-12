import {
  BaseEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Activity,
  Boxes,
  Check,
  CircleGauge,
  Database,
  Film,
  Filter,
  GitMerge,
  Layers3,
  Maximize2,
  Network,
  Orbit,
  Play,
  Plus,
  RefreshCw,
  Rows3,
  Shuffle,
  SlidersHorizontal,
  Timer,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react'
import { loadRecommendationDataset, SANDBOX_DATASET, type RuntimeDataset } from '../data/recommenderDataset'
import type { SandboxMovie } from '../data/movielensSandbox'
import {
  SYSTEM_TEMPLATES,
  type SystemTemplate,
  type SystemTemplateId,
} from '../data/systemTemplates'
import {
  PIPELINE_MODULES,
  simulatePipeline,
  simulateServiceDays,
  type ModuleConfig,
  type ModuleFamily,
  type NodeTrace,
  type PipelineModuleType,
  type SimulationResult,
} from '../logic/systemSimulator'

type RunState = 'idle' | 'queued' | 'active' | 'complete' | 'error'
type RunStatus = 'ready' | 'dirty' | 'running' | 'complete' | 'error'
type MobileTab = 'graph' | 'modules' | 'slate'
type LayoutMode = 'diagram' | 'isometric'
type ResultsView = 'recommendations' | 'trace' | 'service' | 'dataset'
type NodePositionMap = Record<string, { x: number; y: number }>

interface BuilderNodeData extends Record<string, unknown> {
  moduleType: PipelineModuleType
  config: ModuleConfig
  trace?: NodeTrace
  runState: RunState
}

type BuilderNode = Node<BuilderNodeData, 'systemModule'>
type BuilderEdge = Edge<Record<string, unknown>>

const NODE_TYPES = { systemModule: SystemModuleNode }
const EDGE_TYPES = { isometric: IsometricEdge }
const FAMILY_ORDER: ModuleFamily[] = ['data', 'retrieval', 'control', 'ranking', 'evaluation', 'output']
const FAMILY_LABELS: Record<ModuleFamily, string> = {
  data: 'Data',
  retrieval: 'Retrieval',
  control: 'Control',
  ranking: 'Ranking',
  evaluation: 'Evaluation',
  output: 'Delivery',
}

const FAMILY_COLORS: Record<ModuleFamily, string> = {
  data: '#4aa7b5',
  retrieval: '#27ad9f',
  control: '#e0aa35',
  ranking: '#ef765f',
  evaluation: '#56a96a',
  output: '#254855',
}

const MODULE_ICONS: Record<PipelineModuleType, LucideIcon> = {
  ratingsSource: Database,
  featureStore: Rows3,
  eventStream: Activity,
  popularity: TrendingUp,
  collaborative: UsersRound,
  vectorSearch: Orbit,
  matrixFactorization: Boxes,
  bpr: GitMerge,
  twoTower: Network,
  sequenceTransformer: Layers3,
  blend: GitMerge,
  seenFilter: Filter,
  ranker: SlidersHorizontal,
  diversify: Shuffle,
  evaluator: CircleGauge,
  generativeReranker: Orbit,
  rlPolicy: Shuffle,
  onlineServing: Timer,
  output: Film,
}

const INITIAL_LAYOUT_MODE: LayoutMode = 'isometric'
const initialTemplate = SYSTEM_TEMPLATES.hybrid
const initialDiagramNodes = nodesFromTemplate(initialTemplate)
const initialEdges = edgesFromTemplate(initialTemplate, INITIAL_LAYOUT_MODE)
const initialIsoPositions = createIsometricLayout(initialDiagramNodes, initialEdges)
const initialNodes = applyNodePositions(initialDiagramNodes, initialIsoPositions)
const initialResult = simulatePipeline('u104', specsFromNodes(initialNodes), specsFromEdges(initialEdges), SANDBOX_DATASET)

export function SystemBuilder({ onClose }: { onClose: () => void }) {
  return (
    <ReactFlowProvider>
      <SystemBuilderSurface onClose={onClose} />
    </ReactFlowProvider>
  )
}

function SystemBuilderSurface({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const nodeCounter = useRef(0)
  const hasAnimatedInitial = useRef(false)
  const positionsByMode = useRef<Record<LayoutMode, NodePositionMap>>({
    diagram: positionsFromNodes(initialDiagramNodes),
    isometric: initialIsoPositions,
  })
  const [flow, setFlow] = useState<ReactFlowInstance<BuilderNode, BuilderEdge> | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(initialEdges)
  const [viewerId, setViewerId] = useState('u104')
  const [dataset, setDataset] = useState<RuntimeDataset>(SANDBOX_DATASET)
  const [datasetReady, setDatasetReady] = useState(false)
  const [templateId, setTemplateId] = useState<SystemTemplateId>('hybrid')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('blend')
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(initialResult.recommendations[0]?.movieId ?? null)
  const [result, setResult] = useState<SimulationResult>(initialResult)
  const [resultViewerId, setResultViewerId] = useState('u104')
  const [runStatus, setRunStatus] = useState<RunStatus>('ready')
  const [mobileTab, setMobileTab] = useState<MobileTab>('graph')
  const [traceSpeed, setTraceSpeed] = useState<1 | 2>(2)
  const [resultsView, setResultsView] = useState<ResultsView>('recommendations')
  const [viewMode, setViewMode] = useState<LayoutMode>(INITIAL_LAYOUT_MODE)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  useEffect(() => {
    let cancelled = false
    loadRecommendationDataset().then((loaded) => {
      if (cancelled) return
      const nextViewerId = loaded.viewerById[viewerId] ? viewerId : loaded.viewers[0]?.id ?? 'u104'
      const bootstrapResult = simulatePipeline(nextViewerId, specsFromNodes(initialNodes), specsFromEdges(initialEdges), loaded)
      setResult(bootstrapResult)
      setSelectedMovieId(bootstrapResult.recommendations[0]?.movieId ?? null)
      setDataset(loaded)
      setViewerId(nextViewerId)
      setResultViewerId(nextViewerId)
      setDatasetReady(true)
    })
    return () => { cancelled = true }
  }, [])

  const animateRun = useCallback((sourceNodes: BuilderNode[], sourceEdges: BuilderEdge[], activeViewerId: string) => {
    clearTimers()
    const nextResult = simulatePipeline(activeViewerId, specsFromNodes(sourceNodes), specsFromEdges(sourceEdges), dataset)
    const sequence = Object.keys(nextResult.trace)
    const stepMs = traceSpeed === 2 ? 46 : 92
    setRunStatus('running')
    setNodes((current) => current.map((node) => ({
      ...node,
      data: { ...node.data, trace: undefined, runState: 'queued' },
    })))
    setEdges((current) => current.map((edge) => ({ ...edge, animated: true, className: 'foundry-edge is-running' })))

    if (!sequence.length) {
      setResult(nextResult)
      setRunStatus('error')
      return
    }

    sequence.forEach((nodeId, index) => {
      const timer = window.setTimeout(() => {
        const processed = new Set(sequence.slice(0, index + 1))
        setNodes((current) => current.map((node) => {
          const trace = nextResult.trace[node.id]
          const isCurrent = node.id === nodeId
          const runState: RunState = isCurrent
            ? trace?.status === 'error' ? 'error' : 'active'
            : processed.has(node.id)
            ? trace?.status === 'error' ? 'error' : 'complete'
            : 'queued'
          return { ...node, data: { ...node.data, trace: processed.has(node.id) ? trace : undefined, runState } }
        }))
        setEdges((current) => current.map((edge) => ({
          ...edge,
          animated: edge.target === nodeId || processed.has(edge.target),
          className: processed.has(edge.target) ? 'foundry-edge is-traced' : 'foundry-edge is-running',
        })))

        if (index === sequence.length - 1) {
          const finishTimer = window.setTimeout(() => {
            setNodes((current) => current.map((node) => {
              const trace = nextResult.trace[node.id]
              return {
                ...node,
                data: {
                  ...node.data,
                  trace,
                  runState: trace?.status === 'error' ? 'error' : trace ? 'complete' : 'idle',
                },
              }
            }))
            setEdges((current) => current.map((edge) => ({
              ...edge,
              animated: false,
              className: 'foundry-edge is-traced',
            })))
            setResult(nextResult)
            setResultViewerId(activeViewerId)
            setSelectedMovieId((current) => (
              current && nextResult.recommendations.some((candidate) => candidate.movieId === current)
                ? current
                : nextResult.recommendations[0]?.movieId ?? null
            ))
            setRunStatus(nextResult.error ? 'error' : 'complete')
          }, traceSpeed === 2 ? 70 : 130)
          timers.current.push(finishTimer)
        }
      }, stepMs * (index + 1))
      timers.current.push(timer)
    })
  }, [clearTimers, dataset, setEdges, setNodes, traceSpeed])

  useEffect(() => {
    if (!datasetReady || !dataset.meta.isOfficial || hasAnimatedInitial.current) return
    hasAnimatedInitial.current = true
    const timer = window.setTimeout(() => animateRun(initialNodes, initialEdges, 'u104'), 260)
    timers.current.push(timer)
  }, [animateRun, dataset.meta.isOfficial, datasetReady])

  const runPipeline = useCallback(() => {
    if (!dataset.meta.isOfficial) return
    animateRun(nodes, edges, viewerId)
  }, [animateRun, dataset.meta.isOfficial, edges, nodes, viewerId])


  // A stable signature of the graph *topology* (which nodes exist + how they wire
  // together) — deliberately ignores node positions so that manual drags never
  // trigger a relayout, only structural edits do.
  const topologySignature = useMemo(() => {
    const nodeKey = nodes.map((node) => node.id).sort().join('|')
    const edgeKey = edges.map((edge) => `${edge.source}>${edge.target}`).sort().join('|')
    return `${nodeKey}::${edgeKey}`
  }, [nodes, edges])
  const lastTopology = useRef(topologySignature)

  // In isometric mode the graph *is* the diorama: whenever the wiring changes
  // (module added, connected, or removed) re-flow the isometric layers so the
  // scene visibly reacts to the edit instead of ignoring it.
  useEffect(() => {
    if (viewMode !== 'isometric') {
      lastTopology.current = topologySignature
      return
    }
    if (lastTopology.current === topologySignature) return
    lastTopology.current = topologySignature
    const layout = createIsometricLayout(nodes, edges)
    if (!Object.keys(layout).length) return
    positionsByMode.current.isometric = layout
    setNodes((current) => applyNodePositions(current, layout))
    const timer = window.setTimeout(() => {
      if (flow) focusLayoutView(flow, templateId, 'isometric', 420)
    }, 60)
    timers.current.push(timer)
  }, [topologySignature, viewMode, nodes, edges, flow, setNodes, templateId])

  const loadTemplate = useCallback((id: SystemTemplateId) => {
    clearTimers()
    const template = SYSTEM_TEMPLATES[id]
    const diagramNodes = nodesFromTemplate(template)
    const nextEdges = edgesFromTemplate(template, viewMode)
    const isometricPositions = createIsometricLayout(diagramNodes, nextEdges)
    positionsByMode.current = {
      diagram: positionsFromNodes(diagramNodes),
      isometric: isometricPositions,
    }
    const nextNodes = viewMode === 'isometric'
      ? applyNodePositions(diagramNodes, isometricPositions)
      : diagramNodes
    setTemplateId(id)
    setNodes(nextNodes)
    setEdges(nextEdges)
    setSelectedNodeId(nextNodes.find((node) => node.data.moduleType === 'blend')?.id ?? nextNodes[0]?.id ?? null)
    setRunStatus('dirty')
    const timer = window.setTimeout(() => {
      if (flow) focusLayoutView(flow, id, viewMode, 480)
    }, 80)
    timers.current.push(timer)
  }, [clearTimers, flow, setEdges, setNodes, viewMode])

  const switchViewMode = useCallback((nextMode: LayoutMode) => {
    if (nextMode === viewMode) return
    positionsByMode.current[viewMode] = positionsFromNodes(nodes)
    const stored = positionsByMode.current[nextMode]
    const hasEveryPosition = nodes.every((node) => stored[node.id])
    const computed = nextMode === 'isometric'
      ? createIsometricLayout(nodes, edges)
      : positionsFromNodes(nodes)
    const nextPositions = hasEveryPosition ? stored : { ...computed, ...stored }
    positionsByMode.current[nextMode] = nextPositions
    setViewMode(nextMode)
    setNodes((current) => applyNodePositions(current, nextPositions))
    setEdges((current) => current.map((edge) => ({
      ...edge,
      type: edgeTypeForMode(nextMode),
    })))
    const timer = window.setTimeout(() => {
      if (flow) focusLayoutView(flow, templateId, nextMode, 460)
    }, 70)
    timers.current.push(timer)
  }, [edges, flow, nodes, setEdges, setNodes, templateId, viewMode])

  const markDirty = useCallback(() => {
    clearTimers()
    setRunStatus('dirty')
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, runState: 'idle', trace: undefined } })))
    setEdges((current) => current.map((edge) => ({ ...edge, animated: false, className: 'foundry-edge' })))
  }, [clearTimers, setEdges, setNodes])

  const updateConfig = useCallback((nodeId: string, key: string, value: number | boolean) => {
    setNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, config: { ...node.data.config, [key]: value }, trace: undefined, runState: 'idle' } }
      : node))
    markDirty()
  }, [markDirty, setNodes])

  const addModule = useCallback((moduleType: PipelineModuleType, position?: { x: number; y: number }) => {
    nodeCounter.current += 1
    const definition = PIPELINE_MODULES[moduleType]
    const fallback = flow?.screenToFlowPosition({
      x: window.innerWidth * 0.52,
      y: window.innerHeight * 0.42,
    }) ?? { x: 420, y: 180 }
    const id = `${moduleType}-${Date.now()}-${nodeCounter.current}`
    const stagger = nodeCounter.current % 5
    const node: BuilderNode = {
      id,
      type: 'systemModule',
      position: position ?? { x: fallback.x + stagger * 24, y: fallback.y + stagger * 20 },
      data: {
        moduleType,
        config: { ...definition.defaultConfig },
        runState: 'idle',
      },
    }
    positionsByMode.current[viewMode][id] = { ...node.position }
    setNodes((current) => [...current, node])
    setSelectedNodeId(id)
    setMobileTab('graph')
    markDirty()
  }, [flow, markDirty, setNodes, viewMode])

  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) return
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
    markDirty()
  }, [markDirty, selectedNodeId, setEdges, setNodes])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({
      ...connection,
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      type: edgeTypeForMode(viewMode),
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
      className: 'foundry-edge',
    }, current))
    markDirty()
  }, [markDirty, setEdges, viewMode])

  const isValidConnection = useCallback((connection: Connection | BuilderEdge) => {
    const source = connection.source
    const target = connection.target
    if (!source || !target || source === target) return false
    const sourceNode = nodes.find((node) => node.id === source)
    const targetNode = nodes.find((node) => node.id === target)
    if (!sourceNode || !targetNode) return false
    if (!PIPELINE_MODULES[sourceNode.data.moduleType].emitsOutput) return false
    if (!PIPELINE_MODULES[targetNode.data.moduleType].acceptsInput) return false
    if (edges.some((edge) => edge.source === source && edge.target === target)) return false

    const stack = [target]
    const seen = new Set<string>()
    while (stack.length) {
      const current = stack.pop()!
      if (current === source) return false
      if (seen.has(current)) continue
      seen.add(current)
      for (const edge of edges) if (edge.source === current) stack.push(edge.target)
    }
    return true
  }, [edges, nodes])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const moduleType = event.dataTransfer.getData('application/recsys-module') as PipelineModuleType
    if (!moduleType || !PIPELINE_MODULES[moduleType] || !flow) return
    addModule(moduleType, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }, [addModule, flow])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="system-builder-overlay" role="dialog" aria-modal="true" aria-label="RecSys Foundry">
      <div className="system-builder" data-mobile-tab={mobileTab} data-view-mode={viewMode}>
        <FoundryHeader
          dataset={dataset}
          datasetReady={datasetReady}
          viewerId={viewerId}
          templateId={templateId}
          runStatus={runStatus}
          onViewerChange={(id) => { setViewerId(id); markDirty() }}
          onTemplateChange={loadTemplate}
          onReset={() => loadTemplate(templateId)}
          onRun={runPipeline}
          onClose={onClose}
        />

        <nav className="foundry-mobile-tabs" aria-label="Foundry views">
          <button type="button" className={mobileTab === 'graph' ? 'is-active' : ''} onClick={() => setMobileTab('graph')}><Network size={15} />Graph</button>
          <button type="button" className={mobileTab === 'modules' ? 'is-active' : ''} onClick={() => setMobileTab('modules')}><Boxes size={15} />Modules</button>
          <button type="button" className={mobileTab === 'slate' ? 'is-active' : ''} onClick={() => setMobileTab('slate')}><Film size={15} />Slate</button>
        </nav>

        <div className="foundry-workspace">
          <ModulePalette onAdd={addModule} />

          <main className="foundry-canvas" ref={canvasRef} onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow<BuilderNode, BuilderEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={(_, node) => {
                positionsByMode.current[viewMode][node.id] = { ...node.position }
              }}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onInit={(instance) => {
                setFlow(instance)
                window.setTimeout(() => focusLayoutView(instance, templateId, viewMode, 420), 80)
              }}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              minZoom={0.34}
              maxZoom={1.65}
              defaultEdgeOptions={{
                type: edgeTypeForMode(viewMode),
                markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
                className: 'foundry-edge',
              }}
              colorMode="light"
              deleteKeyCode={['Backspace', 'Delete']}
            >
              {viewMode === 'diagram' && <Background variant={BackgroundVariant.Dots} gap={18} size={1.15} color="#aac2c5" />}
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(node) => FAMILY_COLORS[(node.data as BuilderNodeData).moduleType ? PIPELINE_MODULES[(node.data as BuilderNodeData).moduleType].family : 'data']}
                maskColor="rgba(229, 239, 239, 0.82)"
                pannable
                zoomable
              />
            </ReactFlow>
            <button type="button" className="foundry-fit-button" onClick={() => flow?.fitView({ padding: 0.16, duration: 380 })} aria-label="Fit graph" title="Fit graph">
              <Maximize2 size={16} />
            </button>
            <div className="foundry-canvas-view-toggle">
              <FoundryViewToggle viewMode={viewMode} onChange={switchViewMode} />
            </div>
            <div className="foundry-canvas-status" aria-live="polite">
              <span className={`status-dot status-${runStatus}`} />
              <span>{statusLabel(runStatus)}</span>
              <strong>{nodes.length} modules</strong>
              <button
                type="button"
                className="foundry-speed"
                onClick={() => setTraceSpeed((current) => current === 2 ? 1 : 2)}
                aria-label="Change trace speed"
                title="Trace speed"
              >
                <CircleGauge size={12} />{traceSpeed}×
              </button>
            </div>
          </main>

          <NodeInspector
            dataset={dataset}
            node={selectedNode}
            onConfigChange={updateConfig}
            onDelete={removeSelectedNode}
            onOpenTrace={() => { setResultsView('trace'); setMobileTab('slate') }}
          />
        </div>

        <FoundryResults
          dataset={dataset}
          datasetReady={datasetReady}
          viewerId={resultViewerId}
          result={result}
          runStatus={runStatus}
          activeView={resultsView}
          selectedMovieId={selectedMovieId}
          onSelectMovie={setSelectedMovieId}
          onViewChange={(view) => { setResultsView(view); setMobileTab('slate') }}
        />
      </div>
    </div>
  )
}

function FoundryHeader({
  dataset,
  datasetReady,
  viewerId,
  templateId,
  runStatus,
  onViewerChange,
  onTemplateChange,
  onReset,
  onRun,
  onClose,
}: {
  dataset: RuntimeDataset
  datasetReady: boolean
  viewerId: string
  templateId: SystemTemplateId
  runStatus: RunStatus
  onViewerChange: (id: string) => void
  onTemplateChange: (id: SystemTemplateId) => void
  onReset: () => void
  onRun: () => void
  onClose: () => void
}) {
  return (
    <header className="foundry-header">
      <div className="foundry-brand">
        <span><Network size={20} /></span>
        <div><strong>REC.SYS FOUNDRY</strong><small>{!datasetReady ? 'Loading official MovieLens 100K' : dataset.meta.isOfficial ? 'Official MovieLens 100K lab' : 'MovieLens data required'}</small></div>
      </div>
      <div className={`foundry-dataset-chip ${dataset.meta.isOfficial ? 'is-official' : 'is-fallback'}`} title={dataset.meta.notice}><Database size={14} /><strong>{dataset.meta.ratingsCount.toLocaleString()}</strong><span>ratings</span><i /><strong>{dataset.meta.moviesCount.toLocaleString()}</strong><span>films</span></div>
      <label className="foundry-select">
        <span><UserRound size={13} />Viewer</span>
        <select value={viewerId} onChange={(event) => onViewerChange(event.target.value)}>
          {dataset.viewers.map((viewer) => <option key={viewer.id} value={viewer.id}>{viewer.id.toUpperCase()} · {viewer.name}</option>)}
        </select>
      </label>
      <label className="foundry-select template-select">
        <span><Layers3 size={13} />Template</span>
        <select value={templateId} onChange={(event) => onTemplateChange(event.target.value as SystemTemplateId)}>
          {(Object.values(SYSTEM_TEMPLATES) as SystemTemplate[]).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      <button type="button" className={`foundry-run status-${runStatus}`} onClick={onRun} disabled={runStatus === 'running' || !datasetReady || !dataset.meta.isOfficial}>
        {runStatus === 'running' || !datasetReady ? <Activity size={17} /> : <Play size={17} fill="currentColor" />}
        <span>{!datasetReady ? 'Loading MovieLens' : !dataset.meta.isOfficial ? 'MovieLens required' : runStatus === 'running' ? 'Tracing request' : 'Run pipeline'}</span>
      </button>
      <button type="button" className="foundry-reset" onClick={onReset} aria-label="Reset template" title="Reset template"><RefreshCw size={16} /></button>
      <button type="button" className="foundry-close" onClick={onClose} aria-label="Close Foundry" title="Close Foundry"><X size={19} /></button>
    </header>
  )
}

function FoundryViewToggle({
  viewMode,
  onChange,
  compact = false,
}: {
  viewMode: LayoutMode
  onChange: (mode: LayoutMode) => void
  compact?: boolean
}) {
  return (
    <div className={`foundry-view-toggle${compact ? ' is-compact' : ''}`} role="group" aria-label="Graph layout">
      <button
        type="button"
        className={viewMode === 'diagram' ? 'is-active' : ''}
        onClick={() => onChange('diagram')}
        aria-pressed={viewMode === 'diagram'}
        title="Diagram view"
      >
        <Network size={13} /><span>Diagram</span>
      </button>
      <button
        type="button"
        className={viewMode === 'isometric' ? 'is-active' : ''}
        onClick={() => onChange('isometric')}
        aria-pressed={viewMode === 'isometric'}
        title="Isometric view"
      >
        <Boxes size={13} /><span>Isometric</span>
      </button>
    </div>
  )
}

function ModulePalette({ onAdd }: { onAdd: (type: PipelineModuleType) => void }) {
  return (
    <aside className="foundry-palette">
      <header><span>Module library</span><strong>{Object.keys(PIPELINE_MODULES).length}</strong></header>
      <div className="foundry-palette-scroll">
        {FAMILY_ORDER.map((family) => (
          <section key={family} style={{ '--family-color': FAMILY_COLORS[family] } as CSSProperties}>
            <h2>{FAMILY_LABELS[family]}</h2>
            {Object.values(PIPELINE_MODULES).filter((module) => module.family === family).map((module) => {
              const Icon = MODULE_ICONS[module.type]
              return (
                <button
                  type="button"
                  key={module.type}
                  className="foundry-palette-module"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/recsys-module', module.type)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => onAdd(module.type)}
                >
                  <span><Icon size={14} /></span>
                  <strong>{module.shortLabel}</strong>
                  <Plus size={13} />
                </button>
              )
            })}
          </section>
        ))}
      </div>
    </aside>
  )
}

function NodeInspector({
  node,
  dataset,
  onConfigChange,
  onDelete,
  onOpenTrace,
}: {
  node: BuilderNode | null
  onConfigChange: (nodeId: string, key: string, value: number | boolean) => void
  dataset: RuntimeDataset
  onDelete: () => void
  onOpenTrace: () => void
}) {
  if (!node) {
    return (
      <aside className="foundry-inspector is-empty">
        <Network size={24} />
        <strong>No module selected</strong>
        <span>Pipeline overview</span>
      </aside>
    )
  }
  const definition = PIPELINE_MODULES[node.data.moduleType]
  const Icon = MODULE_ICONS[node.data.moduleType]
  const trace = node.data.trace
  return (
    <aside className="foundry-inspector" style={{ '--family-color': FAMILY_COLORS[definition.family] } as CSSProperties}>
      <header>
        <span className="inspector-icon"><Icon size={18} /></span>
        <div><small>{FAMILY_LABELS[definition.family]}</small><h2>{definition.label}</h2></div>
        <button type="button" onClick={onDelete} aria-label="Delete module" title="Delete module"><Trash2 size={15} /></button>
      </header>
      <p>{definition.description}</p>
      <div className="inspector-technology"><span>{definition.technology}</span><b>{definition.fidelity}</b></div>
      <div className="inspector-trace">
        <span><small>Input</small><strong>{trace?.inputCount ?? '—'}</strong></span>
        <i />
        <span><small>Output</small><strong>{trace?.outputCount ?? '—'}</strong></span>
        <span><small>Node</small><strong>{trace ? `${trace.latencyMs} ms` : '—'}</strong></span>
      <StageLineage trace={trace} dataset={dataset} />
      {trace && <button type="button" className="inspector-open-trace" onClick={onOpenTrace}><Maximize2 size={13} />Open stage details</button>}
      </div>
      <section className="inspector-config">
        <h3>Configuration</h3>
        {definition.fields.length === 0 && <div className="inspector-static"><Check size={14} />No runtime parameters</div>}
        {definition.fields.map((field) => {
          const value = node.data.config[field.key] ?? definition.defaultConfig[field.key]
          if (field.type === 'toggle') {
            return (
              <label className="inspector-toggle" key={field.key}>
                <span>{field.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => onConfigChange(node.id, field.key, event.target.checked)}
                />
                <i />
              </label>
            )
          }
          if (field.type === 'number') {
            return (
              <label className="inspector-number" key={field.key}>
                <span>{field.label}</span>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(value)}
                  onChange={(event) => onConfigChange(node.id, field.key, Number(event.target.value))}
                />
              </label>
            )
          }
          const numberValue = Number(value)
          const min = field.min ?? 0
          const max = field.max ?? 1
          const progress = ((numberValue - min) / Math.max(0.001, max - min)) * 100
          return (
            <label className="inspector-range" key={field.key}>
              <span>{field.label}<strong>{formatFieldValue(numberValue, field.step)}</strong></span>
              <input
                type="range"
                min={min}
                max={max}
                step={field.step}
                value={numberValue}
                style={{ '--range-progress': `${progress}%` } as CSSProperties}
                onChange={(event) => onConfigChange(node.id, field.key, Number(event.target.value))}
              />
            </label>
          )
        })}
      </section>
      {trace?.message && <div className="inspector-error">{trace.message}</div>}
    </aside>
  )
}

function StageLineage({ trace, dataset, expanded = false }: { trace?: NodeTrace; dataset: RuntimeDataset; expanded?: boolean }) {
  const [view, setView] = useState<'input' | 'output' | 'removed'>('output')
  if (!trace) {
    return (
      <section className="stage-lineage is-empty">
        <header><span>Item lineage</span><small>Run pipeline to inspect</small></header>
        <p>The last completed trace stays frozen while you edit the graph.</p>
      </section>
    )
  }

  const items = view === 'input' ? trace.inputItems : view === 'removed' ? trace.removedItems : trace.outputItems
  return (
    <section className={`stage-lineage${expanded ? ' is-expanded' : ''}`}>
      <header>
        <span>Item lineage</span>
        <small>{trace.summary}</small>
      </header>
      <div className="stage-lineage-tabs" role="tablist" aria-label="Stage item sets">
        <button type="button" className={view === 'input' ? 'is-active' : ''} onClick={() => setView('input')}>In <b>{trace.inputCount}</b></button>
        <button type="button" className={view === 'output' ? 'is-active' : ''} onClick={() => setView('output')}>Out <b>{trace.outputCount}</b></button>
        <button type="button" className={view === 'removed' ? 'is-active' : ''} onClick={() => setView('removed')}>Dropped <b>{Math.max(0, trace.inputCount - trace.outputCount)}</b></button>
      </div>
      <div className="stage-lineage-items">
        {items.length === 0 && <p>No item snapshots in this set.</p>}
        {items.slice(0, expanded ? 36 : 12).map((item) => {
          const movie = dataset.movieById[item.movieId]
          if (!movie) return null
          const removalReason = 'removalReason' in item ? String(item.removalReason) : null
          return (
            <article key={item.movieId}>
              <span className="stage-item-poster movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} />
              <span className="stage-item-copy">
                <strong><i>{String(item.rank).padStart(2, '0')}</i>{movie.title}</strong>
                <small>{movie.year} · {movie.genres.slice(0, 2).join(' / ')}</small>
                <em>{removalReason ?? item.reasons[0] ?? 'Candidate retained'}</em>
              </span>
              <b>{item.score.toFixed(2)}</b>
            </article>
          )
        })}
      </div>
      {items.length > (expanded ? 36 : 12) && <footer>Showing {expanded ? 36 : 12} of {items.length} captured items · counts above reflect the full stage.</footer>}
    </section>
  )
}

function FoundryResults({
  viewerId,
  dataset,
  datasetReady,
  result,
  runStatus,
  activeView,
  selectedMovieId,
  onSelectMovie,
  onViewChange,
}: {
  dataset: RuntimeDataset
  datasetReady: boolean
  viewerId: string
  result: SimulationResult
  runStatus: RunStatus
  activeView: ResultsView
  selectedMovieId: string | null
  onSelectMovie: (id: string) => void
  onViewChange: (view: ResultsView) => void
}) {
  const viewer = dataset.viewerById[viewerId] ?? dataset.viewers[0]
  const selectedCandidate = result.recommendations.find((candidate) => candidate.movieId === selectedMovieId)
    ?? result.recommendations[0]
  const profileEvidence = [...(dataset.ratingsByViewer.get(viewerId) ?? [])]
    .filter((rating) => rating.rating >= 4)
    .sort((a, b) => b.rating - a.rating || (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, 4)

  if (!datasetReady) {
    return (
      <section className="foundry-results is-dataset-state" aria-live="polite">
        <Activity size={24} />
        <div><strong>Loading official MovieLens 100K</strong><span>Preparing 100,000 historical ratings, 943 viewers and 1,682 films.</span></div>
      </section>
    )
  }

  if (!dataset.meta.isOfficial) {
    return (
      <section className="foundry-results is-dataset-state is-unavailable" role="alert">
        <Database size={24} />
        <div><strong>Official MovieLens data is required</strong><span>The Foundry does not substitute synthetic recommendations. Run <code>npm run data:movielens</code> to prepare the local educational payload.</span></div>
      </section>
    )
  }

  const tabs: Array<{ id: ResultsView; label: string; detail: string; Icon: LucideIcon }> = [
    { id: 'recommendations', label: 'Recommendations', detail: `${result.recommendations.length} explained films`, Icon: Film },
    { id: 'trace', label: 'Stage trace', detail: `${result.visitedNodeIds.length} processing stages`, Icon: Network },
    { id: 'service', label: 'Service simulation', detail: 'Counterfactual feedback', Icon: Activity },
    { id: 'dataset', label: 'MovieLens data', detail: 'Ratings and provenance', Icon: Database },
  ]

  return (
    <section className={`foundry-results${runStatus === 'running' ? ' is-running' : ''}${runStatus === 'dirty' ? ' has-pending-changes' : ''}`}>
      <header className="foundry-results-nav">
        <div className="foundry-results-source">
          <span><Check size={13} />Official dataset</span>
          <strong>MovieLens 100K</strong>
          <small>{dataset.meta.ratingsCount.toLocaleString()} ratings · {dataset.meta.viewersCount.toLocaleString()} viewers · {dataset.meta.moviesCount.toLocaleString()} films</small>
        </div>
        <div className="foundry-results-tabs" role="tablist" aria-label="Simulation results">
          {tabs.map(({ id, label, detail, Icon }) => (
            <button
              type="button"
              key={id}
              className={activeView === id ? 'is-active' : ''}
              onClick={() => onViewChange(id)}
              role="tab"
              aria-selected={activeView === id}
            >
              <Icon size={15} />
              <span><strong>{label}</strong><small>{detail}</small></span>
            </button>
          ))}
        </div>
        {runStatus === 'dirty' && <span className="foundry-pending-note">Draft changes are not applied until Run pipeline</span>}
      </header>

      {activeView === 'recommendations' && (
        <div className="foundry-results-view is-recommendations" role="tabpanel">
          <div className="foundry-viewer-card">
            <span><UserRound size={20} /></span>
            <div><small>Real MovieLens profile · {viewer.id.toUpperCase()}</small><strong>{viewer.name}</strong><em>{viewer.cohort}</em></div>
            <p>{viewer.note}</p>
            <div className="viewer-genres">{viewer.favoriteGenres.map((genre) => <i key={genre}>{genre}</i>)}</div>
            <div className="viewer-evidence">
              <small>Historical ratings used as evidence</small>
              <div>
                {profileEvidence.map((rating) => {
                  const movie = dataset.movieById[rating.movieId]
                  if (!movie) return null
                  return (
                    <span
                      key={movie.id}
                      className="viewer-poster movie-poster-art"
                      style={moviePosterStyle(movie, dataset)}
                      data-mark={movie.mark}
                      data-year={movie.year}
                      role="img"
                      aria-label={`${movie.title} cover, rated ${rating.rating}`}
                      title={`${movie.title} · ${rating.rating}/5 · ${formatRatingDate(rating.timestamp)}`}
                    />
                  )
                })}
              </div>
            </div>
            <button type="button" className="foundry-data-link" onClick={() => onViewChange('dataset')}><Database size={13} />Inspect this viewer's ratings</button>
          </div>

          <div className="foundry-recommendation-main">
            <div className="foundry-metrics">
              <MetricCell label="Quality" value={result.metrics.quality} color="#ef765f" />
              <MetricCell label="Diversity" value={result.metrics.diversity} color="#e0aa35" />
              <MetricCell label="Coverage" value={result.metrics.coverage} color="#27ad9f" />
              <MetricCell label="Novelty" value={result.metrics.novelty} color="#6c6cc7" />
              <div className="foundry-latency"><Timer size={17} /><span><strong>{result.metrics.latencyMs}</strong><small>ms critical path</small></span></div>
            </div>

            <div className="foundry-slate">
              <header>
                <div>
                  <span>Recommendation slate</span>
                  <em>{runStatus === 'dirty' ? 'Last completed run · Draft not applied' : runStatus === 'running' ? 'Pipeline is running · Results stay frozen' : 'Select a film to understand its score'}</em>
                </div>
                <button type="button" className="foundry-open-trace" onClick={() => onViewChange('trace')}><Network size={14} />Inspect stage trace</button>
              </header>
              {result.error ? (
                <div className="foundry-result-error"><Activity size={18} /><span>{result.error}</span></div>
              ) : (
                <div className="foundry-slate-layout">
                  <div className="foundry-movie-row">
                    {result.recommendations.map((candidate, index) => {
                      const movie = dataset.movieById[candidate.movieId]
                      if (!movie) return null
                      const selected = selectedMovieId === movie.id
                      return (
                        <button
                          type="button"
                          key={movie.id}
                          className={`foundry-movie-card${selected ? ' is-selected' : ''}`}
                          style={{ '--movie-tone': movie.tone, '--movie-score': `${candidate.score * 100}%` } as CSSProperties}
                          onClick={() => onSelectMovie(movie.id)}
                          aria-pressed={selected}
                          aria-label={`Explain recommendation ${movie.title}`}
                        >
                          <span className="movie-rank">#{index + 1}</span>
                          <span className="movie-cover movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} role="img" aria-label={`${movie.title} cover`} />
                          <span className="movie-copy"><strong>{movie.title}</strong><small>{movie.year} · {movie.genres.join(' / ')}</small><em>{candidate.reasons[0]}</em></span>
                          <span className="movie-score"><b>{candidate.score.toFixed(2)}</b><i><em /></i></span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedCandidate && <RecommendationExplanation candidate={selectedCandidate} viewerId={viewerId} dataset={dataset} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'trace' && <PipelineTraceExplorer dataset={dataset} result={result} runStatus={runStatus} />}
      {activeView === 'service' && <ServiceSimulator dataset={dataset} viewerId={viewerId} result={result} runStatus={runStatus} />}
      {activeView === 'dataset' && <MovieLensDataExplorer dataset={dataset} viewerId={viewerId} />}
    </section>
  )
}

function PipelineTraceExplorer({
  dataset,
  result,
  runStatus,
}: {
  dataset: RuntimeDataset
  result: SimulationResult
  runStatus: RunStatus
}) {
  const traces = result.visitedNodeIds
    .map((nodeId) => result.trace[nodeId])
    .filter((trace): trace is NodeTrace => Boolean(trace))
  const [selectedStageId, setSelectedStageId] = useState(traces[0]?.nodeId ?? '')

  useEffect(() => {
    if (!traces.some((trace) => trace.nodeId === selectedStageId)) setSelectedStageId(traces[0]?.nodeId ?? '')
  }, [result, selectedStageId, traces])

  const selectedTrace = traces.find((trace) => trace.nodeId === selectedStageId) ?? traces[0]
  return (
    <div className="foundry-results-view foundry-trace-explorer" role="tabpanel">
      <aside className="trace-stage-rail">
        <header><span>Pipeline stages</span><small>Select a stage to inspect every captured item.</small></header>
        <div>
          {traces.map((trace, index) => {
            const definition = PIPELINE_MODULES[trace.moduleType]
            const Icon = MODULE_ICONS[trace.moduleType]
            return (
              <button type="button" key={trace.nodeId} className={selectedTrace?.nodeId === trace.nodeId ? 'is-active' : ''} onClick={() => setSelectedStageId(trace.nodeId)}>
                <i>{String(index + 1).padStart(2, '0')}</i>
                <span style={{ '--trace-color': FAMILY_COLORS[definition.family] } as CSSProperties}><Icon size={15} /></span>
                <div><strong>{definition.label}</strong><small>{trace.inputCount.toLocaleString()} in → {trace.outputCount.toLocaleString()} out</small></div>
                <b>{trace.latencyMs} ms</b>
              </button>
            )
          })}
        </div>
      </aside>
      <section className="trace-stage-detail">
        {selectedTrace ? (
          <>
            <header>
              <div>
                <small>{FAMILY_LABELS[PIPELINE_MODULES[selectedTrace.moduleType].family]} · {PIPELINE_MODULES[selectedTrace.moduleType].technology}</small>
                <strong>{PIPELINE_MODULES[selectedTrace.moduleType].label}</strong>
                <p>{selectedTrace.summary}</p>
              </div>
              <div className="trace-stage-metrics">
                <span><small>Input</small><strong>{selectedTrace.inputCount.toLocaleString()}</strong></span>
                <span><small>Output</small><strong>{selectedTrace.outputCount.toLocaleString()}</strong></span>
                <span><small>Dropped</small><strong>{Math.max(0, selectedTrace.inputCount - selectedTrace.outputCount).toLocaleString()}</strong></span>
                <span><small>Path latency</small><strong>{selectedTrace.pathLatencyMs} ms</strong></span>
              </div>
            </header>
            <div className="trace-stage-context">
              <span><Check size={13} />{selectedTrace.fidelity}</span>
              <em>{runStatus === 'dirty' ? 'Showing the last completed run. Press Run pipeline to apply graph changes.' : 'Captured from the latest completed pipeline run.'}</em>
            </div>
            <StageLineage trace={selectedTrace} dataset={dataset} expanded />
          </>
        ) : (
          <div className="trace-empty"><Network size={24} /><strong>No completed stage trace</strong><span>Run the pipeline to capture item-level lineage.</span></div>
        )}
      </section>
    </div>
  )
}

type DatasetView = 'profile' | 'ratings' | 'catalog'

function MovieLensDataExplorer({ dataset, viewerId }: { dataset: RuntimeDataset; viewerId: string }) {
  const [view, setView] = useState<DatasetView>('profile')
  const viewer = dataset.viewerById[viewerId] ?? dataset.viewers[0]
  const viewerRatings = useMemo(() => [...(dataset.ratingsByViewer.get(viewerId) ?? [])]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)), [dataset, viewerId])
  const ratingDistribution = useMemo(() => [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: viewerRatings.filter((row) => Math.round(row.rating) === rating).length,
  })), [viewerRatings])
  const genrePreferences = useMemo(() => {
    const totals = new Map<string, { count: number; score: number }>()
    for (const rating of viewerRatings) {
      const movie = dataset.movieById[rating.movieId]
      if (!movie) continue
      for (const genre of movie.genres) {
        const current = totals.get(genre) ?? { count: 0, score: 0 }
        totals.set(genre, { count: current.count + 1, score: current.score + rating.rating })
      }
    }
    return [...totals.entries()].map(([genre, value]) => ({ genre, count: value.count, average: value.score / value.count }))
      .sort((a, b) => b.average * Math.log1p(b.count) - a.average * Math.log1p(a.count)).slice(0, 8)
  }, [dataset, viewerRatings])
  const catalogEvidence = useMemo(() => dataset.movies.map((movie) => {
    const ratings = dataset.ratingsByMovie.get(movie.id) ?? []
    const average = ratings.length ? ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length : 0
    return { movie, ratings: ratings.length, average }
  }).filter((row) => row.ratings >= 40).sort((a, b) => b.average * Math.log1p(b.ratings) - a.average * Math.log1p(a.ratings)).slice(0, 12), [dataset])
  const maxDistribution = Math.max(1, ...ratingDistribution.map((row) => row.count))

  return (
    <div className="foundry-results-view movielens-explorer" role="tabpanel">
      <aside className="movielens-summary">
        <header><Database size={20} /><div><small>Real educational corpus</small><strong>{dataset.meta.label}</strong></div></header>
        <p>{dataset.meta.source}</p>
        <dl>
          <div><dt>Ratings</dt><dd>{dataset.meta.ratingsCount.toLocaleString()}</dd></div>
          <div><dt>Viewers</dt><dd>{dataset.meta.viewersCount.toLocaleString()}</dd></div>
          <div><dt>Films</dt><dd>{dataset.meta.moviesCount.toLocaleString()}</dd></div>
          <div><dt>Latent factors</dt><dd>{dataset.latent?.dimension ?? '—'}</dd></div>
        </dl>
        <div className="movielens-provenance">
          <small>Data lineage</small>
          <span><b>u.user</b><em>age, gender, occupation</em></span>
          <i />
          <span><b>u.data</b><em>rating + timestamp</em></span>
          <i />
          <span><b>u.item</b><em>title, year, genres</em></span>
          <i />
          <span className="is-output"><b>Foundry</b><em>browser-side simulation</em></span>
        </div>
      </aside>

      <section className="movielens-detail">
        <header>
          <div><small>Selected historical subject</small><strong>{viewer.name} · {viewer.id.toUpperCase()}</strong><span>{viewer.note}</span></div>
          <div className="movielens-tabs" role="tablist" aria-label="MovieLens detail views">
            <button type="button" className={view === 'profile' ? 'is-active' : ''} onClick={() => setView('profile')} role="tab" aria-selected={view === 'profile'}><UserRound size={14} />Profile</button>
            <button type="button" className={view === 'ratings' ? 'is-active' : ''} onClick={() => setView('ratings')} role="tab" aria-selected={view === 'ratings'}><Rows3 size={14} />Ratings</button>
            <button type="button" className={view === 'catalog' ? 'is-active' : ''} onClick={() => setView('catalog')} role="tab" aria-selected={view === 'catalog'}><Film size={14} />Catalog evidence</button>
          </div>
        </header>

        {view === 'profile' && (
          <div className="movielens-profile-view">
            <div className="movielens-person">
              <span><UserRound size={24} /></span>
              <div><small>Demographics from u.user</small><strong>{viewer.age ?? '—'} years · {viewer.gender === 'F' ? 'Female' : viewer.gender === 'M' ? 'Male' : 'Unknown'}</strong><em>{viewer.occupation ?? viewer.cohort}</em></div>
              <p>{viewerRatings.length} explicit ratings form this profile. Demographics are shown for interpretation and are not silently used by every model.</p>
            </div>
            <section className="movielens-distribution">
              <header><span>Rating distribution</span><small>Real 1–5 star feedback</small></header>
              <div>{ratingDistribution.map((row) => <span key={row.rating}><b>{row.rating}★</b><i><em style={{ width: `${row.count / maxDistribution * 100}%` }} /></i><strong>{row.count}</strong></span>)}</div>
            </section>
            <section className="movielens-genres">
              <header><span>Interpretable genre signal</span><small>Average rating × evidence volume</small></header>
              <div>{genrePreferences.map((row) => <span key={row.genre}><b>{row.genre}</b><i><em style={{ width: `${row.average / 5 * 100}%` }} /></i><strong>{row.average.toFixed(1)}</strong><small>{row.count} ratings</small></span>)}</div>
            </section>
          </div>
        )}

        {view === 'ratings' && (
          <div className="movielens-rating-table" role="table" aria-label={`Historical ratings for ${viewer.name}`}>
            <header role="row"><span>Film</span><span>Genres</span><span>Rating</span><span>Timestamp</span></header>
            {viewerRatings.slice(0, 18).map((rating) => {
              const movie = dataset.movieById[rating.movieId]
              if (!movie) return null
              return (
                <div key={`${rating.movieId}-${rating.timestamp ?? rating.rating}`} role="row">
                  <span><i className="movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} /><b>{movie.title}</b><small>{movie.year}</small></span>
                  <span>{movie.genres.slice(0, 3).join(' · ')}</span>
                  <strong>{rating.rating.toFixed(0)} / 5</strong>
                  <time>{formatRatingDate(rating.timestamp)}</time>
                </div>
              )
            })}
          </div>
        )}

        {view === 'catalog' && (
          <div className="movielens-catalog-grid">
            {catalogEvidence.map(({ movie, ratings, average }, index) => (
              <article key={movie.id}>
                <span className="movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} />
                <div><small>#{index + 1} catalog evidence</small><strong>{movie.title}</strong><em>{movie.year} · {movie.genres.slice(0, 2).join(' / ')}</em><p><b>{average.toFixed(2)}</b> average from <b>{ratings}</b> real ratings</p></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatRatingDate(timestamp?: number): string {
  if (!timestamp) return 'No timestamp'
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(timestamp * 1000))
}

function ServiceSimulator({
  dataset,
  viewerId,
  result,
  runStatus,
}: {
  dataset: RuntimeDataset
  viewerId: string
  result: SimulationResult
  runStatus: RunStatus
}) {
  const [days, setDays] = useState(7)
  const [simulation, setSimulation] = useState<ReturnType<typeof simulateServiceDays> | null>(null)
  const canSimulate = !result.error && result.recommendations.length > 0 && runStatus !== 'dirty' && runStatus !== 'running'

  useEffect(() => {
    setSimulation(null)
  }, [dataset, result, viewerId])

  const runDays = (count: number) => {
    if (!canSimulate) return
    setSimulation(simulateServiceDays(dataset, viewerId, result, count))
  }

  const finalDay = simulation?.days[simulation.days.length - 1]
  const recentEvents = simulation?.events.slice(-14).reverse() ?? []
  return (
    <section className="service-simulator foundry-results-view" role="tabpanel">
      <header>
        <div>
          <span><Activity size={16} />Service feedback lab</span>
          <small>Real MovieLens history anchors the profile. Future reactions are a deterministic counterfactual, not observed GroupLens events.</small>
        </div>
        <div className="service-simulator-actions">
          <button type="button" onClick={() => runDays(1)} disabled={!canSimulate}>Emulate one feedback step</button>
          <label>
            <span>Service horizon · {days} days</span>
            <input type="range" min="2" max="30" step="1" value={days} onChange={(event) => setDays(Number(event.target.value))} />
          </label>
          <button type="button" className="is-primary" onClick={() => runDays(days)} disabled={!canSimulate}><Play size={13} fill="currentColor" />Simulate service</button>
        </div>
      </header>

      <div className="service-method-strip">
        <span><Database size={14} /><b>Observed input</b><em>{(dataset.ratingsByViewer.get(viewerId) ?? []).length} MovieLens ratings for {viewerId.toUpperCase()}</em></span>
        <i />
        <span><Film size={14} /><b>Frozen slate</b><em>{result.recommendations.length} films from the last completed run</em></span>
        <i />
        <span><Shuffle size={14} /><b>Counterfactual policy</b><em>Seeded exploration, fatigue and reward updates</em></span>
      </div>

      {!simulation ? (
        <div className="service-simulator-empty">
          <CircleGauge size={24} />
          <strong>{canSimulate ? 'Choose how far to project this recommendation slate' : 'Run the pipeline before feedback simulation'}</strong>
          <span>{canSimulate ? 'The same profile and slate always produce the same trace, so model changes remain comparable.' : 'Draft graph edits are intentionally excluded until Run pipeline completes.'}</span>
        </div>
      ) : (
        <div className="service-simulator-body">
          <div className="service-summary">
            <span><small>Impressions</small><strong>{simulation.summary.impressions}</strong></span>
            <span><small>CTR</small><strong>{Math.round(simulation.summary.ctr * 1000) / 10}%</strong></span>
            <span><small>Completion</small><strong>{Math.round(simulation.summary.completionRate * 1000) / 10}%</strong></span>
            <span><small>Cumulative reward</small><strong>{simulation.summary.cumulativeReward.toFixed(1)}</strong></span>
          </div>

          <div className="service-analysis-grid">
            <section className="service-chart-panel">
              <header><div><strong>Daily behavior</strong><small>CTR versus completion rate</small></div><span><i />CTR <b />Completion</span></header>
              <div className="service-trend" aria-label="Daily CTR and completion trend">
                {simulation.days.map((day) => (
                  <span key={day.day} title={`Day ${day.day}: CTR ${Math.round(day.ctr * 100)}%, completion ${Math.round(day.completionRate * 100)}%`}>
                    <i style={{ height: `${Math.max(8, day.ctr * 100)}%` }} />
                    <b style={{ height: `${Math.max(5, day.completionRate * 100)}%` }} />
                    <small>{day.day}</small>
                  </span>
                ))}
              </div>
            </section>

            <section className="service-event-log">
              <header><div><strong>Recent policy events</strong><small>Why reward changed</small></div><span>{simulation.events.length} events</span></header>
              <div>
                {recentEvents.map((event, index) => {
                  const movie = dataset.movieById[event.movieId]
                  if (!movie) return null
                  return (
                    <article key={`${event.day}-${event.movieId}-${event.action}-${index}`} className={`is-${event.action}`}>
                      <span className="movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} />
                      <div><small>Day {event.day} · {event.action}</small><strong>{movie.title}</strong></div>
                      <b>{event.reward > 0 ? '+' : ''}{event.reward.toFixed(2)}</b>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="service-policy">
            <div>
              <small>Policy after day {finalDay?.day}</small>
              <strong>{Math.round((finalDay?.explorationRate ?? 0) * 100)}% exploration · {simulation.summary.uniqueMovies} films explored</strong>
              <em>{finalDay?.clicks ?? 0} clicks and {finalDay?.completed ?? 0} completions on the last day</em>
            </div>
            <div className="service-top-items">
              {(finalDay?.topMovieIds ?? []).map((movieId, index) => {
                const movie = dataset.movieById[movieId]
                return movie ? (
                  <span key={movieId} className="movie-poster-art" style={moviePosterStyle(movie, dataset)} data-mark={movie.mark} data-year={movie.year} title={`#${index + 1} ${movie.title}`} />
                ) : null
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const SCORE_SIGNAL_META = {
  affinity: { label: 'Personal affinity', color: '#8f78ff' },
  popularity: { label: 'Catalog strength', color: '#ffad3d' },
  freshness: { label: 'Freshness', color: '#24d5bf' },
} as const

const RETRIEVAL_SOURCE_META: Partial<Record<PipelineModuleType, { label: string; color: string }>> = {
  collaborative: { label: 'User CF', color: '#a97cff' },
  matrixFactorization: { label: 'SVD / ALS', color: '#8c72cf' },
  bpr: { label: 'BPR', color: '#bc6fc2' },
  twoTower: { label: 'Two-tower', color: '#38a9ba' },
  vectorSearch: { label: 'Vector ANN', color: '#20d5cc' },
  sequenceTransformer: { label: 'Transformer', color: '#6d78d8' },
  popularity: { label: 'Popularity', color: '#ffb33f' },
  generativeReranker: { label: 'GenAI', color: '#9a68d5' },
  rlPolicy: { label: 'RL policy', color: '#e56b7c' },
}

function RecommendationExplanation({
  candidate,
  viewerId,
  dataset,
}: {
  candidate: SimulationResult['recommendations'][number]
  viewerId: string
  dataset: RuntimeDataset
}) {
  const movie = dataset.movieById[candidate.movieId]
  const viewer = dataset.viewerById[viewerId]
  const matchingGenres = movie.genres.filter((genre) => viewer.favoriteGenres.includes(genre))
  const ratings = dataset.ratingsByMovie.get(movie.id) ?? []
  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
    : 0
  const sources = Object.entries(candidate.sourceScores)
    .map(([source, score]) => ({
      source: source as PipelineModuleType,
      score: score ?? 0,
      meta: RETRIEVAL_SOURCE_META[source as PipelineModuleType],
    }))
    .filter((item) => item.meta)

  return (
    <aside className="recommendation-why" style={{ '--movie-tone': movie.tone } as CSSProperties} aria-label={`Why ${movie.title} was recommended`}>
      <header>
        <div><small>Why this result</small><strong>{movie.title}</strong></div>
        <span><b>{Math.round(candidate.score * 100)}</b>% match</span>
      </header>
      <div className="why-source-strip">
        {sources.map(({ source, score, meta }) => (
          <span key={source} style={{ '--signal-color': meta!.color } as CSSProperties}>
            <i /><b>{meta!.label}</b><em>{Math.round(score * 100)}</em>
          </span>
        ))}
      </div>
      <div className="why-score-breakdown">
        {(candidate.rankBreakdown ?? []).map((part) => {
          const meta = SCORE_SIGNAL_META[part.signal]
          return (
            <div key={part.signal} style={{ '--signal-color': meta.color, '--signal-width': `${Math.min(100, part.value * 100)}%` } as CSSProperties}>
              <span><b>{meta.label}</b><em>{Math.round(part.weight * 100)}% weight</em></span>
              <i><b /></i>
              <strong>+{Math.round(part.contribution * 100)}</strong>
            </div>
          )
        })}
      </div>
      <div className="why-reasons">
        {candidate.reasons.slice(0, 3).map((reason) => <span key={reason}><Check size={11} />{reason}</span>)}
      </div>
      <footer>
        <span><b>{sources.length}</b> retrievers agreed</span>
        <span><b>{averageRating.toFixed(1)}</b> catalog rating</span>
        <span><b>{matchingGenres.length || '0'}</b> profile genres</span>
        {candidate.diversityTrace && <span><b>{Math.round((1 - candidate.diversityTrace.maxSimilarity) * 100)}%</b> distinct</span>}
      </footer>
    </aside>
  )
}

function moviePosterStyle(movie: SandboxMovie, dataset: RuntimeDataset): CSSProperties {
  if (dataset.meta.id === 'sandbox') {
    const index = Math.max(0, dataset.movies.findIndex((item) => item.id === movie.id))
    return {
      '--movie-tone': movie.tone,
      '--cover-x': `${(index % 6) * 20}%`,
      '--cover-y': `${Math.floor(index / 6) * 50}%`,
    } as CSSProperties
  }

  const phase = hashPhase(movie.id)
  const angle = Math.round(118 + phase * 74)
  const light = phase > 0.5 ? '#d9f7ef' : '#f5d9ed'
  return {
    '--movie-tone': movie.tone,
    '--poster-shift': `${Math.round(phase * 28 - 14)}deg`,
    '--poster-glow': light,
    backgroundImage: `
      linear-gradient(180deg, rgba(8, 17, 43, 0.02), rgba(8, 17, 43, 0.72)),
      radial-gradient(circle at ${28 + phase * 44}% 28%, ${light} 0 8%, transparent 9%),
      conic-gradient(from ${angle}deg at 50% 54%, ${movie.tone}, #18284f, ${light}, ${movie.tone})
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as CSSProperties
}

function MetricCell({ label, value, color }: { label: string; value: number; color: string }) {
  const percentage = Math.round(value * 100)
  return (
    <div className="foundry-metric-cell" style={{ '--metric-color': color, '--metric-value': `${percentage}%` } as CSSProperties}>
      <span><small>{label}</small><strong>{percentage}</strong></span>
      <i><b /></i>
    </div>
  )
}

function SystemModuleNode({ id, data, selected }: NodeProps<BuilderNode>) {
  const definition = PIPELINE_MODULES[data.moduleType]
  const Icon = MODULE_ICONS[data.moduleType]
  const trace = data.trace
  // A stable per-node phase so the floating diorama breathes out of sync
  // (each block bobs on its own offset instead of pulsing in lockstep).
  const phase = -(hashPhase(id) * 3.6)
  return (
    <div
      className={`system-module-node family-${definition.family} run-${data.runState}${selected ? ' is-selected' : ''}`}
      style={{ '--family-color': FAMILY_COLORS[definition.family], '--iso-phase': `${phase.toFixed(2)}s` } as CSSProperties}
    >
      {definition.acceptsInput && <Handle type="target" position={Position.Left} className="system-handle" />}

      {/* Diagram-mode face: the flat information card. */}
      <header><span><Icon size={15} /></span><div><small>{FAMILY_LABELS[definition.family]}</small><strong>{definition.shortLabel}</strong></div><i /></header>
      <div className="system-node-flow">
        <span><small>IN</small><strong>{trace?.inputCount ?? '—'}</strong></span>
        <em><Activity size={12} /></em>
        <span><small>OUT</small><strong>{trace?.outputCount ?? '—'}</strong></span>
      </div>
      <footer><span>{trace ? `${trace.latencyMs} ms` : 'not traced'}</span><strong>{data.runState === 'error' ? 'check input' : data.runState === 'active' ? 'processing' : data.runState === 'complete' ? 'ready' : 'idle'}</strong></footer>

      {/* True 3D render baked from the same camera, lighting and materials as the world map. */}
      <span className="iso-shadow" aria-hidden="true" />
      <div className="system-iso-cube" aria-hidden="true">
        <img
          className="iso-render-3d"
          src={`/assets/foundry3d/${data.moduleType}.png`}
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
      <div className="system-iso-plate"><strong>{definition.shortLabel}</strong><small>{FAMILY_LABELS[definition.family]}</small></div>
      <div className="system-iso-trace">
        <span><small>IN</small><b>{trace?.inputCount ?? '—'}</b></span>
        <span><small>OUT</small><b>{trace?.outputCount ?? '—'}</b></span>
      </div>

      {definition.emitsOutput && <Handle type="source" position={Position.Right} className="system-handle" />}
    </div>
  )
}

function nodesFromTemplate(template: SystemTemplate): BuilderNode[] {
  return template.nodes.map((node) => {
    const definition = PIPELINE_MODULES[node.moduleType]
    return {
      id: node.id,
      type: 'systemModule',
      position: { ...node.position },
      data: {
        moduleType: node.moduleType,
        config: { ...definition.defaultConfig, ...(node.config ?? {}) },
        runState: 'idle',
      },
    }
  })
}

function edgesFromTemplate(template: SystemTemplate, mode: LayoutMode): BuilderEdge[] {
  return template.edges.map((edge) => ({
    ...edge,
    type: edgeTypeForMode(mode),
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
    className: 'foundry-edge',
  }))
}

function edgeTypeForMode(mode: LayoutMode): 'smoothstep' | 'isometric' {
  return mode === 'isometric' ? 'isometric' : 'smoothstep'
}

function positionsFromNodes(nodes: BuilderNode[]): NodePositionMap {
  return Object.fromEntries(nodes.map((node) => [node.id, { ...node.position }]))
}

function applyNodePositions(nodes: BuilderNode[], positions: NodePositionMap): BuilderNode[] {
  return nodes.map((node) => ({
    ...node,
    position: positions[node.id] ? { ...positions[node.id] } : { ...node.position },
  }))
}

function createIsometricLayout(nodes: BuilderNode[], edges: BuilderEdge[]): NodePositionMap {
  if (!nodes.length) return {}

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const validEdges = edges.filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))
  const outgoing = new Map<string, BuilderEdge[]>()
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  const minOriginalX = Math.min(...nodes.map((node) => node.position.x))
  const layers = new Map(nodes.map((node) => [
    node.id,
    Math.max(0, Math.round((node.position.x - minOriginalX) / 230)),
  ]))

  for (const edge of validEdges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  const queue = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.position.x - b.position.x)
    .map((node) => node.id)
  const visited = new Set<string>()

  while (queue.length) {
    const id = queue.shift()!
    visited.add(id)
    for (const edge of outgoing.get(id) ?? []) {
      layers.set(edge.target, Math.max(layers.get(edge.target) ?? 0, (layers.get(id) ?? 0) + 1))
      const nextIndegree = (indegree.get(edge.target) ?? 1) - 1
      indegree.set(edge.target, nextIndegree)
      if (nextIndegree === 0) queue.push(edge.target)
    }
  }

  const grouped = new Map<number, BuilderNode[]>()
  for (const node of nodes) {
    const layer = layers.get(node.id) ?? (visited.has(node.id) ? 0 : Math.round(node.position.x / 230))
    grouped.set(layer, [...(grouped.get(layer) ?? []), node])
  }

  const rawPositions: NodePositionMap = {}
  for (const [layer, group] of grouped) {
    const ordered = [...group].sort((a, b) => a.position.y - b.position.y)
    const center = (ordered.length - 1) / 2
    ordered.forEach((node, index) => {
      const branchOffset = index - center
      // Isometric axes at a 2:1 ratio: the pipeline marches down-right one tile
      // per layer, and parallel branches fan out along the down-left axis so the
      // cube pedestals sit on the grid without overlapping.
      rawPositions[node.id] = {
        x: layer * 204 - branchOffset * 140,
        y: layer * 94 + branchOffset * 96,
      }
    })
  }

  const minX = Math.min(...Object.values(rawPositions).map((position) => position.x))
  const minY = Math.min(...Object.values(rawPositions).map((position) => position.y))
  return Object.fromEntries(Object.entries(rawPositions).map(([id, position]) => [
    id,
    { x: position.x - minX + 54, y: position.y - minY + 54 },
  ]))
}

// Route an edge along the true isometric ground axes, isoflow-style.
// Any displacement decomposes uniquely into a*e1 + b*e2 where
// e1 = (cos30, +sin30) runs down-right and e2 = (cos30, -sin30) runs up-right,
// giving a single rounded elbow whose both segments hug the floor grid.
const ISO_COS = 0.8660254
const ISO_SIN = 0.5

function IsometricEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  style,
}: EdgeProps) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const a = dx / (2 * ISO_COS) + dy / (2 * ISO_SIN)
  const b = dx / (2 * ISO_COS) - dy / (2 * ISO_SIN)
  const e1 = (t: number): [number, number] => [t * ISO_COS, t * ISO_SIN]
  const e2 = (t: number): [number, number] => [t * ISO_COS, -t * ISO_SIN]

  let path: string
  if (Math.abs(a) < 6 || Math.abs(b) < 6) {
    // Nearly a pure iso segment already — draw it straight.
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  } else {
    // Walk the iso grid: short displacements take one elbow; long ones split
    // the dominant axis in half into a Z so the route stays near the nodes.
    const splitLong = Math.max(Math.abs(a), Math.abs(b)) * ISO_COS > 150
    const steps: Array<[number, number]> =
      Math.abs(a) >= Math.abs(b)
        ? splitLong ? [e1(a / 2), e2(b), e1(a / 2)] : [e1(a), e2(b)]
        : splitLong ? [e2(b / 2), e1(a), e2(b / 2)] : [e2(b), e1(a)]
    const points: Array<[number, number]> = [[sourceX, sourceY]]
    for (const [stepX, stepY] of steps) {
      const [lastX, lastY] = points[points.length - 1]
      points.push([lastX + stepX, lastY + stepY])
    }
    path = roundedIsoPath(points, 13)
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={18}
    />
  )
}

// Polyline -> SVG path with small quadratic fillets at every interior corner.
function roundedIsoPath(points: Array<[number, number]>, radius: number): string {
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const inX = cx - ((cx - px) / inLen) * r
    const inY = cy - ((cy - py) / inLen) * r
    const outX = cx + ((nx - cx) / outLen) * r
    const outY = cy + ((ny - cy) / outLen) * r
    d += ` L ${inX} ${inY} Q ${cx} ${cy} ${outX} ${outY}`
  }
  const [lastX, lastY] = points[points.length - 1]
  return `${d} L ${lastX} ${lastY}`
}

function specsFromNodes(nodes: BuilderNode[]) {
  return nodes.map((node) => ({ id: node.id, moduleType: node.data.moduleType, config: node.data.config }))
}

function specsFromEdges(edges: BuilderEdge[]) {
  return edges.map((edge) => ({ source: edge.source, target: edge.target }))
}

function statusLabel(status: RunStatus): string {
  switch (status) {
    case 'running': return 'Request in motion'
    case 'dirty': return 'Pipeline changed'
    case 'complete': return 'Trace complete'
    case 'error': return 'Path needs attention'
    default: return 'Ready to simulate'
  }
}

function formatFieldValue(value: number, step?: number): string {
  return step && step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(value)
}

// Deterministic 0..1 from a node id — used to phase-offset the float animation.
function hashPhase(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100000
  }
  return (hash % 1000) / 1000
}

function focusTemplateView(
  instance: ReactFlowInstance<BuilderNode, BuilderEdge>,
  templateId: SystemTemplateId,
  duration: number,
) {
  const mobile = window.innerWidth <= 820
  const zoom = mobile ? 0.72 : templateId === 'fast' || templateId === 'blank' ? 0.76 : 0.68
  instance.setViewport({ x: mobile ? 18 : 34, y: mobile ? 165 : 82, zoom }, { duration })
}

function focusLayoutView(
  instance: ReactFlowInstance<BuilderNode, BuilderEdge>,
  templateId: SystemTemplateId,
  mode: LayoutMode,
  duration: number,
) {
  if (mode === 'isometric') {
    const mobile = window.innerWidth <= 820
    if (mobile) {
      instance.setViewport({ x: 22, y: 148, zoom: 0.44 }, { duration })
      return
    }
    instance.fitView({
      padding: 0.1,
      duration,
      maxZoom: 0.92,
    })
    return
  }
  focusTemplateView(instance, templateId, duration)
}
