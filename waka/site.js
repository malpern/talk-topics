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
for (const scene of document.querySelectorAll('.arcade-scene')) {
  let reset;
  scene.querySelector('.power-button').addEventListener('click', () => {
    clearTimeout(reset);
    scene.classList.add('powered');
    scene.querySelector('.maze-message').textContent = 'CHOMP!';
    scene.querySelector('.arcade-caption').textContent = 'Plot twist: the ghosts are on the menu.';
    reset = setTimeout(() => {
      scene.classList.remove('powered');
      scene.querySelector('.maze-message').textContent = 'READY!';
      scene.querySelector('.arcade-caption').textContent = 'A little chase. A lot to learn.';
    }, 5000);
  });
}
