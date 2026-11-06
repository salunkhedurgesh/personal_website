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
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:290,scale:1}});await writeFile('/tmp/winter-national-qa/'+name+'.png',Buffer.from(r.data,'base64'))}
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:base+'navigation-models.html'});
 await until(`window.NavigationStudies&&document.body.dataset.ready==='true'`);
 const images=await evaluate(`(()=>{
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.physicallyCorrectLights=true;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.setSize(152,160,false);r.setClearColor(0,0);
  const out={};for(const [page,id] of Object.entries(NavigationModels.selected)){
   const entry=NavigationModels.scene(id);NavigationModels.frame(entry,152,160);r.render(entry.s,entry.camera);out[page]=r.domElement.toDataURL('image/png');
  }r.dispose();r.forceContextLoss();return out;
 })()`);
 for(const [page,url] of Object.entries(images))await writeFile('images/nav-'+page+'.png',Buffer.from(url.split(',')[1],'base64'));
 console.log('Saved four selected navigation model snapshots');
}finally{ws.close()}
