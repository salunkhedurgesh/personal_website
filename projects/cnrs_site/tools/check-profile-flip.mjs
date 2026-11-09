import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Start the local static server and Chromium remote debugging before this check.
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8765/',
  debug = process.env.DEBUG_URL || 'http://127.0.0.1:9223',
  output = '/tmp/durgesh-profile-qa',
  frame = `document.querySelector('#atlasHost iframe')`,
  tour = `${frame}.contentWindow.AtlasTour`;
const tabs = await (await fetch(debug + '/json/list')).json(),
  ws = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
await mkdir(output, { recursive: true });
let next = 0;
const calls = new Map(),
  errors = [],
  pendingPhotos = [];
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const call = calls.get(message.id);
    calls.delete(message.id);
    if (message.error) call.reject(Error(JSON.stringify(message.error)));
    else call.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
  else if (message.method === 'Fetch.requestPaused') pendingPhotos.push(message.params.requestId);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    calls.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
function until(expression) {
  return evaluate(`new Promise((resolve,reject)=>{
    const start=performance.now();
    const poll=()=>{if(${expression})return resolve(true);
      if(performance.now()-start>30000)return reject(Error('Badge not ready'));
      setTimeout(poll,40)};poll();})`);
}
async function point() {
  return evaluate(`(()=>{const f=${frame},a=f.getBoundingClientRect(),
    b=f.contentDocument.getElementById('world').getBoundingClientRect();
    return {x:a.x+b.x+b.width/2,y:a.y+b.y+b.height/2}})()`);
}
async function click() {
  const position = await point();
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position });
  for (const [type, buttons] of [['mousePressed', 1], ['mouseReleased', 0]])
    await cdp('Input.dispatchMouseEvent', {
      type, ...position, button: 'left', buttons, clickCount: 1,
    });
}
async function settled(angle) {
  await until(`Math.abs(${tour}.camera.mflip-${angle})<0.00001`);
}
async function snapshot(name) {
  const result = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${output}/${name}.png`, Buffer.from(result.data, 'base64'));
}
try {
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*profile_pic_nino.png*' }] });
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await cdp('Page.navigate', { url: base + '?edition=robots' });
  await until(`${frame}?.contentWindow?.AtlasTour&&
    ${frame}?.contentDocument?.getElementById('world')?.dataset.explore==='mark'`);
  const loadingStarted = Date.now();
  while (!pendingPhotos.length) {
    if (Date.now() - loadingStarted > 30000) throw Error('Photo download did not start');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  const loadingScroll = await evaluate(`${frame}.contentWindow.scrollY`);
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseWheel', ...await point(), deltaX: 0, deltaY: 120,
  });
  await evaluate(`new Promise(r=>setTimeout(r,150))`);
  assert.equal(await evaluate(`${tour}.camera.mflip`), Math.PI);
  assert.equal(await evaluate(`${frame}.contentWindow.scrollY`), loadingScroll);
  for (const requestId of pendingPhotos) await cdp('Fetch.continueRequest', { requestId });
  await cdp('Fetch.disable');
  await until(`${frame}?.contentDocument?.body?.dataset.visualReady==='true'`);
  await settled(Math.PI);
  await snapshot('initial-photo-desktop');

  await click();
  await until(`${tour}.camera.mflip>Math.PI+0.05&&${tour}.camera.mflip<2*Math.PI-0.05`);
  await snapshot('turning-desktop');
  await settled(2 * Math.PI);
  await snapshot('cnrs-desktop');
  await click();
  await settled(3 * Math.PI);

  const position = await point();
  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed', ...position, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: position.x + 55, y: position.y + 8, button: 'left', buttons: 1,
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: position.x + 55, y: position.y + 8,
    button: 'left', buttons: 0, clickCount: 1,
  });
  assert(Math.abs(await evaluate(`${tour}.camera.myaw`)) > 0.05);
  await settled(3 * Math.PI);

  await evaluate(`${tour}.go(0,true)`);
  await settled(Math.PI);
  const before = await evaluate(`({parent:scrollY,frame:${frame}.contentWindow.scrollY})`);
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseWheel', ...await point(), deltaX: 0, deltaY: 120,
  });
  await settled(2 * Math.PI);
  assert.deepEqual(
    await evaluate(`({parent:scrollY,frame:${frame}.contentWindow.scrollY})`), before,
  );
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseWheel', ...await point(), deltaX: 0, deltaY: 550,
  });
  await until(`${tour}.state.progress>0.001`);
  await evaluate(`${tour}.go(1,true)`);
  await until(`${frame}.contentDocument.body.dataset.worldReady==='true'`);
  await settled(0);

  await evaluate(`${tour}.go(0,true)`);
  await settled(Math.PI);
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  await evaluate(`document.getElementById('environment').scrollIntoView({block:'center'})`);
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const touch = await point();
  await cdp('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...touch, id: 1, radiusX: 3, radiusY: 3, force: 1 }],
  });
  await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settled(2 * Math.PI);
  await snapshot('cnrs-mobile');

  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await evaluate(`${frame}.contentDocument.getElementById('world').focus()`);
  for (const [key, expected] of [['Enter', 3 * Math.PI], [' ', 4 * Math.PI]]) {
    await cdp('Input.dispatchKeyEvent', {
      type: 'keyDown', key, code: key === ' ' ? 'Space' : key,
    });
    await cdp('Input.dispatchKeyEvent', {
      type: 'keyUp', key, code: key === ' ' ? 'Space' : key,
    });
    await settled(expected);
  }
  assert.equal(await evaluate(`${tour}.state.chapter`), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    photoFirst: true, delayedPhotoStartup: true,
    clickBothFaces: true, animatedTurn: true, dragPreserved: true,
    firstWheelFlips: true, subsequentWheelContinuesTour: true, officeLoads: true,
    touchTap: true, keyboard: true, reducedMotion: true, errors,
  }, null, 2));
} finally {
  await cdp('Fetch.disable');
  ws.close();
}
