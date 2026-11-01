'use strict';
const screens={
 overview:{alt:'Synthetic Household Atlas overview with an annual spending chart, sample order totals, category exploration and DialKit controls.',caption:'A timeline gives the sample history shape. Change the years, shopping channel, or metric to look closer.'},
 compare:{alt:'Synthetic year comparison showing matched-period totals, order counts, averages and the split between frequency and average-order effects.',caption:'Matching calendar periods makes the comparison useful. The app separates frequency, average totals, and shopping channels.'},
 electronics:{alt:'Synthetic electronics deep dive showing fictional accessories, repeat purchases, return evidence and a purchase timeline.',caption:'Look beyond the device. Trace the accessories around it, inspect exact repeats, and review return evidence without presuming waste.'},
 books:{alt:'Synthetic book-topic heatmap comparing fictional interests across four eras and all print, Kindle and audio formats.',caption:'Which interests persist as the shelf changes? Compare topic shares across eras, then click through to the fictional titles behind the pattern.'},
 audio:{alt:'Synthetic audiobook timeline showing physical audio and Audible purchases, peak year and a matched January–October comparison.',caption:'Audio has its own rhythm. Trace title purchases over time; keep cash amounts, credit redemptions and membership funding distinct.'},
 savings:{alt:'Synthetic savings studio with an illustrative savings amount, explicit percentage assumptions and subscription-pause controls.',caption:'Move a dial and inspect the arithmetic. Savings figures are hypothetical scenarios based entirely on the fictional sample.'}
};
let screenshotRequest=0;
for(const button of document.querySelectorAll('[data-screen]'))button.addEventListener('click',()=>{
 const request=++screenshotRequest,key=button.dataset.screen,screen=screens[key];
 const img=document.getElementById('app-screenshot'),link=document.getElementById('screenshot-link'),status=document.getElementById('image-status');
 if(img.getAttribute('src').endsWith(`assets/${key}.png`)){link.setAttribute('aria-busy','false');status.hidden=true;return;}
 link.setAttribute('aria-busy','true');status.textContent='Loading preview…';status.hidden=false;
 const next=new Image();
 next.onload=()=>{if(request!==screenshotRequest)return;
  for(const item of document.querySelectorAll('[data-screen]'))item.setAttribute('aria-pressed',String(item===button));
  img.src=next.src;img.alt=screen.alt;link.href=next.src;
  document.getElementById('screen-caption').textContent=screen.caption;
  link.setAttribute('aria-busy','false');status.hidden=true;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)img.animate([{opacity:.6},{opacity:1}],{duration:180,easing:'ease-out'});
 };
 next.onerror=()=>{if(request!==screenshotRequest)return;link.setAttribute('aria-busy','false');status.textContent='Preview could not load. Try the tab again, or open the working demo.';status.hidden=false;};
 next.src=`assets/${key}.png`;
});

const copyButton=document.getElementById('copy-prompt');
copyButton.addEventListener('click',async()=>{
 const prompt=document.getElementById('starter-prompt');
 const status=document.getElementById('copy-status');
 try{
  await navigator.clipboard.writeText(prompt.textContent);
  status.textContent='Copied. Paste into your browser-capable agent.';
  copyButton.textContent='Copy again ↗';
 }catch{
  const range=document.createRange();range.selectNodeContents(prompt);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  prompt.focus();
  status.textContent='Copy unavailable. Select and copy the prompt, or download the text file.';
 }
});
