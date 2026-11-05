/* Research Atlas. Dependency-free WebGL 2 viewer of the supplied glTF scene.
   Coordinates: metres, Y up, +Z toward the street. Matrices are column-major. */
(function(){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const sub=(a,b)=>a.map((x,i)=>x-b[i]), dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),unit=a=>{let q=Math.sqrt(dot(a,a));return a.map(x=>x/q)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function look(eye,at){const z=unit(sub(eye,at)),x=unit(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function mm(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function persp(f,aspect,n,fa){let u=1/Math.tan(f*Math.PI/360);return new Float32Array([u/aspect,0,0,0,0,u,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0])}
function ortho(s,n,f){return new Float32Array([1/s,0,0,0,0,1/s,0,0,0,0,-2/(f-n),0,0,0,-(f+n)/(f-n),1])}
// Scroll keyframes: [progress, eye x/y/z, focus x/y/z, vertical field of view].
const frames=[
 [0,-.23,1.365,-.988,-.23,1.365,-1.626,43], [.075,-.215,1.378,-.76,-.23,1.354,-1.626,43],
 [.155,.035,1.55,-.01,-.18,1.28,-1.61,42],[.25,.77,1.77,1.38,-.12,1.26,-1.53,39],
 [.34,.96,1.93,2.0,-.32,1.26,-1.20,42],[.46,1.10,2.26,4.15,-.36,1.22,-.78,45],
 [.52,1.32,2.47,5.3,-.37,1.04,-.62,43],[.60,3.7,3.55,8.9,-1.25,.48,-.53,43],
 [.67,8.3,5.7,16.4,-5.10,-.38,-1.6,43],[.74,13.7,10.0,30.5,-10.3,-1.28,-3.25,43],
 [.78,14.7,16.2,43.0,-12.8,-2.1,-7.2,43],[.84,20,48,74,-22.2,-4.3,-30,43],
 [.90,14,150,166,-53,-6.55,-105,43],[.95,-9.5,358,235,-82,-7,-208,42],
 [1,-45,578,250,-99,-7.2,-235,39]
];
// Shape-preserving monotone cubic interpolation avoids crossing walls around a corner.
function spline(t,c){let i=0;while(i<frames.length-2&&frames[i+1][0]<t)i++;const f=frames[i],g=frames[i+1],h=g[0]-f[0],u=clamp((t-f[0])/h);function slope(k){if(k===0)return (frames[1][c]-frames[0][c])/(frames[1][0]-frames[0][0]);if(k===frames.length-1)return (frames[k][c]-frames[k-1][c])/(frames[k][0]-frames[k-1][0]);let a=(frames[k][c]-frames[k-1][c])/(frames[k][0]-frames[k-1][0]),b=(frames[k+1][c]-frames[k][c])/(frames[k+1][0]-frames[k][0]);return a*b<=0?0:2*a*b/(a+b)}return (2*u**3-3*u*u+1)*f[c]+(u**3-2*u*u+u)*h*slope(i)+(-2*u**3+3*u*u)*g[c]+(u**3-u*u)*h*slope(i+1)}
const vs=`#version 300 es
layout(location=0)in vec3 position;layout(location=1)in vec3 normal;layout(location=2)in vec2 texcoord;uniform highp int style,room;uniform vec3 clockAngles;uniform vec4 hull;uniform mat4 vp,lightIn,lightOut;out vec3 P,N;out vec2 UV;out vec4 S,T;
void main(){P=position;if(style>=9 && style<=11){float a=clockAngles[style-9];vec2 pivot=vec2(.93-21.25,2.26);vec2 xy=position.xy-pivot;P.xy=pivot+vec2(cos(a)*xy.x+sin(a)*xy.y,-sin(a)*xy.x+cos(a)*xy.y);}N=normal;if(hull.w>.5){float a=hull.z;mat2 rot=mat2(cos(a),sin(a),-sin(a),cos(a));P.xz=rot*P.xz+hull.xy;P.y-=6.62;N.xz=rot*N.xz;}UV=texcoord;gl_Position=vp*vec4(P,1.);S=lightIn*vec4(P,1.);T=lightOut*vec4(P,1.);if(room==1)P.x+=21.25;}`;
const fs=`#version 300 es
precision highp float;precision highp sampler2D;in vec3 P,N;in vec2 UV;in vec4 S,T;out vec4 outColor;uniform vec3 eye,base,sunDir;uniform int monument;uniform float flow;uniform highp int style,room;uniform vec4 daylight;uniform sampler2D atlas,shIn,shOut,digital;
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);} 
float shadow(sampler2D m,vec4 sc,float bias,float rad){vec3 q=sc.xyz/sc.w*.5+.5;if(q.x<.001||q.x>.999||q.y<.001||q.y>.999||q.z>.999||q.z<0.)return 1.;vec2 texel=rad/vec2(textureSize(m,0));vec3 dx=dFdx(q),dy=dFdy(q);float det=dx.x*dy.y-dx.y*dy.x;vec2 slope=abs(det)>1e-14?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det:vec2(0.);slope=clamp(slope,vec2(-6.),vec2(6.));float vis=0.;for(int i=0;i<12;i++){float u=float(i)+.5,t=u*2.399963;vec2 v=sqrt(u/12.)*vec2(cos(t),sin(t));float d=texture(m,q.xy+v*texel).r;vis+=step(q.z+dot(slope,v*texel)-bias,d);}return vis/12.;}
void main(){vec3 n=normalize(N),e=normalize(eye+vec3(room==1?21.25:0.,0.,0.)-P),L=normalize(sunDir);if(dot(n,e)<-.01)n=-n;vec3 b=base;
if(style==5){vec2 markuv=clamp((UV*vec2(2048.,3072.)-1.)/vec2(1598.,898.),0.,1.);outColor=vec4(texture(digital,vec2(markuv.x,1.-markuv.y)).rgb,1);return;}
if(style==6)b=texture(atlas,UV).rgb;
float nd=dot(n,L),key=max(nd,0.);float vis=room==1?shadow(shIn,S,.00014+.00048*(1.-key),3.1):shadow(shOut,T,.00027+.00064*(1.-key),3.6);
float amb=.67+.115*max(n.y,0.)+.035*max(n.z,0.);vec3 lit=(vec3(.963,.982,1.)*amb)+vec3(1.0,.949,.86)*(.35*key*vis)+vec3(1.,.72,.52)*.038*max(-n.y,0.)+vec3(1.,.92,.82)*.036*max(n.x,0.);
// Lighting is in display space, consistent with the sRGB atlas. Night keeps printed labels readable.
float day=daylight.x, sun=daylight.y, dusk=daylight.z, lamp=daylight.w;
vec3 night=room==1?vec3(.235,.288,.39):vec3(.38,.445,.55);
vec3 sky=vec3(.73,.785,.85)*(.87+.11*max(n.y,0.));
vec3 sunlit=mix(sky,lit,sun);sunlit+=vec3(.16,.055,-.045)*dusk*(.55+key*.55);
lit=mix(night,sunlit,day);
if(room==1){vec3 lv=vec3(-1.29,1.147,-1.65)-P;float ld=length(lv);float face=max(dot(n,lv/max(ld,.001)),0.);float wrap=.29+.87*face;float cone=mix(.32,1.,smoothstep(-.27,.69,lv.y/(ld+.0001)));lit+=lamp*vec3(1.00,.61,.32)*wrap*cone*1.98/(.44+1.9*ld*ld);
 vec3 mv=vec3(-.23,1.36,-1.51)-P;lit+=lamp*vec3(.074,.105,.16)*(.3+.7*max(dot(n,normalize(mv)),0.))/(.48+2.3*dot(mv,mv));}
if(style==1){vec2 k=abs(n.x)>.70?P.zy:P.xy; if(abs(n.y)>.70)k=P.xz;float growth=noise(vec2(k.x*2.2,k.y*34.))*.035+sin(k.y*214.+2.4*noise(k*6.))*.008; b*=.981+growth;}
if(style==7)b*=.97+.035*noise(P.xz*130.);
float contact=1.;
if(room==1&&n.y>.70){
 if(abs(P.y-.8335)<.006){
 vec2 k=P.xz;float pc=length(max(abs(k-vec2(.84,-1.56))-vec2(.162,.25),0.));float stand=length(max(abs(k-vec2(-.23,-1.615))-vec2(.24,.14),0.));float books=length(max(abs(k-vec2(-.975,-1.24))-vec2(.165,.113),0.));float lamp=max(0.,length(k-vec2(-1.29,-1.65))-.122);contact-=.19*exp(-min(min(pc,stand),min(books,lamp))/.037);}
 else if(abs(P.y)<.012){vec2 k=P.xz;float shelf=length(max(abs(k-vec2(-2.38,-2.36))-vec2(.64,.235),0.));float cab=length(max(abs(k-vec2(-2.61,.12))-vec2(.455,.51),0.));float plant=max(0.,length(k-vec2(2.54,-1.85))-.21);contact-=.19*exp(-min(min(shelf,cab),plant)/.15);float desk=length(max(abs(k-vec2(-.08,-1.44))-vec2(1.16,.25),0.));contact-=.065*exp(-desk/.30);}}
vec3 col=b*lit*contact; if(style==2)col+=(.032+.058*day)*pow(max(dot(n,normalize(L+e)),0.),24.)+.022*pow(1.-abs(dot(n,e)),3.);
if(style==3){float fres=pow(1.-abs(dot(n,e)),3.);float grad=clamp((P.y+3.3)/6.5,0.,1.);float refl=.5+.5*sin(P.x*.79+P.z*.53+P.y*1.75);col=mix(col,mix(vec3(.25,.36,.43),vec3(.81,.86,.80),day),.11+.29*fres+.09*grad);col+=refl*.022;}
if(style==4){bool shade=distance(P,vec3(-1.29,1.168,-1.65))<.2;col=shade?mix(col,vec3(1.,.825,.58),lamp):mix(col,b,.48);}
if(style==3 && room==0 && P.y<3.22){float pane=step(.70,hash(floor(P.xz*.76)+floor(P.y/3.0)));col+=vec3(.43,.27,.103)*pane*(1.-day)*.85;}
if(monument==6){float stone=.22+.42*max(0.,-n.x)+.20*max(0.,n.z);col+=b*vec3(1.0,.67,.39)*stone*(1.-day);}
if(monument==7){col+=b*vec3(.37,.32,.24)*(.23+.75*max(n.x,0.))*(1.-day);}
if(monument==8||monument==9){col+=b*vec3(.47,.28,.09)*(.29+.78*max(n.z,0.))*(1.-day);}
if(monument==10){float rip=sin(P.x*.78+P.z*.32+flow*.51);float line=smoothstep(.93,1.,rip)*(.5+.5*sin(P.x*.29-P.z*.12+flow*.2));col+=vec3(.056,.084,.093)*line;}
if(room==0&&n.y>.86&&P.y< -6.6){float k=length(P.xz-vec2(49.90,-279.24)),b0=length(P.xz-vec2(146.02,-331.64));if(flow>=0.)col+=vec3(.14,.077,.023)*max(exp(-.17*k),exp(-.19*b0))*(1.-day);}
if(style==12){float fr=pow(1.-abs(dot(n,e)),2.0);float cloud=.5+.5*sin(P.y*.27+P.z*.10);outColor=vec4(mix(vec3(.14,.30,.38),vec3(.67,.85,.89),day*.72+fr*.22)+.065*cloud,.15+.40*fr);return;}
if(style==13){outColor=vec4(mix(vec3(1.,.78,.34),vec3(1.,.91,.62),day*.45),1.);return;}
if(style==14)col=mix(vec3(.96,.62,.29),col,.28+.71*day);
if(style==8){float d=length(P.xz-vec2(-3.3,0.));vec3 ground=mix(vec3(.888,.872,.828),vec3(.939,.925,.89),smoothstep(7.,37.,d));col=mix(vec3(.202,.254,.285),ground,day)*(.87+.13*vis);}
col+=.0032*(hash(gl_FragCoord.xy)-.5);outColor=vec4(col,1.);}`;
const sv=`#version 300 es\nlayout(location=0)in vec3 p;uniform mat4 vp;void main(){gl_Position=vp*vec4(p,1.);}`;
const sf=`#version 300 es\nprecision mediump float;void main(){}`;
const pv=`#version 300 es\nout vec2 uv;void main(){vec2 a=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=a;gl_Position=vec4(a*2.-1.,0.,1.);}`;
const pf=`#version 300 es
precision highp float;precision highp sampler2D;in vec2 uv;out vec4 C;uniform sampler2D im,depthTex;uniform vec2 dims;uniform float clipN,clipF,projY;
float zz(vec2 q){float d=texture(depthTex,q).r;return clipN*clipF/(clipF-d*(clipF-clipN));}
void main(){vec3 a=texture(im,uv).rgb;float z=zz(uv);if(z>clipF*.95){C=vec4(a,1);return;}vec2 tex=1./dims;
// Small-radius, slope-aware screen-space contact shading (world-space near limit).
float oc=0.;float pix=clamp(.083*projY*dims.y/(2.*z),3.,21.);for(int i=0;i<6;i++){float t=(float(i)+.15)*.523599;vec2 v=vec2(cos(t),sin(t))*tex*pix;float z1=zz(clamp(uv+v,tex,1.-tex));float z2=zz(clamp(uv-v,tex,1.-tex));float d1=z-z1,d2=z-z2;float lim=min(.28,.15*z);float d=max(d1,d2);float conc=(d1+d2)/max(.0001,(abs(d1)+abs(d2)));oc+=smoothstep(.003,lim*.40,d)*(1.-smoothstep(lim*.62,lim*1.9,d))*smoothstep(.01,.75,conc);}
C=vec4(a*(1.-.14*oc/6.),1.);}`;
async function build(canvas,buffer){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)throw new Error('WebGL 2 is not available');
 function program(v,f){function shader(t,s){let h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(h));return h}let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
 const main=program(vs,fs),cast=program(sv,sf),pickProgram=program(sv,`#version 300 es\nprecision highp float;uniform float id;out vec4 C;void main(){C=vec4(id,0.,0.,1.);}`),post=program(pv,pf);function locs(p,n){return Object.fromEntries(n.split(' ').map(k=>[k,gl.getUniformLocation(p,k)]))}const m=locs(main,'vp lightIn lightOut eye base style room atlas shIn shOut digital daylight clockAngles sunDir hull monument flow'),d=locs(cast,'vp'),pk=locs(pickProgram,'vp id'),pp=locs(post,'im depthTex dims clipN clipF projY');
 const rainP=program(`#version 300 es
uniform mat4 vp;uniform vec4 weather;uniform vec2 kind;void main(){float i=float(gl_VertexID/2),j=float(gl_VertexID%2);float a=6.2831853*fract(i*.61803398875),r=sqrt(fract((i+.43)*.7548777))*weather.w*.993;float h=mod(fract(i*.32129)*49.-weather.x*mix(20.,4.,kind.x),49.);vec3 p=vec3(weather.y+r*cos(a),-6.95+h,weather.z+r*sin(a));p.x+=kind.x*sin(i+h*.1)*.4;p+=j*mix(vec3(.75,3.55,.20),vec3(.18,.76,.06),kind.x);gl_Position=vp*vec4(p,1.);}`,`#version 300 es
precision highp float;uniform vec2 kind;out vec4 col;void main(){col=vec4(mix(vec3(.63,.76,.88),vec3(.96,.98,1.),kind.x+.17*(1.-kind.y)),.46);}`),pr=locs(rainP,'vp weather kind');
 let raw=new Uint8Array(buffer),dv=new DataView(buffer),jl=dv.getUint32(12,true),g=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+jl))),bin=28+jl;function view(i){const v=g.bufferViews[i],at=bin+(v.byteOffset||0);return raw.subarray(at,at+v.byteLength)};
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);const blob=new Blob([view(g.images[0].bufferView)],{type:g.images[0].mimeType});const url=URL.createObjectURL(blob);const img=new Image();try{await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img)}finally{URL.revokeObjectURL(url)}gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
 const objs=[];function bindbuf(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;}
 for(let group=0;group<g.meshes.length;group++)for(const p of g.meshes[group].primitives){const vao=gl.createVertexArray();gl.bindVertexArray(vao);for(const [key,loc,size] of [['POSITION',0,3],['NORMAL',1,3],['TEXCOORD_0',2,2]]){if(p.attributes[key]===undefined)continue;let a=g.accessors[p.attributes[key]];bindbuf(gl.ARRAY_BUFFER,view(a.bufferView));gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)}let a=g.accessors[p.indices];bindbuf(gl.ELEMENT_ARRAY_BUFFER,view(a.bufferView));let mat=g.materials[p.material].extras;let name=g.meshes[group].name||'';let key=name.includes('02 / Science')?1:name.includes('02 / IJRR')?2:name.includes('GoFa')?3:name.includes('Selig')?4:name.startsWith('03')?5:name.includes('cathedral')?6:name.includes('railway station')?7:name.endsWith('broglie')?8:name.endsWith('kleber')?9:g.materials[p.material].name==='river'?10:0;objs.push({vao,group,name,key,matName:g.materials[p.material].name,boat:name.includes('bateau ')?Number(name.slice(-1)):-1,festive:name.includes('festive '),room:/^0[12]/.test(name),city:name.startsWith('05'),index:a.componentType,count:a.count,style:mat.style,base:mat.srgb})}
 let gv=gl.createVertexArray();gl.bindVertexArray(gv);bindbuf(gl.ARRAY_BUFFER,new Float32Array([-3500,-15,-3500,-3500,-15,3500,3500,-15,3500,3500,-15,-3500]));gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);bindbuf(gl.ARRAY_BUFFER,new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]));gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);bindbuf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]));objs.push({vao:gv,group:-1,key:0,room:false,city:false,index:gl.UNSIGNED_SHORT,count:6,style:8,base:[.90,.89,.86]});
 function depthtex(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
 function check(){if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Framebuffer unsupported');}
 gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
 // Reuse two depth targets. Only refresh shadows when the light has moved appreciably.
 function shadowTarget(at,extent,dist,inside){const n=Math.min(innerWidth<650?768:1280,gl.getParameter(gl.MAX_TEXTURE_SIZE)),t=depthtex(n,n),fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);check();gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {n,t,fb,at,extent,dist,inside,v:null};}
 function projectShadow(z,L){const {n,at,extent,dist,inside}=z;gl.bindFramebuffer(gl.FRAMEBUFFER,z.fb);gl.viewport(0,0,n,n);gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);z.v=mm(ortho(extent,.5,dist*2.1),look(at.map((a,i)=>a+L[i]*dist),at));gl.useProgram(cast);gl.uniformMatrix4fv(d.vp,false,z.v);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.,2.);for(const o of objs){if(o.group===-1||o.city||o.style>=9||(inside&&!o.room))continue;gl.bindVertexArray(o.vao);gl.drawElements(gl.TRIANGLES,o.count,o.index,0);}gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 const lin=shadowTarget([-21.25,.9,-.1],4.8,10,true),lout=shadowTarget([-10,-1,-2],26,57,false),neutral=unit([-.46,.79,.64]);let shadowDir=neutral;projectShadow(lin,neutral);projectShadow(lout,neutral);
 gl.useProgram(main);gl.uniformMatrix4fv(m.lightIn,false,lin.v);gl.uniformMatrix4fv(m.lightOut,false,lout.v);gl.uniform1i(m.atlas,0);gl.uniform1i(m.shIn,1);gl.uniform1i(m.shOut,2);gl.useProgram(post);gl.uniform1i(pp.im,3);gl.uniform1i(pp.depthTex,4);let frame=null,dt=null,ct=null,w=0,h=0;const empty=gl.createVertexArray();
 function targets(W,H){if(frame){gl.deleteFramebuffer(frame);gl.deleteTexture(dt);gl.deleteTexture(ct)}w=canvas.width=W;h=canvas.height=H;frame=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,frame);ct=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,ct);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ct,0);dt=depthtex(w,h);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,dt,0);check()}
 function bindtex(u,t){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t)}
 objs.sort((a,b)=>(a.style===12)-(b.style===12));let lastCam=null,lastVP=null,lastT=0,cityState=null;const ids=['','science','ijrr','robot','book','ihu','cathedral','gare','broglie','kleber','ill'];const visible=(o,t)=>!(o.city&&t<.525)&&!(o.room&&t>.93)&&(!o.festive||cityState?.festive);
 const orbital=await AtlasOrbital.init(gl,program,window.ATLAS_ASSETS.planet);const mark=await AtlasMark.build(gl,program);gl.useProgram(main);gl.uniform1i(m.digital,8);let geography=null;
 return {get camera(){return lastCam},get geography(){return geography},project(p){if(!lastVP)return null;const v=lastVP,q=[...p,1],a=[0,0,0,0].map((_,r)=>q.reduce((z,x,i)=>z+x*v[4*i+r],0));return a[3]>0&&Math.abs(a[2]/a[3])<=1?[(a[0]/a[3]+1)*.5,(1-a[1]/a[3])*.5]:null},
 pick(x,y){if(!lastVP||!frame)return '';const r=canvas.getBoundingClientRect(),px=clamp(Math.floor((x-r.left)/r.width*w),0,w-1),py=clamp(h-1-Math.floor((y-r.top)/r.height*h),0,h-1);gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.viewport(0,0,w,h);gl.enable(gl.SCISSOR_TEST);gl.scissor(px,py,1,1);gl.enable(gl.DEPTH_TEST);gl.disable(gl.DITHER);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(pickProgram);gl.uniformMatrix4fv(pk.vp,false,lastVP);for(const o of objs){if(!visible(o,lastT)||o.boat>=0)continue;gl.uniform1f(pk.id,(o.key||0)/255);gl.bindVertexArray(o.vao);gl.drawElements(gl.TRIANGLES,o.count,o.index,0);}let col=new Uint8Array(4);gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,col);gl.disable(gl.SCISSOR_TEST);gl.enable(gl.DITHER);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return ids[col[0]]||'';},
 draw(t,env=[1,1,0,0],hands=[0,0,0],detail=null,move={},progress=t*.65,solarDir=null){const aspect=Math.max(.01,canvas.clientWidth/canvas.clientHeight);const scale=Math.min(Math.max(1.25,devicePixelRatio||1),1.6,1600/Math.max(1,canvas.clientWidth));let W=Math.max(2,Math.round(canvas.clientWidth*scale)),H=Math.max(2,Math.round(canvas.clientHeight*scale));if(w!==W||h!==H)targets(W,H);
 mark.draw(move);const planet=()=>{const anchor=(progress<.750)?this.project(window.ATLAS_ASSETS.geo.sites.ihu.world):null;geography=orbital(progress,w,h,move.glon||0,move.glat||0,anchor)}; geography=null;if(progress>=.750&&!detail){planet();return;}
 // The cutaway has an open wall, so these are illustrative sun studies, not a building simulation.
 const ent=solarDir&&env[0]>.06?unit([solarDir[0],Math.max(.075,solarDir[1]),solarDir[2]]):neutral;
 if(dot(shadowDir,ent)<.99988){projectShadow(lin,ent);projectShadow(lout,ent);shadowDir=ent;}
 let eye=[spline(t,1),spline(t,2),spline(t,3)],aim=[spline(t,4),spline(t,5),spline(t,6)],fov=spline(t,7);
 // Fit the model on narrow screens, retaining the window and furniture on the same camera line.
 let v0=clamp((t-.68)/.32),v1=clamp((t-.16)/.20);let ref=mix(mix(1.04,1.33,v1),1.46,v0);ref=mix(ref,1.10,clamp((t-.79)/.15));let fit=Math.max(1,ref/aspect);if(fit>1){fov=Math.min(78,2*Math.atan(Math.tan(fov*Math.PI/360)*fit)*180/Math.PI)}
 if(aspect<.86 && t>.61 && t<.90){let boost=mix(1,Math.max(1,.87/aspect),clamp((t-.61)/.22));eye=eye.map((v,i)=>aim[i]+(v-aim[i])*boost)}
 if(detail){eye=detail.eye.slice();aim=detail.aim.slice();fov=detail.fov||40;const fit=Math.max(1,1.07/aspect);fov=Math.min(83,2*Math.atan(Math.tan(fov*Math.PI/360)*fit)*180/Math.PI);}
 // Ease offsets to zero at the ends of the navigable bay; projection and hit tests share this view.
 if(!detail && t>.145 && t<.59){const smooth=x=>{x=clamp(x);return x*x*(3-2*x)},k=smooth((t-.145)/.065)*(1-smooth((t-.477)/.058));const dx=sub(eye,aim),r=Math.hypot(...dx),az=Math.atan2(dx[0],dx[2])+(move.yaw||0)*k,el=clamp(Math.asin(dx[1]/r)+(move.pitch||0)*k,-.13,.53);let ax=(move.x||0)*k,ay=(move.y||0)*k;aim=[aim[0]+ax*Math.cos(az),aim[1]+ay,aim[2]-ax*Math.sin(az)];const want=[aim[0]+Math.sin(az)*Math.cos(el)*r,aim[1]+Math.sin(el)*r,aim[2]+Math.cos(az)*Math.cos(el)*r];eye=[clamp(want[0],Math.min(eye[0],-2.57),Math.max(eye[0],2.57)),clamp(want[1],Math.min(eye[1],1.00),Math.max(eye[1],2.93)),clamp(want[2],Math.min(eye[2],-.43),Math.max(eye[2],5.2))];}
 if(progress>.65&&!detail){let v=clamp((progress-.65)/.060);v=v*v*(3-2*v);const diff=sub(eye,aim),anchor=window.ATLAS_ASSETS.geo.sites.ihu.world;aim=aim.map((x,i)=>mix(x,anchor[i],v*.92));eye=aim.map((x,i)=>x+diff[i]*(1+2.2*v));}
 let wing=clamp((t-.53)/.29);wing=wing*wing*(3-2*wing);const roomShift=detail?(['book','robot','science','ijrr'].includes(detail.id)?21.25:0):21.25*(1-wing);eye[0]-=roomShift;aim[0]-=roomShift;
 let near=detail?detail.near||.12:.028+.56*clamp((t-.565)/.17)**2+120*clamp((t-.77)/.23)**3;if(detail?.from&&detail.duration>0){const k=1-Math.pow(1-clamp((performance.now()-detail.at)/detail.duration),3),f=detail.from;eye=eye.map((x,i)=>mix(f.eye[i],x,k));aim=aim.map((x,i)=>mix(f.aim[i],x,k));fov=mix(f.fov,fov,k);near=Math.exp(mix(Math.log(f.near),Math.log(near),k));}lastCam={eye:eye.slice(),aim:aim.slice(),fov,near};const far=t>.73?3500:450,VP=mm(persp(fov,aspect,near,far),look(eye,aim));gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);lastVP=VP;lastT=t;gl.clearColor(mix(.202,.939,env[0]),mix(.254,.925,env[0]),mix(.285,.89,env[0]),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(main);gl.uniformMatrix4fv(m.vp,false,VP);gl.uniform3fv(m.eye,eye);gl.uniform3fv(m.sunDir,shadowDir);gl.uniformMatrix4fv(m.lightIn,false,lin.v);gl.uniformMatrix4fv(m.lightOut,false,lout.v);gl.uniform4fv(m.daylight,env);gl.uniform3fv(m.clockAngles,hands);bindtex(0,tex);bindtex(1,lin.t);bindtex(2,lout.t);bindtex(3,null);bindtex(4,null);
 cityState=t>=.525?AtlasCity.get():null;const sec=matchMedia('(prefers-reduced-motion: reduce)').matches?0:performance.now()/1000;gl.uniform1f(m.flow,cityState?.festive?sec:-sec);
 for(const o of objs){if(!visible(o,t))continue;gl.uniform4fv(m.hull,o.boat>=0?AtlasCity.boat(o.boat,sec):[0,0,0,0]);if(o.style===12){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}gl.uniform1i(m.monument,o.key||0);gl.uniform3fv(m.base,o.city&&cityState?.colors[o.matName]||o.base);gl.uniform1i(m.style,o.style);gl.uniform1i(m.room,o.room?1:0);gl.bindVertexArray(o.vao);gl.drawElements(gl.TRIANGLES,o.count,o.index,0)}gl.depthMask(true);gl.disable(gl.BLEND);
 if(cityState&&(cityState.wet||cityState.snow)&&progress>=.55){const geo=ATLAS_ASSETS.geo;gl.useProgram(rainP);gl.uniformMatrix4fv(pr.vp,false,VP);gl.uniform4f(pr.weather,sec,geo.centerWorld[0],geo.centerWorld[1],geo.radiusWorld);gl.uniform2f(pr.kind,cityState.snow?1:0,env[0]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.bindVertexArray(empty);gl.drawArrays(gl.LINES,0,3000);gl.depthMask(true);gl.disable(gl.BLEND)}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.useProgram(post);gl.uniform2f(pp.dims,w,h);gl.uniform1f(pp.clipN,near);gl.uniform1f(pp.clipF,far);gl.uniform1f(pp.projY,1/Math.tan(fov*Math.PI/360));bindtex(3,ct);bindtex(4,dt);gl.bindVertexArray(empty);gl.drawArrays(gl.TRIANGLES,0,3);
 if(progress>.65&&!detail)planet();
 }};
}
window.ResearchAtlasRenderer={build,frames};})();
