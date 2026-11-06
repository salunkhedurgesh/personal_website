/* Real scene snapshots appear before their live canvases and are saved for repeat visits. */
window.ScenePreviews = (() => {
  'use strict';
  const editions = [
    'robots',
    'puppets',
    'halloween',
    'holi',
    'republic',
    'independence',
    'france',
    'christmas',
    'diwali',
    'snow',
  ];
  const key = 'portfolio-scene-previews-' + SiteAssets.version,
    urls = new Map();
  const host = document.getElementById('marquee'),
    image = document.getElementById('letterhead-preview');
  const mobile = matchMedia('(max-width:700px)');
  let current = 'robots',
    token = 0,
    saved = false;
  const cacheJob = 'caches' in window ? caches.open(key).catch(() => null) : Promise.resolve(null);
  const file = (theme, size = mobile.matches ? 'mobile' : 'desktop') =>
    'images/previews/letterhead-' + theme + '-' + size + '.webp';
  async function source(path) {
    if (urls.has(path)) return urls.get(path);
    try {
      const cache = await cacheJob,
        response = await cache?.match(path);
      if (response) {
        const url = URL.createObjectURL(await response.blob());
        urls.set(path, url);
        return url;
      }
    } catch {}
    return path + '?v=' + SiteAssets.version;
  }
  function layout() {
    if (!host) return;
    const rect = host.getBoundingClientRect(),
      nav = document.querySelector('.top nav');
    const edge = nav?.offsetWidth ? nav.getBoundingClientRect().left - rect.left - 14 : rect.width;
    const fit = edge >= rect.width * 0.38;
    host.style.setProperty('--snapshot-width', (fit ? edge : rect.width) + 'px');
    host.style.setProperty('--letterhead-edge', (fit ? edge : rect.width - 28) + 'px');
  }
  async function show(theme) {
    if (!host || !image) return;
    current = editions.includes(theme) ? theme : 'robots';
    const id = ++token;
    host.dataset.live = 'false';
    host.dataset.theme = current;
    host.classList.add('clay-ready');
    layout();
    const url = await source(file(current));
    if (id !== token) return;
    image.onload = () => {
      if (id !== token) return;
      host.classList.add('has-preview');
      if (matchMedia('(prefers-reduced-motion:reduce)').matches && !saved) {
        saved = true;
        setTimeout(saveAll, 2400);
      }
    };
    image.src = url;
  }
  function live(theme) {
    if (!host || host.dataset.theme !== theme) return;
    host.dataset.live = 'true';
    document.dispatchEvent(new CustomEvent('letterhead-live', { detail: { theme } }));
    if (!saved) {
      saved = true;
      setTimeout(saveAll, 2400);
    }
  }
  document.addEventListener('letterhead-assets-ready', () => {
    if (!saved) {
      saved = true;
      setTimeout(saveAll, 2400);
    }
  });
  async function saveAll() {
    if (navigator.connection?.saveData) return;
    const cache = await cacheJob;
    if (!cache) return;
    const files = editions.flatMap((theme) =>
      ['desktop', 'mobile'].map((size) => file(theme, size)),
    );
    files.push('images/previews/cnrs-logo.webp');
    for (let i = 0; i < files.length; i += 2) {
      await Promise.all(
        files.slice(i, i + 2).map(async (path) => {
          try {
            if (await cache.match(path)) return;
            const r = await fetch(path + '?v=' + SiteAssets.version, {
              cache: 'force-cache',
              priority: 'low',
            });
            if (r.ok) await cache.put(path, r);
          } catch {}
        }),
      );
    }
    try {
      for (const name of await caches.keys())
        if (name.startsWith('portfolio-scene-previews-') && name !== key) await caches.delete(name);
    } catch {}
  }
  mobile.addEventListener('change', () => {
    const isLive = host?.dataset.live === 'true';
    show(current).then(() => {
      if (isLive) host.dataset.live = 'true';
    });
  });
  addEventListener('resize', layout);
  return { show, live, source, layout, saveAll };
})();
