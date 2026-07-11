import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROMIUM_PATH ??
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'

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

const errors = []
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (error) => errors.push('page: ' + error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push('console: ' + message.text())
})

await page.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await page.getByRole('button', { name: /Build a recommender/i }).waitFor()
await page.getByRole('button', { name: /Build a recommender/i }).click()
await page.locator('.system-builder').waitFor()
await page.waitForTimeout(2400)
const initialViewMode = await page.locator('.system-builder').getAttribute('data-view-mode')
assert.equal(initialViewMode, 'isometric')
await page.screenshot({ path: 'artifacts/foundry-isometric-light.png' })

const firstNode = page.locator('.react-flow__node').first()
const beforeDrag = await firstNode.boundingBox()
if (!beforeDrag) throw new Error('Unable to locate a draggable isometric node')
await page.mouse.move(beforeDrag.x + beforeDrag.width / 2, beforeDrag.y + beforeDrag.height / 2)
await page.mouse.down()
await page.mouse.move(beforeDrag.x + beforeDrag.width / 2 + 54, beforeDrag.y + beforeDrag.height / 2 + 28, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(180)
const afterDrag = await firstNode.boundingBox()
const isoDragMoved = Boolean(afterDrag && Math.hypot(afterDrag.x - beforeDrag.x, afterDrag.y - beforeDrag.y) > 18)
assert.equal(isoDragMoved, true)

await page.getByRole('button', { name: 'Diagram', exact: true }).click()
await page.waitForTimeout(620)
const diagramViewMode = await page.locator('.system-builder').getAttribute('data-view-mode')
assert.equal(diagramViewMode, 'diagram')
await page.screenshot({ path: 'artifacts/foundry-diagram-light.png' })

await page.getByRole('button', { name: 'Isometric', exact: true }).click()
await page.waitForTimeout(620)
const restoredViewMode = await page.locator('.system-builder').getAttribute('data-view-mode')
assert.equal(restoredViewMode, 'isometric')
await page.screenshot({ path: 'artifacts/foundry-desktop.png' })

const initialNodes = await page.locator('.react-flow__node').count()
const initialMovies = await page.locator('.foundry-movie-card').allTextContents()
const affinityBreakdown = page.locator('.why-score-breakdown > div').filter({ hasText: 'Personal affinity' })
const initialAffinityWeight = await affinityBreakdown.locator('span em').textContent()

await page.locator('.react-flow__node').filter({ hasText: 'Ranker' }).click()
const affinity = page.locator('.inspector-range').filter({ hasText: 'Affinity' }).locator('input')
await affinity.fill('0.5')
await page.getByText('Pipeline changed', { exact: true }).waitFor()
await page.getByText('Preview updated', { exact: true }).waitFor()
await page.waitForTimeout(160)
const previewAffinityWeight = await affinityBreakdown.locator('span em').textContent()
await page.getByRole('button', { name: 'Run pipeline' }).click()
await page.waitForTimeout(420)
await page.screenshot({ path: 'artifacts/foundry-trace.png' })
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 10000 })
await page.screenshot({ path: 'artifacts/foundry-tuned.png' })

await page.getByLabel('Viewer').selectOption('u337')
await page.getByRole('button', { name: 'Run pipeline' }).click()
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 10000 })
const leilaMovies = await page.locator('.foundry-movie-card').allTextContents()

await page.locator('.template-select select').selectOption('fast')
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 10000 })
const fastNodes = await page.locator('.react-flow__node').count()

await page.locator('.template-select select').selectOption('blank')
await page.getByText('Path needs attention', { exact: true }).waitFor({ timeout: 10000 })
const blankNodes = await page.locator('.react-flow__node').count()
await page.locator('.foundry-palette-module').filter({ hasText: 'Popularity' }).click()
await page.waitForTimeout(700)
const sourceNode = page.locator('.react-flow__node').filter({ hasText: 'Ratings' })
const popularityNode = page.locator('.react-flow__node').filter({ hasText: 'Popularity' })
const slateNode = page.locator('.react-flow__node').filter({ hasText: 'Slate' })
const edgesBeforeAssembly = await page.locator('.react-flow__edge').count()
await connectHandles(page, sourceNode.locator('.react-flow__handle-right'), popularityNode.locator('.react-flow__handle-left'))
const edgesAfterFirstConnection = await page.locator('.react-flow__edge').count()
assert.equal(edgesAfterFirstConnection, edgesBeforeAssembly + 1)
await connectHandles(page, popularityNode.locator('.react-flow__handle-right'), slateNode.locator('.react-flow__handle-left'))
const assembledEdges = await page.locator('.react-flow__edge').count()
assert.equal(assembledEdges, edgesBeforeAssembly + 2)
await page.getByRole('button', { name: 'Run pipeline' }).click()
await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 15000 })
const assembledMovies = await page.locator('.foundry-movie-card').count()
await page.getByRole('button', { name: 'Reset template' }).click()
await page.getByText('Path needs attention', { exact: true }).waitFor({ timeout: 10000 })
const resetNodes = await page.locator('.react-flow__node').count()

await page.getByRole('button', { name: 'Close Foundry' }).click()
await page.getByRole('button', { name: 'Open system Foundry' }).click()
await page.waitForTimeout(1600)

const desktopOverflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const mobile = await mobileContext.newPage()
mobile.on('pageerror', (error) => errors.push('mobile page: ' + error.message))
mobile.on('console', (message) => {
  if (message.type() === 'error') errors.push('mobile console: ' + message.text())
})
await mobile.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await mobile.getByRole('button', { name: 'Open system Foundry' }).click()
await mobile.locator('.system-builder').waitFor()
await mobile.waitForTimeout(2200)
const mobileInitialViewMode = await mobile.locator('.system-builder').getAttribute('data-view-mode')
assert.equal(mobileInitialViewMode, 'isometric')
await mobile.screenshot({ path: 'artifacts/foundry-mobile-graph.png' })
await mobile.locator('.foundry-canvas-view-toggle').getByRole('button', { name: 'Diagram', exact: true }).click()
await mobile.waitForTimeout(620)
assert.equal(await mobile.locator('.system-builder').getAttribute('data-view-mode'), 'diagram')
await mobile.screenshot({ path: 'artifacts/foundry-mobile-diagram.png' })
await mobile.locator('.foundry-canvas-view-toggle').getByRole('button', { name: 'Isometric', exact: true }).click()
await mobile.waitForTimeout(620)
assert.equal(await mobile.locator('.system-builder').getAttribute('data-view-mode'), 'isometric')
await mobile.getByRole('button', { name: 'Modules' }).click()
await mobile.waitForTimeout(250)
await mobile.screenshot({ path: 'artifacts/foundry-mobile-modules.png' })
await mobile.getByLabel('Foundry views').getByRole('button', { name: 'Slate' }).click()
await mobile.waitForTimeout(250)
await mobile.screenshot({ path: 'artifacts/foundry-mobile-slate.png' })
await mobile.locator('.foundry-movie-card').nth(2).click()
const mobileWhyTitle = await mobile.locator('.recommendation-why > header strong').textContent()
await mobile.locator('.recommendation-why').scrollIntoViewIfNeeded()
await mobile.waitForTimeout(250)
await mobile.screenshot({ path: 'artifacts/foundry-mobile-why.png' })

const mobileOverflow = await mobile.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))

console.log(JSON.stringify({
  initialNodes,
  fastNodes,
  blankNodes,
  assembledEdges,
  assembledMovies,
  resetNodes,
  initialViewMode,
  diagramViewMode,
  restoredViewMode,
  isoDragMoved,
  livePreviewChanged: initialAffinityWeight !== previewAffinityWeight,
  initialMovies: initialMovies.map((text) => text.replace(/\s+/g, ' ').trim()),
  leilaMovies: leilaMovies.map((text) => text.replace(/\s+/g, ' ').trim()),
  recommendationChanged: initialMovies.join('|') !== leilaMovies.join('|'),
  mobileWhyTitle,
  desktopOverflow,
  mobileOverflow,
  errors,
}, null, 2))

await browser.close()

async function connectHandles(page, source, target) {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('Unable to locate graph handles')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(700)
}
