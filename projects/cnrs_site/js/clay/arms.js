/* Header choreography: letter assembly, lantern-rope lifting, and marionette-rail support.
   iiwa motion is solved against the supplied URDF offline; see iiwa-motion.js.
   This is not a hardware trajectory or a collision-certified robot motion. */
window.ClayArms=(()=>{
 const cache=new Map();
 async function model(path){
  if(cache.has(path))return cache.get(path);
  const job=(async()=>{
   let buffer;
   if(window.BIN_ASSETS?.[path]){
    const raw=Uint8Array.from(atob(BIN_ASSETS[path]),c=>c.charCodeAt(0));
    buffer=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   }else{const r=await fetch(window.siteAsset?siteAsset(path):path);if(!r.ok)throw Error('Model unavailable: '+path);buffer=await r.arrayBuffer()}
   const view=new DataView(buffer),length=view.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length))),offset=28+length;
   const types={5126:Float32Array,5123:Uint16Array,5125:Uint32Array};
   function attr(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];return new THREE.BufferAttribute(new types[a.componentType](buffer,offset+(v.byteOffset||0)+(a.byteOffset||0),a.count*n),n)}
   const geometry=j.meshes.map(m=>{const p=m.primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',attr(p.attributes.POSITION));if(p.indices!=null)g.setIndex(attr(p.indices));if(p.attributes.NORMAL!=null)g.setAttribute('normal',attr(p.attributes.NORMAL));else g.computeVertexNormals();g.userData.shared=true;return g});
   return {j,geometry};
  })().catch(e=>{cache.delete(path);throw e});cache.set(path,job);return job;
 }
 function build(e){
  const {T,V,PI:P,mat,grp,M,box,bevel,cyl,clamp,ease,units,root,actions,theme,token,request}=e,stamp=token();
  const steel=mat('#bec6c6',.34,.53),black=mat('#303b3c',.42,.22),ivory=mat('#e4e1d7',.5,.12),dark=mat('#59686a',.48,.22),orange=mat('#d15e22',.46,.14);
  const hallo=theme==='halloween'&&e.halloweenTargets;
  const d=hallo?e.halloweenTargets[0]:units[0],letter=hallo?e.halloweenTargets[1]:units[units.length-1];if(!d||!letter)return;
  const zOff=hallo?d.z:0;
  // Lowering completes at 71% of the assembly; final E follows D by 650 ms.
  // The resting middle glyphs catch the same cold wave between the two placements.
  const firstContact=8.8*.71,lastContact=firstContact+.65;
  units.forEach((u,i)=>u.groundedAt=firstContact+(lastContact-firstContact)*i/(units.length-1));
  function tree(parent,asset,palette){const {j,geometry}=asset;
   const nodes=j.nodes.map(n=>{const g=grp(parent);g.name=n.name||'';if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(g.position,g.quaternion,g.scale);else{if(n.translation)g.position.fromArray(n.translation);if(n.rotation)g.quaternion.fromArray(n.rotation);if(n.scale)g.scale.fromArray(n.scale)}if(n.mesh!=null)M(g,geometry[n.mesh],palette(n));return g});
   j.nodes.forEach((n,i)=>(n.children||[]).forEach(k=>nodes[i].add(nodes[k])));return nodes;
  }
  function jaws(parent){const g=grp(parent);bevel(g,0,-.055,0,.119,.118,.14,.018,black);bevel(g,0,-.139,0,.168,.072,.64,.014,steel);
   const slides=[-1,1].map(k=>{const part=grp(g);box(part,0,-.22,0,.095,.165,.051,steel);bevel(part,0,-.302,-k*.006,.104,.091,.044,.009,black);box(part,0,-.143,0,.15,.062,.088,dark);return part});
   const contact=grp(g,0,-.302,0);contact.name='Robot grip contact';return {g,contact,set:(open,depth)=>slides.forEach((o,i)=>o.position.z=(i?1:-1)*(depth+.028+open*.12))};
  }
  const depth=hallo?.225:.204*1.21;
  function path(u){const a=ease((u-.12)/.40),b=ease((u-.52)/.19);return {a,b,ret:ease((u-.79)/.18),ap:ease((u-.71)/.074)}}
  let gofaLinks=null,gofaGrip=null,gofaIK=null,kukaIK=null;const left=grp(root,d.x-(hallo?.97:1.05),.04,-.82+zOff);cyl(left,0,-.007,0,.265,.305,.06,black);const gofa=grp(left);gofa.name='ABB GoFa / opening D';gofa.scale.setScalar(2.55);
  e.ready.push(model('models/letterhead/abb-gofa-crb15000.glb').then(asset=>{if(token()!==stamp)return;const mats=[dark,steel,steel,dark,ivory,dark,steel],nodes=tree(gofa,asset,n=>mats[n.mesh]||steel);gofaLinks=nodes.filter(n=>/^link_\d$/.test(n.name));const tool=nodes.find(n=>n.name==='tool0');if(!tool)throw Error('GoFa tool0 frame is missing');const g=grp(tool);g.rotation.x=-P/2;g.scale.setScalar(1/2.55);gofaGrip=jaws(g);gofaIK=ClayRigIK.create({root:gofa,joints:gofaLinks,axes:[V(0,0,1),V(0,1,0),V(0,1,0),V(1,0,0),V(0,1,0),V(1,0,0)],contact:gofaGrip.contact,orientation:gofaGrip.g,seed:ClayMotion[ClayMotion.length-1]});request()}).catch(err=>{console.warn('GoFa assembly:',err);throw err}));
  const m=IiwaAssembly,base=grp(root,letter.x+m.base[0],m.base[1],m.base[2]+zOff);base.name='KUKA iiwa 7 / final E';cyl(base,0,-.012,0,.29,.32,.035,black);const kuka=grp(base);kuka.rotation.x=-P/2;kuka.scale.setScalar(m.scale);let kukaLinks=null,kukaGrip=null;
  e.ready.push(model('models/letterhead/kuka-iiwa7.glb').then(asset=>{if(token()!==stamp)return;const nodes=tree(kuka,asset,n=>/link_[07]_visual/.test(n.name)?black:orange);kukaLinks=m.joints.map(j=>nodes.find(n=>n.name===j.child));const tool=nodes.find(n=>n.name==='iiwa_link_ee');if(kukaLinks.some(n=>!n)||!tool)throw Error('iiwa URDF frames are missing');const g=grp(tool);g.rotation.x=-P/2;g.scale.setScalar(1/m.scale);kukaGrip=jaws(g);kukaIK=ClayRigIK.create({root:kuka,joints:kukaLinks,axes:m.joints.map(()=>V(0,0,1)),contact:kukaGrip.contact,orientation:kukaGrip.g,seed:m.frames[m.frames.length-1].q,limits:m.joints.map(j=>[j.lower,j.upper])});request()}).catch(err=>{console.warn('iiwa assembly:',err);throw err}));
  const ax=[V(0,0,1),V(0,1,0),V(0,1,0),V(1,0,0),V(0,1,0),V(1,0,0)],zaxis=V(0,0,1);
  actions.push(t=>{
   function carry(ik,grip,index,from,blend=1){
    const rig=e.carriedRig;if(!ik||!grip||!rig)return;if(rig.update)rig.update(t);
    rig.object.updateWorldMatrix(true,false);
    const target=rig.grips[index].clone().applyMatrix4(rig.object.matrixWorld);
    const rotation=new T.Quaternion().setFromAxisAngle(V(0,0,1),index?-P/2:P/2);
    const solution=ik.solve(target,rotation);
    ik.apply(solution.map((q,i)=>from[i]+(q-from[i])*blend));
    grip.set(theme==='puppets'?0:1-ease((t-10.75)/.5),rig.gripDepth);
   }
   if(theme==='puppets'){
    d.assemblyLocked=letter.assemblyLocked=false;
    d.puppetHold=letter.puppetHold=null;
    carry(gofaIK,gofaGrip,0,ClayMotion[ClayMotion.length-1]);
    carry(kukaIK,kukaGrip,1,m.frames[m.frames.length-1].q);
    return;
   }
   const u=clamp(t/8.8),p=path(u),dy=.44*(1-p.b)+.16*Math.sin(P*p.a);d.g.position.set(d.x-.26*(1-p.a),.003+dy,zOff-.28*(1-p.a));if(!hallo)d.assemblyLocked=u<.79;else if(d.shadow){d.shadow.position.x=d.g.position.x;d.shadow.position.z=d.g.position.z;d.shadow.material.opacity=.28/(1+dy*4);d.shadow.scale.setScalar(1+dy*.25)}
   if(gofaLinks){const f=u*(ClayMotion.length-1),i=Math.floor(f),j=Math.min(i+1,ClayMotion.length-1);gofaLinks.forEach((n,k)=>n.quaternion.setFromAxisAngle(ax[k],ClayMotion[i][k]+(ClayMotion[j][k]-ClayMotion[i][k])*(f-i)));gofaGrip.set(p.ap,depth)}
   const ku=clamp((t-.65)/8.8),kp=path(ku),ky=.44*(1-kp.b)+.16*Math.sin(P*kp.a);letter.g.position.set(letter.x+.17*(1-kp.a),.003+ky,zOff-.28*(1-kp.a));if(!hallo)letter.assemblyLocked=ku<.79;else if(letter.shadow){letter.shadow.position.x=letter.g.position.x;letter.shadow.position.z=letter.g.position.z;letter.shadow.material.opacity=.28/(1+ky*4);letter.shadow.scale.setScalar(1+ky*.25)}
   if(kukaLinks){const frame=clamp(t/10)*(m.frames.length-1),i=Math.floor(frame),j=Math.min(i+1,m.frames.length-1);kukaLinks.forEach((n,k)=>n.quaternion.setFromAxisAngle(zaxis,m.frames[i].q[k]+(m.frames[j].q[k]-m.frames[i].q[k])*(frame-i)));kukaGrip.set(kp.ap,depth)}
   if(theme==='diwali'&&t>=9.8){
    const blend=ease((t-9.8)/1.5);
    carry(gofaIK,gofaGrip,0,ClayMotion[ClayMotion.length-1],blend);
    carry(kukaIK,kukaGrip,1,m.frames[m.frames.length-1].q,blend);
   }
  });
 }
 return {build};
})();
