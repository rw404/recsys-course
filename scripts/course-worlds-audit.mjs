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

const labs = [
  {
    slug: 'world02-retrieval',
    nodeId: 'retrieval-sandbox',
    title: 'Similarity is a retrieval signal, not the answer',
    ready: 'Retrieval contract and diagnosis complete',
    template: 'personalized',
    checkpoint: 'negatives-quiz',
  },
  {
    slug: 'world03-attention',
    nodeId: 'attention-lab',
    title: 'Why long context runs out of memory',
    ready: 'Long-context execution contract verified',
    template: 'deep',
    checkpoint: 'attention-quiz',
  },
  {
    slug: 'world04-policy',
    nodeId: 'bandit-lab',
    title: 'What pure exploitation fails to discover',
    ready: 'Exploration policy and diagnosis complete',
    template: 'adaptive',
    checkpoint: 'policy-quiz',
  },
  {
    slug: 'world05-diversity',
    nodeId: 'diversity-lab',
    title: 'When relevance collapses into repetition',
    ready: 'Slate health and interpretation complete',
    template: 'hybrid',
    checkpoint: 'ecosystem-quiz',
  },
  {
    slug: 'world06-capstone',
    nodeId: 'capstone-arena',
    title: 'Production Readiness Review',
    ready: 'Production review passed',
    template: 'deep',
    checkpoint: 'champion',
  },
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

function watchPage(page, label) {
  page.on('pageerror', (error) => errors.push(label + ' page: ' + error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      errors.push(label + ' console: ' + message.text())
    }
  })
}

async function preparePage(context, config, label) {
  const page = await context.newPage()
  await page.addInitScript(() => window.localStorage.clear())
  watchPage(page, label)
  await page.goto(baseURL + '/?capture=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
  await showLab(page, config.nodeId)
  return page
}

async function showLab(page, nodeId) {
  await page.evaluate(async (id) => {
    const progress = await import('/src/state/progress.ts')
    progress.useProgress.getState().openNode(id)
  }, nodeId)
  await page.locator('.learning-lab').waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(350)
}

async function completeLab(page, nodeId) {
  if (nodeId === 'retrieval-sandbox') {
    await page.getByRole('button', { name: /Run similarity baseline/ }).click()
    while (await page.locator('.pool .item.picked').count()) {
      await page.locator('.pool .item.picked').first().click()
    }
    const relevant = page.locator('.pool .item:has(.rel.r3)')
    assert.equal(await relevant.count(), 4)
    for (let index = 0; index < 4; index += 1) await relevant.nth(index).click()
    return
  }

  if (nodeId === 'attention-lab') {
    await page.getByRole('button', { name: 'Flash attention' }).click()
    await page.locator('.attn-run').last().click()
    return
  }

  if (nodeId === 'bandit-lab') {
    await page.getByRole('button', { name: /UCB/ }).click()
    await page.getByRole('button', { name: /Run controlled horizon/ }).click()
    return
  }

  if (nodeId === 'diversity-lab') {
    await page.getByRole('button', { name: /Run MMR/ }).click()
    return
  }

  if (nodeId === 'capstone-arena') {
    const answers = await page.evaluate(async () => {
      const course = await import('/src/data/course.ts')
      return course.CAPSTONE_QUESTIONS.map((question) => question.answer)
    })
    for (let index = 0; index < answers.length; index += 1) {
      await page.locator('.arena-questions .q').nth(index).locator('.opt').nth(answers[index]).click()
    }
    await page.getByRole('button', { name: 'Evaluate design' }).click()
  }
}

async function readLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const lab = document.querySelector('.learning-lab')
    const header = document.querySelector('.learning-lab-header')
    const footer = document.querySelector('.learning-lab-actions')
    const scroll = document.querySelector('.learning-lab-scroll')
    const title = document.querySelector('.learning-lab-header h1')
    const labRect = lab?.getBoundingClientRect()
    const headerRect = header?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()
    return {
      documentOverflowX: root.scrollWidth - root.clientWidth,
      documentOverflowY: root.scrollHeight - root.clientHeight,
      labLeft: labRect?.left ?? -1,
      labRight: labRect?.right ?? -1,
      labTop: labRect?.top ?? -1,
      labBottom: labRect?.bottom ?? -1,
      headerTop: headerRect?.top ?? -1,
      footerBottom: footerRect?.bottom ?? -1,
      scrollHeight: scroll?.scrollHeight ?? 0,
      scrollClientHeight: scroll?.clientHeight ?? 0,
      titleFont: Number.parseFloat(title ? getComputedStyle(title).fontSize : '0'),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })
}

function assertLayout(layout, label) {
  assert.ok(layout.documentOverflowX <= 1, label + ' has document horizontal overflow')
  assert.ok(layout.documentOverflowY <= 1, label + ' has document vertical overflow')
  assert.ok(layout.labLeft >= -1 && layout.labRight <= layout.viewportWidth + 1, label + ' lab exceeds viewport width')
  assert.ok(layout.labTop >= -1 && layout.labBottom <= layout.viewportHeight + 1, label + ' lab exceeds viewport height')
  assert.ok(layout.headerTop >= -1, label + ' header is clipped')
  assert.ok(layout.footerBottom <= layout.viewportHeight + 1, label + ' footer is clipped')
  assert.ok(layout.scrollClientHeight > 0, label + ' has no scroll viewport')
  assert.ok(layout.titleFont >= 22, label + ' title is too small')
}

const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
})
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})

const report = []

for (const config of labs) {
  const desktop = await preparePage(desktopContext, config, config.slug + ' desktop')
  await desktop.getByRole('heading', { name: config.title }).waitFor()
  const initialLayout = await readLayout(desktop)
  assertLayout(initialLayout, config.slug + ' desktop initial')
  await desktop.screenshot({ path: 'artifacts/' + config.slug + '-desktop.png' })

  await completeLab(desktop, config.nodeId)
  await desktop.getByText(config.ready, { exact: true }).waitFor({ timeout: 10000 })
  const foundryButton = desktop.locator('.learning-lab-actions .btn.ghost')
  const checkpointButton = desktop.locator('.learning-lab-actions .btn.primary')
  assert.equal(await foundryButton.isEnabled(), true)
  assert.equal(await checkpointButton.isEnabled(), true)
  await desktop.screenshot({ path: 'artifacts/' + config.slug + '-complete.png' })

  await foundryButton.click()
  await desktop.locator('.system-builder').waitFor({ state: 'visible', timeout: 30000 })
  assert.equal(await desktop.locator('.template-select select').inputValue(), config.template)
  await desktop.getByRole('button', { name: 'Close Foundry' }).click()

  await showLab(desktop, config.nodeId)
  await completeLab(desktop, config.nodeId)
  await desktop.getByText(config.ready, { exact: true }).waitFor({ timeout: 10000 })
  await desktop.locator('.learning-lab-actions .btn.primary').click()
  const activeNode = await desktop.evaluate(async () => {
    const progress = await import('/src/state/progress.ts')
    return progress.useProgress.getState().activeNodeId
  })
  assert.equal(activeNode, config.checkpoint)
  await desktop.close()

  const mobile = await preparePage(mobileContext, config, config.slug + ' mobile')
  const mobileLayout = await readLayout(mobile)
  assertLayout(mobileLayout, config.slug + ' mobile')
  assert.ok(mobileLayout.scrollHeight >= mobileLayout.scrollClientHeight)
  await mobile.screenshot({ path: 'artifacts/' + config.slug + '-mobile.png' })
  await mobile.close()

  report.push({
    world: config.slug,
    desktop: initialLayout,
    mobile: mobileLayout,
    foundryTemplate: config.template,
    checkpoint: config.checkpoint,
  })
}

console.log(JSON.stringify({ worlds: report, errors }, null, 2))
await browser.close()
assert.deepEqual(errors, [])

