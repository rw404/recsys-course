import { NodeIO } from '@gltf-transform/core'
const io=new NodeIO()
for(const f of ['idle','walking','running']){
  const doc=await io.read(`public/models/porter-v2/${f}.glb`)
  const anims=doc.getRoot().listAnimations()
  for(const a of anims){
    console.log(`\n${f}.glb — clip "${a.getName()}"`)
    const chans=a.listChannels()
    // show unique target paths and which nodes have translation
    const trans=chans.filter(c=>c.getTargetPath()==='translation').map(c=>c.getTargetNode()?.getName())
    console.log('  translation-animated nodes:', JSON.stringify(trans))
  }
}
