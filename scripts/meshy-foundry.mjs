#!/usr/bin/env node
// Batch-generate the 11 Foundry pipeline-device models via Meshy text-to-3D.
// preview -> refine -> download to public/models/foundry/<type>.glb
// State is checkpointed to /tmp/meshy-foundry-state.json so reruns resume.
import fs from 'fs'

const KEY = process.env.MESHY_API_KEY
if (!KEY) throw new Error('MESHY_API_KEY not set')
const BASE = 'https://api.meshy.ai/openapi'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const STATE_FILE = '/tmp/meshy-foundry-state.json'
const OUT_DIR = 'public/models/foundry'

const STYLE = 'isometric video game asset, cute low poly, smooth stylized shapes, flat vibrant colors, clean bold silhouette, single object'

const DEVICES = {
  ratingsSource: `stacked cylindrical database drums, teal turquoise color with glowing ring seams, ${STYLE}`,
  featureStore: `small filing cabinet server with three glowing drawers, teal color scheme, ${STYLE}`,
  popularity: `three ascending rectangular bar chart columns on a flat base, strictly teal and seafoam green colors only, no pink, no purple, ${STYLE}`,
  collaborative: `three cute round robot figurines standing in a circle facing each other, teal cyan colors, ${STYLE}`,
  vectorSearch: `turquoise crystal sphere with two thin turquoise orbit rings on a small teal pedestal, strictly turquoise and teal colors only, no red, no orange, ${STYLE}`,
  blend: `funnel mixer machine with two input pipes merging into one chamber, warm amber yellow colors, ${STYLE}`,
  seenFilter: `industrial sieve funnel machine with a droplet falling from the spout, amber orange colors, ${STYLE}`,
  ranker: `small DJ mixing console with three slider faders on the top panel, coral orange colors, ${STYLE}`,
  diversify: `whimsical machine shuffling colorful cards fanned out of its top, coral pink and cream colors, ${STYLE}`,
  evaluator: `round analog gauge meter device with a needle dial on top of a small box, fresh green colors, ${STYLE}`,
  output: `retro cinema television screen on a small stand showing colorful movie poster bars, dark navy body with vivid screen, ${STYLE}`,
}

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 200)}`)
  return json
}

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

fs.mkdirSync(OUT_DIR, { recursive: true })

// Retry transient failures (429 rate limits, task-queue caps) with backoff.
async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try { return await fn() } catch (e) {
      log(`retry ${attempt} ${label}: ${String(e).slice(0, 140)}`)
      await sleep(15000 * attempt)
    }
  }
  throw new Error(`gave up: ${label}`)
}

async function drive(type, prompt) {
  const s = (state[type] ??= {})
  if (s.done) return

  if (!s.preview) {
    const res = await withRetry(() => api('POST', '/v2/text-to-3d', {
      mode: 'preview', prompt, art_style: 'realistic', should_remesh: true, ai_model: 'meshy-5',
    }), `${type} preview-create`)
    s.preview = res.result
    save()
    log(type, 'preview task', s.preview)
  }

  await waitTask(s.preview, `${type} preview`)

  if (!s.refine) {
    const res = await withRetry(() => api('POST', '/v2/text-to-3d', {
      mode: 'refine', preview_task_id: s.preview,
    }), `${type} refine-create`)
    s.refine = res.result
    save()
    log(type, 'refine task', s.refine)
  }

  const task = await waitTask(s.refine, `${type} refine`)
  const url = task.model_urls?.glb
  if (!url) throw new Error(`${type}: refine succeeded but no glb url`)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  fs.writeFileSync(`${OUT_DIR}/${type}.glb`, buf)
  s.done = true
  save()
  log(type, `DONE -> ${OUT_DIR}/${type}.glb (${buf.length / 1024 | 0}KB)`)
}

async function waitTask(id, label) {
  for (let i = 0; i < 240; i += 1) {
    const t = await withRetry(() => api('GET', `/v2/text-to-3d/${id}`), `${label} poll`)
    if (t.status === 'SUCCEEDED') { log(label, 'succeeded'); return t }
    if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error(`${label} ${t.status}: ${JSON.stringify(t.task_error)}`)
    if (i % 4 === 0) log(label, t.status, `${t.progress ?? 0}%`)
    await sleep(15000)
  }
  throw new Error(`${label}: timed out`)
}

// Drive all devices concurrently — Meshy queues excess tasks server-side.
const results = await Promise.allSettled(Object.entries(DEVICES).map(([type, prompt]) => drive(type, prompt)))
let failed = 0
results.forEach((r, i) => {
  if (r.status === 'rejected') { failed += 1; log('FAILED', Object.keys(DEVICES)[i], String(r.reason).slice(0, 200)) }
})
log(failed ? `finished with ${failed} failures` : 'ALL MODELS DONE')
process.exit(failed ? 1 : 0)
