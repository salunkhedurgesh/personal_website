/* Protocol/failover checks. Actual engine execution: tools/check-chess-engines.mjs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const context=vm.createContext({console,DOMException,AbortController,setTimeout,clearTimeout,fetch,URL});
for(const file of ['js/rules.js','js/chess-analysis.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const A=context.ChessAnalysis,R=context.Rules;
const start=R.START;
const black=R.fen(R.next(R.read(start),R.parse(R.read(start),'e2e4')));
const miss=async()=>new Response('',{status:404});
const payload=(fen,depth=20,cp=30,moves=fen===black?'e7e5':'e2e4')=>({fen,depth,pvs:[{cp,moves}]});
const hit=data=>async()=>new Response(JSON.stringify(data),{status:200});
let checks=0;
function fakeWorkers(plans={}) {
  const workers=[];
  function makeWorker(file) {
    const engine=A.engines.find(e=>e.file===file);
    const plan=plans[engine.id]||{};
    if(plan.throw) throw Error('Missing asset');
    const worker={file,commands:[],terminated:false,terminate(){this.terminated=true},postMessage(command){
      this.commands.push(command);
      if(plan.hang) return;
      queueMicrotask(()=>{
        if(this.terminated) return;
        const emit=data=>this.onmessage?.({data});
        if(command==='uci') emit('option name Hash type spin default 32 min 1 max 256\nuciok');
        if(command==='isready') emit('readyok');
        if(command.startsWith('go ')) {
          if(plan.error) return this.onerror?.({preventDefault(){}});
          const move=plan.move||'e2e4';
          emit(plan.info||`info depth ${plan.depth||8} score ${plan.score||'cp 50'} ${plan.bound||''} pv ${move}`);
          emit('bestmove '+(plan.best||move));
        }
      });
    }};
    workers.push(worker);return worker;
  }
  return {makeWorker,workers};
}
async function test(name,run){await run();checks++;console.log('✓ '+name)}

(async()=>{
  await test('Exactly five pinned, same-origin fallback builds exist',()=>{
    assert.equal(A.engines.length,5);
    assert.equal(new Set(A.engines.map(e=>e.id)).size,5);
    for(const engine of A.engines) assert(fs.statSync(path.join(root,engine.file)).size>0);
    assert.equal(A.minDepth,8);
  });
  await test('Lichess is first; a valid result starts no worker and stays White-relative',async()=>{
    const pool=fakeWorkers();let requests=0;
    const service=A.create({...pool,fetch:async(url,options)=>{
      requests++;assert(url.startsWith('https://lichess.org/api/cloud-eval?fen='));
      assert.equal(options.credentials,'omit');
      return hit(payload(black,24,-135))();
    }});
    const value=await service.analyse(black);
    assert.equal(value.cp,-135);assert.equal(value.depth,24);assert.equal(value.id,'lichess');
    await service.analyse(black);
    assert.equal(pool.workers.length,0);assert.equal(requests,1);
  });
  await test('Lichess king-to-rook castling is normalized and remains legal',async()=>{
    const pool=fakeWorkers();
    const pv='e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 e1h1 d7d6';
    const result=await A.create({...pool,fetch:hit(payload(start,75,19,pv))}).analyse(start);
    assert.equal(result.id,'lichess');assert(result.moves.includes('e1g1'));
    assert(!result.moves.includes('e1h1'));assert.equal(pool.workers.length,0);
    const castles='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    for(const moves of ['e1a1 e8h8','e1h1 e8a8']) {
      const value=await A.create({...pool,fetch:hit(payload(castles,15,0,moves))}).analyse(castles);
      assert.equal(value.id,'lichess');assert(!/[ea]1[ah]1/.test(value.moves));
    }
  });
  await test('A cloud miss exhausts four different failures before succeeding on the fifth',async()=>{
    const pool=fakeWorkers({
      'stockfish-wasm':{throw:true},tomitank:{error:true},lozza:{depth:7},
      'stockfish-asm':{bound:'lowerbound'}
    });
    const service=A.create({...pool,fetch:miss});
    const value=await service.analyse(start);
    assert.equal(value.id,'garbochess');assert.equal(value.depth,8);
    assert(pool.workers.every(w=>w.terminated));
    assert(pool.workers.every(w=>w.commands.includes('go depth 8')));
  });
  for(const data of [payload(start,7),{depth:20,pvs:[{cp:null,moves:'e2e4'}]},
    payload(start,20,50,'e2e5'),payload(black),{depth:20,pvs:[]}]) {
    await test('Malformed, shallow, illegal, or mismatched cloud data falls back',async()=>{
      const pool=fakeWorkers();const value=await A.create({...pool,fetch:hit(data)}).analyse(start);
      assert.equal(value.id,'stockfish-wasm');assert.equal(value.depth,8);
    });
  }
  for(const invalid of [
    {depth:7},{bound:'lowerbound'},{bound:'upperbound'},
    {best:'d2d4'},{move:'e2e5'},
    {info:'info depth 8 score cp 12 pv e2e4 e7e9'}
  ]) {
    await test('Never publishes incomplete, bounded, or invalid engine analysis',async()=>{
      const plans=Object.fromEntries(A.engines.map(e=>[e.id,invalid]));
      const pool=fakeWorkers(plans);
      await assert.rejects(A.create({...pool,fetch:miss}).analyse(start),/unavailable/);
      assert.equal(pool.workers.length,5);assert(pool.workers.every(w=>w.terminated));
    });
  }
  for(const [score,field,wanted] of [['cp 175','cp',-175],['mate 3','mate',-3],['mate -2','mate',2]]) {
    await test('Black-to-move UCI '+score+' is converted to White perspective',async()=>{
      const pool=fakeWorkers({'stockfish-wasm':{score,move:'e7e5'}});
      const value=await A.create({...pool,fetch:miss}).analyse(black);
      assert.equal(value[field],wanted);
    });
  }
  await test('Cache distinguishes halfmove clocks and sends branch history to the engine',async()=>{
    const pool=fakeWorkers();let requests=0;
    const service=A.create({...pool,fetch:async()=>{requests++;return miss()}});
    await service.analyse(start,{position:'position fen '+start});
    const late=start.replace('0 1','98 42');
    await service.analyse(late,{position:'position fen '+late});
    assert.equal(pool.workers.length,2);assert.equal(requests,2);
    const position='position fen '+start+' moves e2e4';
    const pool2=fakeWorkers({'stockfish-wasm':{move:'e7e5'}});
    await A.create({...pool2,fetch:miss}).analyse(black,{position});
    assert(pool2.workers[0].commands.includes(position));
  });
  await test('Lichess 429 honours at least 60 seconds of cooldown and then retries',async()=>{
    let clock=100000,requests=0;
    const pool=fakeWorkers();
    const service=A.create({...pool,now:()=>clock,fetch:async()=>{
      requests++;return new Response('',{status:429,headers:{'Retry-After':'2'}});
    }});
    await service.analyse(start);
    clock+=59000;await service.analyse(start);
    assert.equal(requests,1);
    clock+=1001;await service.analyse(start);
    assert.equal(requests,2);
  });
  await test('Cloud timeouts start a genuine fallback instead of a heuristic estimate',async()=>{
    const pool=fakeWorkers();
    const value=await A.create({...pool,cloudTimeout:5,fetch:(_url,{signal})=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')));
    })}).analyse(start);
    assert.equal(value.depth,8);
  });
  await test('Worker startup timeout tries the next engine and terminates the failed worker',async()=>{
    const pool=fakeWorkers({'stockfish-wasm':{hang:true}});
    const value=await A.create({...pool,fetch:miss,startupTimeout:5}).analyse(start);
    assert.equal(value.id,'tomitank');assert(pool.workers.every(w=>w.terminated));
  });
  await test('Abort stops an active worker and never starts another backup',async()=>{
    const pool=fakeWorkers({'stockfish-wasm':{hang:true}}),controller=new AbortController();
    const pending=A.create({...pool,fetch:miss}).analyse(start,{signal:controller.signal});
    await new Promise(resolve=>setTimeout(resolve,0));controller.abort();
    await assert.rejects(pending,{name:'AbortError'});
    assert.equal(pool.workers.length,1);assert(pool.workers[0].terminated);
  });
  await test('Cancelled cloud lookups are serialized; only the current board falls back',async()=>{
    let active=0,maxActive=0,started;
    const firstStarted=new Promise(resolve=>{started=resolve});
    const pool=fakeWorkers();let count=0;
    const service=A.create({...pool,fetch:(_url,{signal})=>{
      active++;count++;maxActive=Math.max(maxActive,active);started();
      if(count>1){active--;return miss()}
      return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{
        active--;reject(new DOMException('cancel','AbortError'));
      }));
    }});
    const controller=new AbortController();
    const first=service.analyse(start,{signal:controller.signal});
    await firstStarted;const second=service.analyse(start);controller.abort();
    await assert.rejects(first,{name:'AbortError'});assert.equal((await second).depth,8);
    assert.equal(maxActive,1);assert.equal(pool.workers.length,1);
  });
  console.log(`${checks} chess analysis checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1});
