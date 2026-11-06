import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
// Local static server :8765 and Chromium remote debugging :9223 are required.
const base=process.env.CHESS_PREVIEW_URL||'http://127.0.0.1:8765/';
const debug=process.env.CHESS_DEBUG_URL||'http://127.0.0.1:9223';
const tabs=await (await fetch(debug+'/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const calls=new Map(),errors=[],requests=[];
ws.addEventListener('message',e=>{
 const m=JSON.parse(e.data);
 if(m.id){const p=calls.get(m.id);calls.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}
 else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);
 else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description));
 else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function until(expression){return evaluate(`new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{try{if((${expression}))return resolve(true)}catch{}if(performance.now()-start>60000)return reject(Error('Scene not ready'));setTimeout(poll,80)};poll()})`)}
async function seek(time){await evaluate(`ClayStudio.seek(${time});ClayStudio.tick(performance.now())`)}
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:290,scale:1}});await writeFile('/tmp/holi-puppet-qa/'+name+'.png',Buffer.from(r.data,'base64'))}
await mkdir('/tmp/holi-puppet-qa',{recursive:true});
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));`});
 await cdp('Page.navigate',{url:base+'?edition=puppets'});errors.length=0;
 await until(`window.ClayStudio?.inspection().assetsReady&&LetterPlay.snapshot().mode==='jolt'`);
 assert(!requests.some(u=>u.includes('/holi.js')));
 const report={};
 report.puppetMotion=await evaluate(`(()=>{
  const start=AtelierArt.marionettePose(0),early=AtelierArt.marionettePose(2),late=AtelierArt.marionettePose(4),end=AtelierArt.marionettePose(13);
  return {start,early,late,end};
 })()`);
 const m=report.puppetMotion;assert.equal(m.start.drop,.54);assert.equal(m.early.drop,0);
 assert(Math.abs(m.late.envelope/m.early.envelope-Math.exp(-.72*2))<.00001);assert(m.end.envelope<.0002);
 await evaluate(`(async()=>{await Studio3D.select('puppets');await ClayStudio.whenReady();ClayStudio.seek(0);ClayStudio.tick(performance.now())})()`);
 await until(`LetterPlay.snapshot().mode==='jolt'`);
 await shot('puppets-high');
 report.puppetPhysics=await evaluate(`(()=>{
  const s=ClayStudio.inspection(),rail=s.root.getObjectByName('Robot-held marionette rail');
  const origin=performance.now();let maxOffset=0,maxAngle=0,early=0,late=0,earlyN=0,lateN=0;
  for(let frame=0;frame<=960;frame++){
   const t=frame/120,p=AtelierArt.marionettePose(t);
   rail.position.set(p.x,p.y,0);rail.rotation.z=p.angle;rail.updateMatrix();
   s.units.forEach(u=>{u.rigAnchor.copy(u.railAnchor).applyMatrix4(rail.matrix);u.g.position.set(u.x,.003,0);u.g.rotation.x=u.g.rotation.z=0});
   LetterPlay.step(origin+frame*1000/120);
   const state=LetterPlay.snapshot();
   for(const u of state.units){
    if(![u.x,u.y,u.angle].every(Number.isFinite))throw Error('Nonfinite puppet');
    maxOffset=Math.max(maxOffset,Math.abs(u.x));maxAngle=Math.max(maxAngle,Math.abs(u.angle));
    const motion=Math.abs(u.x)+Math.abs(u.angle);
    if(t>1.3&&t<3){early+=motion;earlyN++}if(t>7){late+=motion;lateN++}
   }
  }
  return {engine:LetterPlay.snapshot().mode,maxOffset,maxAngle,early:early/earlyN,late:late/lateN};
 })()`);
 assert.equal(report.puppetPhysics.engine,'jolt');assert(report.puppetPhysics.maxOffset<.8&&report.puppetPhysics.maxAngle<.8);
 assert(report.puppetPhysics.late<report.puppetPhysics.early*.8);
 await seek(8);await shot('puppets-settled');
 report.grips=[];
 for(const t of [0,.65,1.25,2.4,8]){
  await seek(t);
  const errors=await evaluate(`(()=>{const a=[];ClayStudio.inspection().root.traverse(n=>{if(n.userData.gripError!==undefined)a.push(n.userData.gripError)});return a})()`);
  assert.equal(errors.length,2);assert(errors.every(e=>e<.008));report.grips.push({t,errors});
 }
 console.log('Marionette descent, exponential damping, real Jolt stability and robot grips passed');
 await evaluate(`(async()=>{await Studio3D.select('holi');ClayStudio.seek(0);await ClayStudio.whenReady();ClayStudio.tick(performance.now())})()`);
 const status=()=>evaluate(`(()=>{const s=ClayStudio.inspection(),set=s.root.getObjectByName('Holi / responsive powder bowls');return {time:performance.now(),...set.userData,coats:s.units.map(u=>u.holiPigment.coats),coverageByLetter:s.units.map(u=>u.holiPigment.coverage),green:s.units.every(u=>u.body.material.color.g>u.body.material.color.r&&u.body.material.color.g>u.body.material.color.b),jump:Math.max(...set.children.filter(n=>n.name.startsWith('Holi / gulal bowl')).map(n=>n.userData.jump)),particles:set.getObjectByName('Holi / pooled airborne powder').count}})()`);
 report.opening=await status();assert(report.opening.green);assert.equal(report.opening.assemblyBursts,0);assert.equal(report.opening.coverage,0);await shot('holi-green');
 await seek(6.20);assert.equal((await status()).assemblyBursts,0);
 await seek(6.48);report.firstContact=await status();assert(report.firstContact.assemblyBursts>0&&report.firstContact.jump>0);
 await seek(7.6);report.burst=await status();assert.equal(report.burst.assemblyBursts,7);assert.equal(report.burst.paintedLetters,15);assert(report.burst.activeClouds>0);await shot('holi-assembly-burst');
 await seek(11);report.afterAssembly=await status();assert.equal(report.afterAssembly.activeClouds,0);assert(report.afterAssembly.coverage>.15);await shot('holi-first-coat');
 async function key(key,code=key){const v=key===' '?32:undefined;await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:v});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:v})}
 async function physics(ms){await evaluate(`(()=>{const s=ClayStudio.inspection();window.__playClock=Math.max(window.__playClock||0,performance.now());for(let i=0;i<${Math.ceil(ms*120/1000)};i++){__playClock+=1000/120;s.units.forEach(u=>{u.g.position.set(u.x,.003,0);u.g.rotation.x=u.g.rotation.z=0});LetterPlay.step(__playClock)}})()`)}
 await evaluate(`document.getElementById('word').focus()`);
 for(let i=0;i<6;i++)await key('ArrowRight');
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
 await physics(500);await seek(11.4);
 report.grab=await status();assert(report.grab.interactiveBursts>=2);assert(report.grab.coverage>report.afterAssembly.coverage);
 await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
 await physics(1600);await seek(12);
 report.drop=await status();report.hits=await evaluate(`LetterPlay.snapshot().hits`);
 assert(report.hits>0);assert(report.drop.interactiveBursts>report.grab.interactiveBursts);
 assert(report.drop.coverage>=report.grab.coverage);await shot('holi-user-powder');
 await seek(12.4);
 const position=await evaluate(`(()=>{const s=ClayStudio.inspection(),u=s.units[6],r=document.getElementById('word').getBoundingClientRect();s.root.updateMatrixWorld(true);const p=u.g.localToWorld(new THREE.Vector3(-.23,.5,.22)).project(s.cam);return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}})()`);
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...position,button:'left',buttons:1,clickCount:1});
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:position.x+5,y:position.y-15,button:'left',buttons:1});
 await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:position.x+5,y:position.y-15,button:'left',buttons:0,clickCount:1});
 await seek(12.8);report.pointer=await status();assert(report.pointer.interactiveBursts>report.drop.interactiveBursts);
 await seek(17);report.accumulated=await status();assert.equal(report.accumulated.activeClouds,0);assert(report.accumulated.coverage>=report.pointer.coverage);assert.equal(report.accumulated.particles,1008);await shot('holi-accumulated');
 await seek(0);report.replay=await status();assert.equal(report.replay.coverage,0);assert.equal(report.replay.interactiveBursts,0);
 assert(!requests.some(u=>u.includes('/paint-holi.webp')));console.log('Holi green opening, placement bursts, keyboard and pointer play, persistent paint, rewind and bounded pools passed');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const theme of ['holi','puppets']){
  await evaluate(`(async()=>{await Studio3D.select('${theme}');await ClayStudio.whenReady();ClayStudio.seek(0);ClayStudio.tick(performance.now())})()`);
  assert(await evaluate(`document.documentElement.scrollWidth===innerWidth`));
 }
 report.mobile=true;
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate(`(async()=>{await Studio3D.select('holi');await ClayStudio.whenReady();ClayStudio.tick(performance.now())})()`);
 report.reduced=await status();assert.equal(report.reduced.activeClouds,0);assert(report.reduced.coverage>0);assert(await evaluate(`!ClayStudio.active(performance.now())`));
 report.errors=errors;assert.deepEqual(errors,[]);
 await writeFile('tools/holi-marionette-qa.json',JSON.stringify(report,null,2)+'\n');console.log('Mobile, reduced-motion and browser-error checks passed');
}finally{ws.close()}
