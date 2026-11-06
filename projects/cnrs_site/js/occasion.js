/* Optional context for the currently selected lettering edition. */
(() => {
  const host = document.getElementById('marquee');
  const button = document.getElementById('occasion-toggle');
  const panel = document.getElementById('occasion-note');
  if (!host || !button || !panel) return;
  const title = document.getElementById('occasion-title');
  const copy = document.getElementById('occasion-copy');
  function update(theme) {
    const info = Studio3D.occasionInfo(theme);
    title.textContent = info.title + (info.dates ? ' (' + info.dates + ')' : '');
    copy.hidden = theme !== 'snow';
    copy.textContent =
      theme === 'snow'
        ? info.temperature === null
          ? 'Temperature unavailable'
          : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(info.temperature) +
            ' °C'
        : '';
    button.setAttribute('aria-label', (panel.hidden ? 'About ' : 'Close ') + info.title);
  }
  function toggle(open) {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.firstElementChild.textContent = open ? '−' : '+';
    host.dataset.occasionOpen = String(open);
    update(host.dataset.theme);
  }
  button.addEventListener('click', () => toggle(panel.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      toggle(false);
      button.focus();
    }
  });
  document.addEventListener('clay-theme-change', (event) => update(event.detail.theme));
  document.addEventListener('clay-weather-change', () => update(host.dataset.theme));
  new ResizeObserver(() => {
    if (!panel.hidden) host.style.setProperty('--occasion-height', panel.offsetHeight + 'px');
  }).observe(panel);
  update(host.dataset.theme);
})();
