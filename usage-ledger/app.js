'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const node = (tag,text) => { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e; };
 const number = x => Number(x).toLocaleString(undefined,{maximumFractionDigits:0});
 const date = x => new Date(x*1000).toLocaleDateString(undefined,{timeZone:'America/Los_Angeles',month:'short',day:'numeric',year:'numeric'});
 const publicDemo=document.body.dataset.public==='true';
 let state,view='automation',serial=0;
 const metric=()=>$('measure').value;
 const label=()=>({tokens:'measured tokens',output:'output tokens',records:'recorded executions'}[metric()]);
 const measured=(b)=>metric()==='records'||b.measured>0;
 const value=b=>!b.records?'No observations':!measured(b)?'Unknown':number(b[metric()]);
 function table(id,rows){$(id).replaceChildren(...rows.map(values=>{const tr=node('tr');values.forEach(v=>tr.append(node('td',v)));return tr;}));}
 function render(){
  const d=state,a=d.analysis,key=metric(),total=a.channels.reduce((sum,c)=>sum+c[key],0);
  $('scope').textContent=publicDemo?'Public demo · one approved local run. This is not an account-wide usage report.':d.scope_note;
  $('coverage').textContent=a.coverage_note;
  $('stats').replaceChildren(...[[number(d.tokens),'measured tokens'],[number(d.records),'recorded executions'],[d.records?Math.round(100*d.measured/d.records)+'%':'Unknown','records with token totals'],[number(a.unverified_records),'records with unverified allocation']].map(([v,t])=>{const div=node('div');div.append(node('strong',v),node('span',t));return div;}));
  $('mix-total').textContent=total?number(total):(d.records?'Unknown':'—');$('mix-unit').textContent=label();
  $('mix-caption').textContent=publicDemo?'Within this selected run':date(a.window.start)+' – '+date(a.window.end);
  let from=0;const stops=[];
  $('legend').replaceChildren(...a.channels.map(c=>{
   const share=total?100*c[key]/total:0;if(share){stops.push(`${c.color} ${from}% ${from+share}%`);from+=share;}
   const div=node('div');div.className='legendrow';const dot=node('i');dot.style.background=c.color;
   const empty=publicDemo?'Not represented in this sample':'No observations';
   div.append(dot,node('span',c.name),node('strong',!c.records?empty:!measured(c)?'Tokens unknown':`${number(c[key])} · ${share.toFixed(1)}%`),node('small',c.records?`${number(c.records)} records · ${c.measured}/${c.records} with token totals`:''));return div;
  }));
  $('pie').style.background=stops.length?`conic-gradient(${stops.join(',')})`:'var(--panel)';
  $('pie').setAttribute('aria-label',a.channels.filter(c=>c.records).map(c=>`${c.name}: ${value(c)} ${label()}`).join('; ')||'No observations');
  $('attribution').textContent=publicDemo?'Only local execution is represented in this approved sample. Cloud shares, subscription/API allocation and multi-day trends have not been published.':a.unverified_records?`${number(a.unverified_records)} records lack a verified provider or billing route. Provider identity remains visible; subscription versus API attribution needs execution evidence. Today’s settings cannot establish yesterday’s billing.`:'All observed records have an allocated route. This does not establish usage outside the collected sources.';
  renderTrend();renderComparison();renderOpportunities();
  table('tasks',d.tasks.map(t=>[t.name,t.measured?number(t.tokens):'Unknown',t.measured?number(t.output):'Unknown',number(t.records),`${t.measured}/${t.records}`,number(t.errors)]));
  table('events',d.events.slice(-80).reverse().map(e=>[new Date(e.ts*1000).toLocaleString(undefined,{timeZone:'America/Los_Angeles'}),e.task||'Unassigned',e.model||'Unknown',e.billing||'unknown',e.total_tokens===null||e.total_tokens===undefined?'Unknown':number(e.total_tokens)]));
 }
 function periods(){
  const map=new Map();
  state.analysis.trend.forEach(day=>{
   let k=day.date;
   if($('granularity').value==='week'){const dt=new Date(k+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()-(dt.getUTCDay()+6)%7);k=dt.toISOString().slice(0,10);}
   if(!map.has(k))map.set(k,{date:k,records:0,channels:day.channels.map(c=>({...c,tokens:0,output:0,records:0,measured:0}))});
   const p=map.get(k);p.records+=day.records;day.channels.forEach((c,i)=>{for(const key of ['tokens','output','records','measured'])p.channels[i][key]+=c[key];});
  });return [...map.values()];
 }
 function renderTrend(){
  const ps=periods(),key=metric(),share=$('trend-mode').value==='share';
  const max=Math.max(1,...ps.map(p=>p.channels.reduce((s,c)=>s+c[key],0)));
  $('trend').style.minWidth=Math.max(580,ps.length*26)+'px';
  $('trend').replaceChildren(...ps.map((p,i)=>{
   const total=p.channels.reduce((s,c)=>s+c[key],0),div=node('div');div.className='period'+(!p.records?' empty':'');div.tabIndex=0;
   const text=p.date+': '+(!p.records?'No observations':!total&&key!=='records'?'No measured volume':p.channels.filter(c=>c.records).map(c=>c.name+' '+value(c)).join('; '));
   div.title=text;div.setAttribute('aria-label',text);const stack=node('div');stack.className='stack';stack.style.height=(total?(share?100:100*total/max):0)+'%';
   p.channels.forEach(c=>{if(!total||!c[key])return;const seg=node('div');seg.className='segment';seg.style.height=100*c[key]/total+'%';seg.style.background=c.color;stack.append(seg);});
   div.append(stack);if(i===0||i===ps.length-1||ps.length<12||i%Math.ceil(ps.length/10)===0)div.append(node('span',p.date.slice(5)));return div;
  }));
  $('trend-caption').textContent=publicDemo?'One real observation is available. There is not enough published history to infer a trend.':`Observed ${label()} by ${$('granularity').value}, ${share?'normalized within each period':'scaled to the busiest period'}. ${ps.filter(p=>!p.records).length} periods contain no observations.`;
  $('trend-measure-heading').textContent=label();table('trend-values',ps.flatMap(p=>p.records?p.channels.filter(c=>c.records).map(c=>[p.date,c.name,value(c),number(c.records)]):[[p.date,'No observations','Unknown','No observations']]));
 }
 function renderComparison(){
  const a=state.analysis;
  table('comparison',a.channels.map((c,i)=>{const p=a.previous_channels[i];let change='Not comparable';if(c.records&&p.records&&measured(c)&&measured(p)){const diff=c[metric()]-p[metric()];change=(diff>0?'+':'')+number(diff)+(p[metric()]?' ('+(diff>0?'+':'')+(100*diff/p[metric()]).toFixed(1)+'%)':' · no prior measured baseline');}return [c.name,value(c),publicDemo?'Not published':value(p),publicDemo?'Insufficient history':change];}));
 }
 function renderOpportunities(){
  let list=state.analysis.opportunities;
  if($('workloads').value!=='all')list=list.filter(o=>($('workloads').value==='local')===(o.action==='Review existing local evidence'));
  $('opportunities').replaceChildren(...list.map(o=>{
   const card=node('article');card.className='opportunity';const tag=node('p',o.stage);tag.className='eyebrow';const volume=node('p',`${number(o.tokens)} measured tokens · ${number(o.records)} records · ${o.coverage}/${o.records} with token totals`);volume.className='volume';const detail=node('details');detail.append(node('summary','Evidence & next experiment'),node('p',o.channels.filter(c=>c.records).map(c=>c.name+': '+number(c.records)+' records').join(' · ')),node('p',o.next));card.append(tag,node('h3',o.task),volume,node('h4',o.action),node('p',o.why),detail);return card;
  }));if(!list.length)$('opportunities').append(node('p','No candidates in this selection. More observed workloads and reviewed evaluations are needed.'));
 }
 async function load(){
  const request=++serial;$('content').setAttribute('aria-busy','true');$('status').textContent=publicDemo?'Reading the saved example…':'Loading usage observations…';
  try{const path=publicDemo?document.body.dataset.source:document.body.dataset.source;const r=await fetch(path,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Report unavailable');const data=await r.json();if(request!==serial)return;state=data;render();$('status').textContent=publicDemo?'Frozen example · No live connection':(data.collection.at?'Collected '+new Date(data.collection.at*1000).toLocaleString(undefined,{timeZone:'America/Los_Angeles'}):'Collection time unavailable')+(data.collection.errors?.length?' · Collection has errors: '+data.collection.errors.join(', '):'');}
  catch(e){if(request===serial)$('status').textContent='Could not load the report. '+(state?'The last loaded report remains visible. ':'')+'Use '+(publicDemo?'Reload example':'Collect & refresh')+' to retry.';}
  finally{if(request===serial)$('content').setAttribute('aria-busy','false');}
 }
 $('days').onchange=load;$('measure').onchange=()=>state&&render();$('granularity').onchange=()=>state&&renderTrend();$('trend-mode').onchange=()=>state&&renderTrend();$('workloads').onchange=()=>state&&renderOpportunities();
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load();});
 $('refresh').onclick=()=>load();
 if(publicDemo){$('days').disabled=true;$('views').hidden=true;$('public-context').hidden=false;$('public-context').textContent='A public window into a private tool. This demo uses one approved, real local-model experiment. The private dashboard compares usage routes and trends across collected workloads; this page has no connection to that history.';$('privacy').textContent='Frozen, selected metadata only. Prompts, answers, source messages, account details and live connections are omitted.';}
 load();
})();
