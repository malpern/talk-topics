// Shared validation for UI, imported coaching recipes, workers and WebMCP.
export const defaults = Object.freeze({name:'Scout',caution:65,exploration:25,chaseRange:2});
export const policySchema = {type:'object',additionalProperties:false,required:['name','caution','exploration','chaseRange'],properties:{name:{type:'string',minLength:1,maxLength:40},caution:{type:'integer',minimum:0,maximum:100},exploration:{type:'integer',minimum:0,maximum:100},chaseRange:{type:'integer',minimum:0,maximum:8}}};
export function validatePolicy(value) {
 if(!value || typeof value!=='object' || Array.isArray(value)) throw Error('Use a JSON object with name, caution, exploration and chaseRange.');
 if(Object.keys(value).some(k=>!(Object.hasOwn(policySchema.properties,k)))) throw Error('Unknown recipe field. Use name, caution, exploration and chaseRange.');
 if(typeof value.name!=='string'||!value.name.trim()||value.name.length>40) throw Error('Give your partner a name of 1–40 characters.');
 for(const [key,max] of [['caution',100],['exploration',100],['chaseRange',8]]) if(!Number.isInteger(value[key])||value[key]<0||value[key]>max) throw Error(`${key} must be a whole number between 0 and ${max}.`);
 return {name:value.name.trim(),caution:value.caution,exploration:value.exploration,chaseRange:value.chaseRange};
}
export function coachingPrompt(description, current) {
 return `Help me design a Waka partner. My goal: ${description || 'A cautious pellet collector that only chases nearby blue ghosts.'}\n\nReturn only a JSON recipe matching this schema: ${JSON.stringify(policySchema)}\nCurrent recipe: ${JSON.stringify(current)}\nCaution scales path costs near visible dangerous ghosts (0 reckless, 50 baseline, 100 very cautious). Exploration discourages revisiting remembered tiles (0-100). ChaseRange is the maximum visible distance in tiles for pursuing blue ghosts (0 disables, max 8). These are heuristic preferences, not guarantees. The fast policy sees only gameplay pixels; you are coaching it, not selecting every turn. If you can access this game's WebMCP tools, use waka_configure_partner and waka_run_trial, then inspect results. Otherwise give me JSON to paste into the recipe box. Do not claim to have played unless you actually ran a trial.`;
}
