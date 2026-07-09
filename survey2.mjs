import { chromium } from 'playwright-core'
import sharp from 'sharp'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
for(const spec of JSON.parse(process.env.SPECS)){
  let ok=false
  for(let i=0;i<5&&!ok;i++){
    const ctx=await b.newContext({viewport:{width:1400,height:850},deviceScaleFactor:1})
    const p=await ctx.newPage()
    try{
      await p.goto(`http://127.0.0.1:4173/?capture=1&nofx=1&lsnap=1&world=valley&px=-6&pz=6&${spec.cam}`,{waitUntil:'load',timeout:60000})
      await p.waitForSelector('canvas'); await p.waitForTimeout(6000)
      await p.evaluate(()=>{const s=window.__progress.getState();['npc-guide','week01-station','ranking-sandbox','quiz-gate','retrieval-bridge'].forEach(id=>s.completeNode(id));s.openNode('two-tower-lesson')})
      await p.waitForTimeout(4500)
      const buf=await p.screenshot({timeout:20000})
      const {data,info}=await sharp(buf).extract({left:750,top:200,width:600,height:500}).raw().toBuffer({resolveWithObject:true})
      let bright=0;for(let k=0;k<data.length;k+=info.channels){if(Math.max(data[k],data[k+1],data[k+2])>150)bright++}
      console.log(`${spec.tag} try ${i}: bright=${bright}`)
      if(bright>1500){await sharp(buf).toFile(`renders/ov_${spec.tag}.png`);ok=true;console.log('SAVED',spec.tag)}
    }catch(e){console.log(`${spec.tag} try ${i} ERR ${String(e).slice(0,60)}`)}
    await ctx.close()
  }
}
await b.close()
