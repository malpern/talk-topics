const correctionButtons = Array.from(document.querySelectorAll('.correction'));
const resetButton = document.querySelector('.reset-demo');

function closePopovers(except) {
  correctionButtons.forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    button.parentElement.querySelector('.correction-popover').hidden = true;
  });
}

correctionButtons.forEach((button) => {
  const popover = button.parentElement.querySelector('.correction-popover');
  const revert = popover.querySelector('.revert-correction');

  button.addEventListener('click', () => {
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
  });
});

resetButton.addEventListener('click', () => {
  correctionButtons.forEach((button) => {
    button.textContent = button.dataset.corrected;
    button.classList.remove('restored');
    button.disabled = false;
  });
  closePopovers();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.correction-wrap')) closePopovers();
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
