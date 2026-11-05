import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
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
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:-2,weather_code:3}}));`});
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await cdp('Page.navigate',{url:base});
async function until(expression){return evaluate(`new Promise((resolve,reject)=>{let n=0;const poll=()=>{if((${expression}))return resolve(true);if(n++>600)return reject(Error('Scene not ready'));setTimeout(poll,100)};poll()})`)}
await until(`window.ClayStudio?.inspection().assetsReady&&window.ScarfJolt&&document.querySelector('iframe')?.contentDocument?.body?.dataset.ready==='true'`);
console.log('Snapshot renderer loaded');
const editions=[['robots',9.5],['puppets',4],['halloween',11],['holi',10.5],['india',10.5],['france',10.5],['christmas',10.5],['diwali',17],['snow',27]];
const manifest={};
for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile']]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:label==='mobile'});
 for(const [theme,time] of editions){
  await evaluate(`(async()=>{await Studio3D.select('${theme}');await ClayStudio.whenReady()})()`);
  await new Promise(resolve=>setTimeout(resolve,theme==='puppets'||theme==='snow'?1800:700));
  await until(`(()=>{let count=0;ClayStudio.inspection().root.traverse(o=>{if(o.name==='Robot grip contact')count++});return count===2})()`);
  const shot=await evaluate(`(()=>{ClayStudio.seek(${time});ClayStudio.tick(performance.now());const cv=document.getElementById('word'),rect=cv.getBoundingClientRect(),nav=document.querySelector('.top nav'),r=nav?.offsetWidth?nav.getBoundingClientRect().left-rect.left-14:rect.width,fit=r>=rect.width*.38;const crop=fit?r:rect.width,c=document.createElement('canvas');c.width=Math.round(crop*cv.width/cv.clientWidth);c.height=cv.height;c.getContext('2d').drawImage(cv,0,0,c.width,c.height,0,0,c.width,c.height);return {url:c.toDataURL('image/webp',.86),width:c.width,height:c.height}})()`);
  const file='images/previews/letterhead-'+theme+'-'+label+'.webp';await writeFile(file,Buffer.from(shot.url.split(',')[1],'base64'));manifest[theme+'-'+label]={file,width:shot.width,height:shot.height};console.log(file);
 }
}
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:2,mobile:false});
await evaluate(`scrollTo({top:0,behavior:'instant'});StudioSite.choose('cnrs');const f=document.querySelector('iframe');f.contentWindow.AtlasTour.go(0,true);f.contentDocument.getElementById('cnrs-cube').style.visibility='hidden'`);
await new Promise(resolve=>setTimeout(resolve,400));
const rect=await evaluate(`(()=>{const f=document.querySelector('iframe'),a=f.getBoundingClientRect(),b=f.contentDocument.getElementById('world').getBoundingClientRect();return {x:a.x+b.x,y:a.y+b.y,width:b.width,height:b.height,scale:1}})()`);
const shot=await cdp('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:true});await writeFile('/tmp/progressive-site-qa/cnrs.png',Buffer.from(shot.data,'base64'));
execFileSync('python3',['-c',"from PIL import Image; im=Image.open('/tmp/progressive-site-qa/cnrs.png'); im.thumbnail((1000,900)); im.save('images/previews/cnrs-logo.webp','WEBP',quality=86,method=6)"]);
manifest.cnrs={file:'images/previews/cnrs-logo.webp'};
await writeFile(new URL('../images/previews/manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log('All preview captures complete');ws.close();
