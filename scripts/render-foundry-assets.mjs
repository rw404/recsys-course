#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath = process.env.CHROMIUM_PATH ?? '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const outDir = 'public/assets/foundry3d'
const only = process.argv[2]
const types = [
  'ratingsSource',
  'featureStore',
  'popularity',
  'collaborative',
  'vectorSearch',
  'blend',
  'seenFilter',
  'ranker',
  'diversify',
  'evaluator',
  'output',
].filter((type) => !only || type === only)

if (!types.length) throw new Error(`Unknown module type: ${only}`)
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--no-sandbox',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
  ],
})
const context = await browser.newContext({ viewport: { width: 328, height: 300 }, deviceScaleFactor: 1 })

for (const type of types) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${baseURL}/?view=foundry-asset&type=${type}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForFunction(() => window.__foundryAssetReady === true, null, { timeout: 60000 })
  const frame = page.locator('.foundry-asset-render-frame')
  await frame.waitFor({ state: 'visible' })
  const output = `${outDir}/${type}.png`
  await frame.screenshot({ omitBackground: true, path: output })
  if (errors.length) throw new Error(`${type}: ${errors.join('; ')}`)
  console.log(`${type}: 328x300`)
  await page.close()
}

await context.close()
await browser.close()
