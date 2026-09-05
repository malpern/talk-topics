import init,{PixelPolicy,BrowserGame} from './pkg/waka_web.js';
import {validatePolicy} from './policy.mjs';
const ready=init();
let bots=[],generation=0;
function policies(recipe){const c=validatePolicy(recipe);return [new PixelPolicy(c.caution,c.exploration,c.chaseRange),new PixelPolicy(c.caution,c.exploration,c.chaseRange)];}
self.onmessage=async({data:m})=>{
 try {
  await ready;
  if(m.type==='configure'){bots.forEach(b=>b.free());bots=policies(m.recipe);generation=m.generation;postMessage({type:'ready',generation});}
  else if(m.type==='observe'&&m.generation===generation){const action=bots[m.player].act(m.pixels,m.frame,m.player);postMessage({type:'action',frame:m.frame,player:m.player,action,generation});}
  else if(m.type==='trial'){
   const trialBots=policies(m.recipe),game=new BrowserGame(true,0);
   const limit=Math.min(3600,Math.max(300,Math.trunc(m.frames)||1800));
   let status; const started=performance.now();
   try{
    for(let frame=0;frame<limit;frame++){
     const pixels=game.pixels();
     game.step(trialBots[0].act(pixels,frame,0),trialBots[1].act(pixels,frame,1),false);
     if(frame%60===0){status=JSON.parse(game.status());postMessage({type:'progress',status,pixels:game.pixels()});await new Promise(r=>setTimeout(r,0));}
     status=JSON.parse(game.status());
     if(status.stage==='GameOver'||status.level>1)break;
    }
    postMessage({type:'result',result:{...status,recipe:m.recipe,simulatedSeconds:Math.round(status.frame*16.5)/1000,wallSeconds:Math.round(performance.now()-started)/1000,mode:'Two copies of this image-only policy, local zero-delay trial',completed:true}});
   }finally{game.free();trialBots.forEach(b=>b.free());}
  }
 }catch(e){postMessage({type:'error',message:String(e),generation:m.generation});}
};
