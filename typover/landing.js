const correctionButtons = Array.from(document.querySelectorAll('.correction'));
const textSegments = Array.from(document.querySelectorAll('[data-demo-text]'));
const pauseButton = document.querySelector('.pause-demo');
const replayButton = document.querySelector('.replay-demo');
const demoStatus = document.querySelector('.demo-status');
const demoStatusDot = document.querySelector('.demo-status-dot');
const correctionCount = document.querySelector('.correction-count');
const demoCaret = document.querySelector('.demo-caret');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let runID = 0;
let paused = false;
let completedCorrections = 0;

function closePopovers(except) {
  correctionButtons.forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    button.parentElement.querySelector('.correction-popover').hidden = true;
  });
}

function updateCorrectionCount() {
  const noun = completedCorrections === 1 ? 'correction' : 'corrections';
  correctionCount.textContent = `${completedCorrections} quiet ${noun}`;
}

function setStatus(message, settled = false) {
  demoStatus.textContent = message;
  demoStatusDot.classList.toggle('settled', settled);
}

function setPaused(nextPaused) {
  paused = nextPaused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  if (paused) setStatus('Paused — explore any gray squiggle');
}

function clearDemo() {
  closePopovers();
  completedCorrections = 0;
  updateCorrectionCount();
  textSegments.forEach((segment) => { segment.textContent = ''; });
  correctionButtons.forEach((button) => {
    button.textContent = '';
    button.disabled = true;
    button.classList.remove('restored', 'just-corrected');
    button.classList.add('pending');
    button.setAttribute('aria-expanded', 'false');
  });
  demoCaret.hidden = false;
  setStatus('Typing naturally…');
}

function renderFinishedDemo() {
  textSegments.forEach((segment) => { segment.textContent = segment.dataset.demoText; });
  correctionButtons.forEach((button) => {
    button.textContent = button.dataset.corrected;
    button.disabled = false;
    button.classList.remove('pending', 'restored', 'just-corrected');
  });
  completedCorrections = correctionButtons.length;
  updateCorrectionCount();
  demoCaret.hidden = true;
  setStatus('Done — click a gray squiggle to see the original', true);
}

function rawDelay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function delay(milliseconds, activeRun) {
  let remaining = milliseconds;
  while (remaining > 0 && activeRun === runID) {
    if (paused || document.hidden) {
      await rawDelay(80);
      continue;
    }
    const slice = Math.min(remaining, 60);
    await rawDelay(slice);
    remaining -= slice;
  }
  return activeRun === runID;
}

async function typeText(element, text, activeRun) {
  for (const character of text) {
    if (activeRun !== runID) return false;
    element.textContent += character;
    const pace = character === ' ' ? 72 : 43;
    if (!await delay(pace, activeRun)) return false;
  }
  return true;
}

async function applyCorrection(button, activeRun) {
  if (!await delay(135, activeRun)) return false;
  button.textContent = button.dataset.corrected;
  button.disabled = false;
  button.classList.remove('pending');
  button.classList.add('just-corrected');
  completedCorrections += 1;
  updateCorrectionCount();
  setStatus(`Corrected “${button.dataset.original}” to “${button.dataset.corrected}”`);
  if (!await delay(230, activeRun)) return false;
  button.classList.remove('just-corrected');
  return true;
}

async function playDemo() {
  const activeRun = ++runID;
  paused = false;
  pauseButton.textContent = 'Pause';
  pauseButton.setAttribute('aria-pressed', 'false');

  if (reducedMotion.matches) {
    renderFinishedDemo();
    pauseButton.hidden = true;
    return;
  }

  pauseButton.hidden = false;
  clearDemo();
  if (!await delay(450, activeRun)) return;
  if (!await typeText(textSegments[0], textSegments[0].dataset.demoText, activeRun)) return;

  for (let index = 0; index < correctionButtons.length; index += 1) {
    const button = correctionButtons[index];
    const followingText = textSegments[index + 1].dataset.demoText;

    if (!await typeText(button, button.dataset.original, activeRun)) return;
    if (!await typeText(textSegments[index + 1], followingText.slice(0, 1), activeRun)) return;
    if (!await applyCorrection(button, activeRun)) return;
    if (!await typeText(textSegments[index + 1], followingText.slice(1), activeRun)) return;
  }

  demoCaret.hidden = true;
  setStatus('Done — click a gray squiggle to see the original', true);
  if (!await delay(4200, activeRun)) return;
  if (!paused && activeRun === runID) playDemo();
}

correctionButtons.forEach((button) => {
  const popover = button.parentElement.querySelector('.correction-popover');
  const revert = popover.querySelector('.revert-correction');

  button.addEventListener('click', () => {
    if (button.classList.contains('pending')) return;
    setPaused(true);
    const willOpen = popover.hidden;
    closePopovers(button);
    popover.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));
  });

  revert.addEventListener('click', () => {
    button.textContent = button.dataset.original;
    button.classList.add('restored');
    button.disabled = true;
    button.setAttribute('aria-expanded', 'false');
    popover.hidden = true;
    completedCorrections = Math.max(0, completedCorrections - 1);
    updateCorrectionCount();
    setStatus(`Changed “${button.dataset.corrected}” back to “${button.dataset.original}”`, true);
  });
});

pauseButton.addEventListener('click', () => {
  setPaused(!paused);
  if (!paused && completedCorrections === correctionButtons.length) {
    setStatus('Done — click a gray squiggle to see the original', true);
  } else if (!paused) {
    setStatus('Typing naturally…');
  }
});

replayButton.addEventListener('click', playDemo);

document.addEventListener('click', (event) => {
  if (!event.target.closest('.correction-wrap')) closePopovers();
});

reducedMotion.addEventListener('change', playDemo);
playDemo();

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
