/* Unlisted author controls: Ctrl/Cmd+Alt+A, or ?animations=1 on any device. */
(() => {
  'use strict';

  const panel = document.getElementById('animation-preview');
  const edition = document.getElementById('edition');
  let opener = null;

  function surface(value) {
    const selected = value === 'white' ? 'white' : 'warm';
    document.documentElement.dataset.surface = selected;
    document.querySelectorAll('[data-surface]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.surface === selected));
    });
    try {
      localStorage.setItem('durgesh-surface', selected);
    } catch {}
  }

  let savedSurface = 'warm';
  try {
    savedSurface = localStorage.getItem('durgesh-surface') || savedSurface;
  } catch {}
  surface(savedSurface);
  document.querySelectorAll('[data-surface]').forEach((button) => {
    button.addEventListener('click', () => surface(button.dataset.surface));
  });

  function open() {
    if (!panel || panel.open) return;

    // Bring the letterhead into view before choosing a preview from another page.
    if (document.getElementById('home').hidden) {
      window.addEventListener('hashchange', open, { once: true });
      location.hash = '#home';
      return;
    }

    opener = document.activeElement;
    window.scrollTo({ top: 0, behavior: 'instant' });
    panel.showModal();
    edition.focus();
  }

  function close() {
    panel?.close();
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (panel?.open && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      const editing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (
        !editing &&
        !event.repeat &&
        !event.getModifierState('AltGraph') &&
        (event.ctrlKey || event.metaKey) &&
        event.altKey &&
        event.code === 'KeyA'
      ) {
        event.preventDefault();
        if (panel?.open) close();
        else open();
      }
    },
    true,
  );

  panel?.querySelector('[data-close-preview]').addEventListener('click', close);
  panel?.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  panel?.addEventListener('click', (event) => {
    if (event.target.closest('[data-study]')) {
      close();
      return;
    }
    if (event.target !== panel) return;
    const bounds = panel.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      close();
    }
  });
  panel?.addEventListener('change', (event) => {
    if (event.target === edition) close();
  });

  // Keep selection feedback immediate while the requested models are downloading.
  document.addEventListener('clay-theme-change', (event) => {
    document.querySelectorAll('[data-study]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.study === event.detail.theme));
    });
  });

  if (new URLSearchParams(location.search).get('animations') === '1') open();
})();
