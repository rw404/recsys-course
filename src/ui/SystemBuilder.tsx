import {
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
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react'
import {
  SANDBOX_MOVIES,
  SANDBOX_MOVIE_BY_ID,
  SANDBOX_RATINGS,
  SANDBOX_VIEWER_BY_ID,
  SANDBOX_VIEWERS,
} from '../data/movielensSandbox'
import {
  SYSTEM_TEMPLATES,
  type SystemTemplate,
  type SystemTemplateId,
} from '../data/systemTemplates'
import {
  PIPELINE_MODULES,
  simulatePipeline,
  type ModuleConfig,
  type ModuleFamily,
  type NodeTrace,
  type PipelineModuleType,
  type SimulationResult,
} from '../logic/systemSimulator'

type RunState = 'idle' | 'queued' | 'active' | 'complete' | 'error'
type RunStatus = 'ready' | 'dirty' | 'running' | 'complete' | 'error'
type MobileTab = 'graph' | 'modules' | 'slate'

interface BuilderNodeData extends Record<string, unknown> {
  moduleType: PipelineModuleType
  config: ModuleConfig
  trace?: NodeTrace
  runState: RunState
}

type BuilderNode = Node<BuilderNodeData, 'systemModule'>
type BuilderEdge = Edge<Record<string, unknown>>

const NODE_TYPES = { systemModule: SystemModuleNode }
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
  popularity: TrendingUp,
  collaborative: UsersRound,
  vectorSearch: Orbit,
  blend: GitMerge,
  seenFilter: Filter,
  ranker: SlidersHorizontal,
  diversify: Shuffle,
  evaluator: CircleGauge,
  output: Film,
}

const initialTemplate = SYSTEM_TEMPLATES.hybrid
const initialNodes = nodesFromTemplate(initialTemplate)
const initialEdges = edgesFromTemplate(initialTemplate)
const initialResult = simulatePipeline('u104', specsFromNodes(initialNodes), specsFromEdges(initialEdges))

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
  const [flow, setFlow] = useState<ReactFlowInstance<BuilderNode, BuilderEdge> | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(initialEdges)
  const [viewerId, setViewerId] = useState('u104')
  const [templateId, setTemplateId] = useState<SystemTemplateId>('hybrid')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('blend')
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(initialResult.recommendations[0]?.movieId ?? null)
  const [result, setResult] = useState<SimulationResult>(initialResult)
  const [runStatus, setRunStatus] = useState<RunStatus>('ready')
  const [mobileTab, setMobileTab] = useState<MobileTab>('graph')
  const [traceSpeed, setTraceSpeed] = useState<1 | 2>(2)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const animateRun = useCallback((sourceNodes: BuilderNode[], sourceEdges: BuilderEdge[], activeViewerId: string) => {
    clearTimers()
    const nextResult = simulatePipeline(activeViewerId, specsFromNodes(sourceNodes), specsFromEdges(sourceEdges))
    const sequence = Object.keys(nextResult.trace)
    const stepMs = traceSpeed === 2 ? 46 : 92
    setRunStatus('running')
    setResult(nextResult)
    setSelectedMovieId((current) => (
      current && nextResult.recommendations.some((candidate) => candidate.movieId === current)
        ? current
        : nextResult.recommendations[0]?.movieId ?? null
    ))
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
            setRunStatus(nextResult.error ? 'error' : 'complete')
          }, traceSpeed === 2 ? 70 : 130)
          timers.current.push(finishTimer)
        }
      }, stepMs * (index + 1))
      timers.current.push(timer)
    })
  }, [clearTimers, setEdges, setNodes, traceSpeed])

  useEffect(() => {
    if (hasAnimatedInitial.current) return
    hasAnimatedInitial.current = true
    const timer = window.setTimeout(() => animateRun(initialNodes, initialEdges, 'u104'), 260)
    timers.current.push(timer)
  }, [animateRun])

  const runPipeline = useCallback(() => {
    animateRun(nodes, edges, viewerId)
  }, [animateRun, edges, nodes, viewerId])

  useEffect(() => {
    if (runStatus !== 'dirty') return
    const timer = window.setTimeout(() => {
      const preview = simulatePipeline(viewerId, specsFromNodes(nodes), specsFromEdges(edges))
      setResult(preview)
      setSelectedMovieId((current) => (
        current && preview.recommendations.some((candidate) => candidate.movieId === current)
          ? current
          : preview.recommendations[0]?.movieId ?? null
      ))
    }, 90)
    return () => window.clearTimeout(timer)
  }, [edges, nodes, runStatus, viewerId])

  const loadTemplate = useCallback((id: SystemTemplateId) => {
    const template = SYSTEM_TEMPLATES[id]
    const nextNodes = nodesFromTemplate(template)
    const nextEdges = edgesFromTemplate(template)
    setTemplateId(id)
    setNodes(nextNodes)
    setEdges(nextEdges)
    setSelectedNodeId(nextNodes.find((node) => node.data.moduleType === 'blend')?.id ?? nextNodes[0]?.id ?? null)
    setRunStatus('ready')
    const timer = window.setTimeout(() => {
      if (flow) focusTemplateView(flow, id, 480)
      animateRun(nextNodes, nextEdges, viewerId)
    }, 80)
    timers.current.push(timer)
  }, [animateRun, flow, setEdges, setNodes, viewerId])

  const markDirty = useCallback(() => {
    setRunStatus('dirty')
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, runState: 'idle', trace: undefined } })))
    setEdges((current) => current.map((edge) => ({ ...edge, animated: false, className: 'foundry-edge' })))
  }, [setEdges, setNodes])

  const updateConfig = useCallback((nodeId: string, key: string, value: number | boolean) => {
    setNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, config: { ...node.data.config, [key]: value }, trace: undefined, runState: 'idle' } }
      : node))
    setRunStatus('dirty')
  }, [setNodes])

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
    setNodes((current) => [...current, node])
    setSelectedNodeId(id)
    setMobileTab('graph')
    setRunStatus('dirty')
  }, [flow, setNodes])

  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) return
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
    setRunStatus('dirty')
  }, [selectedNodeId, setEdges, setNodes])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({
      ...connection,
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
      className: 'foundry-edge',
    }, current))
    markDirty()
  }, [markDirty, setEdges])

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
      <div className="system-builder" data-mobile-tab={mobileTab}>
        <FoundryHeader
          viewerId={viewerId}
          templateId={templateId}
          runStatus={runStatus}
          onViewerChange={(id) => { setViewerId(id); setRunStatus('dirty') }}
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
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onInit={(instance) => {
                setFlow(instance)
                window.setTimeout(() => focusTemplateView(instance, templateId, 420), 80)
              }}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              minZoom={0.34}
              maxZoom={1.65}
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
                className: 'foundry-edge',
              }}
              colorMode="light"
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.15} color="#38517d" />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(node) => FAMILY_COLORS[(node.data as BuilderNodeData).moduleType ? PIPELINE_MODULES[(node.data as BuilderNodeData).moduleType].family : 'data']}
                maskColor="rgba(4, 13, 31, 0.78)"
                pannable
                zoomable
              />
            </ReactFlow>
            <button type="button" className="foundry-fit-button" onClick={() => flow?.fitView({ padding: 0.16, duration: 380 })} aria-label="Fit graph" title="Fit graph">
              <Maximize2 size={16} />
            </button>
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
            node={selectedNode}
            onConfigChange={updateConfig}
            onDelete={removeSelectedNode}
          />
        </div>

        <FoundryResults
          viewerId={viewerId}
          result={result}
          runStatus={runStatus}
          selectedMovieId={selectedMovieId}
          onSelectMovie={setSelectedMovieId}
        />
      </div>
    </div>
  )
}

function FoundryHeader({
  viewerId,
  templateId,
  runStatus,
  onViewerChange,
  onTemplateChange,
  onReset,
  onRun,
  onClose,
}: {
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
        <div><strong>REC.SYS FOUNDRY</strong><small>MovieLens-style model lab</small></div>
      </div>
      <div className="foundry-dataset-chip"><Database size={14} /><strong>{SANDBOX_RATINGS.length}</strong><span>ratings</span><i /><strong>{SANDBOX_MOVIES.length}</strong><span>films</span></div>
      <label className="foundry-select">
        <span><UserRound size={13} />Viewer</span>
        <select value={viewerId} onChange={(event) => onViewerChange(event.target.value)}>
          {SANDBOX_VIEWERS.map((viewer) => <option key={viewer.id} value={viewer.id}>{viewer.id.toUpperCase()} · {viewer.name}</option>)}
        </select>
      </label>
      <label className="foundry-select template-select">
        <span><Layers3 size={13} />Template</span>
        <select value={templateId} onChange={(event) => onTemplateChange(event.target.value as SystemTemplateId)}>
          {(Object.values(SYSTEM_TEMPLATES) as SystemTemplate[]).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      <button type="button" className={`foundry-run status-${runStatus}`} onClick={onRun} disabled={runStatus === 'running'}>
        {runStatus === 'running' ? <Activity size={17} /> : <Play size={17} fill="currentColor" />}
        <span>{runStatus === 'running' ? 'Tracing request' : 'Run pipeline'}</span>
      </button>
      <button type="button" className="foundry-reset" onClick={onReset} aria-label="Reset template" title="Reset template"><RefreshCw size={16} /></button>
      <button type="button" className="foundry-close" onClick={onClose} aria-label="Close Foundry" title="Close Foundry"><X size={19} /></button>
    </header>
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
  onConfigChange,
  onDelete,
}: {
  node: BuilderNode | null
  onConfigChange: (nodeId: string, key: string, value: number | boolean) => void
  onDelete: () => void
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
      <div className="inspector-trace">
        <span><small>Input</small><strong>{trace?.inputCount ?? '—'}</strong></span>
        <i />
        <span><small>Output</small><strong>{trace?.outputCount ?? '—'}</strong></span>
        <span><small>Node</small><strong>{trace ? `${trace.latencyMs} ms` : '—'}</strong></span>
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

function FoundryResults({
  viewerId,
  result,
  runStatus,
  selectedMovieId,
  onSelectMovie,
}: {
  viewerId: string
  result: SimulationResult
  runStatus: RunStatus
  selectedMovieId: string | null
  onSelectMovie: (id: string) => void
}) {
  const viewer = SANDBOX_VIEWER_BY_ID[viewerId]
  const selectedCandidate = result.recommendations.find((candidate) => candidate.movieId === selectedMovieId)
    ?? result.recommendations[0]
  const profileEvidence = SANDBOX_RATINGS
    .filter((rating) => rating.viewerId === viewerId && rating.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4)
  return (
    <section className={`foundry-results${runStatus === 'running' ? ' is-running' : ''}${runStatus === 'dirty' ? ' is-live-preview' : ''}`}>
      <div className="foundry-viewer-card">
        <span><UserRound size={18} /></span>
        <div><small>{viewer.id.toUpperCase()}</small><strong>{viewer.name}</strong><em>{viewer.cohort}</em></div>
        <p>{viewer.note}</p>
        <div className="viewer-genres">{viewer.favoriteGenres.map((genre) => <i key={genre}>{genre}</i>)}</div>
        <div className="viewer-evidence">
          <small>Profile evidence</small>
          <div>
            {profileEvidence.map((rating) => {
              const movie = SANDBOX_MOVIE_BY_ID[rating.movieId]
              return (
                <span
                  key={movie.id}
                  className="viewer-poster movie-poster-art"
                  style={moviePosterStyle(movie.id, movie.tone)}
                  role="img"
                  aria-label={`${movie.title} cover, rated ${rating.rating}`}
                  title={`${movie.title} · ${rating.rating}/5`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="foundry-metrics">
        <MetricCell label="Quality" value={result.metrics.quality} color="#ef765f" />
        <MetricCell label="Diversity" value={result.metrics.diversity} color="#e0aa35" />
        <MetricCell label="Coverage" value={result.metrics.coverage} color="#27ad9f" />
        <MetricCell label="Novelty" value={result.metrics.novelty} color="#6c6cc7" />
        <div className="foundry-latency"><Timer size={15} /><span><strong>{result.metrics.latencyMs}</strong><small>ms critical path</small></span></div>
      </div>

      <div className="foundry-slate">
        <header>
          <div>
            <span>Live recommendation slate</span>
            <em>{runStatus === 'dirty' ? 'Preview updated' : runStatus === 'running' ? 'Request in motion' : 'Click a film to inspect'}</em>
          </div>
          <strong>{result.recommendations.length} films</strong>
        </header>
        {result.error ? (
          <div className="foundry-result-error"><Activity size={18} /><span>{result.error}</span></div>
        ) : (
          <div className="foundry-slate-layout">
            <div className="foundry-movie-row">
              {result.recommendations.map((candidate, index) => {
                const movie = SANDBOX_MOVIE_BY_ID[candidate.movieId]
                const selected = selectedMovieId === movie.id
                return (
                  <button
                    type="button"
                    key={movie.id}
                    className={`foundry-movie-card${selected ? ' is-selected' : ''}`}
                    style={{ ...moviePosterStyle(movie.id, movie.tone), '--movie-score': `${candidate.score * 100}%` } as CSSProperties}
                    onClick={() => onSelectMovie(movie.id)}
                    aria-pressed={selected}
                    aria-label={`Explain recommendation ${movie.title}`}
                  >
                    <span className="movie-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="movie-cover movie-poster-art" role="img" aria-label={`${movie.title} cover`} />
                    <span className="movie-copy"><strong>{movie.title}</strong><small>{movie.year} · {movie.genres.join(' / ')}</small><em>{candidate.reasons[0]}</em></span>
                    <span className="movie-score"><b>{candidate.score.toFixed(2)}</b><i><em /></i></span>
                  </button>
                )
              })}
            </div>
            {selectedCandidate && <RecommendationExplanation candidate={selectedCandidate} viewerId={viewerId} />}
          </div>
        )}
      </div>
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
  vectorSearch: { label: 'Vector ANN', color: '#20d5cc' },
  popularity: { label: 'Popularity', color: '#ffb33f' },
}

function RecommendationExplanation({
  candidate,
  viewerId,
}: {
  candidate: SimulationResult['recommendations'][number]
  viewerId: string
}) {
  const movie = SANDBOX_MOVIE_BY_ID[candidate.movieId]
  const viewer = SANDBOX_VIEWER_BY_ID[viewerId]
  const matchingGenres = movie.genres.filter((genre) => viewer.favoriteGenres.includes(genre))
  const ratings = SANDBOX_RATINGS.filter((rating) => rating.movieId === movie.id)
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

function moviePosterStyle(movieId: string, tone: string): CSSProperties {
  const index = Math.max(0, SANDBOX_MOVIES.findIndex((movie) => movie.id === movieId))
  return {
    '--movie-tone': tone,
    '--cover-x': `${(index % 6) * 20}%`,
    '--cover-y': `${Math.floor(index / 6) * 50}%`,
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

function SystemModuleNode({ data, selected }: NodeProps<BuilderNode>) {
  const definition = PIPELINE_MODULES[data.moduleType]
  const Icon = MODULE_ICONS[data.moduleType]
  const trace = data.trace
  return (
    <div
      className={`system-module-node family-${definition.family} run-${data.runState}${selected ? ' is-selected' : ''}`}
      style={{ '--family-color': FAMILY_COLORS[definition.family] } as CSSProperties}
    >
      {definition.acceptsInput && <Handle type="target" position={Position.Left} className="system-handle" />}
      <header><span><Icon size={15} /></span><div><small>{FAMILY_LABELS[definition.family]}</small><strong>{definition.shortLabel}</strong></div><i /></header>
      <div className="system-node-flow">
        <span><small>IN</small><strong>{trace?.inputCount ?? '—'}</strong></span>
        <em><Activity size={12} /></em>
        <span><small>OUT</small><strong>{trace?.outputCount ?? '—'}</strong></span>
      </div>
      <footer><span>{trace ? `${trace.latencyMs} ms` : 'not traced'}</span><strong>{data.runState === 'error' ? 'check input' : data.runState === 'active' ? 'processing' : data.runState === 'complete' ? 'ready' : 'idle'}</strong></footer>
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

function edgesFromTemplate(template: SystemTemplate): BuilderEdge[] {
  return template.edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#8b7cff' },
    className: 'foundry-edge',
  }))
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

function focusTemplateView(
  instance: ReactFlowInstance<BuilderNode, BuilderEdge>,
  templateId: SystemTemplateId,
  duration: number,
) {
  const mobile = window.innerWidth <= 820
  const zoom = mobile ? 0.72 : templateId === 'fast' || templateId === 'blank' ? 0.76 : 0.68
  instance.setViewport({ x: mobile ? 18 : 34, y: mobile ? 165 : 82, zoom }, { duration })
}
