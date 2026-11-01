'use strict';
const screens={
 overview:{alt:'Synthetic Household Atlas overview with an annual spending chart, sample order totals, category exploration and DialKit controls.',caption:'A timeline gives the sample history shape. Change the years, shopping channel, or metric to look closer.'},
 compare:{alt:'Synthetic year comparison showing matched-period totals, order counts, averages and the split between frequency and average-order effects.',caption:'Matching calendar periods makes the comparison useful. The app separates frequency, average totals, and shopping channels.'},
 savings:{alt:'Synthetic savings studio with an illustrative savings amount, explicit percentage assumptions and subscription-pause controls.',caption:'Move a dial and inspect the arithmetic. Savings figures are hypothetical scenarios based entirely on the fictional sample.'}
};
for(const button of document.querySelectorAll('[data-screen]'))button.addEventListener('click',()=>{
 const key=button.dataset.screen,screen=screens[key];
 for(const item of document.querySelectorAll('[data-screen]'))item.setAttribute('aria-pressed',String(item===button));
 const img=document.getElementById('app-screenshot');img.src=`assets/${key}.png`;img.alt=screen.alt;
 document.getElementById('screenshot-link').href=img.src;
 document.getElementById('screen-caption').textContent=screen.caption;
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
