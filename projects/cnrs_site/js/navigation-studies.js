/* Interactive comparison UI; the main site uses the model library directly. */

(()=>{
 'use strict';const T=THREE,library=NavigationModels,entries=new Map(),choices={},previewCanvases=new Map(),dirty=new Set();let renderer,queued=false,allDirty=true;
 const stages=document.getElementById('studies'),nav=document.querySelector('.navigation-preview nav');
 function paint(entry,canvas){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  library.frame(entry,w,h);const c=entry.camera;
  renderer.setSize(canvas.width,canvas.height,false);renderer.setClearColor(0,0);renderer.render(entry.s,c);
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderer.domElement,0,0);
 }
 function render(){queued=false;if(!renderer)return;const changed=allDirty?new Set(entries.values()):new Set(dirty);changed.forEach(e=>e.canvases.forEach(c=>paint(e,c)));previewCanvases.forEach((c,category)=>{const e=entries.get(choices[category]);if(changed.has(e))paint(e,c)});dirty.clear();allDirty=false;document.body.dataset.ready='true'}
 function request(entry){if(entry?.s)dirty.add(entry);else allDirty=true;if(!queued){queued=true;requestAnimationFrame(render)}}
 function choose(category,id){
  choices[category]=id;
  document.querySelectorAll(`[data-category="${category}"] .choose`).forEach(b=>{const active=b.dataset.model===id;b.setAttribute('aria-pressed',String(active));b.textContent=active?'Selected':'Select';b.closest('.model').classList.toggle('selected',active)});
  document.getElementById('selection').textContent=library.categories.map(c=>c.title+' '+(choices[c.id]||c.id+'-'+(c.default||'a')).split('-')[1].toUpperCase()).join(' · ');request(entries.get(id));
 }
 function bind(canvas,entry){
  let drag=null;canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:entry.angle,tilt:entry.tilt,active:false};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.active&&Math.hypot(dx,dy)<4)return;if(!drag.active){drag.active=true;canvas.setPointerCapture(e.pointerId)}library.setView(entry,drag.angle+dx*.012,drag.tilt+dy*.008);e.preventDefault();request(entry)});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){library.setView(entry,entry.angle+(e.key==='ArrowLeft'?-1:1)*.15,entry.tilt);e.preventDefault();request(entry)}else if(e.key.toLowerCase()==='r'){library.setView(entry,library.orbit.baseYaw,0);request(entry)}});
 }
 for(const category of library.categories){
  const section=document.createElement('section');section.className='category';section.id=category.id+'-models';section.dataset.category=category.id;
  const heading=document.createElement('h2');heading.textContent=category.title;section.append(heading);const description=document.createElement('p');description.textContent=category.description;section.append(description);
  for(const [code,title] of category.options){
   const id=category.id+'-'+code,entry=library.scene(id);entries.set(id,entry);
   const card=document.createElement('article');card.className='model';
   const canvas=document.createElement('canvas');canvas.className='scene';canvas.tabIndex=0;canvas.setAttribute('aria-label',title+' — drag to rotate');canvas.dataset.model=id;entry.canvases.push(canvas);card.append(canvas);bind(canvas,entry);
   const caption=document.createElement('div');caption.className='model-caption';const label=document.createElement('div');label.className='model-label';const badge=document.createElement('span');badge.className='code';badge.textContent=code.toUpperCase();label.append(badge);const h=document.createElement('h3');h.textContent=title;label.append(h);caption.append(label);
   const button=document.createElement('button');button.className='choose';button.type='button';button.dataset.model=id;button.setAttribute('aria-label','Select '+category.title+' '+code.toUpperCase()+': '+title);button.onclick=()=>choose(category.id,id);caption.append(button);card.append(caption);section.append(card);
  }
  stages.append(section);
  const a=document.createElement('a');a.href='#'+section.id;const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');a.append(canvas,category.title);nav.append(a);previewCanvases.set(category.id,canvas);choose(category.id,category.id+'-'+(category.default||'a'));
 }
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.physicallyCorrectLights=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;request()}catch(error){document.getElementById('fallback').hidden=false;document.body.dataset.ready='fallback'}
 new ResizeObserver(request).observe(document.querySelector('main'));
 window.NavigationStudies={choose,entries,choices,request,render};
})();
