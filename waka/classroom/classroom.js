// Static illustration from the actual authored maze. Python runs in the Mac app.
const canvas=document.querySelector('#arena-preview');
if(canvas && window.WAKA_MAZE){
 const frame=window.WAKA_MAZE;
 const ctx=canvas.getContext('2d'),t=12;
 ctx.fillStyle='#03050c';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#224fff';ctx.lineWidth=1.3;
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
  const row=frame.grid[y];if(row[x]!=='#')continue;
  const edge=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  if(y>0&&frame.grid[y-1][x]!=='#')edge(x*t,y*t,(x+1)*t,y*t);
  if(y+1<frame.height&&frame.grid[y+1][x]!=='#')edge(x*t,(y+1)*t,(x+1)*t,(y+1)*t);
  if(x>0&&row[x-1]!=='#')edge(x*t,y*t,x*t,(y+1)*t);
  if(x+1<frame.width&&row[x+1]!=='#')edge((x+1)*t,y*t,(x+1)*t,(y+1)*t);
 }
 ctx.fillStyle='#ffcca2';for(const [x,y] of frame.pellets){ctx.beginPath();ctx.arc((x+.5)*t,(y+.5)*t,1.1,0,Math.PI*2);ctx.fill();}
 for(const p of frame.powerups){const [x,y]=p.position;ctx.fillStyle=p.kind==='predator'?'#ff324c':p.kind==='fruit'?'#ff5268':'#fff1ba';ctx.beginPath();ctx.arc((x+.5)*t,(y+.5)*t,3.5,0,Math.PI*2);ctx.fill();}
 for(const a of frame.agents){const[x,y]=a.position;ctx.fillStyle='#'+a.color;ctx.beginPath();ctx.moveTo((x+.5)*t,(y+.5)*t);ctx.arc((x+.5)*t,(y+.5)*t,6,0.5,Math.PI*2-0.5);ctx.closePath();ctx.fill();}
 for(const g of frame.ghosts){const[x,y]=g.position;ctx.fillStyle='#'+g.color;ctx.beginPath();ctx.arc((x+.5)*t,(y+.5)*t,5,Math.PI,0);ctx.lineTo((x+.5)*t+5,(y+.5)*t+5);ctx.lineTo((x+.5)*t-5,(y+.5)*t+5);ctx.closePath();ctx.fill();ctx.fillStyle='white';ctx.fillRect((x+.5)*t-3,(y+.5)*t-1,2,3);ctx.fillRect((x+.5)*t+1,(y+.5)*t-1,2,3);}
}
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
 const code=document.getElementById(button.dataset.copy).innerText;
 try{await navigator.clipboard.writeText(code);button.textContent='Copied';}catch{const range=document.createRange();range.selectNodeContents(document.getElementById(button.dataset.copy));getSelection().removeAllRanges();getSelection().addRange(range);button.textContent='Selected — press Copy';}
 setTimeout(()=>button.textContent='Copy code',2000);
}));
