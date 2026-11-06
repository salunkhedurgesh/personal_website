/* Small tabletop sets. Letter paint is bound to each glyph's rest-space UVs, not projected on the screen. */
window.AtelierArt=(()=>{
 const T=THREE, P=Math.PI, tau=2*P, library=new Map();
 function marionettePose(t){
  const progress=Math.max(0,Math.min(1,t/1.15));
  const drop=.54*(1-progress**3*(progress*(progress*6-15)+10));
  const age=Math.max(0,t-.9),onset=Math.min(1,age/.28),envelope=onset*onset*(3-2*onset)*Math.exp(-.72*age);
  return {x:.085*Math.sin(age*10.7)*envelope,y:drop+.10*Math.sin(age*11.5)*envelope,
   angle:.011*Math.sin(age*9.1)*envelope,drop,envelope};
 }
 const focus=['halloween','puppets'];
 function texture(name,notify,color=true){
  if(library.has(name))return library.get(name);
  const path='images/atelier/'+name+'.webp';let done,fail;
  const ready=new Promise((resolve,reject)=>{done=resolve;fail=reject});
  const t=new T.TextureLoader().load(window.siteAsset?siteAsset(path):path,()=>{done();notify()},undefined,fail);
  t.userData.ready=ready;if(color)t.encoding=T.sRGBEncoding;t.anisotropy=4;
  if(/ceramic|walnut/.test(name))t.wrapS=t.wrapT=T.RepeatWrapping;
  library.set(name,t);return t;
 }

 // Intersect the solid just below its top. Disconnected spans are separate uprights.
 // This distinguishes H/K/N/U from a continuous cap, arch or single apex.
 function suspensionTops(geometry){
  geometry.computeBoundingBox();
  const positions=geometry.attributes.position,index=geometry.index;
  const count=index?index.count:positions.count,cut=geometry.boundingBox.max.y-.055,spans=[];
  const vertex=i=>index?index.getX(i):i;
  for(let i=0;i<count;i+=3){
   const hits=[];
   for(let j=0;j<3;j++){
    const a=vertex(i+j),b=vertex(i+(j+1)%3),ay=positions.getY(a),by=positions.getY(b);
    if((ay<=cut&&by>cut)||(by<=cut&&ay>cut)){
     const t=(cut-ay)/(by-ay);
     hits.push(positions.getX(a)+t*(positions.getX(b)-positions.getX(a)));
    }
   }
   if(hits.length>=2)spans.push([Math.min(...hits),Math.max(...hits)]);
  }
  spans.sort((a,b)=>a[0]-b[0]);
  const tops=[];
  for(const span of spans){
   const previous=tops[tops.length-1];
   if(previous&&span[0]<=previous[1]+.018)previous[1]=Math.max(previous[1],span[1]);
   else tops.push(span.slice());
  }
  if(!tops.length)tops.push([geometry.boundingBox.min.x,geometry.boundingBox.max.x]);
  return tops.map(([left,right])=>{
   const x=(left+right)/2;let y=-Infinity;
   // Find the actual top surface at the center of this upright, including curved caps.
   const ray=new T.Ray(new T.Vector3(x,geometry.boundingBox.max.y+1,0),new T.Vector3(0,-1,0));
   const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3();
   for(let i=0;i<count;i+=3){
    a.fromBufferAttribute(positions,vertex(i));
    b.fromBufferAttribute(positions,vertex(i+1));
    c.fromBufferAttribute(positions,vertex(i+2));
    if(ray.intersectTriangle(a,b,c,false,hit))y=Math.max(y,hit.y);
   }
   return new T.Vector3(x,Number.isFinite(y)?y:geometry.boundingBox.max.y,0);
  });
 }
 function make(e){const {root,units,width:w,theme:k,style,mat,M,grp,ell,box,cyl,rod,curve,bevel,lathe,geom,actions,V,C,keep,rand,request,ease}=e;
 const l=-w*.5,r=-l, tx=n=>{const t=texture(n,request);e.ready.push(t.userData.ready);return t}, normal=texture('ceramic-normal',request,false),grit=tx('ceramic-grit');e.ready.push(normal.userData.ready);
 const colorways={E:['#d87d42','#d87b35','#d98c52','#c96b39']};
 // Local grain coordinates stay attached to the glyph as it is lifted or painted.
 units.forEach((u,i)=>{let g=u.body.geometry.clone();g.userData.shared=false;const p=g.attributes.position;const uv=new Float32Array(p.count*2),stone=new Float32Array(p.count*2);for(let j=0;j<p.count;j++){let x=p.getX(j),y=p.getY(j),z=p.getZ(j);stone[2*j]=(x+z*.61)*.87+i*.37;stone[2*j+1]=(y-z*.44)*.87+i*.21;uv[2*j]=stone[2*j];uv[2*j+1]=stone[2*j+1]}
 g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('clayUV',new T.BufferAttribute(stone,2));u.body.geometry=g;u.body.scale.z=1.21;let m=mat(k==='puppets'?colorways.E[i%4]:['#204e38','#315f45','#407355','#528267','#39684b'][i%5],.86,.015,{normalMap:normal,normalScale:new T.Vector2(.34,.34)});
 m.onBeforeCompile=s=>{s.uniforms.atelierGrit={value:grit};s.vertexShader='attribute vec2 clayUV; varying vec2 vClayFine; varying vec3 vRest;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvClayFine=clayUV; vRest=position;');s.fragmentShader='uniform sampler2D atelierGrit; varying vec2 vClayFine; varying vec3 vRest;\n'+s.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replaceAll('vUv','vClayFine')).replace('#include <color_fragment>',`#include <color_fragment>\nfloat pits=texture2D(atelierGrit,vClayFine).r; diffuseColor.rgb*= (.76+.41*pits)*(1.-.125*exp(-max(0.,vRest.y)*9.));`)};u.body.material=m;u.body.name='Clay / '+u.ch+' / '+(i+1);});
 if(!focus.includes(k))return;
 const back='images/atelier/back-'+k+'.webp'; const host=document.getElementById('marquee');host.style.backgroundImage='none';
 const gold=mat('#c09351',.33,.62),black=mat('#29232a',.65,.22),slate=mat('#564e50',.95),lin=mat('#e2b178',.9),mahogany=mat('#b27c58',.55,.04,{map:tx('walnut')});
 function tor(parent,pos,r,t,m){return M(parent,new T.TorusGeometry(r,t,8,28),m,...pos)}
 function cuts(p,outline,holes,depth,m){let sh=new T.Shape();outline(sh);for(let h of holes){let q=new T.Path();h(q);sh.holes.push(q)}let g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:2,curveSegments:14});g.translate(0,0,-depth/2);return M(p,g,m)}
 // Batch repeated beads, litter and lattice members to keep draw calls low.
 function batch(parent,data,geometry,material){if(!data.length)return;let mesh=new T.InstancedMesh(geometry,material,data.length),obj=new T.Object3D();data.forEach((q,j)=>{obj.position.fromArray(q.p);obj.scale.fromArray(q.s||[1,1,1]);obj.rotation.set(...(q.rot||[0,0,0]));if(q.quat)obj.quaternion.copy(q.quat);obj.updateMatrix();mesh.setMatrixAt(j,obj.matrix);if(q.c)mesh.setColorAt(j,C(q.c))});mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function strutEntry(a,b,rad){let A=V(...a),B=V(...b),v=B.clone().sub(A);return {p:A.clone().lerp(B,.5).toArray(),s:[rad,v.length(),rad],quat:new T.Quaternion().setFromUnitVectors(V(0,1,0),v.normalize())}}
 function marionette(){
 const wood=mat('#edc994',.67,.02,{map:tx('walnut')}),cord=mat('#b9874e',.85),linen=mat('#e9c391',.88);
 // A hand-turned oak batten: the shape as well as the grain varies along the rail.
 const rail=grp(root);rail.name='Robot-held marionette rail';
 const pos=[],uv=[],idx=[],K=116,N=16,beamY=x=>1.78+.039*Math.sin(x*.86)+.014*x/w;
 for(let i=0;i<=K;i++){let t=i/K,x=l-.48+(w+.96)*t;for(let n=0;n<=N;n++){let a=n*tau/N,rr=.094*(1+.09*Math.sin(x*2.6+a)+.055*Math.cos(3*a+.8*x));pos.push(x,beamY(x)+rr*Math.cos(a),-.036+rr*Math.sin(a));uv.push(t*3.2,n/N);if(i&&n){let j=i*(N+1)+n;idx.push(j-N-2,j-N-1,j,j-N-2,j,j-1)}}}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();let beam=M(rail,geo,wood);beam.name='Oak puppet rail';for(let x of [l-.48,r+.48])ell(rail,x,beamY(x),-.036,.105,.103,.097,wood);
 e.carriedRig={kind:'marionette',object:rail,grips:[V(l-.37,beamY(l-.37),-.036),V(r+.37,beamY(r+.37),-.036)],gripDepth:.09};
 function moveRail(t){
  const pose=marionettePose(t);
  rail.position.set(pose.x,pose.y,0);rail.rotation.z=pose.angle;rail.updateMatrix();
  rail.userData.drop=pose.drop;rail.userData.shakeEnvelope=pose.envelope;
  units.forEach(u=>{if(u.railAnchor)u.rigAnchor.copy(u.railAnchor).applyMatrix4(rail.matrix)});
 }
 e.carriedRig.update=moveRail;actions.push(moveRail);
 function hangingLine(top,baseLen,label){const seg=14,n=6,points=new Float32Array((seg+1)*(n+1)*3),idx=[];for(let i=1;i<=seg;i++)for(let j=1;j<=n;j++){let v=i*(n+1)+j;idx.push(v-n-2,v-n-1,v,v-n-2,v,v-1)}let g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(points,3).setUsage(T.DynamicDrawUsage));g.setIndex(idx);let m=M(root,g,linen);m.name=label;m.frustumCulled=false;return end=>{const diff=end.clone().sub(top),slack=Math.sqrt(Math.max(0,baseLen*baseLen-diff.lengthSq()))*.46;for(let i=0;i<=seg;i++){const t=i/seg,bend=Math.sin(t*P);let v=top.clone().lerp(end,t);v.x+=slack*bend*.45;v.z+=slack*bend*.69;let tangent=diff.clone().add(V(slack*P*Math.cos(t*P)*.45,0,slack*P*Math.cos(t*P)*.69)).normalize(),side=V(0,0,1).cross(tangent).normalize(),other=tangent.clone().cross(side);for(let j=0;j<=n;j++){let a=j*tau/n+t*2.1,r=.0116*(1+.09*Math.sin(55*t));let pt=v.clone().addScaledVector(side,r*Math.cos(a)).addScaledVector(other,r*Math.sin(a));g.attributes.position.setXYZ(i*(n+1)+j,pt.x,pt.y,pt.z)}}g.attributes.position.needsUpdate=true;g.computeVertexNormals()}}
 units.forEach((u,j)=>{
  const tops=suspensionTops(u.body.geometry);
  const ties=tops.map(point=>{
   const {x,y}=point;
   const eye=tor(u.g,[x,y+.027,.006],.026,.006,gold);
   eye.name='Puppet eyelet / '+u.ch+' / '+(j+1);
   cyl(u.g,x,y-.003,0,.011,.013,.044,gold);
   const tie=V(x,y+.056,.006);
   const knot=ell(u.g,tie.x,tie.y,tie.z,.019,.024,.019,cord);
   knot.name='Puppet top knot / '+u.ch+' / '+(j+1);
   return tie;
  });
  const join=ties.length===1?ties[0].clone():V(
   ties.reduce((sum,p)=>sum+p.x,0)/ties.length,
   Math.max(...ties.map(p=>p.y))+.17,.006);
  if(ties.length>1){
   ties.forEach((tie,i)=>{
    const middle=tie.clone().lerp(join,.5);middle.z+=.012;
    const rope=curve(u.g,[tie.toArray(),middle.toArray(),join.toArray()],.010,linen);
    rope.name='Puppet bridle / '+u.ch+' / '+(j+1)+' / '+(i+1);
   });
   ell(u.g,join.x,join.y,join.z,.023,.028,.022,cord);
  }
  const beamX=u.x+join.x,top=V(beamX,beamY(beamX)-.076,-.021);
  for(let i=-2;i<=2;i++){
   const loop=tor(rail,[beamX+i*.016,beamY(beamX),-.036],.097,.012,cord);
   loop.rotation.y=P/2+.16;
  }
  ell(rail,beamX,top.y-.013,top.z,.037,.051,.033,cord);
  u.topAttachments=ties;u.rigAnchor=top;u.railAnchor=top.clone();u.marionetteRail=rail;u.attachment=join;
  u.rest=.115+.016*Math.cos(j*.70);u.initialLift=e.reduced?0:.54;
  u.ropeLength=top.distanceTo(join.clone().add(V(u.x,u.rest,0)));
  const draw=hangingLine(top,u.ropeLength,'Puppet rope / '+u.ch+' / '+(j+1));
  u.rope=()=>draw(u.attachment.clone().applyQuaternion(u.g.quaternion).add(u.g.position));
 });moveRail(e.reduced?15:0);}
 function spooky(){let ochre=mat('#cb641f',.65,.035,{normalMap:normal,normalScale:new T.Vector2(.33,.33)}),flesh=mat('#ffbc56',.67,0,{emissive:C('#ff9817'),emissiveIntensity:1.40}),stem=mat('#685936',.95),ink=mat('#1e1922',.93),moonmat=keep(new T.MeshBasicMaterial({color:C('#ffe2a2')}));function pumpkin(x,z,s,rot){let p=grp(root,x,.003,z);p.scale.set(s,s*1.08,s*.56);p.rotation.y=rot;p.name='Carved jack-o-lantern';let gg=geom('atelier-pumpkin',CarvedGourd),vp=gg.attributes.position;if(!gg.attributes.color){let col=new Float32Array(vp.count*3);for(let q=0;q<vp.count;q++){let a=Math.atan2(vp.getZ(q),vp.getX(q)),y=vp.getY(q),rib=.5+.5*Math.cos(11*a+.2*y),mul=.60+.36*rib+.025*Math.sin(34*a+y*14);col.set([mul,mul*(.80+.16*rib),mul*.80],q*3)}gg.setAttribute('color',new T.BufferAttribute(col,3))}ochre.vertexColors=true;M(p,gg,ochre,0,.832,0);ell(p,0,.816,0,.79,.62,.76,flesh);curve(p,[[0,1.56,0],[0,1.65,0],[.04,1.72,-.02]],.072,stem);for(let j=0;j<5;j++){let a=j*tau/5;curve(p,[[.055*Math.cos(a),1.58,.055*Math.sin(a)],[.035*Math.cos(a),1.67,.035*Math.sin(a)],[.02,1.71,-.01]],.015,stem)}return p}
 const xL=units[0].x-units[0].w*.5-.16,xR=units[units.length-1].x+units[units.length-1].w*.5+.16,zF=.52;e.halloweenTargets=[{g:pumpkin(xL,zF,.55,.10),x:xL,z:zF,shadow:e.contact?.(root,xL,zF,.72,.34)},{g:pumpkin(xR,zF,.55,-.10),x:xR,z:zF,shadow:e.contact?.(root,xR,zF,.72,.34)}];
 const moon=ell(root,r-1.09,1.97,-2.5,.32,.32,.12,moonmat);const halo=(()=>{let c=document.createElement('canvas');c.width=c.height=128;let v=c.getContext('2d'),g=v.createRadialGradient(64,64,3,64,64,62);g.addColorStop(0,'rgba(255,210,138,.84)');g.addColorStop(.25,'rgba(255,189,101,.35)');g.addColorStop(1,'rgba(250,140,72,0)');v.fillStyle=g;v.fillRect(0,0,128,128);return e.ownTexture(new T.CanvasTexture(c))})();let glow=M(root,new T.PlaneGeometry(2,2),keep(new T.MeshBasicMaterial({map:halo,transparent:true,depthWrite:false})),moon.position.x,1.97,-2.58);glow.castShadow=false;
 // Lantern spill reaches the neighbouring clay, instead of painting a glow on the screen.
 for(let [x,power] of [[l-.59,4.0],[r+.56,2.9]]){let pt=new T.PointLight(0xff992f,power,2.6,2);pt.position.set(x,.63,.88);root.add(pt)}
 // The web spans the set, behind the type. Each arc sags towards its centre.
 {let corner=V(l-1.48,2.49,-1.49),rays=[V(l+1.21,2.34,-1.57),V(l+.71,1.71,-1.37),V(l+.53,1.22,-1.51),V(l-.06,.94,-1.47),V(l-.92,.69,-1.43)],silk=mat('#b5aebe',.68,.18);for(const end of rays)rod(root,corner.toArray(),end.toArray(),.005,silk);for(let t of [.26,.44,.64,.85])for(let n=1;n<rays.length;n++){let a=corner.clone().lerp(rays[n-1],t),b=corner.clone().lerp(rays[n],t),mid=a.clone().lerp(b,.5);mid.y-=.045*t;curve(root,[a.toArray(),mid.toArray(),b.toArray()],.0047,silk)}}
 let branches=[];function branch(x,y,z,len,a,level,seed){let b=[x+Math.sin(a)*len,y+Math.cos(a)*len,z+.04*Math.sin(seed)];branches.push(strutEntry([x,y,z],b,.011+level*.011));if(level>0){branch(...b,len*.72,a-.28-.35*rand(seed+7),level-1,seed+11);branch(...b,len*.69,a+.30+.32*rand(seed+21),level-1,seed+19)}}for(let [x,a] of [[l-.86,-.03],[r+.94,.12],[r-.22,.17]])branch(x,0,-1.86,.73,a,4,Math.abs(x));batch(root,branches,new T.CylinderGeometry(.62,1,1,6),ink);
 const batGeo=(()=>{let sh=new T.Shape();sh.moveTo(0,.025);sh.quadraticCurveTo(-.22,.30,-.56,.26);sh.quadraticCurveTo(-.34,.13,-.34,-.04);sh.quadraticCurveTo(-.23,.04,-.15,-.115);sh.quadraticCurveTo(-.07,-.04,0,-.145);sh.quadraticCurveTo(.07,-.04,.15,-.115);sh.quadraticCurveTo(.23,.04,.34,-.04);sh.quadraticCurveTo(.34,.13,.56,.26);sh.quadraticCurveTo(.22,.30,0,.025);return new T.ExtrudeGeometry(sh,{depth:.028,bevelEnabled:false})})();for(let j=0;j<6;j++){let b=M(root,batGeo,ink,r-3.6+j*.58,1.73+.38*Math.sin(j*1.34),-1.59+rand(j)*.28);b.scale.setScalar(.22+.16*rand(j+10));b.rotation.z=-.34+.68*rand(j+5)}
 let rails=[];for(let j=0;j<45;j++){let x=l-1+(w+2)*j/44;rails.push(strutEntry([x,.02,-1.3],[x,.56+(j%6===0?.15:0),-1.3],j%6===0?.024:.010))}for(let y of [.23,.43])rails.push(strutEntry([l-1,y,-1.3],[r+1,y,-1.3],.014));batch(root,rails,new T.CylinderGeometry(1,1,1,6),ink)}
 if(k==='puppets')marionette();if(k==='halloween')spooky();
 }
 return {make,focus,suspensionTops,marionettePose};})();
