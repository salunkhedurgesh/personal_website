/* Deterministic closure, assembly-branch, travel-bound and spring-dynamics checks. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/rss-ik.js','utf8'),context);
const api=context.window.RSSIK,config=JSON.parse(fs.readFileSync('models/zamanov-6rss-kinematics.json')),solver=api.create(config);
let seed=21937;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32};let worst=0,minCondition=1;
assert(solver.rest.angles.every(q=>Math.abs(q)<1e-8));assert(solver.rest.condition>.01);
for(let i=0;i<500;i++){
 const point=Array.from({length:3},()=>.008*(random()-.5)),axis=Array.from({length:3},()=>random()-.5),length=Math.hypot(...axis),angle=(random()-.5)*4*Math.PI/180;
 const quaternion=[...axis.map(v=>v/length*Math.sin(angle/2)),Math.cos(angle/2)],pose=solver.solve(point,quaternion);assert(pose,'near-home 6-DoF pose should close');
 assert(pose.angles.every(q=>Math.abs(q)<solver.angleLimit));assert(pose.residual<1e-8);worst=Math.max(worst,pose.residual);minCondition=Math.min(minCondition,pose.condition);
}
for(let i=0;i<200;i++){
 const target=Array.from({length:3},()=>2*(random()-.5)),bound=solver.constrain(target);assert(Math.hypot(...bound.point)<=solver.limit+1e-10);assert(bound.limited);assert(solver.solve(bound.point));
}
assert.equal(solver.solve([NaN,0,0]),null);assert.equal(solver.solve([1,0,0]),null);assert.equal(solver.solve([0,0,0],[0,0,0,0]),null);assert.equal(solver.solve([0,.8,0],[0,0,0,1],false),null);
let responses=[];
for(const stiffness of [200,600,1200]){
 const spring=api.spring(solver);spring.setStiffness(stiffness);spring.begin();spring.aim([.2,.1,-.08]);let peak=0;
 for(let i=0;i<240;i++){const pose=spring.step(1/180),state=spring.state();assert(pose.residual<1e-8);assert(state.offset.every(Number.isFinite));peak=Math.max(peak,Math.hypot(...state.offset));assert(peak<=solver.limit+1e-9)}
 const dragged=spring.state();assert(dragged.dragging&&dragged.limited);assert(dragged.force>0);assert(Math.abs(dragged.force-stiffness*Math.hypot(...dragged.offset))<1e-8);responses.push(Math.hypot(...dragged.offset));
 // A resumed tab must not integrate a long paused interval.
 spring.step(600);assert(Math.hypot(...spring.state().offset)<=solver.limit+1e-9);
 spring.release();for(let i=0;i<720;i++)spring.step(1/180);assert(!spring.active());assert.equal(Math.hypot(...spring.state().offset),0);assert.equal(spring.state().force,0);
 spring.begin();spring.aim([0,-.2,0]);for(let i=0;i<90;i++)spring.step(1/90);spring.reset();assert(!spring.active());assert.equal(spring.state().pose,solver.rest);
}
assert(responses[0]>responses[1]&&responses[1]>responses[2],'stiffer spring must resist the same hand target more');
console.log(JSON.stringify({poses:500,boundedTargets:200,maxClosureErrorM:worst,minReciprocalCondition:minCondition,stiffnessResponseMm:responses.map(x=>x*1000),springReturn:'exact home',resume:'bounded'},null,2));
