/* Shared lightweight navigation sculptures for the main menu and comparison page. */
window.NavigationModels=(()=>{
 'use strict';const T=THREE,PI=Math.PI;
 const colours={green:'#426550',darkGreen:'#284b3b',cream:'#eee7d7',paper:'#f7f1e5',slate:'#46545a',ink:'#60716c',ochre:'#b59959',wood:'#a98b68',skin:'#c8a27f',blue:'#667d87',red:'#996959'};
 const colour=x=>new T.Color(x).convertSRGBToLinear();
 const material=(hex,rough=.74,metal=.025)=>new T.MeshStandardMaterial({color:colour(colours[hex]||hex),roughness:rough,metalness:metal});
 const mats=Object.fromEntries(Object.keys(colours).map(k=>[k,material(k)]));
 function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent?.add(g);return g}
 function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,typeof mat==='string'?mats[mat]:mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 const box=(p,x,y,z,w,h,d,m)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
 function round(p,x,y,z,w,h,d,r,m){
  r=Math.min(r,w*.15,h*.15,d*.45);const s=new T.Shape();s.moveTo(-w/2+r,-h/2+r);s.lineTo(w/2-r,-h/2+r);s.lineTo(w/2-r,h/2-r);s.lineTo(-w/2+r,h/2-r);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1});g.translate(0,0,-(d-2*r)/2);return mesh(p,g,m,x,y,z);
 }
 const ell=(p,x,y,z,rx,ry,rz,m)=>{const o=mesh(p,new T.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(rx,ry,rz);return o};
 const cyl=(p,x,y,z,rt,rb,h,m,n=28)=>mesh(p,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);
 function rod(p,a,b,r,m){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const o=cyl(p,0,0,0,r,r,d.length(),m,12);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o}
 function curve(p,points,r,m){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q))),Math.max(12,points.length*5),r,6,false),m)}
 function texture(type){
  const c=document.createElement('canvas');c.width=384;c.height=512;const q=c.getContext('2d');q.fillStyle=colours.paper;q.fillRect(0,0,384,512);
  if(type==='plan'){
   q.fillStyle='#e4ebe7';q.fillRect(0,0,384,512);q.strokeStyle='#b8c6c2';q.lineWidth=.8;
   for(let x=16;x<384;x+=24){q.beginPath();q.moveTo(x,50);q.lineTo(x,496);q.stroke()}
   for(let y=64;y<512;y+=24){q.beginPath();q.moveTo(16,y);q.lineTo(368,y);q.stroke()}
   q.fillStyle='#526c70';q.font='bold 21px Georgia';q.fillText('PROJECT 01',31,39);q.strokeStyle='#526c70';q.lineWidth=5;q.strokeRect(54,102,274,286);q.strokeRect(70,118,242,254);
   q.beginPath();q.moveTo(184,118);q.lineTo(184,276);q.lineTo(312,276);q.moveTo(70,278);q.lineTo(122,278);q.moveTo(70,204);q.lineTo(184,204);q.stroke();
   q.lineWidth=2;q.beginPath();q.moveTo(40,409);q.lineTo(340,409);q.moveTo(40,403);q.lineTo(40,416);q.moveTo(340,403);q.lineTo(340,416);q.stroke();
  }else{
   q.fillStyle='#54655b';q.font='bold 25px Georgia';q.textAlign='center';q.fillText(type==='scroll'?'Manuscript':'Research notes',192,58);q.font='italic 13px Georgia';q.fillText('Methods · results · discussion',192,84);q.strokeStyle='#9da59b';q.lineWidth=2;
   for(let j=0;j<13;j++){const y=115+j*21;q.beginPath();q.moveTo(38,y);q.lineTo(j%4===3?273:346,y);q.stroke()}
   q.strokeStyle='#849488';q.lineWidth=2;q.strokeRect(40,402,128,72);q.beginPath();q.moveTo(48,460);q.lineTo(71,439);q.lineTo(98,448);q.lineTo(124,418);q.lineTo(156,428);q.stroke();
   for(let j=0;j<4;j++){q.beginPath();q.moveTo(194,410+j*18);q.lineTo(343,410+j*18);q.stroke()}
  }
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;
 }
 const textures={};
 const getTexture=type=>textures[type]??=(texture(type));
 function paper(parent,w,h,type='manuscript',curl=.08){
  const p=group(parent),nx=20,ny=26,positions=[],uv=[],index=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
   const u=x/nx,v=y/ny,corner=Math.max(0,(u-.64)/.36)*Math.max(0,(v-.68)/.32);
   positions.push((u-.5)*w,v*h,curl*(Math.sin(v*PI)*.18+corner*corner));uv.push(u,v);
   if(x&&y){const n=y*(nx+1)+x;index.push(n-nx-2,n-1,n,n-nx-2,n,n-nx-1)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  const m=material('paper');m.map=getTexture(type);m.side=T.DoubleSide;mesh(p,g,m);
  const back=mesh(p,g.clone(),'cream',0,0,-.009);back.material=mats.cream;
  return p;
 }
 function letterD(parent,scale=1,mat='green'){
  const s=new T.Shape();s.moveTo(-.43,0);s.lineTo(-.43,1.22);s.lineTo(.02,1.22);s.bezierCurveTo(.65,1.22,.69,0,.02,0);s.closePath();
  const hole=new T.Path();hole.moveTo(-.19,.24);hole.lineTo(.005,.24);hole.bezierCurveTo(.33,.24,.35,.98,.005,.98);hole.lineTo(-.19,.98);hole.closePath();s.holes.push(hole);
  const g=new T.ExtrudeGeometry(s,{depth:.22,bevelEnabled:true,bevelSize:.038,bevelThickness:.035,bevelSegments:4,curveSegments:32});g.translate(0,0,-.11);const m=mesh(parent,g,mat);m.scale.setScalar(scale);return m;
 }
 function book(parent,w=.95){
  const b=group(parent),half=w/2;
  for(const side of [-1,1]){
   const page=group(b,side*.012,.04,0);page.rotation.z=side*.13;
   round(page,side*half/2,.01,0,half,.08,.67,.016,'green');
   for(let j=0;j<4;j++)round(page,side*half/2,.06+j*.012,0,half*.94,.014,.62,.004,'paper');
   const leaf=paper(page,half*.92,.60,'manuscript',.014);leaf.rotation.x=-PI/2;leaf.position.set(side*half/2,.11,.30);
  }
  curve(b,[[0,.01,-.34],[0,.035,0],[0,.01,.34]],.022,'ochre');return b;
 }
 function helmet(parent,scale=1){
  const h=group(parent);h.scale.setScalar(scale);
  mesh(h,new T.SphereGeometry(.245,28,16,0,PI*2,0,PI/2),'ochre',0,.025,0);
  ell(h,0,.025,.035,.29,.025,.30,'ochre');
  for(const x of [-.09,0,.09])curve(h,[[x,.045,.21],[x,.20,.13],[x,.254,-.015],[x,.17,-.18]],x===0?.014:.009,'ochre');
  return h;
 }
 const builders={
  'home-a':p=>letterD(p),
  'home-b':p=>{
   const tile=group(p,0,.68,0);const disc=cyl(tile,0,0,0,.66,.66,.15,'darkGreen',64);disc.rotation.x=PI/2;
   const edge=mesh(tile,new T.TorusGeometry(.606,.009,6,64),'ochre',0,0,.084);letterD(tile,.72,'cream').position.set(.035,-.44,.11);
  },
  'home-c':p=>{
   const dial=group(p,0,.53,0);dial.rotation.x=-.30;
   const rim=cyl(dial,0,0,0,.61,.61,.12,'green',64);rim.rotation.x=PI/2;
   const face=cyl(dial,0,0,.075,.535,.535,.02,'paper',64);face.rotation.x=PI/2;
   for(let i=0;i<12;i++){const a=i*PI/6,len=i%3===0?.075:.035;rod(dial,[Math.sin(a)*.43,Math.cos(a)*.43,.096],[Math.sin(a)*(.43+len),Math.cos(a)*(.43+len),.096],.006,'ink')}
   const needle=new T.Shape();needle.moveTo(0,.42);needle.lineTo(.095,-.16);needle.lineTo(0,-.09);needle.lineTo(-.095,-.16);needle.closePath();
   mesh(dial,new T.ExtrudeGeometry(needle,{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008}),'ochre',0,0,.11);ell(dial,0,0,.15,.044,.044,.025,'slate');
  },
  'publications-a':p=>{
   for(let i=0;i<3;i++){const sheet=paper(p,.88,1.22,'manuscript',i===2?.16:.03);sheet.position.set((i-1)*.045,0,i*.035);sheet.rotation.z=(i-1)*-.035}
   round(p,-.25,1.215,.13,.24,.075,.09,.013,'slate');
  },
  'publications-b':p=>{
   const sheet=paper(p,.91,1.12,'scroll',.03);sheet.position.y=.12;
   for(const y of [.10,1.25]){const roll=cyl(p,0,y,.015,.065,.065,1.06,'cream',36);roll.rotation.z=PI/2;for(const side of [-1,1]){const ring=mesh(p,new T.TorusGeometry(.045,.007,5,24),'ochre',side*.538,y,.015);ring.rotation.y=PI/2}}
  },
  'publications-c':p=>{const b=book(p,1.24);b.rotation.x=.46;b.position.y=.10;const ribbon=round(p,.18,.12,.31,.06,.012,.25,.003,'ochre');ribbon.rotation.x=-.12},
  'projects-a':p=>{
   // A quiet sculptural bust, with the silhouette of a hard hat and a held plan.
   round(p,0,.39,0,.72,.64,.34,.055,'slate');ell(p,0,.67,0,.38,.20,.18,'green');
   cyl(p,0,.80,0,.095,.11,.18,'skin',20);ell(p,0,1.015,.005,.18,.225,.165,'skin');
   ell(p,0,1.008,.166,.035,.043,.035,'skin');helmet(p).position.set(0,1.12,0);
   for(const side of [-1,1]){rod(p,[side*.31,.66,.02],[side*.35,.37,.16],.085,'green');rod(p,[side*.35,.37,.16],[side*.23,.43,.35],.07,'green');ell(p,side*.255,.45,.38,.07,.07,.06,'skin');round(p,side*.18,.47,.178,.035,.32,.012,.003,'cream')}
   const plan=paper(p,.67,.49,'plan',.04);plan.position.set(0,.21,.33);plan.rotation.x=-.08;plan.rotation.z=-.07;
   const roll=cyl(p,.42,.46,.10,.045,.045,.65,'paper',24);roll.rotation.z=.18;
  },
  'projects-b':p=>{
   for(const x of [-.43,.43])for(const z of [-.24,.24])rod(p,[x,.02,z],[x*.80,.60,z*.8],.032,'slate');
   const table=group(p,0,.62,0);table.rotation.x=.28;round(table,0,0,0,1.18,.075,.77,.017,'wood');
   const plan=paper(table,.94,.61,'plan',.012);plan.rotation.x=-PI/2;plan.position.set(0,.05,.30);
   rod(table,[.39,.07,.28],[.48,.07,-.22],.013,'slate');const h=helmet(table,.48);h.position.set(-.42,.055,-.21);
  },
  'projects-c':p=>{
   const plan=paper(p,1.02,1.0,'plan',.06);plan.rotation.x=-.16;plan.position.set(0,.02,-.10);
   const h=helmet(p,.85);h.position.set(-.24,.02,.28);
   for(const [x,z] of [[.29,.20],[.40,.12]]){const roll=cyl(p,x,.38,z,.045,.045,.72,'paper',24);roll.rotation.z=-.12;const band=cyl(p,x,.38,z,.048,.048,.045,'green',24);band.rotation.z=-.12}
  },
  'teaching-a':p=>{
   for(const x of [-.40,.40])rod(p,[x,.015,.10],[x,.98,-.015],.027,'wood');
   round(p,0,.86,0,1.20,.82,.095,.018,'wood');round(p,0,.86,.052,1.10,.72,.025,.007,'darkGreen');
   const ink=material('#dddcc8');for(const pts of [ [[-.38,.67,.073],[-.38,1.05,.073]], [[-.38,.67,.073],[.34,.67,.073]], [[-.30,.74,.079],[-.12,.92,.079],[.08,.80,.079],[.30,1.02,.079]] ])curve(p,pts,.008,ink);
   for(const [x,y] of [[-.30,.74],[-.12,.92],[.08,.80],[.30,1.02]])ell(p,x,y,.08,.023,.023,.008,'ochre');
   round(p,0,.42,.10,1.20,.04,.16,.01,'wood');round(p,.28,.46,.12,.18,.055,.075,.01,'slate');rod(p,[-.28,.454,.12],[-.10,.454,.12],.012,ink);
  },
  'teaching-b':p=>{
   round(p,0,.035,0,.69,.07,.53,.025,'slate');round(p,0,.35,0,.16,.63,.18,.022,'wood');
   const desk=group(p,0,.73,0);desk.rotation.x=.28;round(desk,0,0,0,1.02,.065,.65,.016,'green');
   const b=book(desk,.90);b.position.set(0,.035,0);round(desk,0,.04,.34,1.0,.06,.05,.009,'wood');
  },
  'teaching-c':p=>{
   const b=book(p,1.22);b.rotation.x=.40;b.position.y=.12;
   rod(p,[.43,.20,.39],[.23,.59,-.23],.023,'wood');ell(p,.23,.59,-.23,.032,.032,.032,'slate');
  }
 };
 const categories=[
  {id:'home',title:'Home',default:'c',description:'A personal mark or a point of orientation.',options:[['a','Sculpted D'],['b','D medallion'],['c','Navigation compass']]},
  {id:'publications',title:'Publications',default:'a',description:'Paper, writing and the published record.',options:[['a','Research manuscript'],['b','Rolled manuscript'],['c','Open journal']]},
  {id:'projects',title:'Projects',description:'People and plans behind the work.',options:[['a','Builder with plans'],['b','Drafting table'],['c','Plans + hard hat']]},
  {id:'teaching',title:'Teaching',description:'Quiet objects from a working classroom.',options:[['a','Seminar board'],['b','Lectern + book'],['c','Book + pointer']]}
 ];
 function create(id){const g=group();if(!builders[id])throw Error('Unknown navigation model '+id);builders[id](g);return g}
 const selected=Object.freeze(Object.fromEntries(categories.map(c=>[c.id,c.id+'-'+(c.default||'a')])));
 const orbit=Object.freeze({baseYaw:-.12,yawLimit:25*PI/180,pitchLimit:12*PI/180});
 function setView(entry,yaw,tilt){
  entry.angle=T.MathUtils.clamp(yaw,orbit.baseYaw-orbit.yawLimit,orbit.baseYaw+orbit.yawLimit);
  entry.tilt=T.MathUtils.clamp(tilt,-orbit.pitchLimit,orbit.pitchLimit);
 }
 function scene(id){
  const s=new T.Scene(),pivot=new T.Group(),model=create(id);s.add(pivot);pivot.add(model);
  model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const scale=1.40/Math.max(size.y,size.x*.90,size.z*.85);model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  const floor=new T.Mesh(new T.PlaneGeometry(5,5),new T.ShadowMaterial({color:0x3c4b40,opacity:.13,depthWrite:false}));floor.rotation.x=-PI/2;floor.position.y=-.016;floor.receiveShadow=true;s.add(floor);
  s.add(new T.HemisphereLight(0xfffbef,0xb4c3b4,.85),new T.AmbientLight(0xffffff,.22));
  for(const [x,y,z,power,c] of [[-3.4,5,5,2.8,0xfff0da],[4,2,3,.65,0xe3edf8],[2,4,-3,.9,0xffffff]]){
   const light=new T.DirectionalLight(c,power);light.position.set(x,y,z);s.add(light);
   if(x<0){light.castShadow=true;light.shadow.mapSize.set(256,256);Object.assign(light.shadow.camera,{left:-2,right:2,top:3,bottom:-1,near:.1,far:15});light.shadow.bias=-.0004;light.shadow.normalBias=.015;light.shadow.radius=3}
  }
  const camera=new T.OrthographicCamera(-.94,.94,.98,-.98,.1,30);camera.position.set(2.7,2.4,6);camera.lookAt(0,.65,0);
  return {id,s,pivot,g:pivot,camera,c:camera,angle:orbit.baseYaw,tilt:0,canvases:[]};
 }
 function frame(entry,width,height){
  setView(entry,entry.angle,entry.tilt);
  const camera=entry.camera,aspect=width/Math.max(1,height);camera.top=.98;camera.bottom=-.98;camera.left=-.98*aspect;camera.right=.98*aspect;camera.updateProjectionMatrix();
  entry.pivot.rotation.set(entry.tilt,entry.angle,0);
 }
 return {create,categories,selected,orbit,setView,scene,frame};
})();
