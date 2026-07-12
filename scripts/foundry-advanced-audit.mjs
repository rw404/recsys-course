import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath = process.env.CHROMIUM_PATH
  ?? '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'

await mkdir('artifacts', { recursive: true })
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
const page = await browser.newPage({ viewport: { width: 1536, height: 960 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

await page.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('button', { name: 'Open system Foundry' }).click()
await page.locator('.system-builder').waitFor()
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 15000 })
assert.match(await page.locator('.foundry-dataset-chip').innerText(), /100,000/)
assert.match(await page.locator('.foundry-dataset-chip').innerText(), /1,682/)

await page.locator('.template-select select').selectOption('deep')
await page.getByRole('button', { name: 'Run pipeline' }).click()
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 20000 })
assert.equal(await page.locator('.react-flow__node').count(), 14)
assert.equal(await page.locator('.foundry-movie-card').count(), 8)
const loadedAssets = await page.locator('.iso-render-3d').evaluateAll((images) => (
  images.filter((image) => image.complete && image.naturalWidth > 0).length
))
assert.equal(loadedAssets, 14)

await page.locator('.react-flow__node').filter({ hasText: 'Selectors' }).click()
await page.getByRole('button', { name: /Dropped/ }).click()
const droppedItems = await page.locator('.stage-lineage-items article').count()
assert.ok(droppedItems > 0)
await page.screenshot({ path: 'artifacts/foundry-advanced-lineage.png' })

await page.getByRole('tab', { name: /Service simulation/ }).click()
await page.getByRole('button', { name: 'Simulate service' }).click()
await page.locator('.service-trend').waitFor()
assert.equal(await page.locator('.service-trend > span').count(), 7)
assert.ok(await page.locator('.service-top-items > span').count() >= 4)
await page.screenshot({ path: 'artifacts/foundry-service-simulation.png' })

await page.locator('.template-select select').selectOption('generative')
await page.getByRole('button', { name: 'Run pipeline' }).click()
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 20000 })
await page.getByRole('tab', { name: /Recommendations/ }).click()
assert.equal(await page.locator('.foundry-movie-card').count(), 8)
assert.ok(await page.locator('.react-flow__node').filter({ hasText: 'GenAI rerank' }).count() > 0)
await page.screenshot({ path: 'artifacts/foundry-generative.png' })

const overflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))
assert.deepEqual(overflow, { x: 0, y: 0 })
assert.deepEqual(errors, [])

console.log(JSON.stringify({ loadedAssets, droppedItems, overflow, errors }, null, 2))
await browser.close()
