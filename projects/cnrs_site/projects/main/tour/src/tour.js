/* Native document scrolling; no wheel or touch hijacking. Index controls use the same progress track. */
(() => {
  'use strict';
  if (location.hash === '#mini-robot') {
    document.documentElement.classList.remove('no-js');
    document.body.dataset.ready = 'robot';
    window.AtlasTour = {
      get state() {
        return { chapter: 0, progress: 0, still: false };
      },
      request() {},
      clearDetail() {},
    };
    return;
  }
  const $ = (q) => document.querySelector(q),
    btns = [...document.querySelectorAll('.index button')];
  const chapters = [
    {
      p: 0,
      category: 'Material study',
      title: 'A mark|in clay.',
      body: 'A clay impression of the CNRS mark. Pull back to discover the space around it.',
      caption: 'Clay relief',
      scale: 'Object scale',
    },
    {
      p: 0.1625,
      category: 'Desk study',
      title: 'The|workstation.',
      body: 'A screen, an oak-front PC, a coffee cup on a coaster. The little grey book on the desk opens to reveal its cover.',
      caption: 'Monitor & desktop PC',
      scale: 'Workstation scale',
    },
    {
      p: 0.299,
      category: 'Research interior',
      title: 'Inside|the lab.',
      body: 'Drag to look around the office. Pan across the bench, or select a poster or the GoFa to explore the research.',
      caption: 'Robotics studio',
      scale: 'Room scale',
    },
    {
      p: 0.481,
      category: 'Architecture',
      title: 'At the|institute.',
      body: 'Through the studio window, the IHU comes into view: folded metal roofs, a planted façade and a glass entrance on the hospital campus.',
      caption: 'IHU Strasbourg · interpretation',
      scale: 'Building scale',
    },
    {
      p: 0.65,
      category: 'City atlas',
      title: 'Across|Strasbourg.',
      body: 'From the IHU to the cathedral, follow the Ill past the Christmas squares and the station. Select a landmark for a closer look.',
      caption: 'Central Strasbourg · illustrated terrain',
      scale: '1.79 km diameter',
    },
    {
      p: 0.835,
      category: 'Geographic atlas',
      title: 'A point|in France.',
      body: 'The red pin marks the IHU, near France’s eastern border. Follow it from the streets of Strasbourg to the outline of metropolitan France.',
      caption: 'Metropolitan France · shaded relief',
      scale: 'Country scale',
    },
    {
      p: 1,
      category: 'Orbital atlas',
      title: 'Earth,|from orbit.',
      body: 'Drag to rotate the globe. Hover over a red pin, or tap it to explore.',
      caption: 'Earth · Blue Marble',
      scale: 'Planetary scale',
    },
  ];
  const liveLogo = parent !== self && (window.__NOTEBOOK_HASH || location.hash) === '#mini';
  const cuts = [0, 0.143 * 0.65, 0.365 * 0.65, 0.603 * 0.65, 0.855 * 0.65, 0.735, 0.915, 1.00001];
  let active = -1,
    target = 0,
    shown = -1,
    raf = 0,
    lastTime = 0,
    engine = null,
    moving = false,
    force = true,
    modeStill = !liveLogo && matchMedia('(prefers-reduced-motion: reduce)').matches,
    locked = false,
    ready = false;
  const scene = $('#world'),
    still = $('#still'),
    pending = $('#pending'),
    mode = $('#mode'),
    reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const assets = window.ATLAS_ASSETS || {};
  still.addEventListener('load', () => {
    if (modeStill) parent.postMessage({ atlasNotebook: 'visual-ready', mode: 'snapshot' }, '*');
  });
  function nNow() {
    return Math.max(
      0,
      Math.min(
        1,
        window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight),
      ),
    );
  }
  function stillSrc(i) {
    if (liveLogo && i === 0)
      return '../../../images/previews/cnrs-logo.webp?v=' + window.ATLAS_VERSION;
    return (
      (innerWidth <= 730 && innerHeight > innerWidth ? assets.mobile : assets.stills)?.[i] ||
      assets.stills?.[i] ||
      `assets/chapter-${i + 1}.webp`
    );
  }
  function chapterAt(p) {
    let i = 0;
    while (i + 1 < chapters.length && p >= cuts[i + 1]) i++;
    return i;
  }
  function text(i) {
    if (active === i) return;
    if (active !== -1) {
      AtlasGlass.dismiss();
      AtlasPlay.close(false);
    }
    active = i;
    const c = chapters[i];
    $('#number').textContent = '0' + (i + 1);
    $('#category').textContent = c.category;
    const [a, b] = c.title.split('|'),
      em = document.createElement('em');
    em.textContent = b;
    $('#title').replaceChildren(document.createTextNode(a), document.createElement('br'), em);
    $('#bodycopy').textContent = c.body;
    $('#fig').textContent = 'Fig. 0' + (i + 1);
    $('#caption').textContent = c.caption;
    $('#figright').textContent = c.scale;
    still.alt = c.caption;
    exhibits(i);
    scene.setAttribute(
      'aria-label',
      c.caption +
        '. ' +
        c.body +
        ' In the office use arrows to orbit or Shift and arrows to pan. R resets the view.',
    );
    if (modeStill) still.src = stillSrc(i);
    btns.forEach((b, j) => {
      if (j === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    $('#announce').textContent = `Scene ${i + 1} of 7: ${c.caption}`;
  }
  function cue(p) {
    const end = p > 0.974;
    $('#advance').setAttribute('aria-label', end ? 'Return to the mark' : 'Go to the next scene');
    $('#seqdesc').textContent =
      innerWidth <= 730
        ? end
          ? 'Swipe down to return'
          : 'Swipe up to pull back'
        : 'Seven nested scales';
    $('.scrolltip').classList.toggle('atend', end);
    $('#cue').textContent = end ? 'Scroll to return' : 'Scroll to pull back';
    $('#cue-sub').textContent = end ? 'or revisit a scene below' : 'or choose a scene below';
  }
  function paint(time) {
    raf = 0;
    let dt = Math.min(55, Math.max(4, time - lastTime || 17));
    lastTime = time;
    target = nNow();
    if (shown < 0 || modeStill || reduce.matches) shown = target;
    else {
      shown += (target - shown) * (1 - Math.exp(-dt / 56));
      if (Math.abs(target - shown) < 0.00024) shown = target;
    }
    let p = shown;
    text(chapterAt(p));
    cue(p);
    $('#progressval').innerHTML = String(Math.round(p * 100)).padStart(3, '0') + ' <i>/ 100</i>';
    for (let i = 0; i < chapters.length; i++) {
      let t = Math.max(0, Math.min(1, (p - cuts[i]) / (cuts[i + 1] - cuts[i])));
      btns[i].querySelector('i').style.transform = `scaleX(${t})`;
    }
    let e = clocks();
    if (detail && Math.abs(p - detail.p) > 0.007) {
      AtlasGlass.dismiss();
      unfocus();
    }
    let local = Math.min(1, p / 0.65);
    motion.update(p, local, modeStill, !!detail);
    if (engine && !modeStill && !AtlasPlay.active) {
      engine.draw(local, e.light, e.hands, detail, motion.state, p, e.direction);
      const loading = !engine.readyFor(p);
      if (loading) {
        const src = stillSrc(active);
        if (!still.src.endsWith(src)) still.src = src;
      }
      still.hidden = !loading;
      pending.hidden = true;
      if (!loading && !document.body.dataset.visualReady) {
        document.body.dataset.visualReady = 'true';
        requestAnimationFrame(() =>
          parent.postMessage({ atlasNotebook: 'visual-ready', mode: '3d' }, '*'),
        );
      }
    }
    pinLayer(local, p);
    brand(local, e);
    geoLayer(p, local);
    $('#cnrs-cube').hidden = active > 1 || !!detail || AtlasPlay.active;
    AtlasGlass.update(p, active, engine, modeStill, detail);
    force = false;
    scene.dataset.progress = String(p);
    if (Math.abs(target - shown) > 0.0001 || (detail && performance.now() < detail.at + 720))
      request();
  }
  function request() {
    if (!window.studioPaused && !raf) raf = requestAnimationFrame(paint);
  }
  function go(i, instant = false) {
    AtlasGlass.dismiss();
    AtlasPlay.close(false);
    unfocus();
    motion.reset(true);
    if (instant) shown = chapters[Math.max(0, Math.min(chapters.length - 1, i))].p;
    let y =
      chapters[Math.max(0, Math.min(chapters.length - 1, i))].p *
      (document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({
      top: y,
      behavior: instant || modeStill || reduce.matches ? 'instant' : 'smooth',
    });
    request();
  }
  function setMode() {
    AtlasGlass.dismiss();
    AtlasPlay.close(false);
    if (modeStill && detail) unfocus();
    mode.setAttribute('aria-pressed', String(modeStill));
    mode.setAttribute(
      'aria-label',
      locked
        ? 'Still-image mode'
        : modeStill
          ? 'Switch to interactive 3D mode'
          : 'Switch to still-image mode',
    );
    $('#mode-text').textContent = modeStill ? 'Stills' : '3D view';
    mode.disabled = locked;
    scene.hidden = modeStill;
    still.hidden = !modeStill;
    if (modeStill) {
      still.src = stillSrc(Math.max(0, active));
      pending.hidden = true;
    } else {
      pending.hidden = !!engine;
    }
    document.body.dataset.mode = modeStill ? 'stills' : '3d';
    request();
  }
  async function getAsset() {
    if (!assets.glb) {
      let r = await fetch('assets/strasbourg-studio.glb?v=' + window.ATLAS_VERSION);
      if (!r.ok) throw Error('Missing studio model');
      return r.arrayBuffer();
    }
    let s = atob(assets.glb),
      b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    if (assets.codec === 'gzip') {
      let st = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(st).arrayBuffer();
    }
    return b.buffer;
  }
  let starting = null;
  async function start() {
    if (starting) return starting;
    starting = (async () => {
      try {
        engine = await ProgressiveAtlas.build(scene, getAsset, request);
        pending.hidden = true;
        ready = true;
        document.body.dataset.ready = 'true';
        setMode();
      } catch (e) {
        console.warn('Switching to the illustrated sequence:', e);
        locked = true;
        modeStill = true;
        setMode();
        document.body.dataset.ready = 'fallback';
      }
    })();
    return starting;
  }
  $('#advance').addEventListener('click', () =>
    go(shown > 0.974 ? 0 : Math.min(chapters.length - 1, active + 1)),
  );
  mode.addEventListener('click', () => {
    if (locked) return;
    modeStill = !modeStill;
    setMode();
    if (!modeStill && !engine) start();
  });
  btns.forEach((b, i) => b.addEventListener('click', () => go(i)));
  addEventListener('keydown', (e) => {
    if (
      AtlasPlay.active ||
      e.target.matches?.('input,select,textarea,[contenteditable=true]') ||
      document.querySelector('dialog[open]') ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      e.shiftKey
    )
      return;
    let step = 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        step = 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        step = -1;
        break;
      case 'Home':
        e.preventDefault();
        go(0);
        return;
      case 'End':
        e.preventDefault();
        go(6);
        return;
      default:
        return;
    }
    e.preventDefault();
    go(chapterAt(nNow()) + step);
  });
  addEventListener('scroll', request, { passive: true });
  new ResizeObserver(() => {
    if (modeStill) still.src = stillSrc(Math.max(0, active));
    request();
  }).observe($('.surface'));
  reduce.addEventListener('change', (e) => {
    if (locked || liveLogo) return;
    modeStill = e.matches;
    setMode();
    if (!modeStill && !engine) start();
  });
  scene.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    locked = true;
    engine = null;
    modeStill = true;
    setMode();
    document.body.dataset.ready = 'fallback';
  });
  const env = window.AtlasEnvironment,
    records = window.AtlasRecords,
    entries = [
      [],
      ['book', 'science', 'ijrr'],
      ['science', 'ijrr', 'robot', 'book'],
      ['ihu'],
      ['ihu', 'cathedral', 'gare', 'ill', 'broglie', 'kleber'],
      ['ihu'],
      ['ihu', 'atlasdata'],
    ],
    names = {
      atlasdata: 'Map credits',
      book: 'Selig’s book',
      science: 'Science Robotics',
      ijrr: 'IJRR',
      robot: 'ABB GoFa',
      ihu: 'IHU',
      cathedral: 'Cathedral',
      gare: 'Gare',
      ill: 'Ill',
      broglie: 'Broglie',
      kleber: 'Kléber',
    },
    numb = {
      science: '01',
      ijrr: '02',
      robot: '03',
      book: '04',
      ihu: '01',
      cathedral: '02',
      gare: '03',
      ill: '04',
      broglie: '05',
      kleber: '06',
    },
    pos = { science: [-1.4, 2.64, -2.624], ijrr: [0.25, 2.64, -2.624], robot: [-2.79, 1.76, 0.04] };
  let pins = [],
    pinSig = '',
    backFocus = null;
  const all = (q) => [...document.querySelectorAll(q)];
  let detail = null,
    playTimer = 0;
  function unfocus() {
    clearTimeout(playTimer);
    detail = null;
    $('#exit-focus').hidden = true;
  }
  function detailCam(k) {
    if (k === 'science' || k === 'ijrr') {
      const x = k === 'science' ? -1.02 : -0.12;
      return {
        eye: [x + 0.19, 2.26, -0.58],
        aim: [x + (innerWidth > 730 ? 0.46 : 0.03), 2.1, -2.625],
        fov: 39,
        near: 0.02,
      };
    }
    if (k === 'robot')
      return { eye: [-1.41, 1.71, 1.5], aim: [-2.56, 1.41, 0.08], fov: 33, near: 0.035 };
    if (k === 'book')
      return { eye: [-0.86, 1.28, -0.99], aim: [-0.97, 0.895, -1.25], fov: 41, near: 0.01 };
    let s = assets.geo.sites[k];
    if (!s) return null;
    let [x, y, z] = s.world,
      ground = -7.1;
    const spec = {
      ihu: [[21, 10.8, 36], [0, 6, 0], 40],
      cathedral: [[-65, 37, 57], [-3, 18, 1], 40],
      gare: [[35, 14, 23], [0, 3.45, 0], 41],
      ill: [[25, 42, 54], [0, 0, -2], 42],
      broglie: [[17, 15.8, 23], [0, 1.15, 0], 39],
      kleber: [[15, 13.4, 22], [0, 3.6, 0], 40],
    };
    let [off, tar, fov] = spec[k];
    return {
      eye: [x + off[0], ground + off[1], z + off[2]],
      aim: [x + tar[0], ground + tar[1], z + tar[2]],
      fov,
      near: 0.32,
    };
  }
  function focusObject(k) {
    clearTimeout(playTimer);
    if (!engine || modeStill) {
      if (k === 'robot') AtlasPlay.open();
      return;
    }
    let camera = detailCam(k);
    if (!camera) return;
    detail = {
      ...camera,
      p: shown,
      id: k,
      from: engine.camera,
      at: performance.now(),
      duration: reduce.matches ? 0 : 640,
    };
    $('#exit-focus').hidden = false;
    request();
    if (k === 'robot')
      playTimer = setTimeout(() => {
        if (detail?.id === 'robot') {
          AtlasPlay.open();
          request();
        }
      }, detail.duration);
  }
  $('#exit-focus').onclick = () => {
    AtlasGlass.dismiss();
    unfocus();
    request();
  };
  addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      !AtlasPlay.active &&
      !document.querySelector('dialog[open]') &&
      detail
    ) {
      unfocus();
      request();
    }
  });
  function link(label, url) {
    let a = document.createElement('a');
    a.className = 'rec-link';
    a.textContent = label;
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function record(id) {
    if (!records[id]) return;
    if (id === 'ihu' && active >= 5) {
      go(3, true);
      requestAnimationFrame(() => requestAnimationFrame(() => record(id)));
      return;
    }
    if (modeStill && !locked && detailCam(id)) {
      modeStill = false;
      setMode();
      if (!engine) {
        start().then(() => {
          if (engine) record(id);
          else record(id);
        });
        return;
      }
    }
    const d = $('#record'),
      r = records[id];
    backFocus = document.activeElement;
    d.classList.remove('inspecting');
    d.dataset.record = id;
    $('#rec-type').textContent = r.k;
    $('#rec-title').textContent = r.title;
    $('#rec-meta').textContent = r.meta || '';
    $('#rec-body').textContent = r.body || '';
    $('#rec-journal').textContent = r.journal || '';
    $('#rec-fine').textContent = r.fine || '';
    $('.rec-image').hidden = !r.image;
    if (r.image) {
      $('#rec-img').src = assets.media[r.image];
      $('#rec-img').alt = r.alt;
    }
    $('.rec-bottom').hidden = !r.url;
    if (r.url) {
      $('#rec-action').textContent = r.action;
      $('#rec-plus').href = r.url;
      $('#rec-plus').setAttribute('aria-label', r.action + ' (opens in a new tab)');
    } else $('#rec-plus').removeAttribute('href');
    $('#rec-links').replaceChildren(...(r.links || []).map(([x, y]) => link(x, y)));
    if ((detailCam(id) && active < 5) || id === 'ihu') focusObject(id);
    AtlasGlass.open(d, id);
    request();
  }
  $('#inspect').onclick = () => $('#record').classList.toggle('inspecting');
  for (let d of all('.dialog')) {
    d.querySelector('.close').onclick = () => d.close();
    d.addEventListener('click', (e) => {
      if (e.target === d) {
        let r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
          d.close();
      }
    });
    d.addEventListener('close', () => {
      if (d.id === 'careers') {
        if (!$('#cnrs-cube').hidden) $('#cnrs-cube').focus({ preventScroll: true });
        request();
        return;
      }
      if (backFocus?.isConnected && backFocus !== document.body)
        backFocus.focus({ preventScroll: true });
      else btns[Math.max(0, active)].focus({ preventScroll: true });
      request();
    });
  }
  function exhibits(i) {
    $('#season-dock').hidden = i !== 4;
    $('#exhibits').replaceChildren(
      ...entries[i].map((id) => {
        let b = document.createElement('button');
        b.type = 'button';
        b.className = 'exhibit';
        b.dataset.record = id;
        b.innerHTML = '<span class="en">' + (numb[id] || '↗') + '</span>';
        b.append(names[id]);
        b.onclick = () => record(id);
        return b;
      }),
    );
  }
  function pinLayer(p, global) {
    let keys =
      modeStill || detail || global > 0.662
        ? []
        : p >= 0.938
          ? ['cathedral', 'gare', 'ill', 'broglie', 'kleber']
          : p > 0.315 && p < 0.525
            ? ['science', 'ijrr', 'robot']
            : [];
    let sig = keys.join(',');
    if (pinSig !== sig) {
      pinSig = sig;
      pins = keys.map((k) => {
        let b = document.createElement('button');
        b.type = 'button';
        b.className = 'pin';
        b.dataset.id = k;
        if (p > 0.9) b.dataset.city = '';
        b.setAttribute('aria-label', 'Inspect ' + names[k]);
        b.textContent = numb[k];
        let sp = document.createElement('span');
        sp.className = 'tip';
        sp.textContent = names[k];
        b.append(sp);
        b.onclick = () => record(k);
        return b;
      });
      $('#pins').replaceChildren(...pins);
    }
    for (const b of pins) {
      let k = b.dataset.id,
        city = b.hasAttribute('data-city');
      let v = engine?.project(
        city ? assets.geo.sites[k].world : pos[k].map((v, i) => v - (i === 0 ? 21.25 : 0)),
      );
      let valid = v && v[0] > 0.025 && v[0] < 0.975 && v[1] > 0.03 && v[1] < 0.96;
      b.hidden = !valid;
      if (valid) {
        b.style.left = `${(v[0] * 100).toFixed(2)}%`;
        b.style.top = `${(v[1] * 100).toFixed(2)}%`;
      }
    }
  }
  // The light table lives outside the canvas: scrubbing cannot orbit the camera or scroll the tour.
  const dial = $('#day-slider'),
    dock = $('#time-dock'),
    warmStill = $('#still-warm'),
    nightStill = $('#still-night');
  let stillPair = '',
    lastGradient = '';
  function stillLight(e, local) {
    const frames = assets.lightStills;
    if (modeStill && active === 4 && assets.cityStills) {
      const c = AtlasCity.get(e),
        side = innerWidth <= 730 && innerHeight > innerWidth ? 'mobile' : 'desktop',
        variant = c.wet
          ? c.festive
            ? 'rainy'
            : 'rainy-bare'
          : c.season === 'autumn' && c.festive
            ? 'festival'
            : c.season === 'winter' && !c.festive
              ? 'winter-bare'
              : c.season,
        key = side + '-' + variant;
      const day = assets.cityStills[key + '-day'],
        night = assets.cityStills[key + '-night'];
      if (day && night) {
        if (stillPair !== key || still.getAttribute('src') !== day) {
          stillPair = key;
          still.src = day;
          nightStill.src = night;
        }
        warmStill.hidden = true;
        nightStill.hidden = e.light[0] > 0.996;
        nightStill.style.opacity = String(1 - e.light[0]);
        return;
      }
    }
    if (!modeStill || !local || !frames) {
      warmStill.hidden = nightStill.hidden = true;
      return;
    }
    const portrait = innerWidth <= 730 && innerHeight > innerWidth,
      side = e.mode === 'sunset' ? 'dusk' : e.rising ? 'dawn' : 'dusk',
      set = frames[portrait ? 'mobile' : 'desktop'][active - 1];
    let sig = [portrait, active, side].join('/');
    if (stillPair !== sig) {
      stillPair = sig;
      warmStill.src = set[side];
      nightStill.src = set.night;
    }
    const dark = 1 - e.light[0],
      warm = e.mode === 'time' || e.mode === 'live' ? e.light[2] : e.mode === 'sunset' ? 1 : 0;
    warmStill.hidden = warm < 0.004;
    nightStill.hidden = dark < 0.004;
    warmStill.style.opacity = String(warm);
    nightStill.style.opacity = String(dark);
  }
  function syncDial(e) {
    const local = active >= 1 && active <= 4;
    dock.hidden = !local;
    stillLight(e, local);
    if (!local) return;
    if (lastGradient !== e.gradient) {
      lastGradient = e.gradient;
      dial.style.setProperty('--ramp', e.gradient);
    }
    const value = String(
      Math.max(
        0,
        Math.min(1435, Math.round((e.mode === 'time' ? e.requested : e.minutes) / 5) * 5),
      ),
    );
    if (dial.value !== value) dial.value = value;
    const kind = e.mode === 'live' ? 'Live' : e.mode === 'time' ? 'Preview' : 'Preset';
    $('#dial-state').textContent = kind;
    $('#dial-time').textContent = e.mode === 'live' || e.mode === 'time' ? e.selected : '—';
    dock.dataset.mode = e.mode;
    dial.setAttribute('aria-valuetext', e.selected + ' Strasbourg, ' + e.label + '; ' + kind);
    $('#dial-noon').setAttribute('aria-pressed', String(e.mode === 'time' && e.minutes === 720));
    $('#dial-live').setAttribute('aria-pressed', String(e.mode === 'live'));
  }
  dial.addEventListener('input', () => {
    AtlasCity.resetLight();
    env.preview(+dial.value);
  });
  $('#dial-noon').onclick = () => {
    AtlasCity.resetLight();
    env.preview(720);
  };
  $('#dial-live').onclick = () => {
    AtlasCity.resetLight();
    env.setMode('live');
  };
  $('#visit-noon').onclick = () => {
    ed.close();
    go(2, true);
    env.preview(720);
    requestAnimationFrame(() => dial.focus({ preventScroll: true }));
  };
  new ResizeObserver((entries) => {
    $('#stage').style.setProperty('--cap-h', entries[0].contentRect.height + 'px');
  }).observe(document.querySelector('figcaption'));
  function clocks() {
    let e = env.state();
    if (active === 4) AtlasCity.status(e);
    syncDial(e);
    $('#headclock').textContent = e.time.slice(0, 5);
    $('#bigclock').textContent = e.time;
    $('#weatherline').textContent = e.label + ' · ' + e.source;
    $('#environment').title = 'Strasbourg ' + e.time + ' · ' + e.label + ' · ' + e.source;
    let tag = $('#scene-tag');
    tag.hidden = active === 0 || active >= 5 || (!modeStill && shown > 0.675);
    tag.textContent = detail
      ? 'Detail / ' + names[detail.id]
      : (e.mode === 'time'
          ? e.selected + ' preview'
          : e.mode === 'live'
            ? 'Strasbourg'
            : 'Preset') +
        ' / ' +
        e.label;
    all('#light-options button').forEach((b) =>
      b.setAttribute('aria-pressed', String(e.mode === b.dataset.light)),
    );
    return e;
  }
  const motion = AtlasControls.bind(scene, {
    request,
    record,
    engine: () => engine,
    canPick: () => !modeStill && shown > 0.17 * 0.65 && shown < 0.664,
    allState: () => ({ p: shown, still: modeStill, detail: !!detail }),
  });
  const geoLayer = AtlasControls.overlay({
    assets,
    record,
    engine: () => engine,
    still: () => modeStill,
    detail: () => detail,
  });
  // The live Sage masthead is an HTML image; unlike a GPU texture, displaying it does not
  // require the publisher to grant WebGL cross-origin readback. The local plate remains
  // available offline. Only the header of the journal cover is shown, not an unrelated figure.
  const brandFace = document.createElement('div');
  brandFace.className = 'remote-mast';
  brandFace.setAttribute('aria-hidden', 'true');
  brandFace.hidden = true;
  $('.surface').insertBefore(brandFace, $('#pins'));
  let brandStarted = false,
    brandReady = false;
  const brandSource =
    'https://journals.sagepub.com/cms/asset/7ffd2b29-f827-42ec-aa05-1bb2e5083ed8/ijra_45_1.largecover.png';
  function brand(p, e) {
    const enabled = !modeStill && !detail && p > 0.18 && p < 0.52;
    if (enabled && !brandStarted) {
      brandStarted = true;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.alt = '';
      img.onload = () => {
        brandReady = true;
        request();
      };
      img.onerror = () => {
        brandReady = false;
      };
      img.src = brandSource;
      brandFace.append(img);
    }
    if (!enabled || !brandReady) {
      brandFace.hidden = true;
      return;
    }
    const W = 640,
      H = 174,
      w = $('.surface').clientWidth,
      h = $('.surface').clientHeight;
    let corners = [
      [-0.505, 2.66, -2.638],
      [0.265, 2.66, -2.638],
      [0.265, 2.45, -2.638],
      [-0.505, 2.45, -2.638],
    ].map((v) => engine?.project(v.map((x, i) => x - (i === 0 ? 21.25 : 0))));
    if (corners.some((v) => !v)) {
      brandFace.hidden = true;
      return;
    }
    const q = corners.map((v) => [v[0] * w, v[1] * h]),
      [A, B, C, D] = q;
    const dx1 = B[0] - C[0],
      dx2 = D[0] - C[0],
      dy1 = B[1] - C[1],
      dy2 = D[1] - C[1],
      sx = A[0] - B[0] + C[0] - D[0],
      sy = A[1] - B[1] + C[1] - D[1],
      den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 0.1) {
      brandFace.hidden = true;
      return;
    }
    const g = (sx * dy2 - dx2 * sy) / den,
      k = (dx1 * sy - sx * dy1) / den;
    const a = B[0] - A[0] + g * B[0],
      b = D[0] - A[0] + k * D[0],
      c = B[1] - A[1] + g * B[1],
      d = D[1] - A[1] + k * D[1];
    brandFace.style.transform =
      'matrix3d(' +
      [a / W, c / W, 0, g / W, b / H, d / H, 0, k / H, 0, 0, 1, 0, A[0], A[1], 0, 1].join(',') +
      ')';
    brandFace.style.filter = 'brightness(' + (0.34 + 0.61 * e.light[0]) + ')';
    brandFace.hidden = false;
  }

  const ed = $('#lightdialog');
  $('#environment').onclick = () => {
    backFocus = document.activeElement;
    clocks();
    AtlasGlass.open(ed);
  };
  all('#light-options button').forEach(
    (b) =>
      (b.onclick = () => {
        env.setMode(b.dataset.light);
        ed.close();
        if (modeStill && !locked && !reduce.matches) {
          modeStill = false;
          setMode();
          if (!engine) start();
        }
        request();
      }),
  );
  addEventListener('atlas-environment', () => {
    clocks();
    request();
  });
  function tick() {
    if (document.hidden) return;
    clocks();
    if (
      !modeStill &&
      shown > 0.12 * 0.65 &&
      shown < 0.65 * 0.65 &&
      !document.querySelector('dialog[open]')
    )
      request();
  }
  setInterval(tick, 1000);
  setInterval(() => {
    if (!document.hidden) env.update();
  }, 15 * 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      env.update();
      request();
    }
  });
  addEventListener('message', (e) => {
    if (e.source !== parent || typeof e.data?.studioPause !== 'boolean') return;
    window.studioPaused = e.data.studioPause;
    if (!window.studioPaused) request();
  });
  window.AtlasTour = {
    go,
    request,
    clearDetail: unfocus,
    open: record,
    get camera() {
      return { ...motion.state };
    },
    get planet() {
      let g = engine?.geography;
      return g ? { lat: g.lat, lon: g.lon, km: g.km } : null;
    },
    focus: focusObject,
    project: (p) => engine?.project(p),
    get state() {
      return { progress: shown, chapter: active, still: modeStill, detail: detail?.id || null };
    },
  };
  clocks();
  env.update();
  setInterval(() => {
    if (!document.hidden && !modeStill && !reduce.matches && !AtlasPlay.active && active === 4)
      request();
  }, 70);

  document.documentElement.classList.remove('no-js');
  text(chapterAt(nNow()));
  setMode();
  if (parent !== self && (window.__NOTEBOOK_HASH || location.hash) === '#playground') {
    AtlasPlay.open();
    document.body.dataset.ready = 'playground';
    return;
  }
  if (!modeStill) start();
  else {
    document.body.dataset.ready = 'stills';
    still.addEventListener(
      'load',
      () => parent.postMessage({ atlasNotebook: 'visual-ready', mode: 'snapshot' }, '*'),
      { once: true },
    );
    if (still.complete)
      parent.postMessage({ atlasNotebook: 'visual-ready', mode: 'snapshot' }, '*');
  }
  if (location.hash === '#playground') {
    go(2, true);
    (starting || Promise.resolve()).then(() => requestAnimationFrame(() => record('robot')));
  } else if (/^#strasbourg(?:\/|$)/.test(location.hash)) {
    go(4, true);
    AtlasCity.route(location.hash);
  } else if (
    location.hash === '#lab-noon' ||
    (!location.hash && assets.initialView === 'lab-noon')
  ) {
    go(2, true);
    env.preview(720);
  }
})();
