import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
await mkdir('/tmp/progressive-site-qa',{recursive:true});
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
const editions=['robots','puppets','halloween','holi','republic','independence','france','christmas','diwali','snow'];
const manifest={};
for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile']]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:label==='mobile'});
 for(const theme of editions){
  // Freeze before assets finish, then render and export the very first frame in
  // the same task that observes readiness; no live animation may run in between.
  const shot=await evaluate(`(async()=>{
   await Studio3D.select('${theme}');ClayStudio.seek(0);await ClayStudio.whenReady();
   ClayStudio.seek(0);ClayStudio.tick(performance.now());
   const scene=ClayStudio.inspection();
   const cv=document.getElementById('word'),rect=cv.getBoundingClientRect(),nav=document.querySelector('.top nav'),r=nav?.offsetWidth?nav.getBoundingClientRect().left-rect.left-14:rect.width,fit=r>=rect.width*.38;
   const crop=fit?r:rect.width,c=document.createElement('canvas');c.width=Math.round(crop*cv.width/cv.clientWidth);c.height=cv.height;
   c.getContext('2d').drawImage(cv,0,0,c.width,c.height,0,0,c.width,c.height);
   const carrier=scene.root.getObjectByName('Robot-lifted Diwali lantern rope');
   return {url:c.toDataURL('image/webp',.86),width:c.width,height:c.height,
    pose:{firstLetterY:scene.units[0].g.position.y,lastLetterY:scene.units.at(-1).g.position.y,
     ropeLift:carrier?.userData.liftProgress,scarfWrap:scene.units.find(u=>u.winterScarf)?.winterScarf.userData.wrapProgress}};
  })()`);
  if(!['puppets','halloween'].includes(theme))assert(shot.pose.firstLetterY>.4&&shot.pose.lastLetterY>.4,theme+' must show the held opening letters');
  if(theme==='diwali')assert.equal(shot.pose.ropeLift,0);
  if(theme==='snow')assert.equal(shot.pose.scarfWrap,0);
  const file='images/previews/letterhead-'+theme+'-'+label+'.webp';await writeFile(file,Buffer.from(shot.url.split(',')[1],'base64'));manifest[theme+'-'+label]={file,width:shot.width,height:shot.height,time:0,phase:'start',pose:shot.pose};console.log(file);
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
