import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const CONFIGS = JSON.parse(process.env.CONFIGS)
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
for (const {tag, q} of CONFIGS){
  const ctx=await b.newContext({viewport:{width:1680,height:945},deviceScaleFactor:1.15})
  const p=await ctx.newPage()
  await p.goto('http://127.0.0.1:4173/?capture=1&showcase=1&'+(q||''),{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(3200)
  await p.screenshot({path:`renders/show_${tag}.png`}); console.log(tag)
  await ctx.close()
}
await b.close()
