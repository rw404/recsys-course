import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function rightBright(f){const img=sharp(f);const m=await img.metadata();const {data,info}=await img.extract({left:Math.floor(m.width*0.6),top:Math.floor(m.height*0.2),width:Math.floor(m.width*0.32),height:Math.floor(m.height*0.6)}).raw().toBuffer({resolveWithObject:true});let n=0;for(let i=0;i<data.length;i+=info.channels){if(data[i]+data[i+1]+data[i+2]>130)n++}return n}
let ok=false
for(let a=1;a<=14&&!ok;a++){
  const ctx=await b.newContext({viewport:{width:1180,height:680},deviceScaleFactor:1.4})
  const p=await ctx.newPage()
  await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1',{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(3500)
  await p.getByRole('button',{name:'Catalog'}).click()
  await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
  await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(3200)
  const tmp=`/tmp/lc_${a}.png`; await p.screenshot({path:tmp})
  const n=await rightBright(tmp); console.log(`attempt ${a}: rightBright=${n}`)
  await ctx.close()
  if(n>3500){ fs.copyFileSync(tmp,'lesson-cinematic.png'); ok=true; console.log('GOOD') }
}
if(!ok) fs.copyFileSync('/tmp/lc_1.png','lesson-cinematic.png')
await b.close()
