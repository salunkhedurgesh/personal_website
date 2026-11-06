/* A single shared renderer paints the wordmark, navigation objects and mechanism portraits.
   No build, remote font or external model loader. Only the packaged GLBs use this reader. */
window.Studio3D = (() => {
  'use strict';
  let T;
  const rm = matchMedia('(prefers-reduced-motion: reduce)'),
    P = Math.PI;
  let renderer,
    graphicsJob = null,
    graphicsStarted = false,
    selection = 0,
    unavailable = false,
    cache = new Map(),
    frame = 0,
    stamp = 0,
    visible = true,
    headerVisible = true,
    head,
    navs = [],
    themeScenes = [],
    kin,
    navDirty = true,
    wordDirty = true,
    themeDirty = true,
    lastPx = 0,
    dayKey = '',
    daily = 'robots',
    theme = 'robots',
    selTheme = 'auto',
    seq = 0,
    noHalloween = false,
    themeTime = 0,
    wordFlip = false,
    weather = null,
    fxCanvas,
    ctx,
    wordRect,
    mouse = { x: -100, y: 0 },
    impulse = [],
    forceKin = true;
  const models = ['abb-gofa-crb15000', 'zamanov-6rss', 'delta-stainless', 'fanuc-crx10ial', 'ur5'];
  const A = (p) => (window.siteAsset ? window.siteAsset(p) : p);
  const themenames = {
    auto: 'Live calendar',
    republic: 'Indian Republic Day',
    independence: 'Indian Independence Day',
    france: 'France · la Fête nationale',
    christmas: 'Christmas',
    holi: 'Holi',
    diwali: 'Diwali',
    snow: 'Strasbourg Winter',
    halloween: 'Halloween',
    puppets: 'Marionettes',
    robots: 'Robot assembly',
  };
  function nextSeq() {
    try {
      seq = parseInt(localStorage.getItem('durgesh-letter-seq') || '-1', 10) + 1 || 0;
      localStorage.setItem('durgesh-letter-seq', String(seq));
    } catch {
      seq++;
    }
    return seq;
  }
  function color(hex) {
    return new T.Color(hex).convertSRGBToLinear();
  }
  function material(hex, met = 0.12, rough = 0.5, opts = {}) {
    return new T.MeshStandardMaterial({
      color: color(hex),
      metalness: met,
      roughness: rough,
      ...opts,
    });
  }
  function mesh(g, m, p = [0, 0, 0]) {
    let o = new T.Mesh(g, m);
    o.position.fromArray(p);
    return o;
  }
  function box(x, y, z, m, p) {
    return mesh(new T.BoxGeometry(x, y, z), m, p);
  }
  function ball(r, m, p, sy = 1) {
    let o = mesh(new T.SphereGeometry(r, 18, 12), m, p);
    o.scale.y = sy;
    return o;
  }
  function cylinder(r1, r2, len, m, p, n = 20) {
    return mesh(new T.CylinderGeometry(r1, r2, len, n), m, p);
  }
  function rod(a, b, r, m) {
    const v = new T.Vector3(...a),
      u = new T.Vector3(...b),
      o = cylinder(r, r, v.distanceTo(u), m);
    o.position.copy(v).lerp(u, 0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), u.sub(v).normalize());
    return o;
  }
  function light(s) {
    s.add(new T.HemisphereLight(0xfff7e6, 0xb4c4ac, 0.95));
    for (let [x, y, z, inten, cc] of [
      [-3, 5, 6, 1.35, 0xfff4da],
      [4, 2, 4, 0.58, 0xc4e2de],
      [2, 4, -3, 0.78, 0xffefca],
    ]) {
      let d = new T.DirectionalLight(cc, inten);
      d.position.set(x, y, z);
      s.add(d);
    }
  }
  function renderTo(s, c, cv) {
    if (!renderer || !cv.clientWidth || !cv.clientHeight) return;
    let dpr = Math.min(1.65, window.devicePixelRatio || 1),
      w = Math.round(cv.clientWidth * dpr),
      h = Math.round(cv.clientHeight * dpr);
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    if (renderer.domElement.width !== w || renderer.domElement.height !== h)
      renderer.setSize(w, h, false);
    renderer.render(s, c);
    const q = cv.getContext('2d');
    q.clearRect(0, 0, w, h);
    q.drawImage(renderer.domElement, 0, 0);
  }
  function ortho(w, h) {
    return new T.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.01, 100);
  }
  let navigationJob,
    currentTitle = null,
    titleToken = 0;
  const titleScenes = new Map();
  function navModel(id) {
    return NavigationModels.scene(NavigationModels.selected[id]);
  }
  function paintNavigation() {
    const old = {
      shadows: renderer.shadowMap.enabled,
      type: renderer.shadowMap.type,
      lights: renderer.physicallyCorrectLights,
      tone: renderer.toneMapping,
      exposure: renderer.toneMappingExposure,
    };
    try {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.physicallyCorrectLights = true;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      [...navs, ...(currentTitle?.cv.isConnected ? [currentTitle] : [])].forEach((n) => {
        if (!n.cv.clientWidth) return;
        NavigationModels.frame(n, n.cv.clientWidth, n.cv.clientHeight);
        renderTo(n.s, n.c, n.cv);
        if (n === currentTitle) n.cv.parentElement.classList.add('live');
      });
    } finally {
      renderer.shadowMap.enabled = old.shadows;
      renderer.shadowMap.type = old.type;
      renderer.physicallyCorrectLights = old.lights;
      renderer.toneMapping = old.tone;
      renderer.toneMappingExposure = old.exposure;
    }
    document.body.classList.add('nav-live');
    navDirty = false;
  }
  function bindNavigation(n, el) {
    const cv = n.cv;
    let drag = null,
      suppressUntil = 0;
    const redraw = () => {
        navDirty = true;
        request();
      },
      reset = () => {
        NavigationModels.setView(n, NavigationModels.orbit.baseYaw, 0);
        redraw();
      };
    cv.dataset.model = n.id;
    el.draggable = false;
    el.addEventListener('pointerenter', (e) => {
      if (!drag && e.pointerType === 'mouse' && !rm.matches) {
        NavigationModels.setView(n, NavigationModels.orbit.baseYaw + 0.08, -0.025);
        redraw();
      }
    });
    el.addEventListener('pointerleave', () => {
      if (!drag) reset();
    });
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !e.isPrimary || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)
        return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        angle: n.angle,
        tilt: n.tilt,
        active: false,
      };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (!drag.active) {
        if (Math.hypot(dx, dy) < 6) return;
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) return;
        drag.active = true;
        cv.setPointerCapture(e.pointerId);
      }
      NavigationModels.setView(n, drag.angle + dx * 0.01, drag.tilt + dy * 0.008);
      e.preventDefault();
      redraw();
    });
    const finish = (e) => {
      if (!drag) return;
      if (drag.active) suppressUntil = performance.now() + 450;
      drag = null;
      const r = el.getBoundingClientRect();
      if (
        e.type === 'pointercancel' ||
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        reset();
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      cv.addEventListener(event, finish);
    el.addEventListener(
      'click',
      (e) => {
        if (performance.now() < suppressUntil) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }
  async function titleModel(canvas, page) {
    const token = ++titleToken;
    currentTitle = null;
    if (!canvas || rm.matches) return;
    try {
      await ensureNavigation();
      if (!renderer || token !== titleToken || !canvas.isConnected) return;
      if (!titleScenes.has(page)) titleScenes.set(page, navModel(page));
      const n = titleScenes.get(page);
      n.cv = canvas;
      NavigationModels.setView(n, NavigationModels.orbit.baseYaw, 0);
      bindNavigation(n, canvas.parentElement);
      currentTitle = n;
      navDirty = true;
      request();
    } catch (error) {
      console.warn('Page model preview retained:', error.message);
    }
  }

  function setupThemes() {}
  async function buffer(n) {
    const file = 'models/' + n + '.glb';
    let v = window.BIN_ASSETS?.[file];
    if (v) {
      let raw = Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
      return await new Response(
        new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer();
    }
    let resp = await fetch(A(file));
    if (!resp.ok) throw Error('Model not found');
    return resp.arrayBuffer();
  }
  async function load(n) {
    if (!cache.has(n))
      cache.set(
        n,
        (async () => {
          const buf = await buffer(n),
            dv = new DataView(buf),
            jl = dv.getUint32(12, true),
            j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))),
            offset = 20 + jl + 8,
            types = {
              5120: Int8Array,
              5121: Uint8Array,
              5122: Int16Array,
              5123: Uint16Array,
              5125: Uint32Array,
              5126: Float32Array,
            },
            lens = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
          const acc = (i) => {
            let a = j.accessors[i],
              v = j.bufferViews[a.bufferView],
              C = types[a.componentType];
            if (v.byteStride) throw Error('Interleaving not used by studio models');
            return new T.BufferAttribute(
              new C(
                buf,
                offset + (v.byteOffset || 0) + (a.byteOffset || 0),
                a.count * lens[a.type],
              ),
              lens[a.type],
              a.normalized || false,
            );
          };
          const mats = j.materials.map((m) => {
            let f = m.pbrMetallicRoughness || {},
              rgb = f.baseColorFactor || [0.45, 0.45, 0.45];
            return new T.MeshStandardMaterial({
              color: new T.Color().fromArray(rgb),
              metalness: Math.min(0.36, f.metallicFactor ?? 0.15),
              roughness: Math.max(0.5, f.roughnessFactor ?? 0.55),
            });
          });
          const ps = j.meshes.map((m) =>
            m.primitives.map((p) => {
              let g = new T.BufferGeometry();
              g.setAttribute('position', acc(p.attributes.POSITION));
              if (p.attributes.NORMAL != null) g.setAttribute('normal', acc(p.attributes.NORMAL));
              if (p.indices != null) g.setIndex(acc(p.indices));
              if (!g.attributes.normal) g.computeVertexNormals();
              return [g, mats[p.material] || mats[0]];
            }),
          );
          let nodes = j.nodes.map((n, i) => {
            let g = new T.Group();
            g.name = n.name || 'part' + i;
            if (n.matrix)
              new T.Matrix4().fromArray(n.matrix).decompose(g.position, g.quaternion, g.scale);
            else {
              if (n.translation) g.position.fromArray(n.translation);
              if (n.rotation) g.quaternion.fromArray(n.rotation);
              if (n.scale)
                g.scale.setFromArray ? g.scale.setFromArray(n.scale) : g.scale.fromArray(n.scale);
            }
            return g;
          });
          j.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
          let tmp = new T.Group();
          for (let idx of j.scenes[j.scene || 0].nodes) tmp.add(nodes[idx]);
          tmp.updateMatrixWorld(true);
          let inst = new Map(),
            bounds = new T.Box3(),
            target = new T.Vector3(),
            hasTool = false;
          j.nodes.forEach((obj, i) => {
            if (obj.name === 'tool0') {
              target.setFromMatrixPosition(nodes[i].matrixWorld);
              hasTool = true;
            }
            if (obj.mesh === undefined) return;
            ps[obj.mesh].forEach(([g, m], k) => {
              let key = obj.mesh + ':' + k;
              let a = inst.get(key) || { g, m, mm: [] };
              a.mm.push(nodes[i].matrixWorld.clone());
              inst.set(key, a);
              g.computeBoundingBox();
              bounds.union(g.boundingBox.clone().applyMatrix4(nodes[i].matrixWorld));
            });
          });
          let center = bounds.getCenter(new T.Vector3()),
            dims = bounds.getSize(new T.Vector3()),
            unit = 1 / dims.y,
            origin = new T.Vector3(center.x, bounds.min.y, center.z);
          const wrapped = new T.Group(),
            parts = new T.Group();
          for (let { g, m, mm } of inst.values()) {
            const o = new T.InstancedMesh(g, m, mm.length);
            mm.forEach((ma, i) => o.setMatrixAt(i, ma));
            o.frustumCulled = false;
            parts.add(o);
          }
          parts.scale.setScalar(unit);
          parts.position.copy(origin).multiplyScalar(-unit);
          wrapped.add(parts);
          if (!hasTool) target.set(center.x, bounds.max.y, center.z);
          wrapped.userData.tip = target.sub(origin).multiplyScalar(unit).toArray();
          wrapped.userData.aspect = dims.x / dims.y;
          return wrapped;
        })(),
      );
    return (await cache.get(n)).clone(true);
  }
  function date() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date()),
      p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return p.year + '-' + p.month + '-' + p.day;
  }
  const festivals = {
    '2026-03-04': 'holi',
    '2026-11-08': 'diwali',
    '2027-03-23': 'holi',
    '2027-10-29': 'diwali',
    '2028-03-11': 'holi',
    '2028-10-17': 'diwali',
    '2029-03-01': 'holi',
    '2029-11-05': 'diwali',
    '2030-03-20': 'holi',
    '2030-10-26': 'diwali',
    '2031-03-09': 'holi',
    '2031-11-14': 'diwali',
  }; // Seven calendar days centered on each festival, independent of refresh rotation.
  function festivalWeek(ds) {
    const day = Date.parse(ds + 'T00:00:00Z'),
      threeDays = 3 * 86400000;
    const christmas = Date.parse(ds.slice(0, 4) + '-12-25T00:00:00Z');
    if (Math.abs(day - christmas) <= threeDays) return 'christmas';
    for (const [festival, theme] of Object.entries(festivals)) {
      if (Math.abs(day - Date.parse(festival + 'T00:00:00Z')) <= threeDays) return theme;
    }
    return null;
  }
  function isHalloweenWeek(ds) {
    const m = +ds.slice(5, 7),
      d = +ds.slice(8, 10);
    return m === 10 && d >= 25 && d <= 31;
  }
  function classify(ds, wx, s = seq) {
    const md = ds.slice(5),
      m = +ds.slice(5, 7),
      fixed = { '01-26': 'republic', '08-15': 'independence', '07-14': 'france' },
      festival = festivalWeek(ds);
    if (fixed[md] || festival) return fixed[md] || festival;
    if (!noHalloween && isHalloweenWeek(ds)) return 'halloween';
    const isSnowWx = !!(wx && [71, 73, 75, 77, 85, 86].includes(wx.weather_code)),
      isWinter = m === 12 || m === 1 || m === 2 || isSnowWx;
    const pool = isWinter ? ['robots', 'puppets', 'snow'] : ['robots', 'puppets'];
    return pool[((s % pool.length) + pool.length) % pool.length];
  }
  function occasionInfo(k, ds = date(), wx = weather) {
    if (k === 'india') k = ds.slice(5) === '01-26' ? 'republic' : 'independence';
    const year = +ds.slice(0, 4),
      day = 86400000;
    const fmt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    const show = (d) => fmt.format(new Date(d)),
      range = (a, b) => show(a) + ' – ' + show(b);
    let title = themenames[k] || themenames.robots,
      dates = '',
      temperature = null;
    if (k === 'holi' || k === 'diwali') {
      const festival = Object.entries(festivals).find(
        ([d, t]) => d.startsWith(year + '-') && t === k,
      );
      if (festival) {
        const t = Date.parse(festival[0] + 'T00:00:00Z');
        dates = range(t - 3 * day, t + 3 * day);
      }
    } else if (k === 'christmas') dates = '22 Dec – 28 Dec';
    else if (k === 'halloween') dates = '25 Oct – 31 Oct';
    else if (k === 'republic') {
      title = 'Indian Republic Day';
      dates = '26 Jan';
    } else if (k === 'independence') {
      title = 'Indian Independence Day';
      dates = '15 Aug';
    } else if (k === 'france') {
      title = 'France · la Fête nationale';
      dates = '14 Jul';
    } else if (k === 'snow') {
      temperature = Number.isFinite(wx?.temperature_2m) ? wx.temperature_2m : null;
    } else dates = '1 Jan – 31 Dec';
    return { title, dates, temperature };
  }
  function weatherUpdated() {
    document.dispatchEvent(new CustomEvent('clay-weather-change'));
  }
  function syncThemeUI() {
    const isH = theme === 'halloween';
    if (isH) document.documentElement.dataset.halloween = 'true';
    else delete document.documentElement.dataset.halloween;
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.hidden = !(isH || isHalloweenWeek(date()));
      btn.setAttribute('aria-pressed', String(isH));
      btn.textContent = isH ? '☀ Default theme' : '🎃 Halloween theme';
    }
  }
  async function select(k, bump = false) {
    if (k === 'india') k = date().slice(5) === '01-26' ? 'republic' : 'independence';
    if (k === 'halloween') noHalloween = false;
    selTheme = k;
    if (k === 'auto' && bump) nextSeq();
    const next = k === 'auto' ? classify(date(), weather, seq) : k;
    if (k === 'auto' && !bump && next === theme) {
      syncThemeUI();
      return;
    }
    const id = ++selection;
    theme = next;
    syncThemeUI();
    ScenePreviews.show(theme);
    document.getElementById('marquee').dataset.theme = theme;
    document.dispatchEvent(new CustomEvent('clay-theme-change', { detail: { theme } }));
    if (!graphicsStarted && (rm.matches || (k === 'auto' && !headerVisible))) return;
    try {
      await ensureGraphics();
      await SiteAssets.lettering(next);
      if (id !== selection) return;
      if (renderer) {
        if (ClayStudio.theme() !== next || ClayStudio.inspection().assetStatus !== 'loading')
          ClayStudio.select(next);
        wordDirty = true;
        request();
      }
    } catch (error) {
      console.warn('Letterhead preview retained:', error.message);
    }
  }
  function advance() {
    let menu = document.getElementById('edition');
    if (menu) menu.value = 'auto';
    select('auto', true);
  }
  function calendarTick() {
    let s = date();
    if (s !== dayKey) {
      dayKey = s;
      if (selTheme === 'auto') select('auto');
    }
  }
  async function climate() {
    try {
      let c = JSON.parse(localStorage.getItem('studio-strasbourg-meteo-v1') || 'null');
      if (c && Date.now() - c.t < 900000) {
        weather = c.data;
        weatherUpdated();
        if (selTheme === 'auto') select('auto');
        return;
      }
    } catch {}
    try {
      let r = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=48.58&longitude=7.75&current=temperature_2m,weather_code&timezone=Europe%2FParis',
        { signal: AbortSignal.timeout(5500), referrerPolicy: 'no-referrer' },
      );
      if (!r.ok) throw Error('weather');
      let d = (await r.json()).current;
      if (!Number.isFinite(d?.temperature_2m)) throw Error('weather');
      weather = d;
      weatherUpdated();
      try {
        localStorage.setItem(
          'studio-strasbourg-meteo-v1',
          JSON.stringify({ t: Date.now(), data: d }),
        );
      } catch {}
      if (selTheme === 'auto') select('auto');
    } catch {
      if (weather) {
        weather = null;
        weatherUpdated();
        if (selTheme === 'auto') select('auto');
      }
    }
  }
  async function setupKin(host, open) {
    await ensureNavigation();
    if (kin) return;
    host.innerHTML = /* HTML */ `<div class="kinscene">
      <div class="scene-fallback">
        <img src="${A('images/gofa-still.webp')}" alt="ABB GoFa" /><img
          src="${A('images/sac-1.webp')}"
          alt="Zamanov 6-RSS"
        />
      </div>
      <canvas
        id="kinCanvas"
        tabindex="0"
        aria-label="ABB GoFa and Zamanov 6-RSS; drag to orbit, select a robot"
      ></canvas>
      <div class="riglabels">
        <button data-rig="gofa">ABB GoFa<small>Serial · 6R</small></button
        ><button data-rig="rss">Zamanov platform<small>Parallel · 6-RSS</small></button>
      </div>
      <div class="parallel-note glass" hidden>
        <div class="rss-actions">
          <button class="btn" data-both>← Both robots</button
          ><button class="btn" data-reset>Reset</button>
        </div>
        <h3>6-RSS platform</h3>
        <p>Drag the gold handle or top platform. Release to spring back.</p>
        <div class="rss-readings">
          <span>Displacement <output data-displacement>0.0 mm</output></span
          ><span>Spring force <output data-force>0.0 N</output></span>
        </div>
        <label class="rss-stiffness"
          >Virtual spring <output data-stiffness>600 N/m</output
          ><input
            data-spring
            type="range"
            min="200"
            max="1200"
            step="50"
            value="600"
            aria-label="Virtual spring stiffness"
        /></label>
        <p class="rss-status" data-limit role="status">25 mm travel envelope</p>
      </div>
    </div>`;
    const cv = host.querySelector('canvas');
    kin = {
      host,
      cv,
      solo: false,
      on: !!host.getClientRects().length,
      angle: 0,
      tilt: 0,
      all: [],
      ready: false,
      open,
    };
    host.querySelector('[data-rig=gofa]').onclick = open;
    host.querySelector('[data-rig=rss]').onclick = () => kinMode(true);
    host.querySelector('[data-both]').onclick = () => kinMode(false);
    host.querySelector('[data-reset]').onclick = () => kin.controller?.reset();
    host.querySelector('[data-spring]').oninput = (e) =>
      kin.controller?.setStiffness(e.target.value);
    if (!renderer) {
      host.querySelector('[data-rig=rss]').disabled = true;
      return;
    }
    const s = (kin.s = new T.Scene()),
      c = (kin.c = ortho(3.5, 1.75)),
      group = (kin.g = new T.Group());
    s.add(group);
    s.add(new T.HemisphereLight(0xeaf0ee, 0x8b9a91, 0.78));
    s.add(new T.AmbientLight(0xffffff, 0.14));
    const key = new T.DirectionalLight(0xfff5e9, 2.1);
    key.position.set(-3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, {
      left: -3,
      right: 3,
      top: 3,
      bottom: -2,
      near: 0.1,
      far: 15,
    });
    key.shadow.normalBias = 0.015;
    key.shadow.bias = -0.0001;
    s.add(key);
    const fill = new T.DirectionalLight(0xdce9ee, 0.65);
    fill.position.set(4, 2, 3);
    s.add(fill);
    const rim = new T.DirectionalLight(0xe8eee6, 0.8);
    rim.position.set(1, 3, -3);
    s.add(rim);
    for (let i = 0; i < 2; i++) {
      const g = new T.Group();
      group.add(g);
      kin.all.push(g);
      const disc = cylinder(
        i ? 0.8 : 0.54,
        i ? 0.82 : 0.56,
        0.055,
        material(i ? '#82958b' : '#8e9e91', 0.03, 0.75),
        [0, -0.03, 0],
        64,
      );
      disc.receiveShadow = true;
      g.add(disc);
      for (let j = 0; j < 2; j++) {
        const ring = mesh(
          new T.TorusGeometry((i ? 0.75 : 0.49) - j * 0.04, 0.002, 5, 64),
          material('#b9c7b9', 0.03, 0.75),
        );
        ring.rotation.x = P / 2;
        ring.position.y = 0.001;
        g.add(ring);
      }
      g.position.x = i ? 0.82 : -0.86;
    }
    try {
      const [gofa, [, rssBuffer, config]] = await Promise.all([
        load('abb-gofa-crb15000'),
        Promise.all([
          SiteAssets.rss(),
          buffer('zamanov-6rss'),
          fetch(A('models/zamanov-6rss-kinematics.json')).then((r) => {
            if (!r.ok) throw Error('6-RSS geometry not found');
            return r.json();
          }),
        ]),
      ]);
      gofa.scale.setScalar(1.11);
      gofa.rotation.y = -0.45;
      kin.all[0].add(gofa);
      const rig = (kin.rig = RSSScene.model(rssBuffer, config));
      rig.root.scale.setScalar(0.96);
      rig.root.rotation.y = 0.23;
      kin.all[1].add(rig.root);
      let lastRead = 0;
      kin.controller = RSSScene.controller(
        rig,
        cv,
        c,
        () => {
          forceKin = true;
          request();
        },
        (state) => {
          const now = performance.now();
          if (now - lastRead < 60 && state.dragging) return;
          lastRead = now;
          host.querySelector('[data-displacement]').textContent =
            (Math.hypot(...state.offset) * 1000).toFixed(1) + ' mm';
          host.querySelector('[data-force]').textContent = state.force.toFixed(1) + ' N';
          host.querySelector('[data-stiffness]').textContent = state.stiffness + ' N/m';
          const status = host.querySelector('[data-limit]');
          status.textContent = state.limited ? 'Travel limit reached' : '25 mm travel envelope';
          status.classList.toggle('at-limit', state.limited);
        },
      );
      kin.controller.setEnabled(kin.solo);
      kin.ready = true;
      host.querySelector('.scene-fallback').hidden = true;
      forceKin = true;
      request();
    } catch (error) {
      console.warn('Mechanism preview retained:', error.message);
      host.querySelector('[data-rig=rss]').disabled = true;
      kin = null;
      throw error;
    }
    let drag = null;
    cv.onpointerdown = (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      cv.focus({ preventScroll: true });
      const manipulating = kin.solo && kin.controller.begin(e);
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        ang: kin.angle,
        t: kin.tilt,
        d: 0,
        manipulating,
      };
      cv.setPointerCapture(e.pointerId);
      if (manipulating) {
        cv.classList.add('grabbing');
        e.preventDefault();
      }
    };
    cv.onpointermove = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.manipulating) {
        kin.controller.move(e);
        e.preventDefault();
        return;
      }
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.d = Math.max(drag.d, Math.hypot(dx, dy));
      if (drag.d > 5) {
        kin.angle = Math.max(-0.65, Math.min(0.65, drag.ang + dx * 0.006));
        kin.tilt = Math.max(-0.16, Math.min(0.3, drag.t + dy * 0.002));
        forceKin = true;
        request();
      }
    };
    const finish = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const click = drag.d < 7 && !drag.manipulating && e.type === 'pointerup';
      kin.controller.release();
      cv.classList.remove('grabbing');
      drag = null;
      if (!click || !kin.ready || kin.solo) return;
      const r = cv.getBoundingClientRect(),
        pt = new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - (2 * (e.clientY - r.top)) / r.height,
        ),
        ray = new T.Raycaster();
      ray.setFromCamera(pt, c);
      const hits = ray.intersectObjects(
        kin.all.filter((g) => g.visible),
        true,
      );
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !kin.all.includes(obj)) obj = obj.parent;
        if (obj === kin.all[0]) open();
        else if (obj === kin.all[1]) kinMode(true);
      }
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      cv.addEventListener(event, finish);
    cv.addEventListener('keydown', (e) => kin.controller.keyboard(e));
    cv.addEventListener('keyup', () => kin.controller.release());
    cv.addEventListener('blur', () => kin.controller.release());
    new ResizeObserver(() => {
      forceKin = true;
      request();
    }).observe(cv);
  }
  function kinMode(b) {
    if (!kin) return;
    kin.solo = b;
    kin.host.querySelector('.kinscene').classList.toggle('solo', b);
    kin.angle = kin.tilt = 0;
    kin.host.querySelector('.parallel-note').hidden = !b;
    kin.host.querySelector('.riglabels').hidden = b;
    kin.controller?.setEnabled(b);
    if (kin.all.length) {
      kin.all[0].visible = !b;
      kin.all[1].scale.setScalar(b ? 1.35 : 1);
    }
    kin.cv.setAttribute(
      'aria-label',
      b
        ? '6-RSS virtual spring: drag the gold handle or top platform. Arrow keys and Page Up/Down also move it.'
        : 'ABB GoFa and Zamanov 6-RSS; drag to orbit, select a robot',
    );
    forceKin = true;
    request();
  }
  function paintKin() {
    if (!renderer || !kin?.ready || !kin.on || !kin.cv.clientWidth) return;
    const { cv, c } = kin,
      a = cv.clientWidth / cv.clientHeight,
      mobile = kin.host.clientWidth < 540;
    let w = kin.solo ? (mobile ? 2.65 : 3.75) : 3.75,
      h = Math.max(w / a, kin.solo ? 1.85 : 1.53);
    w = h * a;
    c.left = -w / 2;
    c.right = w / 2;
    c.top = h / 2;
    c.bottom = -h / 2;
    c.updateProjectionMatrix();
    c.position.set(0, 2.8 + kin.tilt * 2, 6.3);
    c.lookAt(0, kin.solo ? 0.72 : 0.52, 0);
    kin.all[1].position.x = kin.solo ? (mobile ? 0 : 0.62) : 0.82;
    kin.all.forEach((g) => (g.rotation.y = kin.angle));
    kin.s.updateMatrixWorld(true);
    const old = {
      shadows: renderer.shadowMap.enabled,
      type: renderer.shadowMap.type,
      lights: renderer.physicallyCorrectLights,
      tone: renderer.toneMapping,
      exposure: renderer.toneMappingExposure,
    };
    try {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.physicallyCorrectLights = true;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.88;
      renderTo(kin.s, c, cv);
    } finally {
      renderer.shadowMap.enabled = old.shadows;
      renderer.shadowMap.type = old.type;
      renderer.physicallyCorrectLights = old.lights;
      renderer.toneMapping = old.tone;
      renderer.toneMappingExposure = old.exposure;
    }
    forceKin = false;
  }
  function request() {
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function tick(ms) {
    frame = 0;
    if (document.hidden || !renderer) return;
    const clay = graphicsStarted ? window.ClayStudio : null,
      kinActive = kin?.on && kin.controller?.active();
    if (kinActive && kin.controller.step(ms)) forceKin = true;
    const work = !!(clay && headerVisible && (wordDirty || clay.needs() || clay.active(ms)));
    if (
      (ms - stamp > 32 || wordDirty || navDirty || forceKin || clay?.needs()) &&
      (work || navDirty || forceKin)
    ) {
      stamp = ms;
      if (navDirty) paintNavigation();
      if (work) {
        clay.tick(ms);
        wordDirty = false;
      }
      if (forceKin) {
        paintKin();
        forceKin = false;
      }
    }
    if ((clay && headerVisible && clay.active(ms)) || (kin?.on && kin.controller?.active()))
      request();
  }
  function ensureNavigation() {
    if (!navigationJob)
      navigationJob = SiteAssets.navigation()
        .then(() => {
          T = window.THREE;
          try {
            renderer = new T.WebGLRenderer({
              alpha: true,
              antialias: true,
              preserveDrawingBuffer: true,
              powerPreference: 'low-power',
            });
            renderer.setClearColor(0, 0);
            renderer.outputEncoding = T.sRGBEncoding;
            renderer.setPixelRatio(1);
            for (const el of document.querySelectorAll('[data-nav]')) {
              const n = navModel(el.dataset.nav);
              n.cv = el.querySelector('canvas');
              navs.push(n);
              bindNavigation(n, el);
            }
          } catch (error) {
            renderer = null;
            document.body.classList.add('no-gpu');
          }
          navDirty = true;
          request();
        })
        .catch((error) => {
          navigationJob = null;
          throw error;
        });
    return navigationJob;
  }
  function ensureGraphics() {
    if (graphicsStarted) return Promise.resolve();
    if (!graphicsJob)
      graphicsJob = (async () => {
        await ensureNavigation();
        if (renderer) {
          let edition;
          do {
            edition = theme;
            await SiteAssets.lettering(edition);
          } while (edition !== theme);
          ClayStudio.init(renderer, request, edition);
        } else {
          document.getElementById('physics-state').textContent = 'Illustrated preview';
          document.dispatchEvent(new CustomEvent('letterhead-assets-ready'));
        }
        graphicsStarted = true;
        wordDirty = navDirty = forceKin = true;
        request();
      })().catch((error) => {
        graphicsJob = null;
        throw error;
      });
    return graphicsJob;
  }
  function scheduleGraphics() {
    SiteAssets.afterPaint(() => {
      if (headerVisible && !document.hidden && !rm.matches)
        ensureGraphics().catch((error) => {
          console.warn('Letterhead preview retained:', error.message);
          document.dispatchEvent(new CustomEvent('letterhead-assets-ready'));
        });
    });
  }
  function init() {
    nextSeq();
    dayKey = date();
    theme = classify(dayKey, weather, seq);
    syncThemeUI();
    const query = new URLSearchParams(location.search),
      requested = query.get('edition') || window.ATELIER_START_EDITION,
      start =
        requested === 'india'
          ? dayKey.slice(5) === '01-26'
            ? 'republic'
            : 'independence'
          : requested;
    if (start && themenames[start]) {
      selTheme = start;
      theme = start;
      syncThemeUI();
    }
    const menu = document.getElementById('edition');
    if (menu) {
      Object.entries(themenames).forEach(([v, l]) => menu.add(new Option(l, v)));
      menu.value = start || 'auto';
      menu.onchange = () => select(menu.value, menu.value === 'auto');
    }
    const tbtn = document.getElementById('theme-toggle');
    if (tbtn)
      tbtn.onclick = () => {
        if (theme === 'halloween') {
          noHalloween = true;
          if (menu) menu.value = 'auto';
          select('auto', true);
        } else {
          noHalloween = false;
          if (menu) menu.value = isHalloweenWeek(date()) ? 'auto' : 'halloween';
          select(isHalloweenWeek(date()) ? 'auto' : 'halloween');
        }
      };
    document.querySelectorAll('[data-study]').forEach(
      (button) =>
        (button.onclick = () => {
          if (menu) menu.value = button.dataset.study;
          select(button.dataset.study);
        }),
    );
    const wr = document.getElementById('marquee');
    wr.dataset.theme = theme;
    ScenePreviews.show(theme);
    document.dispatchEvent(new CustomEvent('clay-theme-change', { detail: { theme } }));
    new ResizeObserver(() => {
      navDirty = wordDirty = forceKin = true;
      ScenePreviews.layout();
      request();
    }).observe(document.body);
    new IntersectionObserver(([entry]) => {
      headerVisible = entry.isIntersecting;
      if (headerVisible) {
        wordDirty = true;
        scheduleGraphics();
        request();
      }
    }).observe(wr);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) kin?.controller?.release();
      if (!document.hidden) {
        calendarTick();
        if (headerVisible) scheduleGraphics();
        wordDirty = true;
        request();
      }
    });
    climate();
    setInterval(() => {
      if (!document.hidden) {
        calendarTick();
        climate();
      }
    }, 900000);
  }

  return {
    init,
    navigation: () => navs.map(({ id, angle, tilt }) => ({ id, angle, tilt })),
    ensure: ensureGraphics,
    titleModel,
    pageModel: () =>
      currentTitle
        ? { id: currentTitle.id, angle: currentTitle.angle, tilt: currentTitle.tilt }
        : null,
    kinematics: () => kin?.controller?.inspection() || null,
    setupKin,
    setupThemes,
    kinMode,
    select,
    advance,
    redraw() {
      wordDirty = navDirty = forceKin = true;
      request();
    },
    showKin(b) {
      if (kin) {
        kin.on = b;
        if (!b) kin.controller?.release();
      }
      forceKin = true;
      request();
    },
    classify,
    occasionInfo,
    theme: () => theme,
  };
})();
