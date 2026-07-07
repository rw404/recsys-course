// Generate extra Astra gesture clips to enrich per-page narration variety.
import fs from 'fs'
const KEY = (process.env.MESHY_API_KEY || (fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').match(/MESHY_API_KEY=(.+)/) || [])[1] || '').trim()
const BASE = 'https://api.meshy.ai/openapi'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const api = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { raw: t } }
  if (!r.ok) throw new Error(`${m} ${p} -> ${r.status}: ${t.slice(0,200)}`); return j
}
const dl = async (url, out) => { const r = await fetch(url); fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); return (fs.statSync(out).size/1024|0)+'KB' }

const ASTRA_RIG = '019f38d5-d29f-7c13-b942-bee66be4821b'
// [action_id, outName]  (standing upper-body talk/gesture actions)
const JOBS = [
  [309, 'talk-lefthip'],   // talk with left hand on hip
  [310, 'talk-leftraise'], // talk with left hand raised
  [315, 'hand-on-hip'],    // hand on hip gesture
  [290, 'wave'],           // wave one hand (greeting)
  [36,  'think'],          // confused scratch (thinking)
  [49,  'cheer'],          // motivational cheer (finale)
]
const tasks = []
for (const [action, name] of JOBS) {
  const res = await api('POST', '/v1/animations', { rig_task_id: ASTRA_RIG, action_id: action })
  tasks.push({ id: res.result || res.id, action, out: `public/models/astra-rigged/${name}.glb` })
  console.log('submit', action, name, '->', tasks.at(-1).id)
}
const pending = new Set(tasks.map(t => t.id))
for (let i = 0; i < 90 && pending.size; i++) {
  await new Promise(r => setTimeout(r, 4000))
  for (const t of tasks) {
    if (!pending.has(t.id)) continue
    const s = await api('GET', `/v1/animations/${t.id}`)
    if (s.status === 'SUCCEEDED') { pending.delete(t.id); console.log('DONE', t.action, await dl(s.result.animation_glb_url, t.out), t.out) }
    else if (s.status === 'FAILED' || s.status === 'CANCELED') { pending.delete(t.id); console.log('FAILED', t.action, JSON.stringify(s.task_error)) }
  }
}
console.log('remaining:', [...pending])
