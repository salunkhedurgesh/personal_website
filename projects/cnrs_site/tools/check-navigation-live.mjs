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
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:290,scale:1}});await writeFile('/tmp/navigation-apply-qa/'+name+'.png',Buffer.from(r.data,'base64'))}
await mkdir('/tmp/navigation-apply-qa',{recursive:true});
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
 localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));
 if(location.search.includes('no-gpu=1')||(parent!==self&&parent.location.search.includes('no-gpu=1'))){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:original.call(this,kind,...args)}}
 })()`});
 const run=Date.now();await cdp('Page.navigate',{url:base+'?edition=robots&nav-qa='+run+'#home'});await new Promise(r=>setTimeout(r,500));errors.length=0;
 await until(`location.search.includes('nav-qa=${run}')&&document.body.classList.contains('nav-live')&&window.ClayStudio?.inspection().assetsReady&&document.getElementById('atlasHost').dataset.renderMode==='3d'`);
 const report={};report.models=await evaluate(`Studio3D.navigation()`);
 assert.deepEqual(report.models.map(m=>m.id),['home-c','publications-a','projects-a','teaching-a']);
 assert(!(await evaluate(`!!window.NavigationStudies`)));assert(!requests.some(u=>u.includes('/navigation-studies.js')));
 const limits=await evaluate(`NavigationModels.orbit`);
 await seek(10.5);await evaluate(`ClayStudio.tick(performance.now())`);
 const word=await evaluate(`document.getElementById('word').toDataURL()`);
 async function center(selector){return evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)}
 const point=await center('.top [data-nav="projects"] canvas');
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x-260,y:point.y+80,button:'left',buttons:1});
 report.drag=await evaluate(`Studio3D.navigation().find(m=>m.id==='projects-a')`);
 assert(Math.abs(report.drag.angle-limits.baseYaw)<=limits.yawLimit+.00001&&Math.abs(report.drag.tilt)<=limits.pitchLimit+.00001);
 assert(Math.abs(report.drag.angle-limits.baseYaw)>.3);
 await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x-260,y:point.y+80,button:'left',buttons:0,clickCount:1});
 assert.equal(await evaluate(`location.hash`),'#home');report.dragDoesNotNavigate=true;
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:40,y:250});await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 await evaluate(`ClayStudio.tick(performance.now())`);
 assert((await evaluate(`document.getElementById('word').toDataURL()`))===word,'Navigation rendering must preserve the lettering appearance');report.letteringRenderUnchanged=true;
 const header=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:310,scale:1}});await writeFile('/tmp/navigation-apply-qa/desktop-header.png',Buffer.from(header.data,'base64'));
 await evaluate(`new Promise(r=>setTimeout(r,480))`);
 async function clickLabel(page){const p=await evaluate(`(()=>{const r=document.querySelector('.top [data-nav="${page}"]').getBoundingClientRect();return {x:r.right-6,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});await until(`location.hash==='#${page}'`)}
 await clickLabel('projects');await clickLabel('home');report.linksNavigate=true;
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 assert(await evaluate(`innerWidth===document.documentElement.scrollWidth`));
 const touch=await center('.top [data-nav="projects"] canvas');
 const touchPoint=(x,y)=>[{x,y,radiusX:3,radiusY:3,force:1,id:1}];
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touchPoint(touch.x,touch.y)});
 await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touchPoint(touch.x+12,touch.y)});
 await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touchPoint(touch.x+80,touch.y+3)});
 report.touchPose=await evaluate(`Studio3D.navigation().find(m=>m.id==='projects-a')`);
 assert(Math.abs(report.touchPose.angle-limits.baseYaw)<=limits.yawLimit+.00001);
 await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await evaluate(`location.hash`),'#home');report.touchDragDoesNotNavigate=true;
 const mobile=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/navigation-apply-qa/mobile-header.png',Buffer.from(mobile.data,'base64'));
 report.mobileNoOverflow=true;report.errors=errors.slice();assert.deepEqual(report.errors,[]);
 await cdp('Page.navigate',{url:base+'?edition=robots&no-gpu=1'});
 await until(`document.body.classList.contains('no-gpu')`);
 report.fallbacks=await evaluate(`Promise.all([...document.querySelectorAll('.top [data-nav] canvas')].map(async cv=>{const src=getComputedStyle(cv).backgroundImage.slice(5,-2),im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=src});return {page:cv.closest('[data-nav]').dataset.nav,src:im.src,width:im.naturalWidth,height:im.naturalHeight}}))`);
 assert.equal(report.fallbacks.length,4);assert(report.fallbacks.every(i=>i.width===152&&i.height===160&&i.src.includes('?v=')));
 const fallbackShot=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:390,height:170,scale:1}});await writeFile('/tmp/navigation-apply-qa/no-webgl-header.png',Buffer.from(fallbackShot.data,'base64'));
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 requests.length=0;await cdp('Page.navigate',{url:base});
 await until(`document.getElementById('letterhead-preview')?.naturalWidth>0&&document.getElementById('atlasHost').dataset.renderMode==='3d'`);
 assert(!(await evaluate(`document.body.classList.contains('nav-live')`)));assert(!requests.some(u=>u.includes('/navigation-models.js')));report.reducedMotionUsesSnapshots=true;
 await writeFile('tools/navigation-live-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{ws.close()}
