const correctionButtons = Array.from(document.querySelectorAll('.correction'));
const textSegments = Array.from(document.querySelectorAll('[data-demo-text]'));
const pauseButton = document.querySelector('.pause-demo');
const replayButton = document.querySelector('.replay-demo');
const demoStatus = document.querySelector('.demo-status');
const demoStatusDot = document.querySelector('.demo-status-dot');
const correctionCount = document.querySelector('.correction-count');
const demoCaret = document.querySelector('.demo-caret');
const editorCopy = document.querySelector('.editor-copy');
const reviewPointer = document.querySelector('.demo-review-pointer');
const MARK_VISIBLE_MS = 1500;
const COMPLETION_HOLD_MS = 1700;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let runID = 0;
let paused = false;
let completedCorrections = 0;
let manualReview = false;
let scriptedReview = false;
let hoverRevealTimer;
let hoverExitTimer;
let menuRevealTimer;
let menuExitTimer;
let userMenuButton;
let markFadeTimers = [];
let pointerAnimation;

function isReviewingSentence() {
  return paused || manualReview || scriptedReview;
}

function syncMarkVisibility() {
  const reviewing = isReviewingSentence();
  editorCopy.classList.toggle('contextual-review', reviewing);
  correctionButtons.forEach((button) => {
    const menuOpen = button.getAttribute('aria-expanded') === 'true';
    const shouldHide = button.dataset.markExpired === 'true'
      && !reviewing
      && !menuOpen;
    button.classList.toggle('mark-hidden', shouldHide);
  });
}

function clearMarkFadeTimers() {
  markFadeTimers.forEach((timer) => window.clearTimeout(timer));
  markFadeTimers = [];
}

function closePopovers(except) {
  correctionButtons.forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    button.dataset.menuPinned = 'false';
    const popover = button.parentElement.querySelector('.correction-popover');
    popover.hidden = true;
    clearMenuSelection(popover);
    if (userMenuButton === button) userMenuButton = undefined;
  });
  syncMarkVisibility();
}

function clearMenuSelection(popover) {
  popover.querySelectorAll('.correction-menu-item.is-selected').forEach((item) => {
    item.classList.remove('is-selected');
  });
}

function selectMenuItem(item) {
  const popover = item.closest('.correction-popover');
  clearMenuSelection(popover);
  item.classList.add('is-selected');
}

function commitMenuSelection(item, action) {
  selectMenuItem(item);
  window.setTimeout(action, 90);
}

function showCorrectionMenu(button, { userInitiated = false, pinned = false } = {}) {
  if (button.classList.contains('pending') || button.classList.contains('restored')) return;
  const popover = button.parentElement.querySelector('.correction-popover');
  closePopovers(button);
  clearMenuSelection(popover);
  popover.hidden = false;
  button.dataset.menuPinned = String(pinned);
  button.setAttribute('aria-expanded', 'true');
  if (userInitiated) userMenuButton = button;
  syncMarkVisibility();
}

function hideCorrectionMenu(button) {
  const popover = button.parentElement.querySelector('.correction-popover');
  popover.hidden = true;
  clearMenuSelection(popover);
  button.dataset.menuPinned = 'false';
  button.setAttribute('aria-expanded', 'false');
  if (userMenuButton === button) userMenuButton = undefined;
  syncMarkVisibility();
}

function updateCorrectionCount() {
  const noun = completedCorrections === 1 ? 'correction' : 'corrections';
  correctionCount.textContent = `${completedCorrections} quiet ${noun}`;
}

function setStatus(message, settled = false) {
  demoStatus.textContent = message;
  demoStatusDot.classList.toggle('settled', settled);
}

function allMarksHaveFaded() {
  return correctionButtons
    .filter((button) => !button.classList.contains('restored'))
    .every((button) => button.dataset.markExpired === 'true');
}

function setPaused(nextPaused) {
  paused = nextPaused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  syncMarkVisibility();
  if (paused) setStatus('Paused — every correction is available for review');
}

function clearDemo() {
  closePopovers();
  clearMarkFadeTimers();
  window.clearTimeout(menuRevealTimer);
  window.clearTimeout(menuExitTimer);
  pointerAnimation?.cancel();
  reviewPointer.hidden = true;
  manualReview = false;
  scriptedReview = false;
  completedCorrections = 0;
  updateCorrectionCount();
  textSegments.forEach((segment) => { segment.textContent = ''; });
  correctionButtons.forEach((button) => {
    button.textContent = '';
    button.disabled = true;
    button.dataset.markExpired = 'false';
    button.dataset.menuPinned = 'false';
    button.classList.remove('restored', 'just-corrected', 'mark-hidden');
    button.classList.add('pending');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute(
      'aria-label',
      `Correction: ${button.dataset.original} became ${button.dataset.corrected}. Show options`
    );
    button.parentElement.querySelector('.correction-popover').setAttribute(
      'aria-label',
      `Correction options for ${button.dataset.corrected}`
    );
    button.parentElement.querySelectorAll('.alternative-correction').forEach((alternative) => {
      alternative.textContent = alternative.dataset.defaultAlternative;
      alternative.dataset.alternative = alternative.dataset.defaultAlternative;
    });
  });
  editorCopy.classList.remove('contextual-review');
  demoCaret.hidden = false;
  setStatus('Typing naturally…');
}

function renderFinishedDemo() {
  closePopovers();
  clearMarkFadeTimers();
  textSegments.forEach((segment) => {
    segment.textContent = segment.dataset.demoText;
  });
  correctionButtons.forEach((button) => {
    button.textContent = button.dataset.corrected;
    button.disabled = false;
    button.dataset.markExpired = 'true';
    button.dataset.menuPinned = 'false';
    button.classList.remove(
      'pending',
      'restored',
      'just-corrected',
      'mark-hidden'
    );
  });
  completedCorrections = correctionButtons.length;
  updateCorrectionCount();
  demoCaret.hidden = true;
  syncMarkVisibility();
  setStatus('A clean page. Focus the sentence to review changes.', true);
}

function rawDelay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function delay(milliseconds, activeRun) {
  let remaining = milliseconds;
  while (remaining > 0 && activeRun === runID) {
    if (paused || userMenuButton || document.hidden) {
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

function scheduleMarkFade(button, activeRun) {
  const timer = window.setTimeout(() => {
    if (activeRun !== runID) return;
    button.dataset.markExpired = 'true';
    syncMarkVisibility();
  }, MARK_VISIBLE_MS);
  markFadeTimers.push(timer);
}

async function applyCorrection(button, activeRun) {
  if (!await delay(135, activeRun)) return false;
  button.textContent = button.dataset.corrected;
  button.disabled = false;
  button.dataset.markExpired = 'false';
  button.classList.remove('pending', 'mark-hidden');
  button.classList.add('just-corrected');
  completedCorrections += 1;
  updateCorrectionCount();
  syncMarkVisibility();
  scheduleMarkFade(button, activeRun);
  setStatus(`Corrected “${button.dataset.original}” to “${button.dataset.corrected}”`);
  if (!await delay(180, activeRun)) return false;
  button.classList.remove('just-corrected');
  return true;
}

async function animateContextualReview(activeRun) {
  if (activeRun !== runID || reducedMotion.matches) return false;
  reviewPointer.hidden = false;
  pointerAnimation = reviewPointer.animate([
    { opacity: 0, transform: 'translate(74px, 54px)' },
    { opacity: 1, transform: 'translate(0, 0)' }
  ], {
    duration: 650,
    easing: 'cubic-bezier(.2,.8,.2,1)',
    fill: 'forwards'
  });
  try {
    await pointerAnimation.finished;
  } catch {
    return false;
  }
  if (activeRun !== runID) return false;

  scriptedReview = true;
  syncMarkVisibility();
  setStatus('Move over the sentence — quiet marks return', true);
  if (!await delay(620, activeRun)) return false;

  const menuButton = correctionButtons[1];
  pointerAnimation = reviewPointer.animate([
    { opacity: 1, transform: 'translate(0, 0)' },
    { opacity: 1, transform: 'translate(-90px, -18px)' }
  ], {
    duration: 360,
    easing: 'cubic-bezier(.2,.8,.2,1)',
    fill: 'forwards'
  });
  try {
    await pointerAnimation.finished;
  } catch {
    return false;
  }
  if (activeRun !== runID) return false;

  showCorrectionMenu(menuButton);
  setStatus('Move onto a mark — its choices appear', true);
  if (!await delay(420, activeRun)) return false;

  const selectedItem = menuButton.parentElement.querySelector('.revert-correction');
  pointerAnimation = reviewPointer.animate([
    { opacity: 1, transform: 'translate(-90px, -18px)' },
    { opacity: 1, transform: 'translate(-78px, 64px)' }
  ], {
    duration: 320,
    easing: 'cubic-bezier(.2,.8,.2,1)',
    fill: 'forwards'
  });
  try {
    await pointerAnimation.finished;
  } catch {
    return false;
  }
  if (activeRun !== runID) return false;

  selectMenuItem(selectedItem);
  setStatus('Hover previews the choice — “ideas” stays put', true);
  if (!await delay(800, activeRun)) return false;

  pointerAnimation = reviewPointer.animate([
    { opacity: 1, transform: 'translate(-78px, 64px)' },
    { opacity: 1, transform: 'translate(66px, 60px)' }
  ], {
    duration: 420,
    easing: 'cubic-bezier(.4,0,.2,1)',
    fill: 'forwards'
  });
  try {
    await pointerAnimation.finished;
  } catch {
    return false;
  }
  if (activeRun !== runID) return false;

  hideCorrectionMenu(menuButton);
  setStatus('Move away — the menu closes without changing the text', true);
  if (!await delay(320, activeRun)) return false;

  scriptedReview = false;
  syncMarkVisibility();
  pointerAnimation = reviewPointer.animate([
    { opacity: 1, transform: 'translate(66px, 60px)' },
    { opacity: 0, transform: 'translate(104px, 48px)' }
  ], {
    duration: 280,
    easing: 'ease-out',
    fill: 'forwards'
  });
  try {
    await pointerAnimation.finished;
  } catch {
    return false;
  }
  reviewPointer.hidden = true;
  setStatus('The marks fade. “Ideas” remains.', true);
  return activeRun === runID;
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
  setStatus('Done — corrections stay marked briefly', true);
  if (!await delay(COMPLETION_HOLD_MS, activeRun)) return;
  setStatus('A clean page. Move over the sentence to review changes.', true);
  if (!await delay(700, activeRun)) return;
  if (!await animateContextualReview(activeRun)) return;
  if (!await delay(1000, activeRun)) return;
  if (!paused && activeRun === runID) playDemo();
}

function beginManualReview() {
  window.clearTimeout(hoverExitTimer);
  window.clearTimeout(hoverRevealTimer);
  hoverRevealTimer = window.setTimeout(() => {
    manualReview = true;
    syncMarkVisibility();
    if (completedCorrections > 0) {
      setStatus('Reviewing this sentence — correction marks restored', true);
    }
  }, 220);
}

function endManualReview() {
  window.clearTimeout(hoverRevealTimer);
  window.clearTimeout(hoverExitTimer);
  hoverExitTimer = window.setTimeout(() => {
    manualReview = false;
    syncMarkVisibility();
    if (completedCorrections > 0 && allMarksHaveFaded()) {
      setStatus('The marks fade. The choices remain.', true);
    }
  }, 280);
}

editorCopy.addEventListener('pointerenter', beginManualReview);
editorCopy.addEventListener('pointerleave', endManualReview);
editorCopy.addEventListener('focusin', () => {
  manualReview = true;
  syncMarkVisibility();
  if (completedCorrections > 0) {
    setStatus('Reviewing this sentence — correction marks restored', true);
  }
});
editorCopy.addEventListener('focusout', (event) => {
  if (editorCopy.contains(event.relatedTarget)) return;
  endManualReview();
});

correctionButtons.forEach((button) => {
  const wrap = button.parentElement;
  const popover = wrap.querySelector('.correction-popover');
  const revert = popover.querySelector('.revert-correction');
  const alternatives = Array.from(popover.querySelectorAll('.alternative-correction'));
  const menuItems = [revert, ...alternatives];
  alternatives.forEach((alternative) => {
    alternative.dataset.defaultAlternative = alternative.dataset.alternative;
  });

  menuItems.forEach((item) => {
    item.addEventListener('pointerenter', () => selectMenuItem(item));
    item.addEventListener('focus', () => selectMenuItem(item));
    item.addEventListener('pointerdown', () => selectMenuItem(item));
  });

  popover.addEventListener('pointerleave', () => clearMenuSelection(popover));

  button.addEventListener('pointerenter', () => {
    if (button.classList.contains('pending') || button.classList.contains('restored')) return;
    window.clearTimeout(menuExitTimer);
    window.clearTimeout(menuRevealTimer);
    menuRevealTimer = window.setTimeout(() => {
      showCorrectionMenu(button, { userInitiated: true });
      setStatus(`Review “${button.textContent}” — revert or choose another spelling`, true);
    }, 120);
  });

  wrap.addEventListener('pointerleave', () => {
    window.clearTimeout(menuRevealTimer);
    window.clearTimeout(menuExitTimer);
    menuExitTimer = window.setTimeout(() => {
      if (button.dataset.menuPinned === 'true') return;
      hideCorrectionMenu(button);
      if (completedCorrections > 0 && allMarksHaveFaded()) {
        setStatus('The marks fade. The choices remain.', true);
      }
    }, 240);
  });

  button.addEventListener('focus', () => {
    if (button.classList.contains('pending') || button.classList.contains('restored')) return;
    showCorrectionMenu(button, { userInitiated: true });
    setStatus(`Review “${button.textContent}” — revert or choose another spelling`, true);
  });

  wrap.addEventListener('focusout', (event) => {
    if (wrap.contains(event.relatedTarget)) return;
    if (button.dataset.menuPinned === 'true') return;
    hideCorrectionMenu(button);
  });

  button.addEventListener('click', () => {
    if (button.classList.contains('pending')) return;
    if (!popover.hidden && button.dataset.menuPinned === 'true') {
      hideCorrectionMenu(button);
      return;
    }
    showCorrectionMenu(button, { userInitiated: true, pinned: true });
    setStatus(`Review “${button.textContent}” — revert or choose another spelling`, true);
  });

  revert.addEventListener('click', () => {
    commitMenuSelection(revert, () => {
      const previousCorrection = button.textContent;
      button.textContent = button.dataset.original;
      button.classList.add('restored');
      button.classList.remove('mark-hidden');
      button.disabled = true;
      button.setAttribute(
        'aria-label',
        `Original spelling restored: ${button.dataset.original}`
      );
      completedCorrections = Math.max(0, completedCorrections - 1);
      updateCorrectionCount();
      hideCorrectionMenu(button);
      setStatus(`Changed “${previousCorrection}” back to “${button.dataset.original}”`, true);
    });
  });

  alternatives.forEach((alternative) => {
    alternative.addEventListener('click', () => {
      commitMenuSelection(alternative, () => {
        const previousCorrection = button.textContent;
        const nextCorrection = alternative.dataset.alternative;
        button.textContent = nextCorrection;
        button.setAttribute(
          'aria-label',
          `Correction: ${button.dataset.original} became ${nextCorrection}. Show options`
        );
        popover.setAttribute('aria-label', `Correction options for ${nextCorrection}`);
        alternative.textContent = previousCorrection;
        alternative.dataset.alternative = previousCorrection;
        hideCorrectionMenu(button);
        setStatus(`Changed “${previousCorrection}” to “${nextCorrection}”`, true);
      });
    });
  });
});

pauseButton.addEventListener('click', () => {
  setPaused(!paused);
  if (!paused && completedCorrections === correctionButtons.length) {
    setStatus(
      allMarksHaveFaded()
        ? 'A clean page. Move over the sentence to review changes.'
        : 'Corrections stay marked briefly, then fade.',
      true
    );
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
