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
    if (!p) return;
    m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    errors.push(m.params.args.map((a) => a.value || a.description));
  else if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const timeout = setTimeout(() => {
      calls.delete(n);
      reject(Error('CDP timeout: ' + method));
    }, 60000);
    calls.set(n, {
      resolve(value) {
        clearTimeout(timeout);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timeout);
        reject(error);
      },
    });
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
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir('/tmp/animation-preview-qa', { recursive: true });
async function shot(name) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/animation-preview-qa/' + name + '.png', Buffer.from(r.data, 'base64'));
}
async function click(selector) {
  const p = await evaluate(
    `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
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
async function shortcut() {
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 3,
  });
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 0,
  });
}
async function escape() {
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
}
const report = {};
try {
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Runtime.discardConsoleEntries');
  errors.length = 0;
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
    source: `localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}))`,
  });
  const run = Date.now();
  await cdp('Page.navigate', { url: base + '?edition=robots&secret-qa=' + run + '#home' });
  await delay(500);
  await until(
    `location.search.includes('secret-qa=${run}')&&window.ClayStudio?.inspection().assetsReady&&document.getElementById('atlasHost').dataset.renderMode==='3d'`,
  );
  assert.equal(await evaluate(`!!document.querySelector('#appearance')`), false);
  assert.equal(await evaluate(`document.getElementById('animation-preview').open`), false);
  assert.equal(await evaluate(`document.querySelector('[data-study]').getClientRects().length`), 0);
  report.hiddenOnNormalVisits = true;
  await shot('normal-site');
  await evaluate(`document.querySelector('[data-nav="home"]').focus()`);
  await shortcut();
  await until(`document.getElementById('animation-preview').open`);
  assert.equal(await evaluate('document.activeElement.id'), 'edition');
  await shot('desktop-controls');
  report.editions = await evaluate(
    `[...document.querySelectorAll('#edition option')].map(o=>o.value)`,
  );
  assert.equal(report.editions.length, 11);
  await escape();
  await until(`!document.getElementById('animation-preview').open`);
  report.livePreviews = [];
  for (const [theme, time] of [
    ['robots', 10.5],
    ['puppets', 15],
    ['halloween', 11],
    ['holi', 10.5],
    ['republic', 24],
    ['independence', 18],
    ['france', 18],
    ['christmas', 10.5],
    ['diwali', 18],
    ['snow', 35],
  ]) {
    console.log('Preview:', theme);
    if (!(await evaluate(`document.getElementById('animation-preview').open`))) await shortcut();
    await click(`[data-study="${theme}"]`);
    assert.equal(await evaluate(`document.getElementById('animation-preview').open`), false);
    await until(
      `Studio3D.theme()==='${theme}'&&ClayStudio.theme()==='${theme}'&&ClayStudio.inspection().assetsReady&&document.getElementById('marquee').dataset.live==='true'`,
    );
    assert.equal(
      await evaluate(
        `document.querySelector('[data-study="${theme}"]').getAttribute('aria-pressed')`,
      ),
      'true',
    );
    await evaluate(`ClayStudio.seek(${time});ClayStudio.tick(performance.now())`);
    report.livePreviews.push(theme);
  }
  await escape();
  await until(`!document.getElementById('animation-preview').open`);
  assert.equal(await evaluate('document.activeElement.dataset.nav'), 'home');
  report.escapeAndFocusRestoration = true;
  // The shortcut brings the letterhead into view from another route.
  await evaluate(`location.hash='#publications'`);
  await until(`document.querySelector('.page-title-model.live')`);
  await evaluate('document.activeElement.blur()');
  await shortcut();
  await until(`location.hash==='#home'&&document.getElementById('animation-preview').open`);
  report.shortcutFromDirectory = true;
  await escape();
  // Mobile can open the same controls without a keyboard, including from a directory URL.
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp('Page.navigate', { url: base + '?animations=1&secret-mobile=' + run + '#projects' });
  await delay(500);
  await until(
    `location.search.includes('secret-mobile=${run}')&&location.hash==='#home'&&document.getElementById('animation-preview').open`,
  );
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await shot('mobile-controls');
  await click('[data-study="snow"]');
  await until(`window.ClayStudio?.theme()==='snow'&&ClayStudio.inspection().assetsReady`);
  await shot('mobile-selected-animation');
  await until(`!document.getElementById('animation-preview').open`);
  report.mobileURLAndSelection = true;
  // Reduced-motion visitors can still inspect all still previews.
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp('Page.navigate', { url: base + '?animations=1&secret-reduced=' + run });
  await delay(500);
  await until(
    `location.search.includes('secret-reduced=${run}')&&document.getElementById('animation-preview').open`,
  );
  await click('[data-study="halloween"]');
  await until(
    `document.getElementById('marquee').dataset.theme==='halloween'&&document.getElementById('letterhead-preview').naturalWidth>0`,
  );
  assert.equal(await evaluate('!!window.ClayStudio'), false);
  report.reducedMotionPreview = true;
  await escape();
  // The formatted chess template still constructs a board and responds to navigation keys.
  await evaluate(`StudioSite.choose('chess')`);
  await until(`document.querySelectorAll('#chessScene .sq').length===64`);
  await click('[data-key="reveal"]');
  const move = await evaluate(`document.querySelector('.ply').textContent`);
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
  });
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
  });
  assert.notEqual(await evaluate(`document.querySelector('.ply').textContent`), move);
  report.chessNavigation = true;
  // Preserve the complete high-resolution playground and the formatted tour bridge.
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(`StudioSite.openTheme(1);document.querySelector('[data-open-gofa-play]').click()`);
  await until(`document.querySelector('#playhost iframe')?.contentWindow.AtlasPlay?.active`);
  await until(
    `document.querySelector('#playhost iframe')?.contentDocument.getElementById('kg-frame')?.textContent.includes('base_link')`,
  );
  await until(
    `document.querySelector('#playhost iframe').contentWindow.performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/gofa/')&&r.name.includes('.stl')&&r.responseEnd>0).length>=7`,
  );
  report.playgroundSTLs = await evaluate(
    `document.querySelector('#playhost iframe').contentWindow.performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/gofa/')&&r.name.includes('.stl')).map(r=>r.name)`,
  );
  assert(report.playgroundSTLs.length >= 7);
  await evaluate('StudioSite.closePlay();StudioSite.closeTheme()');
  report.errors = errors;
  assert.equal(errors.length, 0);
  await writeFile('tools/animation-preview-qa.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  ws.close();
}
