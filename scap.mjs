import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
for (const [tag,url,rot] of [['console','/models/props/arcane-console.glb','25'],['arch','/models/props/checkpoint-arch.glb','15'],['waystone','/models/props/waystone.glb','25']]) {
  const ctx=await b.newContext({viewport:{width:600,height:600},deviceScaleFactor:1})
  const p=await ctx.newPage()
  await p.goto(`http://127.0.0.1:4173/?view=glb&url=${url}&rot=${rot}`,{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(2600)
  await p.screenshot({path:`renders/st_${tag}.png`}); console.log(tag)
  await ctx.close()
}
await b.close(); console.log('DONE')
