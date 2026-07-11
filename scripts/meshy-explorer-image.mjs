#!/usr/bin/env node
// Generate a controlled character concept, convert it to 3D, then rig and animate it.
import fs from 'node:fs'
import path from 'node:path'

const KEY = process.env.MESHY_API_KEY
if (!KEY) throw new Error('MESHY_API_KEY not set')

const BASE = 'https://api.meshy.ai/openapi'
const STATE_FILE = '/tmp/recsys-explorer-v4.json'
const OUT_DIR = 'public/models/explorer-v4'
const ASSET_DIR = 'public/assets'
const headers = {
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

const CONCEPT_PROMPT = [
  'Full-body character concept of one friendly male AI engineer explorer, age 24, visible human face, warm brown eyes and tousled chestnut brown hair.',
  'Absolutely no helmet, no hat, no mask, no visor, no headphones, no spacesuit.',
  'Premium stylized 3D adventure-game character with mature proportions and a slightly oversized expressive head.',
  'Standing centered in a clean A-pose, both arms and hands clearly separated from the torso, fingers readable, legs separated.',
  'Short cobalt blue utility jacket with restrained cyan piping over a cream shirt, charcoal tapered trousers, white techno sneakers.',
  'Small orange and navy data backpack with slim shoulder straps and a wrist tablet.',
  'Plain white studio background, soft even front lighting, no shadow baked into clothing, no weapon, no prop, no pedestal, no text, no logo.',
].join(' ')

const TEXTURE_PROMPT = [
  'Match the concept exactly: visible friendly human face, chestnut hair, cobalt fabric jacket, cyan trim, cream shirt,',
  'charcoal trousers, white sneakers and a compact orange navy backpack.',
  'Premium pastel techno-fi game materials, no helmet, no mask, no text or logos.',
].join(' ')

const ANIMATIONS = {
  idle: 0,
  wave: 28,
  chat: 56,
}

const state = fs.existsSync(STATE_FILE)
  ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  : {}

const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (...values) => console.log(new Date().toISOString().slice(11, 19), ...values)

async function api(method, endpoint, body) {
  const response = await fetch(BASE + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} -> ${response.status}: ${text.slice(0, 320)}`)
  }
  return json
}

async function retry(label, operation) {
  let lastError
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      log(label, `retry ${attempt}`, String(error).slice(0, 220))
      await sleep(Math.min(60_000, attempt * 12_000))
    }
  }
  throw lastError
}

async function waitFor(endpoint, id, label) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const task = await retry(`${label} poll`, () => api('GET', `${endpoint}/${id}`))
    if (task.status === 'SUCCEEDED') {
      log(label, 'succeeded')
      return task
    }
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`${label} ${task.status}: ${JSON.stringify(task.task_error)}`)
    }
    if (attempt % 4 === 0) log(label, task.status, `${task.progress ?? 0}%`)
    await sleep(15_000)
  }
  throw new Error(`${label} timed out`)
}

async function ensureTask(key, endpoint, body) {
  if (state[key]) return state[key]
  const response = await retry(`${key} create`, () => api('POST', endpoint, body))
  state[key] = response.result
  save()
  log(key, state[key])
  return state[key]
}

async function download(url, filename) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`download ${filename} -> ${response.status}`)
  const data = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(filename, data)
  log('saved', filename, `${Math.round(data.length / 1024)} KB`)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(ASSET_DIR, { recursive: true })

const conceptId = await ensureTask('concept', '/v1/text-to-image', {
  ai_model: 'gpt-image-2',
  prompt: CONCEPT_PROMPT,
  pose_mode: 'a-pose',
  aspect_ratio: '2:3',
})
const concept = await waitFor('/v1/text-to-image', conceptId, 'concept')
if (!concept.image_urls?.[0]) throw new Error('Concept generation returned no image')
await download(concept.image_urls[0], path.join(ASSET_DIR, 'explorer-v4-concept.png'))

const modelId = await ensureTask('model', '/v1/image-to-3d', {
  input_task_id: conceptId,
  model_type: 'standard',
  ai_model: 'latest',
  should_texture: true,
  enable_pbr: true,
  hd_texture: false,
  texture_prompt: TEXTURE_PROMPT,
  should_remesh: true,
  topology: 'triangle',
  target_polycount: 65_000,
  pose_mode: 'a-pose',
  image_enhancement: false,
  remove_lighting: true,
  target_formats: ['glb'],
  alpha_thumbnail: true,
  multi_view_thumbnails: true,
  auto_size: true,
  origin_at: 'bottom',
})
const model = await waitFor('/v1/image-to-3d', modelId, 'model')

const rigId = await ensureTask('rig', '/v1/rigging', {
  input_task_id: modelId,
  height_meters: 1.74,
})
const rig = await waitFor('/v1/rigging', rigId, 'rig')

state.animations ??= {}
for (const [name, actionId] of Object.entries(ANIMATIONS)) {
  if (!state.animations[name]) {
    const response = await retry(`${name} create`, () => api('POST', '/v1/animations', {
      rig_task_id: rigId,
      action_id: actionId,
      post_process: {
        operation_type: 'change_fps',
        fps: 24,
      },
    }))
    state.animations[name] = response.result
    save()
    log(name, state.animations[name])
  }
}

const animationTasks = {}
for (const [name, id] of Object.entries(state.animations)) {
  animationTasks[name] = await waitFor('/v1/animations', id, name)
}

const rigResult = rig.result ?? {}
const basic = rigResult.basic_animations ?? {}
const files = {
  character: rigResult.rigged_character_glb_url,
  walking: basic.walking_glb_url,
  running: basic.running_glb_url,
  idle: animationTasks.idle?.result?.animation_glb_url,
  wave: animationTasks.wave?.result?.animation_glb_url,
  chat: animationTasks.chat?.result?.animation_glb_url,
}

for (const [name, url] of Object.entries(files)) {
  if (!url) throw new Error(`Meshy did not return ${name} GLB`)
  await download(url, path.join(OUT_DIR, `${name}.glb`))
}

const thumbnail = model.alpha_thumbnail_url ?? model.thumbnail_url
if (thumbnail) await download(thumbnail, path.join(ASSET_DIR, 'explorer-v4.png'))

state.done = true
save()
log('EXPLORER V4 COMPLETE')
