for (const block of document.querySelectorAll('.code-block')) {
  const code = block.querySelector('code');
  const button = document.createElement('button');
  button.className = 'copy'; button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code example');
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code.textContent); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select text to copy'; }
    setTimeout(() => button.textContent = 'Copy', 1800);
  });
  block.append(button);
}

// Motion belongs to the illustration, never the reading column.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
try { const saved = localStorage.getItem('waka-guide-motion'); if (saved) paused = saved === 'paused'; } catch {}
const motionButtons = document.querySelectorAll('.motion-toggle');
function setMotion() {
  document.documentElement.dataset.motion = paused ? 'paused' : 'running';
  for (const button of motionButtons) {
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-pressed', String(paused));
  }
}
setMotion();
for (const button of motionButtons) button.addEventListener('click', () => {
  paused = !paused; setMotion();
  try { localStorage.setItem('waka-guide-motion', paused ? 'paused' : 'running'); } catch {}
});
reduced.addEventListener('change', event => { paused = event.matches; setMotion(); });

// Passive scroll updates only decorative transforms; reading content never shifts.
let scrollFrame = 0;
const trails = [...document.querySelectorAll('.scroll-chase')];
const heroArt = document.querySelector('.cinematic-hero');
function updateScrollArt() {
  scrollFrame = 0;
  if (paused) return;
  const viewport = window.innerHeight;
  for (const trail of trails) {
    const rect = trail.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > viewport) continue;
    const progress = Math.max(0, Math.min(1, (viewport - rect.top) / viewport));
    trail.style.setProperty('--travel', `${progress * Math.max(0, rect.width - 225)}px`);
  }
  if (heroArt) heroArt.style.setProperty('--parallax', `${Math.min(window.scrollY * .08, 40)}px`);
}
function scheduleScrollArt() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollArt);
}
window.addEventListener('scroll', scheduleScrollArt, {passive:true});
window.addEventListener('resize', scheduleScrollArt);
for (const button of motionButtons) button.addEventListener('click', scheduleScrollArt);
reduced.addEventListener('change', scheduleScrollArt);
scheduleScrollArt();
