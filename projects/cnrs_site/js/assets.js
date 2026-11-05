/* Load a feature once, when its view needs it. Keep startup independent of WebGL. */
window.SiteAssets=(()=>{
 'use strict';
 const version='599b8bc1c4b6',jobs=new Map();
 function script(path){
  if(!jobs.has(path))jobs.set(path,new Promise((resolve,reject)=>{
   const tag=document.createElement('script');tag.src=path+'?v='+version;tag.async=true;
   tag.onload=()=>resolve();tag.onerror=()=>{tag.remove();jobs.delete(path);reject(Error('Unable to load '+path))};
   document.head.append(tag);
  }));
  return jobs.get(path);
 }
 let letteringJob,chessJob;
 function lettering(theme){
  letteringJob??=script('lib/three.js').then(()=>Promise.all([
   'forms','motion','props','iiwa-motion','rig-ik','arms','atelier','jolt-config','jolt-rig','play','scarf-jolt','seasonal','studio'
  ].map(name=>script('js/clay/'+name+'.js')))).catch(error=>{letteringJob=null;throw error});
  return letteringJob.then(()=>theme==='halloween'?script('js/clay/carving.js'):theme==='christmas'?script('js/clay/caps.js'):undefined);
 }
 function chess(){
  chessJob??=Promise.all(['games','piecepaths','rules'].map(name=>script('js/'+name+'.js')))
   .then(()=>script('js/chess-analysis.js')).then(()=>script('js/chess.js'))
   .catch(error=>{chessJob=null;throw error});
  return chessJob;
 }
 function afterPaint(work){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const run=()=>resolve(work());
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,40);
 })))}
 function url(path){return /^(?:data:|blob:|https?:)/.test(path)?path:path+(path.includes('?')?'&':'?')+'v='+version}
 return {version,url,script,lettering,chess,afterPaint};
})();
