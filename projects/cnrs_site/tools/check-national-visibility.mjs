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
async function seek(time) {
  await evaluate(`ClayStudio.seek(${time});ClayStudio.tick(performance.now())`);
}

const output = '/tmp/national-visibility-qa';
await mkdir(output, { recursive: true });

// Check actual mesh vertices: an object can exist in the scene while its top is
// clipped by either the canvas or the browser viewport.
async function bounds() {
  return evaluate(`(() => {
    const s = ClayStudio.inspection(), rect = document.getElementById('word').getBoundingClientRect();
    const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), groups = [], errors = [];
    s.root.updateWorldMatrix(true, true);
    s.cam.updateMatrixWorld(true);
    s.root.traverse(n => {
      if (/robot-unrolled|robot-held flag/.test(n.name)) groups.push(n);
      if (n.userData.gripError !== undefined) errors.push(n.userData.gripError);
    });
    groups.push(s.root.getObjectByName('ABB GoFa / opening D'), s.root.getObjectByName('KUKA iiwa 7 / final E'));
    const meshes = groups.map(group => {
      const b = { name: group.name, top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity };
      function walk(node) {
        if (!node.visible) return;
        const positions = node.geometry?.attributes.position;
        if (positions) {
          matrix.multiplyMatrices(s.cam.projectionMatrix, s.cam.matrixWorldInverse).multiply(node.matrixWorld);
          for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
            const x = rect.x + (point.x + 1) * rect.width / 2, y = rect.y + (1 - point.y) * rect.height / 2;
            b.left = Math.min(b.left, x); b.right = Math.max(b.right, x);
            b.top = Math.min(b.top, y); b.bottom = Math.max(b.bottom, y);
          }
        }
        node.children.forEach(walk);
      }
      walk(group);
      return b;
    });
    return { meshes, errors, clip: { top: Math.max(0, rect.top), left: Math.max(0, rect.left),
      bottom: Math.min(innerHeight, rect.bottom), right: Math.min(innerWidth, rect.right) },
      overflow: document.documentElement.scrollWidth > innerWidth,
      rollBottom: groups[0].userData.rollBottom,
      flags: groups[0].userData.flagCount,
      lift: groups[0].userData.liftProgress,
      unroll: groups[0].userData.unrollProgress };
  })()`);
}

try {
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp('Page.navigate', { url: base + '?edition=france' });
  await until(`window.ClayStudio?.inspection().assetsReady`);
  const report = { themes: [], errors: [] };
  for (const theme of ['republic', 'independence', 'france']) {
    await evaluate(`(async () => { await Studio3D.select('${theme}'); ClayStudio.seek(0);
      await ClayStudio.whenReady(); ClayStudio.tick(performance.now()); })()`);
    for (const width of [320, 390, 700, 701, 760, 780, 800, 810, 820, 1024, 1440, 1920]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 700 });
      await evaluate(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
      let highest = Infinity;
      for (const time of [0, 4, 9.8, 10.5, 11.3, 12.5, 13.5, 14.5, 15.4, 18.5, 24, 40]) {
        await seek(time);
        const state = await bounds();
        for (const mesh of state.meshes) {
          const label = theme + ', ' + width + 'px, ' + time + 's: ' + mesh.name;
          assert(mesh.top >= state.clip.top + 1, label + ' clips above the visible header (' + mesh.top + ')');
          assert(mesh.bottom <= state.clip.bottom, label + ' clips below the canvas');
          assert(mesh.left >= state.clip.left && mesh.right <= state.clip.right, label + ' clips horizontally');
          highest = Math.min(highest, mesh.top);
        }
        assert(!state.overflow, theme + ' must not create horizontal overflow');
        if (time >= 15.4) assert(state.errors.length === 2 && state.errors.every(error => error < .008),
          theme + ', ' + width + 'px, ' + time + 's: robot grip errors ' + state.errors.join(', '));
        if (time >= 24) {
          assert.equal(state.lift, 1);
          if (theme === 'republic') {
            assert.equal(state.unroll, 1);
            assert(Math.abs(state.rollBottom - .028) < .0001, 'The shortened parchment must still unroll to the floor');
          } else assert.equal(state.flags, 24);
        }
        if ((width === 1440 || width === 390) && [0, 13.5, 24].includes(time)) {
          const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height: 240, scale: 1 } });
          await writeFile(output + '/' + theme + '-' + width + '-' + time + '.png', Buffer.from(shot.data, 'base64'));
        }
      }
      report.themes.push({ theme, width, highestPixel: highest, poses: 12 });
      console.log(theme, width, 'all poses visible; top:', highest.toFixed(2));
    }
  }
  assert.deepEqual(errors, []);
  report.errors = errors;
  await writeFile('tools/national-visibility-qa.json', JSON.stringify(report, null, 2) + '\n');
  console.log('National-day robots, decorations, grips and floor-length unrolling passed.');
} finally {
  ws.close();
}
