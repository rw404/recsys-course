// Batch-generate + download Meshy animation clips from an already-rigged character.
// Also downloads the base rigged character glb.
// Submits all jobs, polls concurrently, downloads each to its target path.
import fs from 'fs'
const KEY = (process.env.MESHY_API_KEY || (fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').match(/MESHY_API_KEY=(.+)/) || [])[1] || '').trim()
const BASE = 'https://api.meshy.ai/openapi'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const api = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined })
  const t = await r.text()
  let j; try { j = JSON.parse(t) } catch { j = { raw: t } }
  if (!r.ok) throw new Error(`${m} ${p} -> ${r.status}: ${t.slice(0, 200)}`)
  return j
}
const dl = async (url, out) => {
  const r = await fetch(url); const buf = Buffer.from(await r.arrayBuffer())
  fs.mkdirSync(out.substring(0, out.lastIndexOf('/')), { recursive: true })
  fs.writeFileSync(out, buf); return (buf.length / 1024 | 0) + 'KB'
}

const ASTRA_RIG = '019f38d5-d29f-7c13-b942-bee66be4821b'
const PORTER_RIG = '019f3737-7cfb-7c7d-9ea2-c1ed660b17e8'

// [rig, action_id, outPath]
const JOBS = [
  [ASTRA_RIG, 0,   'public/models/astra-rigged/idle.glb'],
  [ASTRA_RIG, 313, 'public/models/astra-rigged/talk-open.glb'],    // welcome / hands open
  [ASTRA_RIG, 308, 'public/models/astra-rigged/talk-passion.glb'], // emphasis
  [ASTRA_RIG, 317, 'public/models/astra-rigged/shrug.glb'],        // weighing options
  [ASTRA_RIG, 314, 'public/models/astra-rigged/talk-right.glb'],   // presenting
  [ASTRA_RIG, 25,  'public/models/astra-rigged/agree.glb'],        // confident finale nod
  [ASTRA_RIG, 49,  'public/models/astra-rigged/cheer.glb'],        // spare: excited finale
  [PORTER_RIG, 56, 'public/models/porter-v2/chat.glb'],            // hero: stand and chat
  [PORTER_RIG, 47, 'public/models/porter-v2/listen.glb'],          // hero: listening (spare)
]

// download the base rigged Astra character
console.log('downloading base rigged Astra character...')
const rig = await api('GET', `/v1/rigging/${ASTRA_RIG}`)
const charUrl = rig.result?.rigged_character_glb_url
if (charUrl) console.log('  character.glb', await dl(charUrl, 'public/models/astra-rigged/character.glb'))

// submit all anim jobs
console.log('submitting', JOBS.length, 'anim jobs...')
const tasks = []
for (const [rigId, action, out] of JOBS) {
  const res = await api('POST', '/v1/animations', { rig_task_id: rigId, action_id: action })
  const id = res.result || res.id
  tasks.push({ id, action, out })
  console.log('  action', action, '->', id)
}

// poll all until done, then download
const pending = new Set(tasks.map((t) => t.id))
for (let i = 0; i < 90 && pending.size; i++) {
  await new Promise((r) => setTimeout(r, 4000))
  for (const t of tasks) {
    if (!pending.has(t.id)) continue
    const s = await api('GET', `/v1/animations/${t.id}`)
    if (s.status === 'SUCCEEDED') {
      pending.delete(t.id)
      const url = s.result?.animation_glb_url
      console.log('  DONE action', t.action, await dl(url, t.out), '->', t.out)
    } else if (s.status === 'FAILED' || s.status === 'CANCELED') {
      pending.delete(t.id)
      console.log('  FAILED action', t.action, JSON.stringify(s.task_error))
    }
  }
  process.stdout.write(`\r  waiting ${pending.size} ...   `)
}
console.log('\nall done. remaining:', [...pending])
