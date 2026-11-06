(() => {
  'use strict';
  const $ = (s) => document.querySelector(s),
    K = GofaMath,
    A = ATLAS_ASSETS,
    D = Math.PI / 180;
  const state = {
    q: [-8, -24, 36, 20, 32, -10].map((x) => x * D),
    sols: [],
    selected: -1,
    chosen: new Set(),
    visible: [],
  };
  let active = false,
    held = false,
    compare = false,
    poseDirty = false,
    exactPose = null,
    view = null,
    loading = null,
    worker = null,
    dropJob = null,
    job = 0;
  const sliders = [],
    readings = [],
    fields = [],
    status = $('#kg-status'),
    results = $('#ik-results'),
    solveButton = $('#solve-ik');
  function visible(fit = false) {
    state.visible = held ? state.sols.map((_, i) => i) : [...state.chosen];
    view?.update(state, fit);
    [...$('#ik-list').children].forEach((b, i) => {
      b.setAttribute('aria-pressed', state.chosen.has(i));
      b.dataset.solid = String(state.selected === i);
    });
  }
  function cancel() {
    job++;
    if (dropJob) {
      const reject = dropJob;
      dropJob = null;
      reject(Error('Cancelled'));
    }
    if (worker) {
      worker.terminate();
      worker = null;
    }
    solveButton.disabled = false;
    state.sols = [];
    state.chosen.clear();
    state.selected = -1;
    results.hidden = true;
    status.textContent = '';
    visible();
  }
  function writePose(p) {
    exactPose = p.slice();
    poseDirty = false;
    fields.forEach((f, i) => {
      f.value = Number(p[i].toFixed(8)).toString();
      f.removeAttribute('aria-invalid');
    });
  }
  function joints(write = true) {
    state.q.forEach((r, j) => {
      const d = r / D,
        [lo, hi] = A.joints.limits[j];
      const outside = d < lo - 1e-8 || d > hi + 1e-8;
      sliders[j].value = Math.max(lo, Math.min(hi, d));
      sliders[j].classList.toggle('invalid-joint', outside);
      sliders[j].setAttribute(
        'aria-valuetext',
        d.toFixed(3) + ' degrees' + (outside ? ', outside joint range' : ''),
      );
      readings[j].textContent = Number(d.toFixed(2)) + '°';
      readings[j].classList.toggle('warn', outside);
    });
    if (write) writePose(K.fk(state.q).pose);
    visible();
  }
  for (let j = 0; j < 6; j++) {
    let lab = document.createElement('label'),
      n = document.createElement('span'),
      input = document.createElement('input'),
      out = document.createElement('output');
    lab.className = 'joint';
    n.textContent = 'θ' + ['₁', '₂', '₃', '₄', '₅', '₆'][j];
    input.type = 'range';
    input.id = 'joint-' + (j + 1);
    [input.min, input.max] = A.joints.limits[j];
    input.step = 'any';
    input.setAttribute('aria-label', `Joint ${j + 1}, ${input.min} to ${input.max} degrees`);
    out.htmlFor = input.id;
    lab.append(n, input, out);
    if (j === 2 || j === 3) {
      let tag = document.createElement('small');
      tag.className = 'joint-limits';
      tag.textContent = `${input.min.replace('-', '−')}° … +${input.max}°`;
      lab.append(tag);
    }
    $('#joint-bank').append(lab);
    sliders.push(input);
    readings.push(out);
    input.oninput = () => {
      cancel();
      state.q[j] = Number(input.value) * D;
      joints();
    };
  }
  ['x', 'y', 'z', 'qw', 'qx', 'qy', 'qz'].forEach((key, i) => {
    let lab = document.createElement('label'),
      f = document.createElement('input');
    lab.textContent = key;
    f.type = 'number';
    f.step = 'any';
    f.id = 'pose-' + key;
    f.setAttribute('aria-label', key + (i < 3 ? ' in metres' : ' quaternion component'));
    lab.append(f);
    $(i < 3 ? '#pose-position' : '#pose-quat').append(lab);
    fields.push(f);
    f.oninput = () => {
      poseDirty = true;
      cancel();
    };
    f.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        solve();
      }
    };
  });
  function single(i, add) {
    if (!state.sols[i]) return;
    if (add) {
      if (state.chosen.has(i) && state.chosen.size > 1) {
        state.chosen.delete(i);
        if (i === state.selected) state.selected = [...state.chosen].at(-1);
      } else {
        state.chosen.add(i);
        state.selected = i;
      }
    } else {
      state.chosen = new Set([i]);
      state.selected = i;
    }
    state.q = state.sols[state.selected].q.slice();
    joints(false);
    $('#ik-reading').textContent =
      state.chosen.size > 1
        ? `${state.chosen.size} selected`
        : state.sols[state.selected].within_limits
          ? 'Within joint limits'
          : 'Outside joint limits';
    visible();
  }
  function display(report) {
    state.sols = report.solutions;
    let n = state.sols.length;
    $('#ik-count').textContent = `${n} solution${n === 1 ? '' : 's'}`;
    results.hidden = !n;
    status.textContent = n
      ? `${state.sols.filter((s) => s.within_limits).length} / ${n} within joint limits`
      : 'No isolated IK solutions found.';
    $('#ik-list').replaceChildren(
      ...state.sols.map((s, i) => {
        let b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(i + 1).padStart(2, '0');
        b.title = s.q.map((r) => (r / D).toFixed(2) + '°').join(' · ');
        b.className = s.within_limits ? '' : 'outside';
        b.setAttribute(
          'aria-label',
          'Solution ' + (i + 1) + (s.within_limits ? '' : ' (outside limits)'),
        );
        b.onclick = (e) => single(i, e.shiftKey || compare);
        return b;
      }),
    );
    if (n) {
      let dist = Infinity,
        best = 0;
      state.sols.forEach((s, i) => {
        let d = s.q.reduce((sum, x, j) => sum + K.wrap(x - state.q[j]) ** 2, 0);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      single(best, false);
      visible(true);
    }
  }
  async function solve() {
    cancel();
    const token = job;
    let pose = poseDirty
      ? fields.map((f) => (f.value.trim() === '' ? NaN : Number(f.value)))
      : exactPose.slice();
    let bad = pose.findIndex((v) => !Number.isFinite(v));
    if (bad !== -1) {
      fields[bad].setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter all seven pose values.';
      return;
    }
    const len = Math.hypot(...pose.slice(3));
    if (len < 1e-12 || !Number.isFinite(len)) {
      fields[3].setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a nonzero quaternion.';
      return;
    }
    pose = pose.map((v, i) => (i < 3 ? v : v / len));
    const q = state.q.slice();
    writePose(pose);
    solveButton.disabled = true;
    status.textContent = 'Solving…';
    const code = document.getElementById('ik-kernel').textContent;
    let blob = null;
    try {
      const req = { pose, q };
      let report = await new Promise((ok, no) => {
        dropJob = no;
        const url = code.trim()
          ? (blob = URL.createObjectURL(
              new Blob(
                [
                  code,
                  '\nonmessage=e=>{try{postMessage(GofaMath.solvePose(e.data.pose,e.data.q))}catch(err){postMessage({error:err.message})}}',
                ],
                { type: 'text/javascript' },
              ),
            ))
          : 'src/solver-worker.js';
        worker = new Worker(url);
        worker.onmessage = (e) => ok(e.data);
        worker.onerror = (e) => no(Error(e.message));
        worker.postMessage(req);
      });
      if (token !== job) return;
      if (report.error) throw Error(report.error);
      display(report);
    } catch (e) {
      if (token === job) {
        try {
          display(K.solvePose(pose, q));
        } catch (err) {
          status.textContent = err.message;
        }
      }
    } finally {
      if (blob) URL.revokeObjectURL(blob);
      if (token === job) {
        dropJob = null;
        worker?.terminate();
        worker = null;
        solveButton.disabled = false;
      }
    }
  }
  async function open() {
    if (active) return;
    if (document.documentElement.classList.contains('atlas-mini') && parent !== self) {
      window.AtlasGlass?.dismiss();
      window.AtlasTour?.clearDetail();
      window.AtlasTour?.request();
      parent.postMessage({ studioPlay: 'office' }, '*');
      return;
    }
    active = true;
    held = compare = false;
    $('#multi-mode').setAttribute('aria-pressed', 'false');
    document.body.classList.add('playing');
    $('#kg-panel').hidden = $('#kg-stage').hidden = false;
    $('#cnrs-cube').hidden = true;
    joints();
    $('#kg-back').focus({ preventScroll: true });
    try {
      loading ??= PlayView.build($('#kg-world'));
      view = await loading;
      if (active) {
        view.reset();
        visible(true);
      }
    } catch (e) {
      status.textContent = '3D rendering unavailable. Pose and IK controls remain active.';
    }
    window.AtlasTour?.request();
  }
  function close(restore = true) {
    if (!active) return;
    if (restore && parent !== self && (window.__NOTEBOOK_HASH || location.hash) === '#playground')
      parent.postMessage({ studioExit: true }, '*');
    AtlasGlass.dismiss();
    active = false;
    held = false;
    window.AtlasTour?.clearDetail();
    cancel();
    document.body.classList.remove('playing');
    $('#kg-panel').hidden = $('#kg-stage').hidden = true;
    if (restore) $('#exhibits [data-record=robot]')?.focus({ preventScroll: true });
    window.AtlasTour?.request();
  }
  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Shift' && !held) {
      held = true;
      visible();
    }
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      close();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && held) {
      held = false;
      visible();
    }
  });
  window.addEventListener('blur', () => {
    if (held) {
      held = false;
      visible();
    }
  });
  $('#multi-mode').onclick = (e) => {
    compare = !compare;
    e.currentTarget.setAttribute('aria-pressed', String(compare));
  };
  solveButton.onclick = solve;
  $('#sample-ik').onclick = () => {
    cancel();
    state.q = [97, 58, -195, -161, -117, -3].map((x) => x * D);
    joints();
    solve();
  };
  $('#kg-reset').onclick = () => view?.reset();
  $('#kg-back').onclick = () => close();
  window.AtlasPlay = {
    open,
    close,
    get active() {
      return active;
    },
    get state() {
      return {
        q: [...state.q],
        pose: exactPose?.slice(),
        count: state.sols.length,
        selected: state.selected,
        shown: [...state.visible],
      };
    },
  };
  joints();
})();
