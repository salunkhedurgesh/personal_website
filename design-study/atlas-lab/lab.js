(() => {
  const palettes = {
    blue: { name: 'Electric blue', hex: '#2457FF', family: 'Bold' },
    lime: { name: 'Neon lime', hex: '#C5FF00', family: 'Neon' },
    coral: { name: 'Signal coral', hex: '#FF4D38', family: 'Bold' },
    violet: { name: 'Vivid violet', hex: '#713BFF', family: 'Bold' },
    lilac: { name: 'Pastel lilac', hex: '#D9CAFF', family: 'Pastel' },
    mint: { name: 'Pastel mint', hex: '#C7ECDD', family: 'Pastel' },
    'mint-mist': { name: 'Mist mint', hex: '#E2F3EC', family: 'Pastel mint' },
    'mint-seafoam': { name: 'Seafoam mint', hex: '#BAE5DE', family: 'Pastel mint' },
    'mint-sage': { name: 'Sage mint', hex: '#D5E6D5', family: 'Pastel mint' },
    lagoon: { name: 'Lagoon glass', hex: '#7DD8CE', family: 'Marine' },
    horizon: { name: 'Horizon blue', hex: '#B9D7EF', family: 'Marine pastel' },
    current: { name: 'Deep current', hex: '#176B78', family: 'Marine bold' },
    whale: { name: 'Whale blue', hex: '#AFC3C8', family: 'Marine neutral' },
    reef: { name: 'Reef coral', hex: '#FF7768', family: 'Marine bold' },
    peach: { name: 'Pastel peach', hex: '#FFD4BD', family: 'Pastel' },
    ice: { name: 'Pastel blue', hex: '#CFE4FF', family: 'Pastel' }
  };
  const fonts = { hybrid: 'Space Grotesk + Inter · display + reading', inter: 'Inter · all-purpose', grotesk: 'Space Grotesk · all-purpose', plex: 'IBM Plex Sans · humanist', editorial: 'Newsreader + Inter · editorial' };
  const effects = { quiet: 'Quiet · no motion', lift: 'Lift · tactile hover', spotlight: 'Spotlight · accent glow' };
  const treatments = { frame: 'Framed · balanced accent', line: 'Minimal · fine details', wash: 'Wash · tinted introduction', panels: 'Panels · research surfaces' };
  const defaults = { accent: 'mint-seafoam', font: 'hybrid', effect: 'quiet', treatment: 'frame' };
  const presets = {
    clear: { accent: 'blue', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    expressive: { accent: 'lime', font: 'grotesk', effect: 'lift', treatment: 'frame' },
    editorial: { accent: 'lilac', font: 'editorial', effect: 'spotlight', treatment: 'frame' },
    'mint-mist': { accent: 'mint-mist', font: 'hybrid', effect: 'quiet', treatment: 'line' },
    'mint-fresh': { accent: 'mint', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'mint-seafoam': { accent: 'mint-seafoam', font: 'hybrid', effect: 'quiet', treatment: 'wash' },
    'mint-sage': { accent: 'mint-sage', font: 'hybrid', effect: 'quiet', treatment: 'panels' },
    'marine-seafoam': { accent: 'mint-seafoam', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'marine-lagoon': { accent: 'lagoon', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'marine-horizon': { accent: 'horizon', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'marine-current': { accent: 'current', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'marine-whale': { accent: 'whale', font: 'hybrid', effect: 'quiet', treatment: 'frame' },
    'marine-reef': { accent: 'reef', font: 'hybrid', effect: 'quiet', treatment: 'frame' }
  };
  const storageKey = 'durgesh-atlas-design-v2';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* URL preferences work without storage. */ }
  const params = new URLSearchParams(location.search);
  const state = {};
  for (const [key, choices] of Object.entries({ accent: palettes, font: fonts, effect: effects, treatment: treatments })) {
    const value = params.get(key) || saved[key];
    state[key] = Object.hasOwn(choices, value) ? value : defaults[key];
  }
  const luminance = hex => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const contrastInk = hex => {
    const light = luminance(hex);
    return 1.05 / (light + .05) > (light + .05) / (luminance('#111111') + .05) ? '#FFFFFF' : '#111111';
  };
  const container = document.querySelector('#experiment-controls');
  if (container) {
    container.innerHTML = `<details class="experiment"><summary class="site-shell"><span class="control-title">Experiment: color, fonts & effects</span><span class="selection" id="lab-selection"></span></summary><div class="site-shell"><div class="control-grid"><fieldset class="palette-field"><legend>One accent, alongside black & white</legend><div class="swatch-list">${Object.entries(palettes).map(([id, p]) => `<button class="swatch-button" type="button" data-accent="${id}" aria-label="${p.name}, ${p.family}, ${p.hex}" title="${p.name} · ${p.hex}" aria-pressed="false" style="--swatch:${p.hex};--swatch-ink:${contrastInk(p.hex)}"><span aria-hidden="true"></span></button>`).join('')}</div><p class="choice-label" id="accent-description"></p></fieldset><fieldset><legend><label for="font-choice">Typography</label></legend><select id="font-choice">${Object.entries(fonts).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select><p class="choice-label">Real local fonts. Compare the name, headings, and reading text.</p></fieldset><fieldset><legend><label for="effect-choice">Effects</label></legend><select id="effect-choice">${Object.entries(effects).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select><p class="choice-label">Try hovering over topic or project cards. Reduced-motion preferences are respected.</p></fieldset></div><div class="control-foot"><div class="preset-group" role="group" aria-label="Suggested combinations"><span>Try a combination:</span><button type="button" data-preset="clear">Clear / blue</button><button type="button" data-preset="expressive">Expressive / neon</button><button type="button" data-preset="editorial">Editorial / pastel</button></div><button type="button" class="lab-reset" id="lab-reset">Reset choices</button></div><p class="lab-help">Design controls are for this preview. The site uses black, white, and your chosen accent; neutrals are shades of black. Simulations keep their own dark canvas. Your choices follow you between pages and are included in the page address.</p></div></details><p class="sr-only" role="status" aria-live="polite" id="lab-status"></p>`;
  }
  if (container) {
    const treatmentField = document.createElement('fieldset');
    treatmentField.innerHTML = `<legend><label for="treatment-choice">Accent placement</label></legend><select id="treatment-choice">${Object.entries(treatments).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select><p class="choice-label">Keep the same shade and compare how much color appears.</p>`;
    container.querySelector('.control-grid').append(treatmentField);
    const mintPresets = document.createElement('div');
    mintPresets.className = 'mint-presets';
    mintPresets.innerHTML = `<div class="preset-group" role="group" aria-label="Pastel mint with Space Grotesk and Inter variations"><span>Focused studies:</span><button type="button" data-preset="mint-seafoam">Seafoam wash</button><button type="button" data-preset="marine-current">Deep current</button><button type="button" data-preset="marine-reef">Reef coral</button><a href="marine.html" class="mint-board-link">Marine palette ↗</a><a href="mint.html" class="mint-board-link">Mint placement ↗</a></div>`;
    container.querySelector('.control-foot').before(mintPresets);
  }
  function updateNavigation() {
    const directory = new URL('.', location.href).pathname;
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.getAttribute('href').startsWith('#')) continue;
      if (a.hasAttribute('data-fixed-theme')) continue;
      const target = new URL(a.href, location.href);
      if (target.protocol !== location.protocol || target.host !== location.host || new URL('.', target).pathname !== directory || !target.pathname.endsWith('.html')) continue;
      for (const [key, value] of Object.entries(state)) target.searchParams.set(key, value);
      a.href = target.href;
    }
  }
  function apply(announce = false) {
    const palette = palettes[state.accent];
    const root = document.documentElement;
    root.dataset.font = state.font;
    root.dataset.effect = state.effect;
    root.dataset.accent = state.accent;
    root.dataset.treatment = state.treatment;
    root.style.setProperty('--accent', palette.hex);
    root.style.setProperty('--on-accent', contrastInk(palette.hex));
    document.querySelectorAll('[data-accent]').forEach(button => {
      if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.accent === state.accent));
    });
    const fontChoice = document.querySelector('#font-choice');
    if (fontChoice) fontChoice.value = state.font;
    const effectChoice = document.querySelector('#effect-choice');
    if (effectChoice) effectChoice.value = state.effect;
    const treatmentChoice = document.querySelector('#treatment-choice');
    if (treatmentChoice) treatmentChoice.value = state.treatment;
    const description = `${palette.name} · ${palette.hex} · ${palette.family}`;
    const selection = `${palette.name} / ${fonts[state.font].split(' · ')[0]} / ${treatments[state.treatment].split(' · ')[0]}`;
    const summary = document.querySelector('#lab-selection');
    if (summary) summary.textContent = selection;
    const label = document.querySelector('#accent-description');
    if (label) label.textContent = description;
    const status = document.querySelector('#lab-status');
    if (announce && status) status.textContent = `${selection}. ${effects[state.effect]}.`;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* No persistence is required to use the controls. */ }
    try {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries(state)) url.searchParams.set(key, value);
      history.replaceState(null, '', url);
    } catch { /* Local file viewers may restrict history changes. */ }
    updateNavigation();
  }
  container?.addEventListener('click', event => {
    const swatch = event.target.closest('button[data-accent]');
    const preset = event.target.closest('button[data-preset]');
    if (swatch) { state.accent = swatch.dataset.accent; apply(true); }
    if (preset) { Object.assign(state, presets[preset.dataset.preset]); apply(true); }
    if (event.target.closest('#lab-reset')) { Object.assign(state, defaults); apply(true); }
  });
  document.querySelector('#font-choice')?.addEventListener('change', event => { state.font = event.target.value; apply(true); });
  document.querySelector('#effect-choice')?.addEventListener('change', event => { state.effect = event.target.value; apply(true); });
  document.querySelector('#treatment-choice')?.addEventListener('change', event => { state.treatment = event.target.value; apply(true); });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (state.effect !== 'spotlight' || reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });
  apply();
})();
