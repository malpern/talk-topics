import init,{BrowserGame} from './pkg/waka_web.js';
import {defaults,validatePolicy,coachingPrompt} from './policy.mjs';
import {registerTools} from './tools.mjs';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
let game,mode='solo',paused=true,recipe={...defaults},inputs=[0,0],generation=0,frame=0,policyReady=false,policyBusy=false,policySentAt=0;
let worker,trialWorker,trialReject,history=[],lastTime=0,accumulator=0,audioContext,audioGain,audioNext=0,sound=false;
const sources=new Set();
function announce(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
function recipeFields(c){$('name').value=c.name;for(const k of ['caution','exploration','chaseRange']){$(k).value=c[k];$(k+'-value').value=c[k];}$('recipe-json').value=JSON.stringify(c,null,2);}
function resetPolicy(){generation++;policyReady=false;policyBusy=false;inputs[1]=0;worker?.postMessage({type:'configure',recipe,generation});}
function configure(value){recipe=validatePolicy(value);recipeFields(recipe);resetPolicy();try{localStorage.setItem('waka-browser-recipe',JSON.stringify(recipe));}catch{}announce('recipe-status',`${recipe.name} is ready. New choices apply on the next observation.`);announce('import-status','Recipe applied.');return {recipe};}
function paint(pixels){ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),224,288),0,0);}
function clearAudio(){for(const source of sources){try{source.stop();}catch{}}sources.clear();audioNext=audioContext?.currentTime||0;}
function playAudio(samples){
 if(!sound||!audioContext||audioContext.state!=='running')return;
 const now=audioContext.currentTime;
 if(audioNext>now+.12)return; // Never accumulate a long sound backlog.
 const buffer=audioContext.createBuffer(1,samples.length,48000);buffer.copyToChannel(samples,0);
 const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioGain);sources.add(source);source.onended=()=>sources.delete(source);
 audioNext=Math.max(audioNext,now+.025);source.start(audioNext);audioNext+=buffer.duration;
}
function pause(value,reason='Paused. Your maze will wait.'){
 if(!game)throw Error('The arcade is still loading.');
 if(!value&&document.hidden)throw Error('Bring the game tab into view before resuming.');
 if(!value&&trialWorker)throw Error('Finish or cancel the trial before resuming.');
 paused=value;inputs=[0,0];resetPolicy();accumulator=0;lastTime=0;clearAudio();
 $('pause').textContent=paused?'Resume':'Pause';$('screen-message').hidden=!paused;$('screen-message').textContent=reason;
 announce('game-status',paused?'Paused':mode==='partner'?`You + ${recipe.name}`:mode==='coop'?'Two humans':'Solo');
 return {paused};
}
function start(selected){
 if(!game)throw Error('The arcade is still loading.');
 if(trialWorker)throw Error('Finish or cancel the trial first.');
 game.free();game=new BrowserGame(selected!=='solo',0);mode=selected;frame=0;paint(game.pixels());pause(false);canvas.focus();return {mode,paused};
}
function results(){return {recipe,game:game?{...JSON.parse(game.status()),mode,paused}:null,trials:history};}
function finishTrial(message='Trial finished. Resume your game or start a new one.'){trialWorker?.terminate();trialWorker=null;trialReject=null;$('trial').disabled=false;$('cancel-trial').hidden=true;$('screen-message').hidden=false;$('screen-message').textContent=message;if(game)paint(game.pixels());}
function cancelTrial(){if(!trialWorker)return;const reject=trialReject;finishTrial('Trial canceled. Your game is still paused.');announce('game-status','Trial canceled');reject?.(Error('Trial canceled.'));}
function trial(frames=1800,signal){
 if(!game) return Promise.reject(Error('The arcade is still loading.'));
 if(trialWorker)return Promise.reject(Error('A trial is already running.'));
 if(signal?.aborted)return Promise.reject(Error('Trial canceled.'));
 pause(true);$('screen-message').hidden=true;$('trial').disabled=true;$('cancel-trial').hidden=false;
 $('trial-result').textContent=`Testing ${recipe.name}…`;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>fail('Trial exceeded its 60-second limit.'),60000);
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancelTrial);};
  trialReject=e=>{cleanup();reject(e);};
  const fail=message=>{cleanup();finishTrial();reject(Error(message));};
  signal?.addEventListener('abort',cancelTrial,{once:true});
  trialWorker=new Worker('./worker.js',{type:'module'});
  trialWorker.onerror=()=>fail('Trial worker failed to load. Reload the page and try again.');
  trialWorker.onmessage=({data:m})=>{
   if(m.type==='progress'){paint(m.pixels);announce('game-status',`Trial · ${m.status.frame} frames`);}
   else if(m.type==='error')fail(m.message);
   else if(m.type==='result'){
    cleanup();history.push(m.result);history=history.slice(-10);$('trial-result').textContent=`${m.result.recipe.name} scored ${m.result.score + m.result.partnerScore} points together.\n${m.result.lives} lives left · Level ${m.result.level}\n${m.result.simulatedSeconds} seconds of game time.\nCopy trial results below to share the full report.`;finishTrial();announce('game-status','Trial complete');resolve(m.result);
   }
  };
  trialWorker.postMessage({type:'trial',recipe:{...recipe},frames});
 });
}
function failGame(message){pause(true,message);announce('load-error',message,true);}
function tick(now){
 requestAnimationFrame(tick);
 if(!game||paused||document.hidden||trialWorker){lastTime=now;return;}
 if(!lastTime){lastTime=now;return;}
 const elapsed=now-lastTime;lastTime=now;
 // Local browser play pauses after a long stall, instead of racing through
 // unseen seconds. This is deliberately not native Equalized timing.
 if(elapsed>250){pause(true,'Paused after the browser was busy. Press Resume when ready.');return;}
 accumulator+=elapsed;
 try{
  let changed=false;
  while(accumulator>=16.5){game.step(inputs[0],mode==='solo'?0:inputs[1],sound);if(sound)playAudio(game.audio());frame++;accumulator-=16.5;changed=true;}
  if(!changed)return;
  const pixels=game.pixels();paint(pixels);
  if(mode==='partner'&&policyReady&&!policyBusy){policyBusy=true;policySentAt=now;worker.postMessage({type:'observe',generation,frame,player:1,pixels});}
  if(policyBusy&&now-policySentAt>1000){failGame('The partner stopped responding. Reload to reconnect it, or start a solo game.');return;}
  if(frame%30===0){const state=JSON.parse(game.status());if(state.stage==='GameOver')pause(true,'Game over. Start a new game when you’re ready.');}
 }catch(e){failGame(`The game stopped: ${e.message}`);}
}
async function copy(text,button){try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1500);}catch{announce('import-status','Clipboard unavailable. Select and copy the recipe or results manually.',true);}}
for(const k of ['caution','exploration','chaseRange'])$(k).addEventListener('input',()=>$(k+'-value').value=$(k).value);
$('recipe-form').addEventListener('submit',e=>{e.preventDefault();try{configure({name:$('name').value,caution:+$('caution').value,exploration:+$('exploration').value,chaseRange:+$('chaseRange').value});}catch(error){announce('recipe-status',error.message,true);}});
const presets={cautious:{name:'Scout',caution:90,exploration:15,chaseRange:1},balanced:defaults,bold:{name:'Comet',caution:25,exploration:65,chaseRange:6}};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>configure(presets[b.dataset.preset]);
$('import-recipe').onclick=()=>{try{configure(JSON.parse($('recipe-json').value));}catch(e){announce('import-status',e.message,true);}};
$('copy-prompt').onclick=e=>copy(coachingPrompt($('brief').value,recipe),e.target);
$('copy-results').onclick=e=>copy(JSON.stringify({trials:history,recipe},null,2),e.target);
$('export-recipe').onclick=e=>copy(JSON.stringify(recipe,null,2),e.target);
for(const id of ['solo','partner','coop'])$(id).onclick=()=>{try{start(id);}catch(e){announce('load-error',e.message,true);}};
$('pause').onclick=()=>{try{pause(!paused);}catch(e){announce('load-error',e.message,true);}};
$('trial').onclick=()=>trial().catch(e=>{$('trial-result').textContent=e.message;});
$('cancel-trial').onclick=cancelTrial;
$('sound').onclick=async()=>{
 try{
  if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=.65;audioGain.connect(audioContext.destination);}
  await audioContext.resume();sound=!sound;clearAudio();$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));
 }catch(e){announce('load-error','Audio could not start. The game is still playable.',true);}
};
$('crt').onclick=()=>{const enabled=$('screen').classList.toggle('crt');$('crt').textContent=enabled?'CRT on':'CRT off';$('crt').setAttribute('aria-pressed',String(enabled));};
const keys={ArrowUp:1,ArrowLeft:2,ArrowDown:3,ArrowRight:4,KeyW:1,KeyA:2,KeyS:3,KeyD:4};
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,button')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(e.code==='Space'){e.preventDefault();if(game&&!trialWorker)pause(!paused);return;}
 if(keys[e.code]){e.preventDefault();if(!paused&&!trialWorker)inputs[mode==='coop'&&e.code.startsWith('Arrow')?1:0]=keys[e.code];}
});
let anchor;
canvas.addEventListener('pointerdown',e=>{if(paused||trialWorker)return;anchor={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.focus();});
canvas.addEventListener('pointermove',e=>{if(!anchor||anchor.id!==e.pointerId||paused)return;const dx=e.clientX-anchor.x,dy=e.clientY-anchor.y;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;inputs[0]=Math.abs(dx)>Math.abs(dy)?(dx>0?4:2):(dy>0?3:1);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>anchor=null);
for(const b of document.querySelectorAll('[data-direction]'))b.onclick=()=>{if(!paused&&!trialWorker)inputs[0]=+b.dataset.direction;};
document.addEventListener('visibilitychange',()=>{if(game&&document.hidden&&!paused)pause(true,'Paused while you were away. Resume when ready.');});
try{
 try{const saved=localStorage.getItem('waka-browser-recipe');if(saved)recipe=validatePolicy(JSON.parse(saved));}catch{}
 recipeFields(recipe);await init();game=new BrowserGame(false,0);paint(game.pixels());
 worker=new Worker('./worker.js',{type:'module'});worker.onerror=()=>{if(mode==='partner'&&!paused)failGame('The partner could not load. Solo and two-human modes are still available.');};
 worker.onmessage=({data:m})=>{if(m.generation!==generation)return;if(m.type==='ready'){policyReady=true;policyBusy=false;}else if(m.type==='action'){policyBusy=false;if(!paused&&m.frame<=frame&&frame-m.frame<=3&&m.action>=0&&m.action<=4){if(m.action)inputs[1]=m.action;}}else if(m.type==='error')failGame(m.message);};
 resetPolicy();for(const id of ['solo','partner','coop','pause','trial'])$(id).disabled=false;
 $('screen-message').textContent='Choose solo, a partner, or two humans.';announce('game-status','Ready to play');
 const actions={configure,start,pause,trial,results};
 try{const available=await registerTools(document.modelContext??navigator.modelContext,actions);announce('webmcp-status',available?'WebMCP tools are registered. A compatible assistant connected to this tab can coach your partner.':'WebMCP is not available in this browser. The coaching prompt and JSON recipe work with any assistant.');}
 catch(e){announce('webmcp-status','WebMCP registration failed. Copy a coaching prompt and import the recipe instead.');}
 requestAnimationFrame(tick);
}catch(e){$('screen-message').textContent='The arcade could not load.';announce('load-error',`Please reload or try another browser. ${e.message}`,true);}
