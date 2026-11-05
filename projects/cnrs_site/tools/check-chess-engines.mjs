import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
// Start a static preview and Chromium with --remote-debugging-port=9223 first.
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
await cdp('Page.enable');
await cdp('Page.navigate',{url:base});

await evaluate(`new Promise((resolve,reject)=>{let n=0;let id=setInterval(()=>{if(window.ChessAnalysis&&window.Rules){clearInterval(id);resolve(true)}else if(n++>100){clearInterval(id);reject(Error('Chess scripts not loaded'))}},100)})`);
const results=[];
const positions=[
 {name:'White to move',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'},
 {name:'White mate in one',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',mate:1},
 {name:'Black mate in one',fen:'8/8/8/8/8/6k1/5q2/7K b - - 0 1',mate:-1}
];
for(const engine of await evaluate('ChessAnalysis.engines')) for(const position of positions) {
 const r=await evaluate(`(async()=>{
  const engine=ChessAnalysis.engines.find(e=>e.id===${JSON.stringify(engine.id)});
  const status=[];let count=0;const start=performance.now();
  const service=ChessAnalysis.create({fetch:async()=>{count++;return new Response('',{status:404})},engines:[engine]});
  try {const value=await service.analyse(${JSON.stringify(position.fen)},{onStatus:s=>status.push(s)});return {id:engine.id,value,status:status.slice(-3),count,ms:performance.now()-start}}
  catch(e){return {id:engine.id,error:e.message,status:status.slice(-3),count,ms:performance.now()-start}}
 })()`);
 r.position=position.name;
 console.log(JSON.stringify(r));results.push(r);
 assert(!r.error,`${engine.id} ${position.name}: ${r.error}`);
 assert(r.value.depth>=8);
 if(position.mate)assert.equal(r.value.mate,position.mate,JSON.stringify(r));
}
await writeFile(new URL('./chess-engine-qa.json',import.meta.url),JSON.stringify({results,errors},null,2)+'\n');
assert.deepEqual(errors,[]);
ws.close();
