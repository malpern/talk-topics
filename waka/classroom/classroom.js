// A static illustration: the downloadable native app runs the Python agents.
const canvas = document.querySelector('#arena-preview');
if (canvas) {
  const ctx = canvas.getContext('2d');
  for (let y=0;y<55;y++) for(let x=0;x<81;x++) {
    const wall = x===0 || x===80 || y===0 || y===54 || (y%4===0 && x%8>=2 && x%8<=6);
    ctx.fillStyle=wall?'#274478':'#aaa891';
    if(wall)ctx.fillRect(x*10+1,y*10+1,8,8);else {ctx.beginPath();ctx.arc(x*10+5,y*10+5,1,0,Math.PI*2);ctx.fill();}
  }
  const colors=['#ffe34c','#65dbf3','#ff7599','#b9a0ff','#77e3ac','#ffb467','#ef9cff','#a8d8ff','#d7eb71','#ff8a65','#86b9ff','#e7ccd6'];
  const positions=[[9,5],[27,7],[53,5],[73,9],[71,27],[73,47],[55,49],[27,47],[7,49],[7,27],[27,27],[53,27]];
  positions.forEach(([x,y],i)=>{ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(x*10+5,y*10+5,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101624';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i+1,x*10+5,y*10+5);});
}
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const code=document.getElementById(button.dataset.copy).innerText;
  try{await navigator.clipboard.writeText(code);button.textContent='Copied';}
  catch{const range=document.createRange();range.selectNodeContents(document.getElementById(button.dataset.copy));getSelection().removeAllRanges();getSelection().addRange(range);button.textContent='Selected — press Copy';}
  setTimeout(()=>button.textContent='Copy code',2000);
}));
