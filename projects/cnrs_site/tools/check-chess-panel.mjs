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
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('studio-strasbourg-meteo-v1',JSON.stringify({t:Date.now(),data:{temperature_2m:5,weather_code:3}}));`});
await cdp('Page.navigate',{url:base});
async function until(expression){return evaluate(`new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{const value=(${expression});if(value)return resolve(value);if(performance.now()-start>45000)return reject(Error('Timed out: '+${JSON.stringify(expression)}));setTimeout(poll,80)};poll()})`)}
await until(`window.ChessAnalysis&&window.Rules&&document.querySelector('[data-role="chess"]')`);
const report={};
report.liveLookup=await evaluate(`(async()=>{
 const log=[],status=[];
 const value=await ChessAnalysis.create({fetch:async(...args)=>{
  try{const r=await fetch(...args);log.push({status:r.status,url:args[0]});return r}
  catch(e){log.push({error:e.message,url:args[0]});throw e}
 }}).analyse(Rules.START,{onStatus:s=>status.push(s)});
 return {value,requests:log,status:status.slice(-2)};
})()`);
console.log('Live lookup',JSON.stringify(report.liveLookup));
assert(report.liveLookup.value.depth>=8);
await evaluate(`(()=>{
 window.__chessRequests=[];window.__chessWorkers=[];window.__cloudMode='miss';
 const originalFetch=window.fetch.bind(window),OriginalWorker=window.Worker;
 window.fetch=async(url,options)=>{
  if(String(url).startsWith('https://lichess.org/api/cloud-eval?')){
   const fen=new URL(url).searchParams.get('fen');__chessRequests.push(fen);
   return __cloudMode==='hit'?new Response(JSON.stringify({fen,depth:18,pvs:[{cp:-142,moves:'e7e5'}]}),{status:200}):new Response('',{status:404});
  }
  return originalFetch(url,options);
 };
 window.Worker=class extends OriginalWorker {
  constructor(url,...args){super(url,...args);this.log={url:String(url),commands:[],terminated:false};if(String(url).includes('/lib/chess/'))__chessWorkers.push(this.log)}
  postMessage(command,...args){this.log.commands.push(command);return super.postMessage(command,...args)}
  terminate(){this.log.terminated=true;return super.terminate()}
 };
 document.querySelector('[data-role="chess"]').click();
})()`);
async function loadFen(fen){await evaluate(`document.querySelector('.fenbox').value=${JSON.stringify(fen)};document.querySelector('[data-key="fen"]').click()`)}
async function panel(){return evaluate(`({score:document.querySelector('.evalnum').textContent,pv:document.querySelector('.evalpv').textContent,barHidden:document.querySelector('.evalbar').hidden,fen:document.querySelector('.fenbox').value,arrows:document.querySelectorAll('.arrows line').length})`)}
async function controls(){return evaluate(`({label:document.querySelector('.ply').textContent,widths:['[data-key="prev"]','.ply','[data-key="next"]'].map(s=>document.querySelector(s).getBoundingClientRect().width)})`)}
async function key(key){const code={ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40}[key];for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code})}
async function clickSquare(square){
 await evaluate(`document.querySelector('[data-sq="'+Rules.sq('${square}')+'"]').scrollIntoView({block:'nearest',behavior:'instant'})`);
 const point=await evaluate(`(()=>{const b=document.querySelector('[data-sq="'+Rules.sq('${square}')+'"]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
 await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
const start='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
await loadFen(start);
await until("/depth 8/.test(document.querySelector('.evalnum').textContent)&&!document.querySelector('.evalbar').hidden");
report.fallback=await panel();assert.match(report.fallback.score,/Stockfish 19 Lite/);assert(report.fallback.arrows>0);assert(report.fallback.pv.length>0);
report.removed=await evaluate(`({newPosition:!!document.querySelector('[data-key="shuffle"]'),importPGN:!!document.querySelector('.filepgn'),help:!!document.querySelector('.touchhelp')})`);
assert.deepEqual(report.removed,{newPosition:false,importPGN:false,help:false});
report.controls={start:await controls()};
assert.deepEqual(report.controls.start.widths,[32,104,32]);
await clickSquare('e2');await clickSquare('e4');
const afterE4=(await panel()).fen;assert.notEqual(afterE4,start);
await evaluate(`document.activeElement.blur()`);await key('ArrowLeft');
assert.equal((await panel()).fen,start);
await key('ArrowRight');assert.equal((await panel()).fen,afterE4);
await evaluate(`document.querySelector('.analysis').focus()`);
await key('ArrowLeft');assert.equal((await panel()).fen,start);
await key('ArrowRight');assert.equal((await panel()).fen,afterE4);
assert.equal(await evaluate("document.querySelector('.analysis').checked"),true);
await evaluate(`document.querySelector('[data-sq="12"]').focus()`);
await key('ArrowLeft');assert.equal((await panel()).fen,start);
assert.equal(await evaluate('document.activeElement.dataset.sq'),'12');
await key('ArrowRight');assert.equal((await panel()).fen,afterE4);
await key('ArrowUp');assert.equal(await evaluate('document.activeElement.dataset.sq'),'20');
assert.equal((await panel()).fen,afterE4);
await evaluate(`document.querySelector('.notation').open=true;document.querySelector('.fenbox').focus();document.querySelector('.fenbox').setSelectionRange(1,1)`);
await key('ArrowRight');assert.equal((await panel()).fen,afterE4);
assert.equal(await evaluate("document.querySelector('.fenbox').selectionStart"),2);
await evaluate(`document.activeElement.blur();document.querySelector('.notation').open=false`);
report.controls.keyboard='Body, analysis checkbox, and board navigate moves; text-field arrows edit normally; Up/Down move board focus.';
await evaluate(`document.querySelector('[data-key="players"]').click()`);await key('ArrowLeft');
assert.equal((await panel()).fen,afterE4);
await evaluate(`document.querySelector('[data-key="board"]').click();document.querySelector('[data-role="cnrs"]').click()`);
await key('ArrowLeft');assert.equal((await panel()).fen,afterE4);
await evaluate(`document.querySelector('[data-role="chess"]').click()`);
await clickSquare('e7');await clickSquare('e5');
await until("/depth 8/.test(document.querySelector('.evalnum').textContent)&&!document.querySelector('.evalbar').hidden");
report.played=await panel();report.controls.played=await controls();
assert.deepEqual(report.controls.played.widths,report.controls.start.widths);
report.history=await evaluate(`__chessWorkers.flatMap(w=>w.commands).filter(x=>typeof x==='string'&&x.includes(' moves '))`);
assert(report.history.some(command=>command.endsWith(' moves e2e4 e7e5')));assert.match(report.played.pv,/2\. /);
await loadFen('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
await new Promise(r=>setTimeout(r,500));
await loadFen('8/8/8/8/8/6k1/5q2/7K b - - 0 1');
await until("document.querySelector('.evalnum').textContent.startsWith('#-1')");
report.rapidNavigation=await panel();assert.match(report.rapidNavigation.score,/depth 8/);
await loadFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
report.terminal=await panel();assert.equal(report.terminal.score,'Checkmate · White wins');assert(report.terminal.barHidden);assert.equal(report.terminal.arrows,0);
await loadFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
report.stalemate=await panel();assert.equal(report.stalemate.score,'Stalemate · draw');assert(report.stalemate.barHidden);
await loadFen('k7/4P3/8/8/8/8/8/7K w - - 0 123');
await evaluate(`document.querySelector('.analysis').click()`);
await clickSquare('e7');await clickSquare('e8');
await evaluate(`Array.from(document.querySelectorAll('.promote button')).find(b=>b.textContent==='Q').click()`);
report.controls.promotion=await controls();
assert.equal(report.controls.promotion.label,'123. e8=Q+');
assert.deepEqual(report.controls.promotion.widths,report.controls.start.widths);
await evaluate(`__cloudMode='hit'`);
await loadFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
await until("document.querySelector('.evalnum').textContent.includes('Lichess cloud')");
report.cloud=await panel();assert.equal(report.cloud.score,'-1.42 · Lichess cloud · depth 18');
await evaluate(`document.querySelector('#chessScene').scrollIntoView({behavior:'instant',block:'center'})`);
let shot=await cdp('Page.captureScreenshot',{format:'png'});if(process.env.CHESS_SCREENSHOT_DIR)await writeFile(process.env.CHESS_SCREENSHOT_DIR+'/panel-desktop.png',Buffer.from(shot.data,'base64'));
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
report.mobile=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,panelWidth:document.querySelector('.engine').getBoundingClientRect().width,score:document.querySelector('.evalnum').textContent})`);
assert.equal(report.mobile.width,report.mobile.scrollWidth);assert(report.mobile.panelWidth>0);
report.controls.mobile=await controls();assert.deepEqual(report.controls.mobile.widths,report.controls.start.widths);
await evaluate(`document.querySelector('.engine').scrollIntoView({behavior:'instant',block:'center'})`);
shot=await cdp('Page.captureScreenshot',{format:'png'});if(process.env.CHESS_SCREENSHOT_DIR)await writeFile(process.env.CHESS_SCREENSHOT_DIR+'/panel-mobile.png',Buffer.from(shot.data,'base64'));
await evaluate(`if(document.querySelector('.analysis').checked)document.querySelector('.analysis').click()`);
report.disabled=await evaluate(`({hidden:document.querySelector('.engine').hidden,arrows:document.querySelectorAll('.arrows line').length,workers:__chessWorkers})`);
assert(report.disabled.hidden);assert.equal(report.disabled.arrows,0);assert(report.disabled.workers.every(w=>w.terminated));
report.requests=await evaluate('__chessRequests');report.runtimeErrors=errors;assert.deepEqual(errors,[]);
await writeFile(new URL('./chess-panel-qa.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
ws.close();
