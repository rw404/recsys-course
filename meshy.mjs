#!/usr/bin/env node
// Minimal Meshy API pipeline for generating course assets (characters / locations / props).
// Usage:
//   node meshy.mjs balance
//   node meshy.mjs create "<prompt>" [preview|refine] [art_style]   -> prints task id
//   node meshy.mjs refine <previewTaskId>                           -> textured refine, prints id
//   node meshy.mjs status <taskId>
//   node meshy.mjs wait <taskId>                                    -> poll until done
//   node meshy.mjs download <taskId> <outfile.glb>
// Reads MESHY_API_KEY from env or .env.
import fs from 'fs'

function loadKey() {
  if (process.env.MESHY_API_KEY) return process.env.MESHY_API_KEY
  try {
    const env = fs.readFileSync(new URL('./.env', import.meta.url), 'utf8')
    const m = env.match(/MESHY_API_KEY=(.+)/)
    if (m) return m[1].trim()
  } catch {}
  throw new Error('MESHY_API_KEY not set (env or .env)')
}
const KEY = loadKey()
const BASE = 'https://api.meshy.ai/openapi'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`)
  return json
}

const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'balance') {
  console.log(await api('GET', '/v1/balance'))
} else if (cmd === 'list') {
  // list [pageSize] — recent text-to-3d tasks (id, mode, status, name/prompt)
  const size = Number(args[0] || 20)
  const t = await api('GET', `/v2/text-to-3d?page_num=1&page_size=${size}&sort_by=-created_at`)
  const rows = Array.isArray(t) ? t : t.result || t.data || []
  for (const r of rows) {
    console.log([r.id, r.mode, r.status, (r.name || r.prompt || '').slice(0, 60).replace(/\n/g, ' ')].join('  |  '))
  }
} else if (cmd === 'riglist') {
  const size = Number(args[0] || 20)
  const t = await api('GET', `/v1/rigging?page_num=1&page_size=${size}&sort_by=-created_at`)
  const rows = Array.isArray(t) ? t : t.result || t.data || []
  for (const r of rows) {
    console.log([r.id, r.status, r.progress + '%', 'in=' + (r.input_task_id || '?')].join('  |  '))
  }
} else if (cmd === 'animlist') {
  const size = Number(args[0] || 30)
  const t = await api('GET', `/v1/animations?page_num=1&page_size=${size}&sort_by=-created_at`)
  const rows = Array.isArray(t) ? t : t.result || t.data || []
  for (const r of rows) {
    console.log([r.id, r.status, 'action=' + (r.action_id ?? '?'), 'rig=' + (r.rig_task_id || '?')].join('  |  '))
  }
} else if (cmd === 'actions') {
  // list the available animation-library actions (id -> name)
  for (const path of ['/v1/animations/actions', '/v1/animations/action-list', '/v1/animation-library']) {
    try {
      const t = await api('GET', path)
      console.log('OK', path, JSON.stringify(t).slice(0, 2000))
      break
    } catch (e) {
      console.log('miss', path, String(e).slice(0, 120))
    }
  }
} else if (cmd === 'create') {
  const [prompt, mode = 'preview', art = 'realistic'] = args
  const res = await api('POST', '/v2/text-to-3d', {
    mode,
    prompt,
    art_style: art,
    should_remesh: true,
    ai_model: 'meshy-5',
  })
  console.log('task:', res.result || JSON.stringify(res))
} else if (cmd === 'refine') {
  const res = await api('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: args[0] })
  console.log('task:', res.result || JSON.stringify(res))
} else if (cmd === 'status') {
  const t = await api('GET', `/v2/text-to-3d/${args[0]}`)
  console.log(JSON.stringify({ status: t.status, progress: t.progress, art_style: t.art_style, glb: t.model_urls?.glb ? 'ready' : null, error: t.task_error }, null, 2))
} else if (cmd === 'wait') {
  const id = args[0]
  for (let i = 0; i < 120; i++) {
    const t = await api('GET', `/v2/text-to-3d/${id}`)
    process.stdout.write(`\r${t.status} ${t.progress ?? 0}%   `)
    if (t.status === 'SUCCEEDED') { console.log('\nDONE glb:', t.model_urls?.glb ? 'ready' : 'none'); break }
    if (t.status === 'FAILED' || t.status === 'CANCELED') { console.log('\nFAILED', JSON.stringify(t.task_error)); process.exit(1) }
    await new Promise((r) => setTimeout(r, 5000))
  }
} else if (cmd === 'download') {
  const [id, out] = args
  const t = await api('GET', `/v2/text-to-3d/${id}`)
  const url = t.model_urls?.glb
  if (!url) throw new Error('no glb url yet; status=' + t.status)
  const r = await fetch(url)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.writeFileSync(out, buf)
  console.log('saved', out, (buf.length / 1024 | 0) + 'KB')
} else if (cmd === 'rig') {
  // rig <input_task_id> [height_meters]
  const [inputId, height = '1.6'] = args
  const res = await api('POST', '/v1/rigging', {
    input_task_id: inputId,
    height_meters: Number(height),
  })
  console.log('task:', res.result || JSON.stringify(res))
} else if (cmd === 'rigstatus') {
  const t = await api('GET', `/v1/rigging/${args[0]}`)
  const r = t.result || {}
  console.log(JSON.stringify({
    status: t.status,
    progress: t.progress,
    character: r.rigged_character_glb_url ? 'ready' : null,
    walk: r.basic_animations?.walking_glb_url ? 'ready' : null,
    run: r.basic_animations?.running_glb_url ? 'ready' : null,
    error: t.task_error,
  }, null, 2))
} else if (cmd === 'rigwait') {
  const id = args[0]
  for (let i = 0; i < 160; i++) {
    const t = await api('GET', `/v1/rigging/${id}`)
    process.stdout.write(`\r${t.status} ${t.progress ?? 0}%   `)
    if (t.status === 'SUCCEEDED') { console.log('\nDONE'); break }
    if (t.status === 'FAILED' || t.status === 'CANCELED') { console.log('\nFAILED', JSON.stringify(t.task_error)); process.exit(1) }
    await new Promise((r) => setTimeout(r, 5000))
  }
} else if (cmd === 'rigdownload') {
  // rigdownload <id> <dir>
  const [id, dir] = args
  const t = await api('GET', `/v1/rigging/${id}`)
  const r = t.result || {}
  const map = {
    'character.glb': r.rigged_character_glb_url,
    'walking.glb': r.basic_animations?.walking_glb_url,
    'running.glb': r.basic_animations?.running_glb_url,
  }
  for (const [name, url] of Object.entries(map)) {
    if (!url) { console.log('missing', name); continue }
    const r = await fetch(url)
    const buf = Buffer.from(await r.arrayBuffer())
    fs.writeFileSync(`${dir}/${name}`, buf)
    console.log('saved', `${dir}/${name}`, (buf.length / 1024 | 0) + 'KB')
  }
} else if (cmd === 'anim') {
  // anim <rig_task_id> <action_id>  (e.g. action_id 0 = Idle)
  const [rigId, actionId] = args
  const res = await api('POST', '/v1/animations', {
    rig_task_id: rigId,
    action_id: Number(actionId),
  })
  console.log('task:', res.result || JSON.stringify(res))
} else if (cmd === 'animstatus') {
  const t = await api('GET', `/v1/animations/${args[0]}`)
  const r = t.result || {}
  console.log(JSON.stringify({ status: t.status, progress: t.progress, glb: r.animation_glb_url ? 'ready' : null, error: t.task_error }, null, 2))
} else if (cmd === 'animwait') {
  const id = args[0]
  for (let i = 0; i < 120; i++) {
    const t = await api('GET', `/v1/animations/${id}`)
    process.stdout.write(`\r${t.status} ${t.progress ?? 0}%   `)
    if (t.status === 'SUCCEEDED') { console.log('\nDONE'); break }
    if (t.status === 'FAILED' || t.status === 'CANCELED') { console.log('\nFAILED', JSON.stringify(t.task_error)); process.exit(1) }
    await new Promise((r) => setTimeout(r, 5000))
  }
} else if (cmd === 'animdownload') {
  const [id, out] = args
  const t = await api('GET', `/v1/animations/${id}`)
  const url = t.result?.animation_glb_url
  if (!url) throw new Error('no glb yet; status=' + t.status)
  const r = await fetch(url)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.writeFileSync(out, buf)
  console.log('saved', out, (buf.length / 1024 | 0) + 'KB')
} else {
  console.log('commands: balance | create | refine | status | wait | download | rig | rigstatus | rigwait | rigdownload | anim <rigId> <actionId> | animstatus <id> | animwait <id> | animdownload <id> <out>')
}
