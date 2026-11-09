/* A first wheel gesture flips the portrait badge; later gestures follow the tour.
   Pointer capture starts only after a drag threshold so taps remain mesh picks. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s),
    cl = (x, a, b) => Math.max(a, Math.min(b, x));
  function bind(c, ctx) {
    const tools = $('#motion-tools'),
      btnO = $('#orbit-mode'),
      btnP = $('#pan-mode'),
      btnR = $('#reset-view'),
      bt = $('#explore'),
      coarse = matchMedia('(pointer:coarse)');
    const state = {
      yaw: 0,
      pitch: 0,
      x: 0,
      y: 0,
      myaw: 0,
      mflip: ctx.portraitFirst ? Math.PI : 0,
      mpitch: 0,
      mx: 0,
      my: 0,
      glon: 0,
      glat: 0,
    };
    let zone = '',
      mode = 'orbit',
      capture = null,
      touchOn = false,
      flipFrom = state.mflip,
      flipTarget = state.mflip,
      flipAt = 0,
      flipDuration = 0,
      flipping = false,
      wheelUntil = 0;
    function style() {
      const office = zone === 'office',
        mark = zone === 'mark';
      tools.hidden = !zone;
      tools.dataset.zone = zone;
      tools.dataset.touch = String(touchOn);
      c.dataset.explore = zone || 'none';
      c.dataset.touch = String(touchOn);
      if (zone === 'mark') {
        const portrait = Math.round(flipTarget / Math.PI) % 2 !== 0,
          available = ctx.engine()?.hasPortrait !== false;
        c.dataset.face = portrait ? 'photo' : 'logo';
        c.setAttribute('role', available ? 'button' : 'region');
        if (available) c.setAttribute('aria-pressed', String(!portrait));
        else c.removeAttribute('aria-pressed');
        c.setAttribute(
          'aria-label',
          !available
            ? 'CNRS badge. Drag to rotate or scroll to continue the 3D tour.'
            : portrait
              ? 'Profile photo on the back of the CNRS badge. Click, press Enter, or scroll to reveal the CNRS logo.'
              : 'CNRS badge. Click or press Enter to reveal the profile photo. Scroll to continue the 3D tour.',
        );
      } else {
        c.setAttribute('role', 'region');
        c.removeAttribute('aria-pressed');
        delete c.dataset.face;
      }
      btnO.setAttribute('aria-pressed', String(mode === 'orbit'));
      btnP.setAttribute('aria-pressed', String(mode === 'pan'));
      bt.setAttribute('aria-pressed', String(touchOn));
      bt.textContent = touchOn
        ? 'Done'
        : office
          ? 'Explore room'
          : mark
            ? 'Explore mark'
            : 'Turn globe';
      btnR.title = office || mark ? 'Restore the guided camera (R)' : 'Recenter on the IHU (R)';
      btnR.setAttribute(
        'aria-label',
        office ? 'Reset office view' : mark ? 'Reset mark' : 'Recenter globe on IHU',
      );
    }
    function release() {
      if (capture && c.hasPointerCapture?.(capture.id)) c.releasePointerCapture(capture.id);
      capture = null;
      delete c.dataset.dragging;
    }
    function reset(full = false) {
      release();
      Object.assign(state, {
        yaw: 0,
        pitch: 0,
        x: 0,
        y: 0,
        myaw: 0,
        mflip: ctx.portraitFirst ? Math.PI : 0,
        mpitch: 0,
        mx: 0,
        my: 0,
        glon: 0,
        glat: 0,
      });
      flipFrom = flipTarget = state.mflip;
      flipping = false;
      wheelUntil = 0;
      if (full) {
        touchOn = false;
        mode = 'orbit';
      }
      style();
      ctx.request();
    }
    function update(p, t, still, detail) {
      let next =
        !still && !detail
          ? t < 0.143
            ? 'mark'
            : t < 0.535
              ? 'office'
              : p >= 0.916
                ? 'earth'
                : ''
          : '';
      if (zone !== next) {
        if (zone === 'office') {
          state.yaw = state.pitch = state.x = state.y = 0;
        }
        if (zone === 'earth') {
          state.glon = state.glat = 0;
        }
        if (zone === 'mark') {
          state.myaw = state.mpitch = state.mx = state.my = 0;
          state.mflip = 0;
          flipping = false;
        }
        release();
        zone = next;
        if (zone === 'mark') state.mflip = flipFrom = flipTarget;
        touchOn = false;
        mode = 'orbit';
        style();
      }
      if (!still && zone !== 'mark' && state.mflip !== 0) {
        // The office monitor shows CNRS, but its pose must not overwrite the
        // chosen badge face during layout changes or restored iframe scrolling.
        state.mflip = 0;
        flipping = false;
      }
      if (zone === 'mark' && ctx.engine()?.hasPortrait === false && state.mflip !== 0) {
        state.mflip = flipFrom = flipTarget = 0;
        flipping = false;
        style();
      }
      if (flipping) {
        const progress = cl((performance.now() - flipAt) / flipDuration, 0, 1),
          eased = progress * progress * (3 - 2 * progress);
        state.mflip = flipFrom + (flipTarget - flipFrom) * eased;
        if (progress < 1) ctx.request();
        else {
          state.mflip = flipTarget;
          flipping = false;
        }
      }
    }
    function flipMark({ face, instant = false } = {}) {
      if (zone !== 'mark' || flipping || !ctx.engine() || ctx.engine().hasPortrait === false)
        return false;
      const current = Math.round(flipTarget / Math.PI) % 2,
        wanted = face === 'logo' ? 0 : face === 'photo' ? 1 : 1 - current;
      if (current === wanted) return false;
      flipFrom = state.mflip;
      flipTarget += Math.PI;
      flipAt = performance.now();
      flipDuration = instant || matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 900;
      flipping = flipDuration > 0;
      if (!flipping) state.mflip = flipTarget;
      style();
      ctx.request();
      return true;
    }
    function toggle(m) {
      mode = m;
      style();
      if (!coarse.matches) c.focus({ preventScroll: true });
    }
    btnO.onclick = () => toggle('orbit');
    btnP.onclick = () => toggle('pan');
    btnR.onclick = () => reset();
    bt.onclick = () => {
      touchOn = !touchOn;
      style();
    };
    coarse.addEventListener?.('change', style);
    function move(dx, dy, pan) {
      const w = Math.max(1, c.clientWidth),
        h = Math.max(1, c.clientHeight);
      if (zone === 'earth') {
        state.glon = (state.glon - (dx / w) * 220) % 360;
        state.glat = cl(state.glat + (dy / h) * 143, -111, 58);
      } else if (zone === 'mark') {
        if (pan) {
          state.mx = cl(state.mx + (dx / w) * 0.65, -0.105, 0.105);
          state.my = cl(state.my - (dy / h) * 0.88, -0.12, 0.12);
        } else {
          state.myaw = cl(state.myaw - (dx / w) * 2.2, -0.53, 0.53);
          state.mpitch = cl(state.mpitch + (dy / h) * 1.4, -0.29, 0.29);
        }
      } else if (pan) {
        state.x = cl(state.x - (dx / w) * 3.5, -0.75, 0.75);
        state.y = cl(state.y + (dy / h) * 1.9, -0.33, 0.33);
      } else {
        state.yaw = cl(state.yaw - (dx / w) * 2.6, -0.42, 0.42);
        state.pitch = cl(state.pitch + (dy / h) * 1.3, -0.15, 0.19);
      }
      ctx.request();
    }
    c.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || (!zone && e.button !== 0) || !(e.button === 0 || e.button === 2)) return;
      capture = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        drag: false,
        travel: 0,
        button: e.button,
        pan: e.button === 2 || e.shiftKey || mode === 'pan',
        enabled: !!zone && (e.pointerType !== 'touch' || touchOn),
        touch: e.pointerType === 'touch',
      };
      if (e.button === 2 && zone) e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      if (!capture || capture.id !== e.pointerId) return;
      let g = capture,
        dx = e.clientX - g.x,
        dy = e.clientY - g.y;
      g.travel = Math.max(g.travel, Math.hypot(e.clientX - g.startX, e.clientY - g.startY));
      if (!g.enabled || (!g.drag && g.travel < 5)) return;
      if (!g.drag) {
        g.drag = true;
        c.dataset.dragging = 'true';
        c.setPointerCapture(e.pointerId);
        dx = e.clientX - g.startX;
        dy = e.clientY - g.startY;
      }
      g.x = e.clientX;
      g.y = e.clientY;
      move(dx, dy, g.pan || e.shiftKey);
      e.preventDefault();
    });
    c.addEventListener('pointerup', (e) => {
      if (!capture || capture.id !== e.pointerId) return;
      const g = capture;
      release();
      if (
        g.button === 0 &&
        !g.drag &&
        g.travel < 7 &&
        Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 7
      ) {
        const id = ctx.engine()?.pick(e.clientX, e.clientY);
        if (zone === 'mark' && id === 'mark') {
          flipMark();
          return;
        }
        ctx.request();
        if (id && ctx.canPick()) ctx.record(id);
      }
    });
    // The loading preview and pending overlay sit above the canvas, so listen
    // on their shared surface as well as on the live badge.
    const wheelHost = c.parentElement || c;
    wheelHost.addEventListener('wheel', (e) => {
      if (zone !== 'mark' || e.ctrlKey || e.metaKey || !e.deltaY) return;
      if (!ctx.engine()) {
        // The visible photo is still a loading snapshot. Wait for the live
        // badge before accepting a flip or advancing the iframe's scroll.
        e.preventDefault();
        return;
      }
      const now = performance.now();
      if (flipping || now < wheelUntil) {
        e.preventDefault();
        wheelUntil = now + 200;
      } else if (Math.round(flipTarget / Math.PI) % 2 !== 0) {
        e.preventDefault();
        flipMark({ face: 'logo' });
        wheelUntil = now + 200;
      }
    }, { passive: false });
    c.addEventListener('pointercancel', release);
    c.addEventListener('lostpointercapture', () => {
      if (capture?.drag) release();
    });
    c.addEventListener('pointerleave', () => {
      if (capture && !capture.drag) release();
    });
    c.addEventListener('contextmenu', (e) => {
      if (zone) e.preventDefault();
    });
    window.addEventListener('blur', release);
    c.addEventListener('keydown', (e) => {
      if (!zone || e.altKey || e.ctrlKey || e.metaKey) return;
      if (zone === 'mark' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) flipMark();
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopPropagation();
        reset();
        return;
      }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
        e.key
      ];
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      move(
        d[0] * c.clientWidth * 0.04,
        d[1] * c.clientHeight * 0.045,
        mode === 'pan' || e.shiftKey,
      );
    });
    style();
    return { update, reset, state, flipMark };
  }
  function overlay({ assets, record, engine, still, detail }) {
    const pin = $('#ihupin'),
      hud = $('#geo-hud'),
      plate = $('#cartolabels'),
      s = assets.geo.sites.ihu;
    pin.onclick = () => record('ihu');
    const places = [
      ['France', 46.75, 2.4, 'nation'],
      ['Paris', 48.8566, 2.3522, 'town'],
      ['Lyon', 45.764, 4.8357, 'town'],
      ['Bordeaux', 44.838, -0.58, 'town'],
      ['Marseille', 43.297, 5.37, 'town'],
      ['Corsica', 42.2, 9.1, 'isle'],
      ['Atlantic Ocean', 45.9, -4.1, 'water'],
      ['Mediterranean Sea', 41.65, 4.45, 'water'],
      ['GERMANY', 49.4, 10.1, 'neighbour'],
      ['SPAIN', 42.05, -2.1, 'neighbour'],
      ['SWITZERLAND', 46.7, 8.55, 'neighbour'],
      ['BELGIUM', 50.85, 4.6, 'neighbour'],
      ['ITALY', 44.4, 9.8, 'neighbour'],
    ];
    const tags = places.map(([name, , , type]) => {
      let el = document.createElement('span');
      el.className = 'geoname ' + type;
      el.textContent = name;
      plate.append(el);
      return el;
    });
    return function (p, t) {
      const show = !still() && !detail() && p >= 0.938 * 0.65,
        g = engine()?.geography;
      plate.hidden = !g || still() || !!detail() || p < 0.72 || p > 0.903;
      hud.hidden = !g || still() || !!detail() || p < 0.715;
      if (!hud.hidden) {
        $('#geo-hudtitle').textContent = p < 0.915 ? 'Relief atlas' : 'Orbital view';
        $('#geo-hudvalue').textContent =
          'Camera height · ' + Math.round(g.km).toLocaleString('en-US') + ' km';
      }
      let hit = show ? (g ? g.project(s.lat, s.lon) : engine()?.project(s.world)) : null;
      pin.hidden = !hit || hit[0] < 0.008 || hit[0] > 0.992 || hit[1] < 0.055 || hit[1] > 0.98;
      let w = plate.parentNode.clientWidth,
        h = plate.parentNode.clientHeight;
      if (!pin.hidden) {
        pin.style.left = hit[0] * 100 + '%';
        pin.style.top = hit[1] * 100 + '%';
        pin.classList.toggle('flip', hit[0] * w > w - 132);
        pin.classList.toggle('small-pin', p < 0.675);
      }
      if (!plate.hidden) {
        plate.style.opacity = String(
          Math.max(0, Math.min(1, (p - 0.72) / 0.045, (0.903 - p) / 0.034)),
        );
        const occupied = [];
        if (!pin.hidden)
          occupied.push([
            hit[0] * w - (pin.classList.contains('flip') ? 110 : 12),
            hit[1] * h - 31,
            128,
            29,
          ]);
        places.forEach(([name, lat, lon, type], i) => {
          const el = tags[i],
            at = g.project(lat, lon);
          let ok = !!at;
          if (at) {
            const sw =
                type === 'nation'
                  ? 100
                  : type === 'town'
                    ? name.length * 6.2 + 10
                    : name.length * 6.3 + 5,
              sh = type === 'nation' ? 26 : 15,
              x = at[0] * w - sw / 2,
              y = at[1] * h - sh / 2;
            ok =
              x > 5 &&
              x + sw < w - 5 &&
              y > 10 &&
              y + sh < h - 27 &&
              !occupied.some(
                ([x1, y1, w1, h1]) =>
                  x < x1 + w1 + 3 && x + sw > x1 - 3 && y < y1 + h1 + 3 && y + sh > y1 - 3,
              );
            if (ok) {
              occupied.push([x, y, sw, sh]);
              el.style.left = at[0] * 100 + '%';
              el.style.top = at[1] * 100 + '%';
            }
          }
          el.hidden = !ok;
        });
      }
    };
  }
  window.AtlasControls = { bind, overlay };
})();
