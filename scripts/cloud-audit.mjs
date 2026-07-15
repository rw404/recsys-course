import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

process.env.LD_LIBRARY_PATH = '/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')

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
const failedResponses = []
const explorerResponses = []
const narratorResponses = []

function watch(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.stack ?? error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`)
  })
  page.on('response', (response) => {
    if (response.url().includes('/models/explorer/')) {
      explorerResponses.push({ url: response.url(), status: response.status() })
    }
    if (response.url().includes('/models/astra-rigged/') || response.url().includes('/models/vector-smith/')) {
      narratorResponses.push({ url: response.url(), status: response.status() })
    }
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      failedResponses.push({ url: response.url(), status: response.status() })
    }
  })
}

async function canvasSignal(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const probe = document.createElement('canvas')
    probe.width = 96
    probe.height = 64
    const context = probe.getContext('2d', { willReadFrequently: true })
    if (!context) return { colored: 0, spread: 0 }
    context.drawImage(canvas, 0, 0, probe.width, probe.height)
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data
    let colored = 0
    let min = 255
    let max = 0
    for (let index = 0; index < pixels.length; index += 16) {
      const value = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
      if (pixels[index + 3] > 0 && value > 8) colored += 1
      min = Math.min(min, value)
      max = Math.max(max, value)
    }
    return {
      colored: colored / (pixels.length / 16),
      spread: max - min,
    }
  })
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
watch(page, 'desktop')

await page.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await page.locator('canvas').waitFor({ state: 'visible' })
await page.getByRole('heading', { name: 'Follow a recommendation from signal to system' }).waitFor()
await page.waitForTimeout(5200)

const journeyStops = await page.locator('.journey-stop').count()
assert.equal(journeyStops, 6)
const initialCanvas = await canvasSignal(page)
assert.ok(initialCanvas.colored > 0.85)
assert.ok(initialCanvas.spread > 45)
await page.screenshot({ path: 'artifacts/journey-signal.png' })

await page.getByRole('button', { name: 'Go to Retrieval Foundry' }).click()
await page.locator('.journey-stop.is-active').getByRole('heading', { name: 'Retrieval Foundry' }).waitFor()
await page.waitForFunction(() => document.querySelector('.journey-scroller')?.scrollTop > 600, null, { timeout: 10000 })
await page.waitForTimeout(900)
const retrievalScrollTop = await page.locator('.journey-scroller').evaluate((element) => element.scrollTop)
assert.ok(retrievalScrollTop > 600)
await page.screenshot({ path: 'artifacts/journey-retrieval.png' })

await page.getByRole('button', { name: 'Go to Synthesis Lab' }).click()
await page.locator('.journey-stop.is-active').getByRole('heading', { name: 'Synthesis Lab' }).waitFor()
await page.waitForTimeout(1800)
await page.waitForFunction(() => document.querySelector('.journey-scroller')?.scrollTop > 3500, null, { timeout: 10000 })
await page.screenshot({ path: 'artifacts/journey-synthesis.png' })

await page.getByRole('button', { name: 'Go to Signal City' }).click()
await page.locator('.journey-stop.is-active').getByRole('heading', { name: 'Follow a recommendation from signal to system' }).waitFor()
await page.waitForTimeout(1300)
await page.waitForFunction(() => document.querySelector('.journey-scroller')?.scrollTop < 100, null, { timeout: 10000 })
await page.locator('.journey-stop.is-active .journey-enter').click()
await page.locator('.journey-shell').waitFor({ state: 'detached' })
await page.waitForTimeout(2600)
await page.screenshot({ path: 'artifacts/journey-play.png' })

await page.locator('.cloud-primary-action').evaluate((button) => button.click())
await page.locator('.imax-study').waitFor({ state: 'visible', timeout: 30000 })
await page.locator('#imax-concept-title').waitFor()
const stationApproachDistance = await page.evaluate(() => {
  const position = window.__runtime.playerPosition
  return Math.hypot(position.x + 4.15, position.z - 32.75)
})
const conceptCount = await page.locator('.imax-chapters button').count()
assert.equal(conceptCount, 11)
assert.equal(await page.getByText(/Astra/i).count(), 0)
await page.screenshot({ path: 'artifacts/foundations-lesson-start.png' })

for (let concept = 1; concept < conceptCount; concept += 1) {
  await page.getByRole('button', { name: 'Next concept', exact: true }).click()
}
await page.locator('#imax-concept-title', { hasText: 'Recall and coverage answer different questions' }).waitFor()
await page.screenshot({ path: 'artifacts/foundations-lesson-final.png' })
await page.locator('.imax-next-button.is-complete').click()
await page.locator('.imax-study').waitFor({ state: 'detached' })
await page.getByRole('button', { name: 'Close experiment' }).click()
await page.getByRole('button', { name: 'Close experiment' }).waitFor({ state: 'detached' })
await page.waitForTimeout(900)
const signalExhibitCount = await page.locator('.signal-exhibit-label').count()
assert.equal(signalExhibitCount, 4)
await page.screenshot({ path: 'artifacts/foundations-exhibits.png' })
await page.getByRole('button', { name: /Profile observatory/ }).click()
await page.locator('.imax-study').waitFor({ state: 'visible', timeout: 30000 })
await page.locator('#imax-concept-title', { hasText: 'Labels, features and scores' }).waitFor()
assert.equal(await page.locator('.imax-chapters button[aria-current="step"]').textContent(), '06')
await page.screenshot({ path: 'artifacts/foundations-profile-exhibit.png' })
await page.getByRole('button', { name: 'Close IMAX lesson' }).click()
await page.locator('.imax-study').waitFor({ state: 'detached' })


await page.locator('.cloud-primary-action').evaluate((button) => button.click())
await page.getByRole('heading', { name: 'Make a ranking, then defend it', exact: true }).waitFor({ timeout: 30000 })
const rankingApproachDistance = await page.evaluate(() => {
  const position = window.__runtime.playerPosition
  return Math.hypot(position.x + 2.4, position.z - 33.62)
})
const rankingBriefSteps = await page.locator('.experiment-steps article').count()
assert.equal(rankingBriefSteps, 3)
const rankingModalOverflow = await page.locator('.foundations-lab').evaluate((element) => ({
  x: element.scrollWidth - element.clientWidth,
  scrollable: element.scrollHeight > element.clientHeight,
}))
assert.equal(rankingModalOverflow.x, 0)
await page.screenshot({ path: 'artifacts/journey-ranking-approach.png' })
await page.getByRole('button', { name: 'Close experiment' }).click()
await page.getByRole('heading', { name: 'Make a ranking, then defend it', exact: true }).waitFor({ state: 'detached' })

const before = await page.evaluate(() => window.__runtime.playerPosition.toArray())
await page.keyboard.down('s')
await page.waitForTimeout(1000)
await page.keyboard.up('s')
await page.waitForTimeout(180)
const afterForward = await page.evaluate(() => window.__runtime.playerPosition.toArray())
await page.keyboard.down('a')
await page.waitForTimeout(1000)
await page.keyboard.up('a')
await page.waitForTimeout(180)
const afterStrafe = await page.evaluate(() => window.__runtime.playerPosition.toArray())

await page.evaluate(() => {
  const runtime = window.__runtime
  const probe = { minimumDistance: Infinity, timer: 0 }
  probe.timer = window.setInterval(() => {
    const position = runtime.playerPosition
    probe.minimumDistance = Math.min(probe.minimumDistance, Math.hypot(position.x + 5.58, position.z - 29.85))
  }, 16)
  window.__collisionProbe = probe
  if (!runtime.requestMove) throw new Error('Course path planner is not available')
  runtime.requestMove(runtime.playerPosition.clone().set(-6.3, 0.76, 28.8))
})
await page.waitForTimeout(1400)
await page.screenshot({ path: 'artifacts/journey-collision.png' })
await page.waitForFunction(() => window.__runtime.moveTarget === null, null, { timeout: 30000 })
const obstacleProbe = await page.evaluate(() => {
  const runtime = window.__runtime
  const probe = window.__collisionProbe
  window.clearInterval(probe.timer)
  const position = runtime.playerPosition.toArray()
  runtime.moveTarget = null
  return {
    minimumDistance: probe.minimumDistance,
    targetDistance: Math.hypot(position[0] + 6.3, position[2] - 28.8),
    position,
  }
})

await page.getByRole('button', { name: 'Course world map', exact: true }).click()
await page.locator('.journey-shell').waitFor({ state: 'visible' })
await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Course index' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'artifacts/journey-catalog.png' })

const desktopOverflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))
await context.close()

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const mobile = await mobileContext.newPage()
watch(mobile, 'mobile')

await mobile.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await mobile.locator('canvas').waitFor({ state: 'visible' })
await mobile.getByRole('heading', { name: 'Follow a recommendation from signal to system' }).waitFor()
await mobile.waitForTimeout(4800)
await mobile.screenshot({ path: 'artifacts/journey-mobile.png' })

await mobile.locator('.journey-stop.is-active .journey-enter').click()
await mobile.locator('.journey-shell').waitFor({ state: 'detached' })
await mobile.waitForTimeout(2200)
await mobile.screenshot({ path: 'artifacts/journey-mobile-play.png' })

await mobile.locator('.cloud-primary-action').evaluate((button) => button.click())
await mobile.locator('#imax-concept-title').waitFor({ timeout: 30000 })
const mobileLessonMetrics = await mobile.locator('.imax-study').evaluate((element) => {
  const rect = element.getBoundingClientRect()
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    scrollOverflow: element.scrollWidth - element.clientWidth,
  }
})
console.log('mobileLessonMetrics', mobileLessonMetrics)
await mobile.screenshot({ path: 'artifacts/foundations-lesson-mobile.png' })
assert.ok(mobileLessonMetrics.right <= 390)
assert.ok(mobileLessonMetrics.bottom <= 844)
assert.equal(mobileLessonMetrics.scrollOverflow, 0)
for (let concept = 1; concept < conceptCount; concept += 1) {
  await mobile.getByRole('button', { name: 'Next concept', exact: true }).click()
}
await mobile.locator('.imax-next-button.is-complete').click()
await mobile.locator('.imax-study').waitFor({ state: 'detached' })
await mobile.getByRole('button', { name: 'Close experiment' }).click()
await mobile.getByRole('button', { name: 'Close experiment' }).waitFor({ state: 'detached' })

await mobile.locator('.cloud-primary-action').evaluate((button) => button.click())
await mobile.getByRole('heading', { name: 'Make a ranking, then defend it', exact: true }).waitFor({ timeout: 30000 })
const mobileExperimentMetrics = await mobile.locator('.foundations-lab').evaluate((element) => {
  const rect = element.getBoundingClientRect()
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    scrollOverflow: element.scrollWidth - element.clientWidth,
  }
})
assert.ok(mobileExperimentMetrics.right <= 390)
assert.ok(mobileExperimentMetrics.bottom <= 844)
assert.equal(mobileExperimentMetrics.scrollOverflow, 0)
assert.equal(await mobile.locator('.experiment-steps article').count(), 3)
await mobile.screenshot({ path: 'artifacts/ranking-experiment-mobile.png' })
await mobile.getByRole('button', { name: 'Close experiment' }).click()

const mobileOverflow = await mobile.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))

const movementForward = Math.hypot(
  afterForward[0] - before[0],
  afterForward[2] - before[2],
)
const movementStrafe = Math.hypot(
  afterStrafe[0] - afterForward[0],
  afterStrafe[2] - afterForward[2],
)

const report = {
  journeyStops,
  retrievalScrollTop: Math.round(retrievalScrollTop),
  initialCanvas,
  movementForward: Number(movementForward.toFixed(2)),
  movementStrafe: Number(movementStrafe.toFixed(2)),
  conceptCount,
  stationApproachDistance: Number(stationApproachDistance.toFixed(2)),
  rankingApproachDistance: Number(rankingApproachDistance.toFixed(2)),
  rankingBriefSteps,
  rankingModalOverflow,
  mobileExperimentMetrics,
  antennaMinimumDistance: Number(obstacleProbe.minimumDistance.toFixed(2)),
  obstacleTargetDistance: Number(obstacleProbe.targetDistance.toFixed(2)),
  obstacleFinalPosition: obstacleProbe.position.map((value) => Number(value.toFixed(2))),
  touchVisible: await mobile.locator('.mobile-controls').isVisible(),
  explorerAssetsLoaded: explorerResponses.filter((response) => response.status === 200).length,
  narratorAssetsLoaded: narratorResponses.filter((response) => response.status === 200).length,
  mobileLessonMetrics,
  desktopOverflow,
  mobileOverflow,
  failedResponses,
  errors,
}

console.log(JSON.stringify(report, null, 2))

assert.ok(movementForward + movementStrafe > 0.2)
assert.ok(stationApproachDistance < 1.26)
assert.ok(rankingApproachDistance < 2.1)
assert.ok(obstacleProbe.minimumDistance >= 1.02)
assert.ok(obstacleProbe.targetDistance < 0.65)
assert.equal(desktopOverflow.x, 0)
assert.equal(mobileOverflow.x, 0)
assert.equal(failedResponses.length, 0)
assert.equal(errors.length, 0)
assert.equal(narratorResponses.length, 0)
assert.ok(explorerResponses.some((response) => response.url.endsWith('/models/explorer/character.glb') && response.status === 200))

await browser.close()
