import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
for (const [tag,q] of [
  ['camp','showcase=1&cx=-13&cy=10.5&cz=17&lx=3&ly=1.2&lz=-5&fov=42'],
  ['valley','world=valley&showcase=1&cx=-3.2&cy=9&cz=16&lx=1&ly=1&lz=-3&fov=44'],
]) {
  const ctx=await b.newContext({viewport:{width:1200,height:720},deviceScaleFactor:1})
  const p=await ctx.newPage()
  await p.goto(`http://127.0.0.1:4173/?capture=1&nofx=1&${q}`,{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(4500)
  await p.screenshot({path:`renders/audit_${tag}.png`}); console.log(tag)
  await ctx.close()
}
await b.close(); console.log('DONE')
