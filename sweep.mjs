import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function bright(file){
  const img=sharp(file); const m=await img.metadata()
  const {data,info}=await img.extract({left:Math.floor(m.width*0.15),top:Math.floor(m.height*0.2),width:Math.floor(m.width*0.7),height:Math.floor(m.height*0.6)}).raw().toBuffer({resolveWithObject:true})
  let n=0; for(let i=0;i<data.length;i+=info.channels){if(data[i]+data[i+1]+data[i+2]>150)n++}
  return n
}
// candidate diorama angles: [name, query]
const SPAWN='px=-3&py=0.9&pz=2'
const angles=[
  ['sc_A', `cx=-13&cy=10.5&cz=17&lx=3&ly=1.2&lz=-5&fov=42`],
  ['sc_B', `cx=20&cy=12&cz=16&lx=2&ly=1&lz=-4&fov=40`],
  ['sc_C', `cx=2&cy=17&cz=20&lx=2&ly=1&lz=-4&fov=40`],
  ['sc_D', `cx=-10&cy=6.5&cz=15&lx=0&ly=1.6&lz=-3&fov=46`],
]
for(const [name,q] of angles){
  const url=`http://127.0.0.1:4173/?capture=1&showcase=1&${SPAWN}&${q}`
  let ok=false
  for(let a=1;a<=6&&!ok;a++){
    const ctx=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1.5})
    const p=await ctx.newPage()
    await p.goto(url,{waitUntil:'load',timeout:60000})
    await p.waitForSelector('canvas'); await p.waitForTimeout(4200)
    const tmp=`/tmp/${name}_${a}.png`; await p.screenshot({path:tmp})
    const n=await bright(tmp); console.log(`${name} #${a}: bright=${n}`)
    await ctx.close()
    if(n>12000){ fs.copyFileSync(tmp,`renders/${name}.png`); ok=true; console.log('  GOOD',name) }
  }
  if(!ok){ fs.copyFileSync(`/tmp/${name}_1.png`,`renders/${name}.png`); console.log('  fallback',name) }
}
await b.close()
