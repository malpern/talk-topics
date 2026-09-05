import {policySchema,validatePolicy} from './policy.mjs';
export function makeTools(actions){
 const object={type:'object',properties:{},additionalProperties:false};
 return [
  {name:'waka_configure_partner',description:'Configure the image-only Waka partner. Caution avoids dangerous ghosts; exploration discourages repeated tiles; chaseRange pursues only visibly blue ghosts within that many tiles. Does not start or restart a game.',inputSchema:policySchema,execute:async value=>JSON.stringify(actions.configure(validatePolicy(value)))},
  {name:'waka_start_game',description:'Start a new local Waka game. Replaces the current game. partner: human yellow and configured cyan policy; solo: human yellow; coop: two humans on one keyboard. No online or Equalized timing.',inputSchema:{type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:['solo','partner','coop']}},required:['mode']},execute:async value=>{if(!value||!['solo','partner','coop'].includes(value.mode)||Object.keys(value).some(k=>k!=='mode'))throw Error('Choose solo, partner or coop.');return JSON.stringify(actions.start(value.mode));}},
  {name:'waka_pause_game',description:'Pause or resume local Waka. Does not advance a hidden tab.',inputSchema:{type:'object',additionalProperties:false,properties:{paused:{type:'boolean'}},required:['paused']},execute:async value=>{if(!value||typeof value.paused!=='boolean'||Object.keys(value).some(k=>k!=='paused'))throw Error('paused must be a boolean.');return JSON.stringify(actions.pause(value.paused));}},
  {name:'waka_run_trial',description:'Run a bounded accelerated local trial with two copies of the configured image-only policy. Pauses the live game without replacing it. Returns public scores, lives, level and elapsed frames; no hidden game state. Compare multiple recipes; this does not test network fairness.',inputSchema:{type:'object',additionalProperties:false,properties:{frames:{type:'integer',minimum:300,maximum:3600}},required:['frames']},execute:async(value,context={})=>{if(!value||!Number.isInteger(value.frames)||value.frames<300||value.frames>3600||Object.keys(value).some(k=>k!=='frames'))throw Error('frames must be 300–3600.');return JSON.stringify(await actions.trial(value.frames,context.signal));}},
  {name:'waka_get_results',description:'Read the current recipe, public HUD/session status and completed trial history. Does not expose positions, targets, timers, seed, ROM data or future game state.',inputSchema:object,annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async()=>JSON.stringify(actions.results())}
 ];
}
export async function registerTools(context,actions){
 if(!context?.registerTool)return false;
 const registered=[],controller=new AbortController();
 try{for(const tool of makeTools(actions)){await context.registerTool(tool,{signal:controller.signal});registered.push(tool.name);}return true;}
 catch(error){controller.abort();for(const name of registered){try{context.unregisterTool?.(name);}catch{}}throw error;}
}
