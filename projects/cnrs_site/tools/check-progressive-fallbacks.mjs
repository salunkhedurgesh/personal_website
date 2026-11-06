import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
// Run a local static preview and Chromium with remote debugging before this check.
const base=process.env.CHESS_PREVIEW_URL||'http://127.0.0.1:8765/';
const debug=process.env.CHESS_DEBUG_URL||'http://127.0.0.1:9223';
const tabs=await (await fetch(debug+'/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const calls=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=calls.get(m.id);calls.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description))});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url)});
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
 localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));
 window.__paints={};document.addEventListener('letterhead-live',()=>{__paints.letterheadLive=performance.now()},{once:true});document.addEventListener('load',e=>{if(e.target.id==='letterhead-preview')__paints.preview=performance.now()},true);
 new PerformanceObserver(list=>{__paints.lcp=list.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});
 if(new URL(location.href).searchParams.has('no-gpu')||(parent!==self&&parent.location.search.includes('no-gpu=1'))){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:get.call(this,kind,...args)}}
})()`});
async function until(expression,ms=60000){return evaluate(`new Promise((resolve,reject)=>{const start=performance.now();const poll=async()=>{let value;try{value=await (${expression})}catch{}if(value)return resolve(value);if(performance.now()-start>${ms})return reject(Error('Timeout '+${JSON.stringify(expression)}));setTimeout(poll,80)};poll()})`)}
async function reset(){await evaluate(`(async()=>{for(const k of await caches.keys())if(k.startsWith('portfolio-scene-previews-'))await caches.delete(k)})()`);await cdp('Network.clearBrowserCache');requests.length=0;errors.length=0}
const report={};
const manifest=JSON.parse(await readFile(new URL('../images/previews/manifest.json',import.meta.url),'utf8'));
const openingFrames=Object.entries(manifest).filter(([key])=>key!=='cnrs');
assert.equal(openingFrames.length,20);
for(const [key,frame] of openingFrames){
 assert.equal(frame.time,0,key);assert.equal(frame.phase,'start',key);
 if(!/^(puppets|halloween)-/.test(key))assert(frame.pose.firstLetterY>.4&&frame.pose.lastLetterY>.4,key);
 if(key.startsWith('diwali-'))assert.equal(frame.pose.ropeLift,0,key);
 if(key.startsWith('snow-'))assert.equal(frame.pose.scarfWrap,0,key);
}
report.openingFrames=openingFrames.length;
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
// Hold the lettering models in flight: CNRS must become genuinely interactive
// without waiting for either robot, and must dismiss its loading snapshot.
const held=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Fetch.requestPaused')held.push(m.params.requestId)});
await cdp('Fetch.enable',{patterns:[{urlPattern:'*models/letterhead/*',requestStage:'Request'}]});
await reset();await cdp('Page.navigate',{url:base});errors.length=0;
try{
 await until(`document.getElementById('atlasHost')?.dataset.renderMode==='3d'&&document.querySelector('#atlasHost iframe')?.contentDocument.body.dataset.ready==='true'&&window.ClayStudio?.inspection().assetStatus==='loading'`);
 report.independentCNRS=await evaluate(`({mode:document.getElementById('atlasHost').dataset.renderMode,snapshotHidden:document.getElementById('atlas-preview').hidden,letterheadReady:ClayStudio.inspection().assetsReady,letterheadLive:document.getElementById('marquee').dataset.live})`);
 assert(held.length>0);assert.equal(report.independentCNRS.snapshotHidden,true);assert.equal(report.independentCNRS.letterheadReady,false);assert.equal(report.independentCNRS.letterheadLive,'false');
 assert(requests.some(u=>u.includes('/assets/mark.glb')));
 assert(!requests.some(u=>/strasbourg-studio\.glb|\/assets\/(world|europe)\.webp/.test(u)));
 assert.deepEqual(errors,[]);
}finally{
 for(const requestId of held)await cdp('Fetch.continueRequest',{requestId});
 await cdp('Fetch.disable');
}
await until(`document.getElementById('marquee').dataset.live==='true'`);
async function dragMark(){
 const position=await evaluate(`(()=>{const f=document.querySelector('#atlasHost iframe'),a=f.getBoundingClientRect(),b=f.contentDocument.getElementById('world').getBoundingClientRect();return {x:a.x+b.x+b.width*.45,y:a.y+b.y+b.height*.45,before:f.contentWindow.AtlasTour.camera.myaw}})()`);
 const {x,y}=position;
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
 for(let i=1;i<=5;i++)await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+i*12,y:y+i*2,button:'left',buttons:1});
 await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+60,y:y+10,button:'left',buttons:0,clickCount:1});
 const after=await evaluate(`document.querySelector('#atlasHost iframe').contentWindow.AtlasTour.camera.myaw`);
 assert(Math.abs(after-position.before)>.05,'CNRS drag must rotate the live model');
 return {before:position.before,after};
}
report.cnrsDrag=await dragMark();console.log('CNRS loads independently and responds to drag');
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await cdp('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:375000,uploadThroughput:375000,connectionType:'cellular4g'});
await reset();await cdp('Page.navigate',{url:base});errors.length=0;
await until(`document.getElementById('letterhead-preview')?.naturalWidth>0`);
report.mobilePreview=await evaluate(`({at:performance.now(),paint:window.__paints,live:document.getElementById('marquee').dataset.live,textVisible:document.getElementById('aboutcopy').getBoundingClientRect().height>0,preview:document.getElementById('letterhead-preview').currentSrc})`);
assert.equal(report.mobilePreview.live,'false');assert(report.mobilePreview.textVisible);
await until(`document.getElementById('marquee').dataset.live==='true'&&document.getElementById('atlasHost').dataset.live==='true'`);
report.mobileLive=await evaluate(`({at:performance.now(),paint:window.__paints,assetsReady:ClayStudio.inspection().assetsReady,width:innerWidth,scrollWidth:document.documentElement.scrollWidth})`);
assert.equal(report.mobileLive.width,report.mobileLive.scrollWidth);assert(!requests.some(u=>u.includes('strasbourg-studio.glb')));
console.log('Mobile 3 Mbps',JSON.stringify({preview:report.mobilePreview,live:report.mobileLive}));
await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await reset();await cdp('Page.navigate',{url:base});errors.length=0;
await until(`document.getElementById('atlasHost')?.dataset.live==='true'`);
await until(`caches.open('portfolio-scene-previews-'+SiteAssets.version).then(c=>c.keys()).then(k=>k.length===21)`);
report.reduced=await evaluate(`({live:document.getElementById('marquee').dataset.live,clay:!!window.ClayStudio,preview:document.getElementById('letterhead-preview').naturalWidth,atlas:document.querySelector('iframe')?.contentDocument.body.dataset.mode})`);
assert.equal(report.reduced.live,'false');assert.equal(report.reduced.clay,false);assert.equal(report.reduced.atlas,'3d');assert(requests.some(u=>u.includes('/assets/mark.glb')));assert(!requests.some(u=>u.includes('lib/three.js')||u.includes('/models/letterhead/')||u.includes('strasbourg-studio.glb')));console.log('Reduced motion: static lettering and live CNRS passed');
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await reset();await cdp('Page.navigate',{url:base+'?no-gpu=1'});errors.length=0;
await until(`document.body.classList.contains('no-gpu')&&document.getElementById('atlasHost').dataset.live==='true'`);
report.noGPU=await evaluate(`({preview:document.getElementById('letterhead-preview').naturalWidth,live:document.getElementById('marquee').dataset.live,atlas:document.querySelector('iframe').contentDocument.body.dataset.mode})`);
assert.equal(report.noGPU.live,'false');assert(!requests.some(u=>u.includes('.glb')));
assert.equal(await evaluate(`document.getElementById('atlasHost').dataset.renderMode`),'snapshot');
assert((await evaluate(`document.querySelector('#atlasHost iframe').contentDocument.getElementById('still').src`)).includes('/images/previews/cnrs-logo.webp'));
console.log('No GPU uses the CNRS snapshot');
await cdp('Network.setBlockedURLs',{urls:['*assets/mark.glb*']});
await reset();await cdp('Page.navigate',{url:base});errors.length=0;
await until(`document.getElementById('atlasHost')?.dataset.renderMode==='snapshot'&&document.querySelector('#atlasHost iframe')?.contentDocument.body.dataset.ready==='fallback'`);
report.cnrsModelFailure=await evaluate(`({mode:document.getElementById('atlasHost').dataset.renderMode,src:document.querySelector('#atlasHost iframe').contentDocument.getElementById('still').src})`);
assert(report.cnrsModelFailure.src.includes('/images/previews/cnrs-logo.webp'));
console.log('Unavailable CNRS model uses the snapshot');
await cdp('Network.setBlockedURLs',{urls:['*models/letterhead/*']});
await reset();await cdp('Page.navigate',{url:base});errors.length=0;
await until(`window.ClayStudio?.inspection().assetStatus==='error'`);
report.modelFailure=await evaluate(`({live:document.getElementById('marquee').dataset.live,preview:document.getElementById('letterhead-preview').naturalWidth,status:ClayStudio.inspection().assetStatus})`);
assert.equal(report.modelFailure.live,'false');assert(report.modelFailure.preview>0);
await cdp('Network.setBlockedURLs',{urls:[]});
await evaluate(`Studio3D.select('diwali')`);await until(`document.getElementById('marquee').dataset.live==='true'`);report.recovered=true;
console.log('Failed model preview and retry passed');
await writeFile('tools/progressive-fallback-qa.json',JSON.stringify(report,null,2)+'\n');ws.close();
