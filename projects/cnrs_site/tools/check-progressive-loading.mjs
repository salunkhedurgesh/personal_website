import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
// Run a local static preview and Chromium with remote debugging before this check.
const base = process.env.CHESS_PREVIEW_URL || 'http://127.0.0.1:8765/';
const debug = process.env.CHESS_DEBUG_URL || 'http://127.0.0.1:9223';
const tabs = await (await fetch(debug + '/json/list')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const calls = new Map(),
  errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = calls.get(m.id);
    calls.delete(m.id);
    m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    errors.push(m.params.args.map((a) => a.value || a.description));
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
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
});
await cdp('Page.enable');
await cdp('Network.enable');
await cdp('Network.setCacheDisabled', { cacheDisabled: true });
await cdp('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
const requests = [],
  network = new Map();
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data),
    p = m.params;
  if (m.method === 'Network.requestWillBeSent') {
    requests.push(p.request.url);
    network.set(p.requestId, { url: p.request.url, type: p.type });
  }
  if (m.method === 'Network.loadingFinished' && network.has(p.requestId))
    network.get(p.requestId).bytes = p.encodedDataLength;
});
await cdp('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
});
await cdp('Page.addScriptToEvaluateOnNewDocument', {
  source: `localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));`,
});
async function until(expression, ms = 45000) {
  return evaluate(
    `new Promise((resolve,reject)=>{const start=performance.now();const poll=async()=>{let v;try{v=await (${expression})}catch{}if(v)return resolve(v);if(performance.now()-start>${ms})return reject(Error('Timeout '+${JSON.stringify(expression)}));setTimeout(poll,70)};poll()})`,
  );
}
async function shot(name) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/progressive-site-qa/' + name + '.png', Buffer.from(r.data, 'base64'));
}
await evaluate(
  `(async()=>{for(const name of await caches.keys())if(name.startsWith('portfolio-scene-previews-'))await caches.delete(name)})()`,
);
await cdp('Network.clearBrowserCache');
await cdp('Page.navigate', { url: base });
errors.length = 0;
const report = {};
report.firstPreview = await until(
  `(()=>{const image=document.getElementById('letterhead-preview');return image?.complete&&image.naturalWidth&&document.getElementById('marquee').dataset.live==='false'?{at:performance.now(),theme:document.getElementById('marquee').dataset.theme,src:image.currentSrc,text:document.getElementById('aboutcopy').textContent.slice(0,65)}:false})()`,
);
await shot('snapshot-first');
await until(
  `document.getElementById('marquee').dataset.live==='true'&&document.getElementById('atlasHost').dataset.live==='true'`,
);
report.initial = await evaluate(
  `({at:performance.now(),live:document.getElementById('marquee').dataset.live,atlas:document.getElementById('atlasHost').dataset.live,assetsReady:ClayStudio.inspection().assetsReady,nav:getComputedStyle(document.querySelector('.top [data-nav] canvas')).backgroundImage})`,
);
const initial = [...requests];
report.initialRequests = initial.filter((u) => /^https?:/.test(u));
assert(initial.some((u) => u.includes('/models/letterhead/abb-gofa-crb15000.glb')));
assert(initial.some((u) => u.includes('/models/letterhead/kuka-iiwa7.glb')));
for (const forbidden of [
  '/models/abb-gofa-crb15000.glb',
  '/models/kuka-iiwa7.glb',
  'strasbourg-studio.glb',
  'world.webp',
  'europe.webp',
  '/js/clay/carving.js',
  '/js/clay/caps.js',
  '/js/clay/holi.js',
  '/js/clay/national.js',
  '/js/games.js',
  '/js/chess.js',
])
  assert(!initial.some((u) => u.includes(forbidden)), forbidden + ' fetched at startup');
await until(
  `caches.open('portfolio-scene-previews-'+SiteAssets.version).then(c=>c.keys()).then(keys=>keys.length>=21)`.replace(
    /^/,
    '',
  ),
);
report.cache = await evaluate(
  `(async()=>{const c=await caches.open('portfolio-scene-previews-'+SiteAssets.version);return (await c.keys()).map(k=>k.url)})()`,
);
assert.equal(report.cache.length, 21);
await shot('live-desktop');
report.themes = [];
for (const [theme, time] of [
  ['robots', 9.5],
  ['puppets', 4],
  ['halloween', 11],
  ['holi', 10.5],
  ['republic', 24],
  ['independence', 18],
  ['france', 18],
  ['christmas', 10.5],
  ['diwali', 17],
  ['snow', 35],
]) {
  await evaluate(
    `(async()=>{await Studio3D.select('${theme}');await ClayStudio.whenReady();ClayStudio.seek(${time});ClayStudio.tick(performance.now())})()`,
  );
  await until(`document.getElementById('marquee').dataset.live==='true'`);
  const state = await evaluate(
    `(()=>{const s=ClayStudio.inspection(),rigs=[];s.root.traverse(n=>{if(n.userData.gripError!==undefined)rigs.push(n.userData.gripError)});return {theme:s.theme,assetsReady:s.assetsReady,units:s.units.length,rigs,live:document.getElementById('marquee').dataset.live,caps:s.units.filter(u=>u.cap).length,previewSrc:document.getElementById('letterhead-preview').currentSrc}})()`,
  );
  assert.equal(state.theme, theme);
  assert(state.assetsReady);
  assert.equal(state.units, 15);
  if (theme === 'christmas') assert.equal(state.caps, 15);
  if (theme === 'diwali' || theme === 'puppets') assert(state.rigs.every((v) => v < 0.008));
  report.themes.push(state);
  console.log('Theme', theme, 'passed');
}
await evaluate(
  `scrollTo({top:0,behavior:'instant'});StudioSite.choose('cnrs');document.querySelector('iframe').contentWindow.AtlasTour.go(1,true)`,
);
await until(`document.querySelector('iframe').contentDocument.body.dataset.worldReady==='true'`);
assert(requests.some((u) => u.includes('strasbourg-studio.glb')));
assert(!requests.some((u) => u.includes('/assets/world.webp')));
assert(!requests.some((u) => u.includes('/assets/europe.webp')));
report.world = await evaluate(
  `({ready:document.querySelector('iframe').contentDocument.body.dataset.worldReady,state:document.querySelector('iframe').contentWindow.AtlasTour.state,still:document.querySelector('iframe').contentDocument.getElementById('still').hidden})`,
);
await shot('tour-workstation');
await evaluate(`document.querySelector('iframe').contentWindow.AtlasTour.go(6,true)`);
await until(`document.querySelector('iframe').contentWindow.AtlasTour.planet!==null`);
report.planet = await evaluate(`document.querySelector('iframe').contentWindow.AtlasTour.planet`);
await shot('tour-earth');
await evaluate(`StudioSite.choose('kin')`);
await until(`document.querySelector('#kinScene .scene-fallback')?.hidden`);
assert(
  requests.some((u) => /\/models\/abb-gofa-crb15000\.glb/.test(u) && !u.includes('/letterhead/')),
);
report.highResolutionKin = true;
await shot('high-resolution-kin');
await evaluate(
  `document.getElementById('themegrid').scrollIntoView({behavior:'instant'});StudioSite.openTheme(1);document.querySelector('[data-open-gofa-play]').click()`,
);
await until(`document.querySelector('#playhost iframe')?.contentWindow.AtlasPlay?.active`);
await until(
  `document.querySelector('#playhost iframe')?.contentWindow.THREE?.STLLoader&&document.querySelector('#playhost iframe')?.contentDocument.getElementById('kg-frame')?.textContent.includes('base_link')`,
);
report.playgroundSTL = requests.filter((u) => u.includes('/models/gofa/') && u.includes('.stl'));
assert(report.playgroundSTL.length >= 7);
await shot('high-resolution-playground');
await evaluate(
  `StudioSite.closePlay();StudioSite.closeTheme();scrollTo({top:0,behavior:'instant'})`,
);
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await evaluate(
  `(async()=>{await Studio3D.select('diwali');await ClayStudio.whenReady();ClayStudio.seek(17);ClayStudio.tick(performance.now())})()`,
);
report.mobile = await evaluate(
  `({width:innerWidth,scroll:document.documentElement.scrollWidth,previewWidth:document.getElementById('letterhead-preview').getBoundingClientRect().width,canvasWidth:document.getElementById('word').clientWidth,preview:document.getElementById('letterhead-preview').currentSrc})`,
);
assert.equal(report.mobile.width, report.mobile.scroll);
await shot('live-mobile');
report.errors = errors;
assert.deepEqual(errors, []);
report.network = Array.from(network.values()).filter((x) => x.url.startsWith('http'));
report.bytes = report.network.reduce((n, r) => n + (r.bytes || 0), 0);
await writeFile('tools/progressive-loading-qa.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      firstPreview: report.firstPreview,
      initial: report.initial,
      cacheCount: report.cache.length,
      themes: report.themes.map((t) => t.theme),
      mobile: report.mobile,
      STLs: report.playgroundSTL.length,
      errors: errors.length,
    },
    null,
    2,
  ),
);
ws.close();
