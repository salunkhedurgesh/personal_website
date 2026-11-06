/* Holi is loaded on demand. Powder is pooled; paint remains in each glyph's rest space. */
window.ClayHoli = {
  build(e) {
    if(e.theme!=='holi')return;
    const {T,mat,keep,ownTexture,M,grp,ell,lathe,C,clamp,ease,rand,units,root,actions}=e;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const colours=['#ed2c9c','#ffb01c','#f94470','#9252e3','#ff9e12','#f440a4','#8452cc'];
    const set=grp(root);set.name='Holi / responsive powder bowls';
    const state=set.userData={assemblyBursts:0,interactiveBursts:0,paintDeposits:0,activeClouds:0,paintedLetters:0,coverage:0};
    let now=0,lastTime=0,lastPlay=-Infinity,serial=0;

    units.forEach(u=>{
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      const texture=ownTexture(new T.CanvasTexture(canvas));texture.generateMipmaps=false;
      texture.minFilter=T.LinearFilter;texture.encoding=T.LinearEncoding;
      u.body.geometry.computeBoundingBox();const bounds=u.body.geometry.boundingBox;
      const compile=u.body.material.onBeforeCompile;
      u.holiPigment={canvas,context,texture,coats:0,coverage:0};
      u.body.material.onBeforeCompile=shader=>{
        compile(shader);
        shader.uniforms.holiPaint={value:texture};
        shader.uniforms.holiBounds={value:new T.Vector2(bounds.min.x,bounds.max.x-bounds.min.x)};
        shader.fragmentShader='uniform sampler2D holiPaint; uniform vec2 holiBounds;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 powderUV=vec2((vRest.x-holiBounds.x)/holiBounds.y,clamp(vRest.y,0.,1.));
vec4 powder=texture2D(holiPaint,powderUV);
vec3 pigment=mix(pow(powder.rgb*.9478672986+vec3(.0521327014),vec3(2.4)),
 powder.rgb*.0773993808,vec3(lessThanEqual(powder.rgb,vec3(.04045))));
diffuseColor.rgb=mix(diffuseColor.rgb,pigment,powder.a*.96);
`);
      };
      u.body.material.needsUpdate=true;
    });

    function splatter(unit,colour,seed,amount){
      const {canvas,context:c,texture}=unit.holiPigment;
      for(let j=0;j<amount;j++){
        const n=seed+j*43,x=(.08+.84*rand(n))*canvas.width,y=(.08+.84*rand(n+3))*canvas.height;
        const r=(.13+.16*rand(n+11))*canvas.width;
        const brush=c.createRadialGradient(x,y,r*.18,x,y,r);
        brush.addColorStop(0,colour);brush.addColorStop(.68,colour+'e8');brush.addColorStop(1,colour+'00');
        c.fillStyle=brush;c.beginPath();c.ellipse(x,y,r,r*1.35,rand(n+9)*Math.PI,0,Math.PI*2);c.fill();
        c.fillStyle=colour+'c9';
        for(let i=0;i<24;i++){
          const a=rand(n+i*13)*Math.PI*2,d=r*(.8+rand(n+i*17)*1.3),s=1+rand(n+i*19)*2.5;
          c.beginPath();c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,s,0,Math.PI*2);c.fill();
        }
      }
      unit.holiPigment.coats+=amount;
      const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;let alpha=0;
      for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];
      unit.holiPigment.coverage=alpha/(canvas.width*canvas.height*255);texture.needsUpdate=true;
    }
    function deposit(event){
      if(event.painted)return;event.painted=true;
      units.forEach((u,i)=>{
        const distance=Math.abs(u.x-event.bowl.x),focus=i===event.focus;
        if(distance>2.25&&!focus)return;
        splatter(u,event.bowl.colour,event.seed+i*71,focus?6:distance<1.1?4:2);state.paintDeposits++;
      });
      state.paintedLetters=units.filter(u=>u.holiPigment.coats>0).length;
      state.coverage=units.reduce((a,u)=>a+u.holiPigment.coverage,0)/units.length;
    }

    const ceramic=mat('#ce7950',.72,.02,{bumpMap:e.tex,bumpScale:.004}),rim=mat('#e5bc74',.48,.18);
    const bowls=colours.map((colour,i)=>{
      const x=-e.width/2+.36+(e.width-.72)*i/(colours.length-1),g=grp(set,x,.018,.57);
      g.name='Holi / gulal bowl / '+(i+1);
      lathe(g,[[.15,0],[.20,.015],[.29,.08],[.34,.14],[.34,.16],[.315,.165],[.27,.095],[.16,.045],[0,.045]],ceramic,0,0,0,40);
      const edge=M(g,new T.TorusGeometry(.328,.012,6,32),rim,0,.15,0);edge.rotation.x=Math.PI/2;
      ell(g,0,.12,0,.29,.075,.28,mat(colour,.99,0,{bumpMap:e.tex,bumpScale:.014}));
      return {g,x,colour,index:i};
    });
    const plumeTextures=[0,1,2].map(i=>{
      let done,fail;const ready=new Promise((resolve,reject)=>{done=resolve;fail=reject});
      const texture=ownTexture(new T.TextureLoader().load(e.asset('images/atelier/pigment-plume-'+i+'.webp'),done,undefined,fail));
      texture.encoding=T.sRGBEncoding;e.ready.push(ready);return texture;
    });
    const slotCount=12,perBurst=84,lifetime=2.3;
    const particles=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat('#ffffff',.95),slotCount*perBurst);
    particles.name='Holi / pooled airborne powder';particles.frustumCulled=false;
    particles.castShadow=particles.receiveShadow=false;particles.visible=false;set.add(particles);
    const transform=new T.Object3D(),zero=new T.Matrix4().makeScale(0,0,0);
    for(let i=0;i<particles.count;i++){particles.setMatrixAt(i,zero);particles.setColorAt(i,C('#ffffff'))}
    const slots=Array.from({length:slotCount},(_,i)=>{
      const material=keep(new T.MeshBasicMaterial({map:plumeTextures[i%3],transparent:true,depthWrite:false,side:T.DoubleSide}));
      const cloud=M(set,new T.PlaneGeometry(1.45,1),material);cloud.name='Holi / transient powder cloud / '+(i+1);
      cloud.visible=false;cloud.castShadow=cloud.receiveShadow=false;
      return {cloud,event:null};
    });
    const contacts=[units[0].groundedAt,units.at(-1).groundedAt];
    const schedule=bowls.map((b,i)=>({bowl:b,at:contacts[i<4?0:1]+Math.abs(b.x-units[i<4?0:units.length-1].x)*.025,done:false}));
    function burst(bowl,at,kind,power=1,focus=null){
      const slot=slots.find(s=>!s.event||at-s.event.at>lifetime)||slots.reduce((a,b)=>a.event.at<b.event.at?a:b);
      // A slot can be reused without losing a pending paint deposit.
      if(slot.event)deposit(slot.event);
      const event={bowl,at,power:clamp(power,.7,1.5),focus,seed:++serial*137,painted:false};slot.event=event;
      state[kind==='assembly'?'assemblyBursts':'interactiveBursts']++;
      slot.cloud.material.color.copy(C(bowl.colour));
      const index=slots.indexOf(slot);
      for(let i=0;i<perBurst;i++)particles.setColorAt(index*perBurst+i,C(colours[(bowl.index+(i%9===0?1:0))%colours.length]));
      particles.instanceColor.needsUpdate=true;
      if(reduced.matches)deposit(event);
      e.request();
    }
    function rewind(){
      schedule.forEach(s=>s.done=false);slots.forEach(s=>{s.event=null;s.cloud.visible=false});
      units.forEach(u=>{const p=u.holiPigment;p.context.clearRect(0,0,p.canvas.width,p.canvas.height);p.coats=p.coverage=0;p.texture.needsUpdate=true});
      for(const key of Object.keys(state))state[key]=0;serial=0;lastPlay=-Infinity;
    }
    function play({kind,index,power}){
      if(now-lastPlay<.18||!units[index])return;lastPlay=now;
      const ordered=bowls.slice().sort((a,b)=>Math.abs(a.x-units[index].x)-Math.abs(b.x-units[index].x));
      burst(ordered[0],now,kind,kind==='impact'?Math.min(1.5,.8+power*.18):1,index);
      if(kind==='grab')burst(ordered[1],now+.055,kind,.85,index);
    }
    e.holi={play};
    actions.push(t=>{
      // Old physical landings may arrive on the frame that rewinds the paint.
      if(t<lastTime-.05){rewind();lastPlay=t}now=t;lastTime=t;
      schedule.forEach(s=>{if(!s.done&&t>=s.at){s.done=true;burst(s.bowl,s.at,'assembly')}});
      bowls.forEach(b=>{b.g.position.y=.018;b.g.rotation.z=0;b.g.userData.jump=0});
      state.activeClouds=0;
      slots.forEach((slot,j)=>{
        const event=slot.event,age=event?t-event.at:-1,alive=event&&age>=0&&age<lifetime;
        if(event&&age>=.18)deposit(event);
        slot.cloud.visible=!!alive&&!reduced.matches;
        if(alive&&!reduced.matches){
          state.activeClouds++;
          const grow=1-Math.exp(-age*4),scale=(.55+1.65*grow)*event.power;
          slot.cloud.position.set(event.bowl.x+.10*Math.sin(age*2+event.seed),.20+1.05*ease(age/.9),-.66-.15*age);
          slot.cloud.rotation.z=.12*Math.sin(event.seed);slot.cloud.scale.setScalar(scale);
          slot.cloud.material.opacity=.88*ease(age/.16)*(1-ease((age-.35)/1.7));
          const u=clamp(age/1.05),jump=.19*event.power*4*u*(1-u);
          if(jump>event.bowl.g.userData.jump){event.bowl.g.position.y=.018+jump;event.bowl.g.rotation.z=.10*Math.sin(u*Math.PI*2)*event.power;event.bowl.g.userData.jump=jump}
        }
        for(let i=0;i<perBurst;i++){
          const index=j*perBurst+i;
          if(!alive||reduced.matches){particles.setMatrixAt(index,zero);continue}
          const n=event.seed+i*17,vy=(2.5+rand(n)*1.25)*event.power,angle=rand(n+4)*Math.PI*2;
          const spread=.20+rand(n+8)*.82;
          const y=.17+vy*age-2.15*age*age;
          if(y<.02){particles.setMatrixAt(index,zero);continue}
          transform.position.set(event.bowl.x+Math.cos(angle)*spread*age,y,.57+Math.sin(angle)*spread*age-.3*age);
          const size=(.008+rand(n+12)*.015)*(1-.55*age/lifetime);
          transform.scale.set(size,size*.8,size);transform.rotation.set(age*2,angle,age*3);transform.updateMatrix();
          particles.setMatrixAt(index,transform.matrix);
        }
      });
      particles.visible=state.activeClouds>0;particles.instanceMatrix.needsUpdate=true;
    });
  }
};
