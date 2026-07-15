import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

process.env.LD_LIBRARY_PATH = '/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173'
const executablePath = [
  process.env.CHROMIUM_PATH,
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
].find((candidate) => candidate && existsSync(candidate))

if (!executablePath) throw new Error('No Playwright Chromium executable was found')

const worlds = [
  { slug: 'world02', lesson: 'two-tower-lesson', experiment: 'retrieval-sandbox', activity: 'Measure recall under a candidate budget' },
  { slug: 'world03', lesson: 'transformer-lesson', experiment: 'attention-lab', activity: 'Fit long context into a memory budget' },
  { slug: 'world04', lesson: 'policy-lesson', experiment: 'bandit-lab', activity: 'Compare exploration policies' },
  { slug: 'world05', lesson: 'ecosystem-lesson', experiment: 'diversity-lab', activity: 'Re-rank for a healthier slate' },
  { slug: 'world06', lesson: 'capstone-lesson', experiment: 'capstone-arena', activity: 'Review production decisions' },
]

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
function watch(page, label) {
  page.on('pageerror', (error) => errors.push(label + ' page: ' + error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      errors.push(label + ' console: ' + message.text())
    }
  })
}

async function openLesson(page, lesson) {
  await page.evaluate(async (nodeId) => {
    const progress = await import('/src/state/progress.ts')
    for (const requirement of progress.NODES[nodeId].requires) {
      progress.useProgress.getState().completeNode(requirement)
    }
    progress.useProgress.getState().openNode(nodeId)
  }, lesson)
  await page.locator('.imax-learning-contract').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.imax-study').waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(350)
}

async function readLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const top = document.querySelector('.imax-topbar')?.getBoundingClientRect()
    const controls = document.querySelector('.imax-controls')?.getBoundingClientRect()
    const title = document.querySelector('.imax-caption h1')
    return {
      overflowX: root.scrollWidth - root.clientWidth,
      overflowY: root.scrollHeight - root.clientHeight,
      top: top?.top ?? -1,
      controlsBottom: controls?.bottom ?? -1,
      titleFont: Number.parseFloat(title ? getComputedStyle(title).fontSize : '0'),
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })
}

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const desktop = await desktopContext.newPage()
await desktop.addInitScript(() => window.localStorage.clear())
watch(desktop, 'theory desktop')
await desktop.goto(baseURL + '/?capture=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await desktop.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })

const desktopReport = []
for (const world of worlds) {
  await openLesson(desktop, world.lesson)
  assert.equal(await desktop.locator('.imax-learning-contract li').count(), 3)
  assert.equal(await desktop.locator('.imax-learning-contract > div span').count(), 4)
  const initial = await readLayout(desktop)
  assert.ok(initial.overflowX <= 1)
  assert.ok(initial.overflowY <= 1)
  assert.ok(initial.top >= 0)
  assert.ok(initial.controlsBottom <= initial.height + 1)
  assert.ok(initial.titleFont >= 16)
  await desktop.screenshot({ path: 'artifacts/' + world.slug + '-theory-contract.png' })

  await desktop.locator('.imax-chapters button').last().click()
  await desktop.getByText('Next learning move', { exact: true }).waitFor()
  await desktop.locator('.imax-next-activity strong').getByText(world.activity, { exact: true }).waitFor()
  await desktop.screenshot({ path: 'artifacts/' + world.slug + '-theory-handoff.png' })
  await desktop.getByRole('button', { name: world.activity }).click()
  await desktop.locator('.learning-lab').waitFor({ state: 'visible', timeout: 30000 })
  const active = await desktop.evaluate(async () => {
    const progress = await import('/src/state/progress.ts')
    return progress.useProgress.getState().activeNodeId
  })
  assert.equal(active, world.experiment)
  await desktop.locator('.learning-lab-header .foundation-icon-button').click()
  desktopReport.push({ world: world.slug, experiment: active, layout: initial })
}

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const mobile = await mobileContext.newPage()
await mobile.addInitScript(() => window.localStorage.clear())
watch(mobile, 'theory mobile')
await mobile.goto(baseURL + '/?capture=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await mobile.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })

const mobileReport = []
for (const world of worlds) {
  await openLesson(mobile, world.lesson)
  assert.equal(await mobile.locator('.imax-learning-contract li').count(), 3)
  const layout = await readLayout(mobile)
  assert.ok(layout.overflowX <= 1)
  assert.ok(layout.overflowY <= 1)
  assert.ok(layout.top >= 0)
  assert.ok(layout.controlsBottom <= layout.height + 1)
  if (world.slug === 'world02' || world.slug === 'world06') {
    await mobile.screenshot({ path: 'artifacts/' + world.slug + '-theory-mobile.png' })
  }
  await mobile.getByRole('button', { name: 'Close IMAX lesson' }).click()
  mobileReport.push({ world: world.slug, layout })
}

console.log(JSON.stringify({ desktop: desktopReport, mobile: mobileReport, errors }, null, 2))
await browser.close()
assert.deepEqual(errors, [])

