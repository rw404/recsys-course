import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const DIST_DIR = path.resolve(process.cwd(), 'dist')
const INDEX_PATH = path.join(DIST_DIR, 'index.html')
const MAX_ENTRY_BYTES = 80 * 1024
const MAX_INITIAL_JS_BYTES = 230 * 1024
const DEFERRED_PREFIXES = ['vendor-three-', 'vendor-flow-', 'vendor-katex-']

const html = await readFile(INDEX_PATH, 'utf8')
const references = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)]
  .map((match) => path.basename(match[1]))
const initialAssets = [...new Set(references)]
const entryAsset = initialAssets.find((asset) => asset.startsWith('index-'))

if (!entryAsset) {
  throw new Error('Bundle budget: no index JavaScript entry found in dist/index.html')
}

const sizes = await Promise.all(initialAssets.map(async (asset) => ({
  asset,
  bytes: (await stat(path.join(DIST_DIR, 'assets', asset))).size,
})))
const totalInitialBytes = sizes.reduce((total, item) => total + item.bytes, 0)
const entryBytes = sizes.find((item) => item.asset === entryAsset)?.bytes ?? 0
const eagerHeavyVendors = initialAssets.filter((asset) => (
  DEFERRED_PREFIXES.some((prefix) => asset.startsWith(prefix))
))

const builtAssets = await readdir(path.join(DIST_DIR, 'assets'))
for (const prefix of DEFERRED_PREFIXES) {
  if (!builtAssets.some((asset) => asset.startsWith(prefix))) {
    throw new Error(`Bundle budget: expected deferred chunk ${prefix}* was not built`)
  }
}

if (eagerHeavyVendors.length > 0) {
  throw new Error(`Bundle budget: heavy vendors are eagerly preloaded: ${eagerHeavyVendors.join(', ')}`)
}
if (entryBytes > MAX_ENTRY_BYTES) {
  throw new Error(`Bundle budget: entry is ${entryBytes} bytes (limit ${MAX_ENTRY_BYTES})`)
}
if (totalInitialBytes > MAX_INITIAL_JS_BYTES) {
  throw new Error(`Bundle budget: initial JavaScript is ${totalInitialBytes} bytes (limit ${MAX_INITIAL_JS_BYTES})`)
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`
console.log('Bundle budget passed')
for (const item of sizes) console.log(`  ${item.asset}: ${kb(item.bytes)}`)
console.log(`  initial total: ${kb(totalInitialBytes)} / ${kb(MAX_INITIAL_JS_BYTES)}`)
console.log('  Three.js, React Flow and KaTeX remain deferred')
