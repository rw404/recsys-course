import { chromium } from 'playwright-core'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
const ctx=await b.newContext({viewport:{width:1000,height:1000},deviceScaleFactor:1.5})
const p=await ctx.newPage()
await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1&inspect=1',{waitUntil:'load',timeout:60000})
await p.waitForSelector('canvas'); await p.waitForTimeout(4500)
await p.screenshot({path:'renders/feet_inspect.png'}); console.log('saved')
await b.close()
