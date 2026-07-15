import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

process.env.LD_LIBRARY_PATH = '/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173'
const reportName = process.env.REPORT_NAME || 'performance-audit'
const executablePath = [
  process.env.CHROMIUM_PATH,
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
].find((candidate) => candidate && existsSync(candidate))

if (!executablePath) throw new Error('No Playwright Chromium executable was found')

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
    '--enable-precise-memory-info',
  ],
})

const scenarios = [
  { name: 'overview-desktop', path: '/?perf=1', viewport: { width: 1440, height: 1000 }, cpuRate: 1 },
  { name: 'focused-desktop', path: '/?world=valley&perf=1', viewport: { width: 1440, height: 1000 }, cpuRate: 1 },
  { name: 'focused-mobile', path: '/?world=valley&perf=1', viewport: { width: 390, height: 844 }, cpuRate: 4, mobile: true },
]

const report = []

for (const scenario of scenarios) {
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: scenario.mobile ? 2 : 1,
    isMobile: Boolean(scenario.mobile),
    hasTouch: Boolean(scenario.mobile),
  })
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await client.send('Emulation.setCPUThrottlingRate', { rate: scenario.cpuRate })
  await page.addInitScript(() => window.localStorage.clear())

  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text())
  })

  const startedAt = Date.now()
  await page.goto(baseURL + scenario.path, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForFunction(() => {
    const metrics = window.__recsysPerformance
    return metrics && metrics.fps > 0 && metrics.objects > 0
  }, null, { timeout: 60000 })
  await page.waitForTimeout(6000)

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const totals = resources.reduce((acc, entry) => {
      const resource = entry
      const group = resource.initiatorType || 'other'
      acc[group] = (acc[group] || 0) + (resource.transferSize || resource.encodedBodySize || 0)
      return acc
    }, {})
    return {
      world: window.__recsysPerformance,
      resourceCount: resources.length,
      transferBytes: Object.values(totals).reduce((sum, value) => sum + value, 0),
      transferByType: totals,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
      loadMs: navigation?.loadEventEnd ?? 0,
      heapBytes: performance.memory?.usedJSHeapSize ?? 0,
    }
  })

  assert.deepEqual(errors, [], scenario.name + ' emitted browser errors')
  await page.screenshot({ path: 'artifacts/' + reportName + '-' + scenario.name + '.png' })
  report.push({
    scenario: scenario.name,
    wallReadyMs: Date.now() - startedAt,
    ...metrics,
  })
  await context.close()
}

await browser.close()
await writeFile('artifacts/' + reportName + '.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
