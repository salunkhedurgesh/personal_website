/* Articulate the original full-resolution GLB with rigid links and instanced draws. */
window.RSSScene=(()=>{
 'use strict';
 const T=window.THREE;
 function model(buffer,config){
  const dv=new DataView(buffer),length=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length))),start=28+length;
  const types={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const attribute=i=>{const a=json.accessors[i],view=json.bufferViews[a.bufferView];if(view.byteStride)throw Error('Unexpected interleaved 6-RSS data');return new T.BufferAttribute(new types[a.componentType](buffer,start+(view.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]),sizes[a.type],a.normalized||false)};
  const materials=json.materials.map(m=>{const p=m.pbrMetallicRoughness||{};return new T.MeshStandardMaterial({color:new T.Color().fromArray(p.baseColorFactor||[.45,.45,.45]),metalness:Math.min(.28,p.metallicFactor??.15),roughness:Math.max(.5,p.roughnessFactor??.55)})});
  const primitives=json.meshes.map(m=>m.primitives.map(p=>{
   const g=new T.BufferGeometry();g.setAttribute('position',attribute(p.attributes.POSITION));if(p.attributes.NORMAL!=null)g.setAttribute('normal',attribute(p.attributes.NORMAL));if(p.indices!=null)g.setIndex(attribute(p.indices));if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingBox();return {g,m:materials[p.material]||materials[0]};
  }));
  const nodes=json.nodes.map((n,i)=>{const g=new T.Group();g.name=n.name||'node'+i;if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(g.position,g.quaternion,g.scale);else{if(n.translation)g.position.fromArray(n.translation);if(n.rotation)g.quaternion.fromArray(n.rotation);if(n.scale)g.scale.fromArray(n.scale)}return g});
  json.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));
  const skeleton=new T.Group();json.scenes[json.scene||0].nodes.forEach(i=>skeleton.add(nodes[i]));skeleton.updateMatrixWorld(true);
  const batches=new Map(),bounds=new T.Box3();json.nodes.forEach((n,i)=>{
   if(n.mesh==null)return;primitives[n.mesh].forEach(({g,m},p)=>{
    const key=n.mesh+':'+p;if(!batches.has(key))batches.set(key,{g,m,nodes:[]});batches.get(key).nodes.push(i);bounds.union(g.boundingBox.clone().applyMatrix4(nodes[i].matrixWorld));
   });
  });
  const root=new T.Group(),parts=new T.Group(),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),origin=new T.Vector3(center.x,bounds.min.y,center.z),unit=1/size.y;
  root.add(parts);parts.scale.setScalar(unit);parts.position.copy(origin).multiplyScalar(-unit);
  for(const batch of batches.values()){
   const o=batch.mesh=new T.InstancedMesh(batch.g,batch.m,batch.nodes.length);o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;o.castShadow=o.receiveShadow=true;parts.add(o);
  }
  const platform=nodes[config.platform.node.index],legObjects=config.legs.map(leg=>{
   const crank=nodes[leg.nodes.crank.index],rod=nodes[leg.nodes.rod.index],parentInverse=new T.Matrix4().copy(rod.parent.matrixWorld).invert();
   const homeQuaternion=new T.Quaternion(),homePosition=new T.Vector3(),homeScale=new T.Vector3();new T.Matrix4().fromArray(leg.rodHomeBaseMatrix).decompose(homePosition,homeQuaternion,homeScale);
   return {leg,crank,rod,crankHome:crank.quaternion.clone(),homeQuaternion,parentInverse,homeDirection:new T.Vector3(...leg.rodHomeDirectionBase)};
  });
  const solver=RSSIK.create(config),rotation=new T.Quaternion(),direction=new T.Vector3(),matrix=new T.Matrix4(),one=new T.Vector3(1,1,1),position=new T.Vector3(),quaternion=new T.Quaternion();
  function pose(solution){
   platform.position.fromArray(solution.position);platform.quaternion.fromArray(solution.quaternion);
   legObjects.forEach((o,i)=>{
    rotation.setFromAxisAngle(new T.Vector3(...o.leg.crankRotationAxisLocal),solution.angles[i]);o.crank.quaternion.copy(o.crankHome).multiply(rotation);
    position.fromArray(solution.elbows[i]);direction.fromArray(solution.joints[i]).sub(position).normalize();quaternion.setFromUnitVectors(o.homeDirection,direction).multiply(o.homeQuaternion);
    matrix.compose(position,quaternion,one).premultiply(o.parentInverse);matrix.decompose(o.rod.position,o.rod.quaternion,o.rod.scale);
   });
   skeleton.updateMatrixWorld(true);for(const b of batches.values()){b.nodes.forEach((index,i)=>b.mesh.setMatrixAt(i,nodes[index].matrixWorld));b.mesh.instanceMatrix.needsUpdate=true}
  }
  const plateIndex=json.nodes[config.platform.node.index].children.find(i=>json.nodes[i].mesh!=null),platePrimitive=primitives[json.nodes[plateIndex].mesh][0],pickPlate=new T.Mesh(platePrimitive.g,platePrimitive.m);pickPlate.matrixAutoUpdate=false;
  const handle=new T.Mesh(new T.SphereGeometry(.0075,20,14),new T.MeshStandardMaterial({color:0xb5822e,metalness:.18,roughness:.55}));handle.visible=false;parts.add(handle);
  const homeHandle=new T.Vector3(...solver.home).add(new T.Vector3(0,.012,0)),handleLocal=new T.Vector3(0,.012,0);
  function handlePoint(solution){return new T.Vector3(...solution.position).add(handleLocal.clone().applyQuaternion(new T.Quaternion(...solution.quaternion)))}
  function rawToWorld(p){root.updateWorldMatrix(true,true);return parts.localToWorld(p.clone())}
  function worldToRaw(p){root.updateWorldMatrix(true,true);return parts.worldToLocal(p.clone())}
  function pick(ray){root.updateWorldMatrix(true,true);pickPlate.matrixWorld.multiplyMatrices(parts.matrixWorld,nodes[plateIndex].matrixWorld);const hits=[...ray.intersectObject(pickPlate),...ray.intersectObject(handle)];return hits.sort((a,b)=>a.distance-b.distance)[0]}
  function errors(solution){return config.legs.map((leg,i)=>{
   const a=new T.Vector3().setFromMatrixPosition(nodes[leg.nodes.lowerSphericalBall.index].matrixWorld),b=new T.Vector3().setFromMatrixPosition(nodes[leg.nodes.upperSphericalBall.index].matrixWorld);
   const crankPoint=new T.Vector3(...leg.crankBallCenterLocalM).applyMatrix4(nodes[leg.nodes.crank.index].matrixWorld);
   return {lower:a.distanceTo(new T.Vector3(...solution.elbows[i])),upper:b.distanceTo(new T.Vector3(...solution.joints[i])),crank:a.distanceTo(crankPoint),length:a.distanceTo(b),scale:nodes[leg.nodes.rod.index].scale.toArray()};
  })}
  pose(solver.rest);return {root,parts,solver,pose,handle,homeHandle,handlePoint,rawToWorld,worldToRaw,pick,errors};
 }
 function controller(rig,canvas,camera,request,readout){
  const spring=RSSIK.spring(rig.solver),plane=new T.Plane(),ray=new T.Raycaster(),pointer=new T.Vector2(),hit=new T.Vector3();let enabled=false,drag=null,last=0;
  const segments=72,sides=6,positions=new Float32Array((segments+1)*sides*3),indices=[];
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d)}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
  const coil=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x9b702e,depthTest:false,depthWrite:false}));coil.renderOrder=20;coil.frustumCulled=false;coil.visible=false;rig.parts.add(coil);
  const anchor=new T.Mesh(new T.TorusGeometry(.012,.001,6,28),new T.MeshBasicMaterial({color:0x667c71,transparent:true,opacity:.65,depthTest:false,depthWrite:false}));anchor.rotation.x=Math.PI/2;anchor.position.copy(rig.homeHandle);anchor.renderOrder=19;anchor.visible=false;rig.parts.add(anchor);
  function pointerRay(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray}
  function draw(solution){
   rig.pose(solution);const end=rig.handlePoint(solution);rig.handle.position.copy(end);const delta=end.clone().sub(rig.homeHandle),length=delta.length();coil.visible=enabled&&length>.0005;
   if(coil.visible){
    const axis=delta.normalize(),u=new T.Vector3().crossVectors(axis,Math.abs(axis.y)<.8?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).normalize(),v=new T.Vector3().crossVectors(axis,u),points=[];
    for(let i=0;i<=segments;i++){const t=i/segments,phase=t*3*2*Math.PI,radius=.0055*Math.sin(Math.PI*t)**.45;points.push(rig.homeHandle.clone().addScaledVector(axis,length*t).addScaledVector(u,radius*Math.cos(phase)).addScaledVector(v,radius*Math.sin(phase)))}
    for(let i=0;i<=segments;i++){
     const tangent=points[Math.min(segments,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize(),normal=new T.Vector3().crossVectors(tangent,u).normalize(),binormal=new T.Vector3().crossVectors(tangent,normal);
     for(let j=0;j<sides;j++){const a=j/sides*2*Math.PI,p=points[i].clone().addScaledVector(normal,.0012*Math.cos(a)).addScaledVector(binormal,.0012*Math.sin(a));p.toArray(positions,(i*sides+j)*3)}
    }
    geometry.attributes.position.needsUpdate=true;
   }
   readout(spring.state());
  }
  function begin(e){
   if(!enabled||e.button!==0)return false;const picked=rig.pick(pointerRay(e));if(!picked)return false;
   spring.begin();const center=rig.rawToWorld(rig.handlePoint(spring.state().pose)),normal=new T.Vector3();camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,center);
   if(!ray.ray.intersectPlane(plane,hit)){spring.release();return false}
   drag={id:e.pointerId,start:rig.worldToRaw(hit),offset:spring.state().offset};last=performance.now();request();return true;
  }
  function move(e){if(!drag||drag.id!==e.pointerId)return;pointerRay(e);if(ray.ray.intersectPlane(plane,hit)){const delta=rig.worldToRaw(hit).sub(drag.start);spring.aim(delta.add(new T.Vector3(...drag.offset)).toArray());request()}}
  function release(){if(drag||spring.state().dragging){drag=null;spring.release();request()}}
  function reset(){drag=null;spring.reset();draw(rig.solver.rest);last=0;request()}
  function step(ms){if(!enabled){last=0;return}const dt=last?Math.min(.05,Math.max(0,(ms-last)/1000)):1/60;last=ms;if(spring.active()){draw(spring.step(dt));return true}return false}
  function setEnabled(value){enabled=value;rig.handle.visible=anchor.visible=value;canvas.style.touchAction=value?'none':'pan-y';if(!value)reset();else{last=0;draw(spring.state().pose)}}
  function keyboard(e){
   if(!enabled)return;const directions={ArrowLeft:[-.004,0,0],ArrowRight:[.004,0,0],ArrowUp:[0,.004,0],ArrowDown:[0,-.004,0],PageUp:[0,0,-.004],PageDown:[0,0,.004]};
   if(e.key==='Home'||e.key==='Escape'){e.preventDefault();reset();return}
   if(directions[e.key]){e.preventDefault();spring.begin();const x=spring.state().offset;spring.aim(x.map((v,i)=>v+directions[e.key][i]));last=performance.now();request()}
  }
  draw(rig.solver.rest);
  return {begin,move,release,reset,step,setEnabled,keyboard,active:()=>enabled&&spring.active(),dragging:()=>!!drag,setStiffness(value){spring.setStiffness(value);readout(spring.state());request()},
   inspection(){const s=spring.state(),world=rig.rawToWorld(rig.handle.position),p=world.clone().project(camera),r=canvas.getBoundingClientRect();return {...s,enabled,limit:rig.solver.limit,coilVisible:coil.visible,jointErrors:rig.errors(s.pose),handle:world.toArray(),anchor:rig.rawToWorld(rig.homeHandle).toArray(),screenHandle:{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}}};
 }
 return {model,controller};
})();
