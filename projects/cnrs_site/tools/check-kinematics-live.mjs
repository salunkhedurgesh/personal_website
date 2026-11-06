import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
// Local static server :8765 and Chromium remote debugging :9223 are required.
const base = process.env.CHESS_PREVIEW_URL || 'http://127.0.0.1:8765/';
const debug = process.env.CHESS_DEBUG_URL || 'http://127.0.0.1:9223';
const tabs = await (await fetch(debug + '/json/list')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const calls = new Map(),
  errors = [],
  requests = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = calls.get(m.id);
    calls.delete(m.id);
    m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    errors.push(m.params.args.map((a) => a.value || a.description));
  else if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    calls.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails)
    throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function until(expression) {
  return evaluate(
    `new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{try{if((${expression}))return resolve(true)}catch{}if(performance.now()-start>60000)return reject(Error('Scene not ready'));setTimeout(poll,80)};poll()})`,
  );
}
async function shot(name) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/kinematics-qa/' + name + '.png', Buffer.from(r.data, 'base64'));
}
await mkdir('/tmp/kinematics-qa', { recursive: true });
const report = {};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function center(selector) {
  return evaluate(
    `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
}
async function click(selector) {
  const p = await center(selector);
  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...p,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...p,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
}
async function state() {
  return evaluate('Studio3D.kinematics()');
}
function closure(s) {
  assert(s.pose.residual < 1e-8);
  assert(s.pose.angles.every(Number.isFinite));
  for (const e of s.jointErrors) {
    assert(e.lower < 2e-8);
    assert(e.upper < 2e-8);
    assert(e.crank < 2e-8);
    assert(Math.abs(e.length - 0.2379558287) < 2e-8);
    assert(e.scale.every((v) => Math.abs(v - 1) < 1e-8));
  }
}
async function readyHome() {
  await until(`Studio3D.kinematics()&&window.ClayStudio?.inspection().assetsReady`);
  await evaluate(`ClayStudio.seek(12);ClayStudio.tick(performance.now());scrollTo(0,0)`);
  await delay(400);
}
try {
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `(()=>{localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:4,weather_code:3}}));if(location.search.includes('no-gpu=1')){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:original.call(this,kind,...args)}}})()`,
  });
  const run = Date.now();
  await cdp('Page.navigate', { url: base + '?edition=robots&kin-qa=' + run + '#publications' });
  await delay(600);
  await until(
    `location.search.includes('kin-qa=${run}')&&document.querySelector('.page-title-model.live')`,
  );
  report.directDirectory = { letteringLoaded: await evaluate('!!window.ClayStudio'), models: [] };
  assert(!report.directDirectory.letteringLoaded);
  assert(!requests.some((u) => u.includes('/models/') || u.includes('/js/clay/')));
  for (const page of ['publications', 'projects', 'teaching']) {
    await evaluate(`location.hash='#${page}'`);
    await until(
      `document.querySelector('.page-title-model.live canvas')?.dataset.model==='${page}-a'`,
    );
    report.directDirectory.models.push(await evaluate('Studio3D.pageModel()'));
    assert.equal(
      await evaluate(`document.querySelector('.dirhead h1').textContent`),
      page[0].toUpperCase() + page.slice(1),
    );
    const p = await center('.page-title-model canvas');
    await cdp('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...p,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: p.x + 500,
      y: p.y + 300,
      button: 'left',
      buttons: 1,
    });
    await delay(160);
    const view = await evaluate('Studio3D.pageModel()'),
      limits = await evaluate('NavigationModels.orbit');
    assert(Math.abs(view.angle - limits.baseYaw) <= limits.yawLimit + 1e-8);
    assert(Math.abs(view.tilt) <= limits.pitchLimit + 1e-8);
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: p.x + 500,
      y: p.y + 300,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await shot('title-' + page);
  }
  await evaluate(`location.hash='#home?role=kin'`);
  await readyHome();
  assert.equal(await evaluate(`document.querySelectorAll('#home .page-title-model').length`), 0);
  closure(await state());
  await shot('mechanisms');
  await click('[data-rig=rss]');
  await until('Studio3D.kinematics().enabled');
  await delay(350);
  await shot('platform-rest');
  let initial = await state(),
    p = initial.screenHandle;
  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...p,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  assert((await state()).dragging, 'native handle press must start manipulation');
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: p.x + 300,
    y: p.y - 180,
    button: 'left',
    buttons: 1,
  });
  await until(`Studio3D.kinematics().force>2&&Studio3D.kinematics().coilVisible`);
  await delay(450);
  const held = await state();
  closure(held);
  assert(held.limited);
  assert(Math.hypot(...held.offset) <= 0.025 + 1e-9);
  assert(held.pose.angles.some((q, i) => Math.abs(q - initial.pose.angles[i]) > 0.01));
  assert(Math.abs(held.force - held.stiffness * Math.hypot(...held.offset)) < 1e-8);
  await shot('platform-spring');
  report.drag = {
    offsetMm: held.offset.map((v) => v * 1000),
    forceN: held.force,
    anglesDeg: held.pose.angles.map((v) => (v * 180) / Math.PI),
    maxJointGapM: Math.max(...held.jointErrors.map((e) => Math.max(e.lower, e.upper, e.crank))),
    limited: held.limited,
  };
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 1400,
    y: 30,
    button: 'left',
    buttons: 1,
  });
  await delay(250);
  closure(await state());
  assert(Math.hypot(...(await state()).offset) <= 0.025 + 1e-9);
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 1400,
    y: 30,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await until(`!Studio3D.kinematics().dragging&&Math.hypot(...Studio3D.kinematics().offset)<1e-6`);
  assert(!(await state()).coilVisible);
  report.release = 'home';
  // Changing the actual UI stiffness changes resistance to an identical pointer target.
  report.stiffness = [];
  for (const k of [200, 1200]) {
    await evaluate(
      `(()=>{const input=document.querySelector('[data-spring]');input.value=${k};input.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    );
    p = (await state()).screenHandle;
    await cdp('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...p,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: p.x + 250,
      y: p.y - 120,
      button: 'left',
      buttons: 1,
    });
    await until(
      `Studio3D.kinematics().force>1&&Math.hypot(...Studio3D.kinematics().velocity)<1e-4`,
    );
    const s = await state();
    closure(s);
    report.stiffness.push({ k, displacementMm: Math.hypot(...s.offset) * 1000 });
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: p.x + 250,
      y: p.y - 120,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await until('Math.hypot(...Studio3D.kinematics().offset)<1e-6');
  }
  assert(report.stiffness[0].displacementMm > report.stiffness[1].displacementMm + 5);
  await evaluate(`document.getElementById('kinCanvas').focus()`);
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
    nativeVirtualKeyCode: 39,
  });
  await until('Studio3D.kinematics().offset[0]>.001');
  closure(await state());
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
    nativeVirtualKeyCode: 39,
  });
  await until('Math.hypot(...Studio3D.kinematics().offset)<1e-6');
  report.keyboard = 'bounded motion and release';
  // The shared navigation renderer must restore the lettering renderer settings.
  await evaluate(`Studio3D.select('robots')`);
  await until(`ClayStudio.theme()==='robots'&&ClayStudio.inspection().assetsReady`);
  await evaluate(
    `ClayStudio.seek(10.5);ClayStudio.tick(performance.now());ClayStudio.tick(performance.now())`,
  );
  await delay(100);
  const before = await evaluate(`document.getElementById('word').toDataURL()`);
  await evaluate('Studio3D.redraw()');
  await delay(250);
  const after = await evaluate(
    `ClayStudio.tick(performance.now());document.getElementById('word').toDataURL()`,
  );
  assert(before === after, 'kinematic/nav rendering must preserve the lettering output');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await delay(650);
  await evaluate('scrollTo(0,0)');
  await shot('mobile-rest');
  p = (await state()).screenHandle;
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 5 }] });
  assert((await state()).dragging, 'touch handle press must start manipulation');
  await cdp('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x + 150, y: p.y - 90, id: 5 }],
  });
  await until(`Studio3D.kinematics().force>1`);
  closure(await state());
  assert(Math.hypot(...(await state()).offset) <= 0.025 + 1e-9);
  await shot('mobile-spring');
  await cdp('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await until(`!Studio3D.kinematics().dragging&&Math.hypot(...Studio3D.kinematics().offset)<1e-6`);
  report.mobile = {
    touch: 'bounded drag, cancel and return',
    overflow: await evaluate('document.documentElement.scrollWidth>innerWidth'),
  };
  assert(!report.mobile.overflow);
  await click('[data-both]');
  assert(!(await state()).enabled);
  await evaluate(`location.hash='#publications'`);
  await until(
    `document.querySelector('.page-title-model.live canvas')?.dataset.model==='publications-a'`,
  );
  await delay(200);
  await shot('mobile-title');
  assert(!(await evaluate('document.documentElement.scrollWidth>innerWidth')));
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: false });
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp('Page.navigate', { url: base + '?kin-reduced=' + run + '#projects' });
  await delay(650);
  await until(
    `location.search.includes('kin-reduced=${run}')&&document.querySelector('.page-title-model img')?.complete`,
  );
  assert(
    !(await evaluate(`document.querySelector('.page-title-model').classList.contains('live')`)),
  );
  report.reducedMotion = 'still portrait';
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await cdp('Page.navigate', { url: base + '?no-gpu=1&kin-fallback=' + run + '#teaching' });
  await delay(650);
  await until(
    `location.search.includes('kin-fallback=${run}')&&document.body.classList.contains('no-gpu')`,
  );
  assert(
    await evaluate(
      `document.querySelector('.page-title-model img').complete&&!document.querySelector('.page-title-model').classList.contains('live')`,
    ),
  );
  report.noGPU = 'still portrait';
  report.errors = errors.filter((e) => !JSON.stringify(e).includes('WebGL context'));
  assert.equal(report.errors.length, 0);
  await writeFile('tools/kinematics-live-qa.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  ws.close();
}
