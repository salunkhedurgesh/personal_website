/* Circle/sphere inverse kinematics for the preserved 6-RSS visual model.
   Metres, Y up. Travel bounds below are demonstration limits, not calibration. */
window.RSSIK=(()=>{
 'use strict';
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>Math.hypot(...a),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function rotate(p,q){const v=q.slice(0,3),t=mul(cross(v,p),2);return add(p,add(mul(t,q[3]),cross(v,t)))}
 function reciprocalCondition(rows){
  const n=rows.length,a=rows.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);
  for(let k=0;k<n;k++){
   let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;
   if(Math.abs(a[p][k])<1e-10)return 0;[a[k],a[p]]=[a[p],a[k]];
   const d=a[k][k];for(let j=0;j<2*n;j++)a[k][j]/=d;
   for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=0;j<2*n;j++)a[i][j]-=f*a[k][j]}
  }
  const matrixNorm=m=>Math.max(...m.map(r=>r.reduce((s,v)=>s+Math.abs(v),0)));
  return 1/(matrixNorm(rows)*matrixNorm(a.map(r=>r.slice(n))));
 }
 function create(config){
  const home=config.platform.homePositionM,limit=.025,angleLimit=25*Math.PI/180,coneLimit=18*Math.PI/180;
  function solve(offset=[0,0,0],quaternion=[0,0,0,1],safe=true){
   if(offset.length!==3||quaternion.length!==4||![...offset,...quaternion].every(Number.isFinite))return null;
   const qn=norm(quaternion);if(qn<1e-10)return null;const orientation=mul(quaternion,1/qn);
   if(safe&&(norm(offset)>limit+1e-9||2*Math.acos(clamp(Math.abs(orientation[3]),-1,1))>8*Math.PI/180))return null;
   const position=add(home,offset),angles=[],elbows=[],joints=[],rows=[];let residual=0,transmission=1;
   for(const leg of config.legs){
    const r=leg.homeRadialVectorM,v=leg.homeTangentVectorM,a=leg.crankRadiusM,b=leg.rodLengthM;
    const attachment=rotate(leg.platformAttachmentM,orientation),joint=add(position,attachment);
    const center=add(leg.basePivotM,mul(leg.baseAxis,leg.crankAxialOffsetM)),d=sub(joint,center);
    const A=dot(d,r),B=dot(d,v),C=(dot(d,d)+a*a-b*b)/2,rho=Math.hypot(A,B);
    if(rho<1e-12||Math.abs(C)>rho+1e-12)return null;
    let q=Math.atan2(B,A)+leg.homeRootSign*Math.acos(clamp(C/rho,-1,1));q=Math.atan2(Math.sin(q),Math.cos(q));
    if(safe&&Math.abs(q)>angleLimit)return null;
    const elbow=add(center,add(mul(r,Math.cos(q)),mul(v,Math.sin(q)))),link=sub(joint,elbow),n=mul(link,1/b);
    if(safe&&dot(n,leg.rodHomeDirectionBase)<Math.cos(coneLimit))return null;
    const tangent=add(mul(r,-Math.sin(q)),mul(v,Math.cos(q))),serial=Math.abs(dot(n,tangent))/a;
    transmission=Math.min(transmission,serial);if(safe&&serial<.15)return null;
    residual=Math.max(residual,Math.abs(norm(link)-b));
    rows.push([...n,...mul(cross(attachment,n),1/.15)]);angles.push(q);elbows.push(elbow);joints.push(joint);
   }
   const condition=reciprocalCondition(rows);if(safe&&condition<.002)return null;
   return {offset:offset.slice(),position,quaternion:orientation,angles,elbows,joints,residual,condition,transmission};
  }
  const rest=solve();if(!rest)throw Error('6-RSS home pose does not close');
  function constrain(target,from=[0,0,0]){
   if(!target.every(Number.isFinite))return {point:from.slice(),limited:true};
   const len=norm(target),bounded=len>limit?mul(target,limit/len):target.slice();let point=from.slice(),limited=len>limit;
   // Follow the continuous home assembly; stop at the first invalid pose on the path.
   for(let i=1;i<=8;i++){
    const next=add(from,mul(sub(bounded,from),i/8));
    if(solve(next)){point=next;continue}
    let lo=point,hi=next;for(let j=0;j<16;j++){const mid=mul(add(lo,hi),.5);if(solve(mid))lo=mid;else hi=mid}
    return {point:lo,limited:true};
   }
   return {point,limited};
  }
  return {config,home:home.slice(),limit,angleLimit,coneLimit,rest,solve,constrain};
 }
 function spring(solver){
  let x=[0,0,0],v=[0,0,0],target=[0,0,0],dragging=false,k=600,limited=false,pose=solver.rest;
  function begin(){dragging=true;target=x.slice();limited=false}
  function aim(value){const bounded=solver.constrain(value,x);target=bounded.point;limited=bounded.limited}
  function release(){dragging=false;target=[0,0,0];limited=false}
  function reset(){x=[0,0,0];v=[0,0,0];target=[0,0,0];dragging=false;limited=false;pose=solver.rest}
  function active(){return dragging||norm(x)>1e-6||norm(v)>1e-5}
  function step(dt){
   const count=Math.max(1,Math.ceil(clamp(dt,0,.05)*180)),h=clamp(dt,0,.05)/count,mass=.5,hand=dragging?2000:0,damping=1.05*2*Math.sqrt(mass*(k+hand));
   for(let j=0;j<count;j++){
    for(let i=0;i<3;i++)v[i]+=(-k*x[i]+hand*(target[i]-x[i])-damping*v[i])*h/mass;
    const proposed=add(x,mul(v,h));let next=solver.solve(proposed);
    if(!next){const clipped=solver.constrain(proposed,x);next=solver.solve(clipped.point);v=[0,0,0];limited=true}
    if(next){pose=next;x=next.offset.slice()}else{v=[0,0,0]}
   }
   if(!dragging&&norm(x)<1e-6&&norm(v)<1e-5)reset();
   return pose;
  }
  return {begin,aim,release,reset,active,step,setStiffness(value){k=clamp(Number(value)||600,200,1200)},
   state:()=>({offset:x.slice(),velocity:v.slice(),target:target.slice(),dragging,stiffness:k,force:norm(x)*k,limited,pose})};
 }
 return {create,spring};
})();
