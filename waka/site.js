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
