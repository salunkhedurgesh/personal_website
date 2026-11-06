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
  await writeFile('/tmp/winter-national-qa/' + name + '.png', Buffer.from(r.data, 'base64'));
}
await mkdir('/tmp/winter-national-qa', { recursive: true });
try {
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Page.enable');
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
    source: `localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));`,
  });
  await cdp('Page.navigate', { url: base + '?edition=snow' });
  errors.length = 0;
  await until(`window.ClayStudio?.inspection().assetsReady`);
  assert(
    !requests.some((u) => u.includes('/clay/national.js')),
    'National-day assets must stay lazy',
  );
  const report = {};
  report.winter = await evaluate(`(()=>{
  const s=ClayStudio.inspection(),units=s.units;
  const frozenAt=Math.max(...units.map(u=>u.freezeCompleteAt));
  const warmedAt=units[0].settledAt,restoredAt=Math.max(...units.map(u=>u.restoredAt));
  let reverseFront=false,mixedThaw=false;
  for(const u of units){
   const b=u.body.geometry.boundingBox,dx=b.max.x-b.min.x,dy=b.max.y-b.min.y;
   for(let j=1;j<10;j++)for(const x of [.2,.5,.8]){
    const lower=[b.min.x+dx*x,b.min.y+dy*.2,b.max.z],upper=[b.min.x+dx*x,b.min.y+dy*.8,b.max.z];
    const t=u.freezeStartsAt+u.iceField.duration*j/10;
    if(u.sampleIceAt(upper,t)&&!u.sampleIceAt(lower,t))reverseFront=true;
    const m=u.thawStartsAt+u.iceField.meltDuration*j/10;
    if(!u.sampleIceAt(upper,m)&&u.sampleIceAt(lower,m))mixedThaw=true;
   }
  }
  ClayStudio.seek(frozenAt+.1);ClayStudio.tick(performance.now());
  const icicles=units.flatMap(u=>u.icicles);
  const state={frozenAt,warmedAt,restoredAt,reverseFront,mixedThaw,
   durations:units.map(u=>u.iceField.duration),meltDurations:units.map(u=>u.iceField.meltDuration),
   allFrozen:units.every(u=>u.freezeProgress===1&&u.iceShell.visible),
   icicles:icicles.length,minLength:Math.min(...icicles.map(c=>c.userData.length)),
   maxLength:Math.max(...icicles.map(c=>c.userData.length)),
   minVertices:Math.min(...icicles.map(c=>c.geometry.attributes.position.count)),
   perLetter:units.map(u=>({letter:u.ch,icicles:u.icicles.length})),
   supported:units.every(u=>{
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),probe=new THREE.Mesh(u.body.geometry,material);
    probe.updateMatrixWorld(true);
    const valid=u.icicles.every(c=>{
     const p=new THREE.Vector3(...c.userData.support.point);
     const up=new THREE.Raycaster(p.clone().add(new THREE.Vector3(0,-.02,0)),new THREE.Vector3(0,1,0),0,.03).intersectObject(probe)[0];
     const down=new THREE.Raycaster(p.clone().add(new THREE.Vector3(0,-.012,0)),new THREE.Vector3(0,-1,0),0,c.userData.length).intersectObject(probe);
     return up&&Math.abs(up.distance-.02)<.0001&&up.face.normal.y<-.4&&down.length===0&&p.y-c.userData.length>.035;
    });
    material.dispose();return valid;
   }),
   allIciclesVisible:icicles.every(c=>c.visible),chattering:units.every(u=>u.chattering)};
  return state;
 })()`);
  const w = report.winter;
  assert(w.reverseFront && w.mixedThaw, 'Frost and thaw must spread from multiple directions');
  assert(Math.max(...w.durations) - Math.min(...w.durations) > 2);
  assert(Math.max(...w.meltDurations) - Math.min(...w.meltDurations) > 1);
  assert(w.allFrozen && w.chattering && w.allIciclesVisible);
  assert(w.warmedAt >= w.frozenAt + 3);
  assert(w.icicles > 8 && w.minLength >= 0.15 && w.maxLength > 0.3 && w.minVertices >= 300);
  assert(w.supported, 'Every icicle must attach to a real underside with free space beneath');
  await shot('winter-frozen');
  await seek(w.warmedAt + 2.6);
  await shot('winter-thaw');
  report.warmed = await evaluate(
    `(()=>{const u=ClayStudio.inspection().units;return {chattering:u.some(u=>u.chattering),scarves:u.filter(u=>u.winterScarf?.userData.wrapProgress===1).length,cap:u[0].winterCap.visible}})()`,
  );
  assert.equal(report.warmed.chattering, false);
  assert.equal(report.warmed.scarves, 3);
  assert(report.warmed.cap);
  await seek(w.restoredAt + 0.1);
  assert(
    await evaluate(
      `ClayStudio.inspection().units.every(u=>!u.iceShell.visible&&!u.chattering&&u.icicles.every(c=>!c.visible)&&u.meltProgress===1)`,
    ),
  );
  console.log(
    'Winter: sculpted icicles, multidirectional frost/thaw, varied pacing, scarves and restoration passed',
  );
  report.national = [];
  for (const theme of ['republic', 'independence', 'france']) {
    await evaluate(
      `(async()=>{await Studio3D.select('${theme}');ClayStudio.seek(0);await ClayStudio.whenReady();ClayStudio.tick(performance.now())})()`,
    );
    assert(
      await evaluate(
        `(()=>{let carrier;ClayStudio.inspection().root.traverse(n=>{if(n.name.includes('robot-unrolled')||n.name.includes('robot-held flag'))carrier=n});return carrier&&carrier.visible})()`,
      ),
    );
    if (theme === 'republic') {
      const opening = await evaluate(
        `(()=>{const r=ClayStudio.inspection().root,c=r.getObjectByName('Republic Day / robot-unrolled Constitution parchment');return {progress:c.userData.unrollProgress,paper:r.getObjectByName('Republic Day / full Preamble of the Indian Constitution').visible,roll:r.getObjectByName('Republic Day / descending rolled paper').visible}})()`,
      );
      assert.equal(opening.progress, 0);
      assert.equal(opening.paper, false);
      assert.equal(opening.roll, true);
    }
    await shot(theme + '-opening');
    await seek(13.5);
    await shot(theme + '-lifting');
    if (theme === 'republic') {
      await seek(15.4);
      await shot('republic-raised-roll');
      assert(
        await evaluate(
          `(()=>{const c=ClayStudio.inspection().root.getObjectByName('Republic Day / robot-unrolled Constitution parchment');return c.userData.unrollProgress===0&&c.userData.gripHeight>2.4})()`,
        ),
      );
      await seek(18.5);
      await shot('republic-unrolling');
      assert(
        await evaluate(
          `(()=>{const c=ClayStudio.inspection().root.getObjectByName('Republic Day / robot-unrolled Constitution parchment');return c.userData.unrollProgress>0&&c.userData.unrollProgress<1&&c.userData.rollBottom>.03})()`,
        ),
      );
    }
    await seek(theme === 'republic' ? 24 : 18);
    const state = await evaluate(`(()=>{
   const s=ClayStudio.inspection(),rigs=[],flags=[];let carrier;
   s.root.traverse(n=>{if(n.userData.gripError!==undefined)rigs.push(n.userData.gripError);if(n.name.includes('triangular pennant /'))flags.push(n);if(n.name.includes('robot-unrolled')||n.name.includes('robot-held flag'))carrier=n});
   return {theme:s.theme,rigs,flags:flags.length,carrierVisible:carrier.visible,lift:carrier.userData.liftProgress,
    unroll:carrier.userData.unrollProgress,height:carrier.userData.gripHeight,rollBottom:carrier.userData.rollBottom,
    preamble:s.root.getObjectByName('Republic Day / full Preamble of the Indian Constitution')?.userData.preamble,ropeProfile:carrier.userData.ropeProfile,
    pennants:flags.map(f=>({colour:f.userData.colour,aspect:f.userData.aspect,solid:!f.children[0].material.map,
     topFit:(()=>{const p=f.children[0].geometry.attributes.position,r=carrier.userData.ropeProfile;let error=0;
      for(let i=0;i<=16;i++){const v=carrier.worldToLocal(f.localToWorld(new THREE.Vector3().fromBufferAttribute(p,i)));const u=(v.x-r.left)/(r.right-r.left);error=Math.max(error,Math.abs(v.y-(r.top-4*r.sag*u*(1-u)-.008)),Math.abs(v.z-(r.z+.006)))}return error})(),
     bottomWidth:(()=>{const p=f.children[0].geometry.attributes.position;return Math.abs(p.getX(p.count-1)-p.getX(p.count-17))})()})),green:s.units.every(u=>!u.body.material.map&&u.body.material.color.g>u.body.material.color.r&&u.body.material.color.g>u.body.material.color.b),
    title:Studio3D.occasionInfo(s.theme).title,dates:Studio3D.occasionInfo(s.theme).dates,
    finite:s.units.every(u=>Array.from(u.body.geometry.attributes.position.array).every(Number.isFinite))};
  })()`);
    assert.equal(state.theme, theme);
    assert(state.green && state.finite && state.carrierVisible);
    assert.equal(state.rigs.length, 2);
    assert(state.rigs.every((d) => d < 0.008));
    assert.equal(state.lift, 1);
    if (theme === 'republic') {
      assert.equal(state.unroll, 1);
      assert.equal(state.dates, '26 Jan');
      assert(state.height > 2.4);
      assert(Math.abs(state.rollBottom - 0.028) < 0.0001, 'Parchment must unroll to the floor');
      for (const phrase of [
        'WE, THE PEOPLE OF INDIA,',
        'SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC',
        'JUSTICE, social, economic and political;',
        'LIBERTY of thought, expression, belief, faith and worship;',
        'EQUALITY of status and of opportunity;',
        'FRATERNITY assuring the dignity of the individual and the unity and integrity of the Nation;',
        'this twenty-sixth day of November, 1949',
        'ADOPT, ENACT AND GIVE TO OURSELVES THIS CONSTITUTION.',
      ])
        assert(state.preamble.includes(phrase), phrase);
    } else {
      assert.equal(state.flags, 24);
      assert.equal(state.dates, theme === 'france' ? '14 Jul' : '15 Aug');
      const colours =
        theme === 'france' ? ['#002395', '#f4eedc', '#ed2939'] : ['#ff9933', '#f4eedc', '#138808'];
      assert(state.height > 2.3);
      assert.equal(state.ropeProfile.sag, 0.42);
      state.pennants.forEach((p, i) => {
        assert.equal(p.colour, colours[Math.floor(i / 8)]);
        assert(p.solid && p.bottomWidth < 0.00001 && p.aspect >= 1.4 && p.topFit < 0.00001);
      });
    }
    report.national.push(state);
    await shot(theme + '-held');
    console.log(theme, 'green letters and robot grips passed');
  }
  assert(requests.some((u) => u.includes('/images/occasions/india-emblem.png')));
  assert(!requests.some((u) => /paint-(india|france)\.webp/.test(u)));
  report.calendar = await evaluate(
    `['2027-01-26','2027-08-15','2027-07-14'].map(d=>({date:d,theme:Studio3D.classify(d)}))`,
  );
  assert.deepEqual(
    report.calendar.map((d) => d.theme),
    ['republic', 'independence', 'france'],
  );
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const theme of ['republic', 'independence', 'france', 'snow']) {
    await evaluate(
      `(async()=>{await Studio3D.select('${theme}');await ClayStudio.whenReady();ClayStudio.seek(24);ClayStudio.tick(performance.now())})()`,
    );
    assert(await evaluate(`document.documentElement.scrollWidth===innerWidth`));
  }
  report.mobileNoOverflow = true;
  await cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await evaluate(
    `(async()=>{await Studio3D.select('republic');await ClayStudio.whenReady();ClayStudio.tick(performance.now())})()`,
  );
  assert(await evaluate(`!ClayStudio.active(performance.now())`));
  report.reducedMotion = true;
  report.errors = errors;
  assert.deepEqual(errors, []);
  await writeFile('tools/winter-national-qa.json', JSON.stringify(report, null, 2) + '\n');
  console.log('Calendar selection, lazy assets, mobile layout and reduced-motion checks passed');
} finally {
  ws.close();
}
