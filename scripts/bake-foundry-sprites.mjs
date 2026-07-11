#!/usr/bin/env node
// Bake animated isometric sprite sheets from the Meshy GLBs via the
// ?view=isoprop dev rig. Writes public/assets/foundry/<type>.png (24 frames).
import { chromium } from 'playwright-core'
import fs from 'fs'

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const OUT_DIR = 'public/assets/foundry'
const FRAMES = 24
const only = process.argv[2] // optional single type

// Per-model facing tweaks (degrees) — picked visually so the "front" reads well.
const ROT = {
  ratingsSource: 0,
  featureStore: 0,
  popularity: 0,
  collaborative: 0,
  vectorSearch: 0,
  blend: 0,
  seenFilter: 0,
  ranker: 0,
  diversify: 0,
  evaluator: 0,
  output: 0,
}

const types = fs.readdirSync('public/models/foundry')
  .filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace('.glb', ''))
  .filter((t) => !only || t === only)

fs.mkdirSync(OUT_DIR, { recursive: true })
const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] })
const ctx = await b.newContext({ viewport: { width: 700, height: 400 }, deviceScaleFactor: 1 })

for (const type of types) {
  const p = await ctx.newPage()
  const rot = ROT[type] ?? 0
  await p.goto(`http://localhost:5173/?view=isoprop&glb=/models/foundry/${type}.glb&rot=${rot}`, { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => window.__isoReady === true, null, { timeout: 60000 })
  await p.waitForTimeout(900) // let textures settle
  const dataUrl = await p.evaluate((frames) => window.__isoCapture(frames), FRAMES)
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  fs.writeFileSync(`${OUT_DIR}/${type}.png`, buf)
  console.log(type, `${buf.length / 1024 | 0}KB`)
  await p.close()
}
await b.close()
console.log('sprites done')
