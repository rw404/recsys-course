import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
const p=await ctx.newPage()
await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1',{waitUntil:'load',timeout:60000})
await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
await p.getByRole('button',{name:'Catalog'}).click()
await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(3000)
await p.screenshot({path:'renders/g_page0.png'}); console.log('page0')
const next=p.getByRole('button',{name:/Next/})
await next.click(); await p.waitForTimeout(400)   // page1 nod, mid-gesture
await p.screenshot({path:'renders/g_page1.png'}); console.log('page1')
await b.close()
