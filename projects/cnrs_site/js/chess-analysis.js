/* Lichess first, then real open-source engines. No heuristic estimate.
   Worker scripts are isolated programs; source and licenses: notices/chess-engines.html. */
(function(g){
  'use strict';
  const MIN_DEPTH=8;
  const ENGINES=Object.freeze([
    {id:'stockfish-wasm',name:'Stockfish 19 Lite',file:'lib/chess/stockfish-19-lite-single.js'},
    {id:'tomitank',name:'tomitankChess 7',file:'lib/chess/tomitank-7.0.js'},
    {id:'lozza',name:'Lozza 11',file:'lib/chess/lozza-11.0.js'},
    {id:'stockfish-asm',name:'Stockfish 19 ASM',file:'lib/chess/stockfish-19-asm.js'},
    {id:'garbochess',name:'Garbochess-JS',file:'lib/chess/garbo-uci.js'}
  ].map(Object.freeze));
  const aborted=()=>new DOMException('Analysis cancelled','AbortError');
  function checkAbort(signal){if(signal?.aborted) throw aborted();}

  function create(options={}) {
    const request=options.fetch||g.fetch.bind(g);
    const makeWorker=options.makeWorker||(file=>new Worker(new URL(file,document.baseURI)));
    const engines=options.engines||ENGINES;
    const now=options.now||Date.now;
    const cloudTimeout=options.cloudTimeout??4500;
    const startupTimeout=options.startupTimeout??15000;
    const searchTimeout=options.searchTimeout??30000;
    const cloudCache=new Map(), engineCache=new Map();
    let coolingUntil=0, cloudQueue=Promise.resolve();

    function remember(cache,key,value) {
      if(cache.size>=96) cache.delete(cache.keys().next().value);
      cache.set(key,value);
      return value;
    }

    // Require a legal PV and a finite, exact score. All scores favour White.
    function validate(value,fen) {
      if(!value||!Number.isInteger(value.depth)||value.depth<MIN_DEPTH) return null;
      if(!Number.isFinite(value.cp)&&!Number.isInteger(value.mate)) return null;
      let state=g.Rules.read(fen);
      const moves=String(value.moves||'').trim().split(/\s+/).filter(Boolean);
      if(!moves.length) return null;
      for(let i=0;i<moves.length;i++) {
        let uci=moves[i];
        if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
        // Lichess cloud PVs use king-to-rook notation for standard castling.
        // Convert only a king on its home square targeting its own rook.
        const from=g.Rules.sq(uci.slice(0,2)),to=g.Rules.sq(uci.slice(2,4));
        const castles={e1h1:'e1g1',e1a1:'e1c1',e8h8:'e8g8',e8a8:'e8c8'};
        if(castles[uci]&&state.b[from]===(state.t==='w'?'K':'k')&&state.b[to]===(state.t==='w'?'R':'r')) uci=castles[uci];
        const move=g.Rules.parse(state,uci);
        if(!move) return null;
        moves[i]=uci;
        state=g.Rules.next(state,move);
      }
      return {...value,moves:moves.join(' ')};
    }

    async function cloud(fen,signal) {
      if(cloudCache.has(fen)) return cloudCache.get(fen);
      // Serialize requests, including when a board move cancels a pending lookup.
      const previous=cloudQueue;
      let release;
      cloudQueue=new Promise(resolve=>{release=resolve});
      await previous;
      let timer,controller;
      const stop=()=>controller?.abort();
      try {
        checkAbort(signal);
        if(now()<coolingUntil) return null;
        controller=new AbortController();
        signal?.addEventListener('abort',stop,{once:true});
        timer=setTimeout(stop,cloudTimeout);
        const response=await request('https://lichess.org/api/cloud-eval?fen='+encodeURIComponent(fen)+'&multiPv=1',{
          signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'
        });
        checkAbort(signal);
        if(response.status===429) {
          const retry=response.headers.get('Retry-After');
          const delay=Number(retry)*1000 || Date.parse(retry)-now() || 60000;
          coolingUntil=now()+Math.max(60000,delay);
        }
        if(!response.ok) return null;
        const data=await response.json();
        checkAbort(signal);
        if(data.fen && data.fen.split(' ').slice(0,4).join(' ')!==fen.split(' ').slice(0,4).join(' ')) return null;
        const pv=data.pvs?.[0];
        const result=validate({...pv,depth:data.depth},fen);
        return result ? remember(cloudCache,fen,{...result,provider:'Lichess cloud',id:'lichess'}) : null;
      } catch(error) {
        checkAbort(signal);
        return null;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort',stop);
        release();
      }
    }

    function runEngine(engine,fen,{signal,onStatus,position}) {
      return new Promise((resolve,reject)=>{
        let worker,timer,phase='uci',candidate=null,settled=false;
        const supported=new Set();
        function finish(error,result) {
          if(settled) return;
          settled=true;
          clearTimeout(timer);
          signal?.removeEventListener('abort',cancel);
          if(worker) {worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate()}
          error ? reject(error) : resolve(result);
        }
        const cancel=()=>finish(aborted());
        function send(command){worker.postMessage(command)}
        function armTimeout(ms){clearTimeout(timer);timer=setTimeout(()=>finish(Error('Engine timeout')),ms)}
        function line(text) {
          if(settled) return;
          const option=text.match(/^option name (.+?) type /);
          if(option) supported.add(option[1]);
          if(text==='uciok'&&phase==='uci') {
            phase='ready';
            if(supported.has('Hash')) send('setoption name Hash value 16');
            if(supported.has('MultiPV')) send('setoption name MultiPV value 1');
            send('ucinewgame');send('isready');
          } else if(text==='readyok'&&phase==='ready') {
            phase='search';
            armTimeout(searchTimeout);
            send(position||'position fen '+fen);
            send('go depth '+MIN_DEPTH);
          } else if(phase==='search'&&text.startsWith('info ')) {
            const depth=Number(text.match(/\bdepth (\d+)/)?.[1]);
            if(Number.isInteger(depth)) onStatus?.(`${engine.name} · searching depth ${MIN_DEPTH}${depth<MIN_DEPTH?' (currently depth '+depth+')':''}…`);
            if(depth<MIN_DEPTH||/\b(?:lowerbound|upperbound)\b/.test(text)) return;
            const multipv=text.match(/\bmultipv (\d+)/);
            if(multipv&&multipv[1]!=='1') return;
            const score=text.match(/\bscore (cp|mate) (-?\d+)(?:\s|$)/);
            if(!score) return;
            const sign=fen.split(' ')[1]==='w'?1:-1;
            const value=validate({depth,[score[1]]:Number(score[2])*sign,moves:text.match(/\bpv (.+)$/)?.[1]},fen);
            if(value) candidate=value;
          } else if(phase==='search'&&text.startsWith('bestmove ')) {
            // A completed search must agree with the scored principal variation.
            if(!candidate||text.split(/\s+/)[1]!==candidate.moves.split(' ')[0]) return finish(Error('No exact depth-8 result'));
            finish(null,{...candidate,provider:engine.name,id:engine.id});
          }
        }
        try {
          checkAbort(signal);
          signal?.addEventListener('abort',cancel,{once:true});
          worker=makeWorker(engine.file);
          worker.onmessage=event=>{
            if(typeof event.data!=='string') return;
            try {for(const message of event.data.split(/\r?\n/)) line(message.trim())}
            catch(error){finish(error)}
          };
          worker.onerror=event=>{event.preventDefault?.();finish(Error('Engine failed to load or run'))};
          worker.onmessageerror=()=>finish(Error('Invalid engine response'));
          armTimeout(startupTimeout);
          send('uci');
        } catch(error){finish(error)}
      });
    }

    async function analyse(fen,{signal,onStatus,position}={}) {
      checkAbort(signal);
      onStatus?.('Checking Lichess…');
      const remote=await cloud(fen,signal);
      checkAbort(signal);
      if(remote) return remote;
      const key=position||fen;
      if(engineCache.has(key)) return engineCache.get(key);
      for(const engine of engines) {
        checkAbort(signal);
        onStatus?.(`${engine.name} · loading live engine…`);
        try {
          const result=await runEngine(engine,fen,{signal,onStatus,position});
          checkAbort(signal);
          return remember(engineCache,key,result);
        } catch(error){checkAbort(signal)}
      }
      throw Error('Analysis unavailable: Lichess and all five engine backups are unavailable.');
    }
    return {analyse};
  }
  g.ChessAnalysis=Object.freeze({create,engines:ENGINES,minDepth:MIN_DEPTH});
})(globalThis);
