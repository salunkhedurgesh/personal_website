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
async function shot(name) {
  const r = await cdp('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 1440, height: 290, scale: 1 },
  });
  await writeFile('/tmp/nav-studies-qa/' + name + '.png', Buffer.from(r.data, 'base64'));
}
await mkdir('/tmp/nav-studies-qa', { recursive: true });
try {
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Page.enable');
  await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp('Page.navigate', { url: base + 'navigation-models.html' });
  errors.length = 0;
  await until(`document.body.dataset.ready==='true'`);
  const models = await evaluate(
    `(()=>{return [...NavigationStudies.entries].map(([id,e])=>{let meshes=0,triangles=0;e.pivot.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3}});return {id,meshes,triangles}})})()`,
  );
  assert.equal(models.length, 12);
  assert(models.every((m) => m.meshes >= 1 && m.triangles > 100));
  const dimensions = await evaluate(
    `({width:innerWidth,scroll:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length,selected:document.querySelectorAll('.choose[aria-pressed=true]').length})`,
  );
  assert.equal(dimensions.width, dimensions.scroll);
  assert.equal(dimensions.canvases, 16);
  assert.equal(dimensions.selected, 4);
  const before = await evaluate(
    `document.querySelector('canvas[data-model="home-a"]').toDataURL()`,
  );
  await evaluate(`document.querySelector('canvas[data-model="home-a"]').focus()`);
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
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  assert.notEqual(
    await evaluate(`document.querySelector('canvas[data-model="home-a"]').toDataURL()`),
    before,
  );
  const point = await evaluate(
    `(()=>{const r=document.querySelector('canvas[data-model="projects-a"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...point,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x + 30,
    y: point.y + 4,
    button: 'left',
    buttons: 1,
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x + 30,
    y: point.y + 4,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  assert((await evaluate(`NavigationStudies.entries.get('projects-a').angle`)) > 0.1);
  const limits = await evaluate(`NavigationModels.orbit`);
  for (const direction of [1, -1]) {
    await cdp('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...point,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x + direction * 400,
      y: point.y + direction * 140,
      button: 'left',
      buttons: 1,
    });
    await cdp('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: point.x + direction * 400,
      y: point.y + direction * 140,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    const pose = await evaluate(
      `(()=>{const e=NavigationStudies.entries.get('projects-a');return {angle:e.angle,tilt:e.tilt}})()`,
    );
    assert(
      Math.abs(pose.angle - limits.baseYaw) <= limits.yawLimit + 0.00001 &&
        Math.abs(pose.tilt) <= limits.pitchLimit + 0.00001,
    );
    assert(Math.abs(pose.angle - (limits.baseYaw + direction * limits.yawLimit)) < 0.00001);
    assert(Math.abs(pose.tilt - direction * limits.pitchLimit) < 0.00001);
  }
  await evaluate(`document.querySelector('canvas[data-model="home-a"]').focus()`);
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    for (let i = 0; i < 12; i++)
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
    const yaw = await evaluate(`NavigationStudies.entries.get('home-a').angle`);
    assert(Math.abs(yaw - limits.baseYaw) <= limits.yawLimit + 0.00001);
  }
  await evaluate(`document.querySelector('button[data-model="projects-b"]').click()`);
  assert.equal(await evaluate(`NavigationStudies.choices.projects`), 'projects-b');
  await evaluate(
    `NavigationModels.categories.forEach(c=>NavigationStudies.choose(c.id,c.id+'-'+(c.default||'a')));NavigationStudies.entries.forEach(e=>{e.angle=-.12;e.tilt=0});NavigationStudies.request();document.activeElement.blur()`,
  );
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const height = await evaluate(
    `Math.ceil(document.querySelector('main').getBoundingClientRect().bottom+28)`,
  );
  const shot = await cdp('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 1440, height, scale: 1 },
    captureBeyondViewport: true,
  });
  await writeFile('images/navigation-model-studies.png', Buffer.from(shot.data, 'base64'));
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate(
    `NavigationStudies.request();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`,
  );
  assert(await evaluate(`innerWidth===document.documentElement.scrollWidth`));
  const mobile = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/nav-studies-qa/mobile.png', Buffer.from(mobile.data, 'base64'));
  await cdp('Page.navigate', { url: 'file://' + process.cwd() + '/navigation-models.html' });
  await until(`document.body.dataset.ready==='true'`);
  assert.equal(await evaluate(`NavigationStudies.entries.size`), 12);
  assert.deepEqual(errors, []);
  const report = {
    models,
    dimensions,
    pointerRotation: true,
    keyboardRotation: true,
    selection: true,
    orbitLimits: limits,
    mobileNoOverflow: true,
    opensWithoutServer: true,
    errors,
  };
  await writeFile('tools/navigation-models-qa.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  ws.close();
}
