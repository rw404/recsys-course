import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function rb(f){const img=sharp(f);const m=await img.metadata();const {data,info}=await img.extract({left:Math.floor(m.width*0.52),top:Math.floor(m.height*0.2),width:Math.floor(m.width*0.46),height:Math.floor(m.height*0.7)}).raw().toBuffer({resolveWithObject:true});let n=0;for(let i=0;i<data.length;i+=info.channels){if(data[i]+data[i+1]+data[i+2]>150)n++}return n}
// sweep player yaw to find "back to camera"
const V=[['py0','lpy=0'],['py157','lpy=1.57'],['py314','lpy=3.14'],['pyneg157','lpy=-1.57']]
for(const [name,q] of V){
  let ok=false
  for(let a=1;a<=6&&!ok;a++){
    const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
    const p=await ctx.newPage()
    await p.goto(`http://127.0.0.1:4173/?capture=1&nofx=1&${q}`,{waitUntil:'load',timeout:60000})
    await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
    await p.getByRole('button',{name:'Catalog'}).click()
    await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
    await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(2600)
    const tmp=`/tmp/${name}_${a}.png`; await p.screenshot({path:tmp})
    const n=await rb(tmp); console.log(`${name} #${a}: rb=${n}`)
    await ctx.close()
    if(n>3000){ fs.copyFileSync(tmp,`renders/${name}.png`); ok=true }
  }
  if(!ok) fs.copyFileSync(`/tmp/${name}_1.png`,`renders/${name}.png`)
}
await b.close()
