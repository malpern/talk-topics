'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const inspector = byId('inspector');
  const tabs = [...byId('tabs').querySelectorAll('[role="tab"]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 'tokens';
  let preview = false;
  let pending = false;
  let controller;
  let panelAnimation;
  const saved = JSON.parse(byId('saved-snapshot').textContent);

  function status(label, loading) {
    byId('load-label').textContent = label;
    inspector.setAttribute('aria-busy', String(loading));
    inspector.classList.toggle('is-loading', loading);
  }
  function showPanels() {
    const loading = pending || preview;
    byId('loading-panel').hidden = !loading;
    for (const tab of tabs) {
      const active = tab.dataset.tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      byId(`panel-${tab.dataset.tab}`).hidden = loading || !active;
    }
    byId('preview-loading').setAttribute('aria-pressed', String(preview));
    byId('preview-loading').textContent = preview ? 'Show loaded state ↗' : 'Preview loading state ↗';
  }
  function render(data) {
    for (const key of ['input_tokens', 'output_tokens', 'model_seconds', 'workflow_seconds']) {
      if (!Number.isFinite(data[key]) || data[key] < 0) throw new Error('Invalid snapshot measurement');
    }
    const total = data.input_tokens + data.output_tokens;
    const values = {
      total: total.toLocaleString(), input: data.input_tokens.toLocaleString(),
      output: data.output_tokens.toLocaleString(), model_seconds: String(data.model_seconds),
      workflow_seconds: String(data.workflow_seconds)
    };
    for (const [key, value] of Object.entries(values)) {
      document.querySelectorAll(`[data-bind="${key}"]`).forEach(node => { node.textContent = value; });
    }
    const share = total ? 100 * data.input_tokens / total : 0;
    byId('input-share').textContent = `${share.toFixed(1)}%`;
    byId('output-share').textContent = `${(total ? 100 - share : 0).toFixed(1)}%`;
    byId('token-track').querySelector('.input-segment').style.flex = data.input_tokens;
    byId('token-track').querySelector('.output-segment').style.flex = data.output_tokens;
    document.querySelector('.donut').style.background = `conic-gradient(var(--lime) 0 ${share}%,var(--orange) ${share}% 100%)`;
    byId('time-track').querySelector('.model-segment').style.flex = data.model_seconds;
    byId('time-track').querySelector('.rest-segment').style.flex = Math.max(0, data.workflow_seconds - data.model_seconds);
    byId('quality-detail').textContent = data.quality_finding;
    byId('snapshot').textContent = JSON.stringify(data, null, 2);
  }
  function selectTab(tab, pointer) {
    panelAnimation?.cancel();
    selected = tab.dataset.tab;
    showPanels();
    const panel = byId(`panel-${selected}`);
    if (pointer && !pending && !preview && !reducedMotion.matches && panel.animate) {
      panelAnimation = panel.animate([
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 180, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => selectTab(tab, event.detail > 0));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], false);
      tabs[next].focus();
    });
  });
  async function load() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    preview = false;
    pending = true;
    byId('recovery').hidden = true;
    byId('loading-caption').textContent = 'Reading the frozen example…';
    status('Loading saved snapshot', true);
    showPanels();
    const timeout = setTimeout(() => request.abort(), 5000);
    try {
      const response = await fetch('example.json', { signal: request.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error('Snapshot unavailable');
      const data = await response.json();
      if (controller !== request) return;
      render(data);
      status('Saved snapshot', false);
    } catch (error) {
      if (controller !== request) return;
      render(saved);
      status('Saved snapshot · offline', false);
      byId('recovery-text').textContent = 'The snapshot file could not be refreshed. You’re viewing the same frozen example saved in this page.';
      byId('recovery').hidden = false;
    } finally {
      clearTimeout(timeout);
      if (controller === request) {
        pending = false;
        showPanels();
      }
    }
  }
  byId('reload').addEventListener('click', load);
  byId('retry').addEventListener('click', load);
  byId('preview-loading').addEventListener('click', () => {
    if (pending) return;
    preview = !preview;
    byId('loading-caption').textContent = 'Loading-state preview · no request sent';
    status(preview ? 'Loading-state preview' : (byId('recovery').hidden ? 'Saved snapshot' : 'Saved snapshot · offline'), false);
    showPanels();
  });
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    try {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('[data-reveal]').forEach(node => observer.observe(node));
      document.documentElement.classList.add('js-reveal');
    } catch (_) { document.documentElement.classList.remove('js-reveal'); }
  }
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) panelAnimation?.cancel();
  });
  render(saved);
  load();
})();
