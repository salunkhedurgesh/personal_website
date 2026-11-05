/* The first chapter needs only the CNRS mark. Load the city when a later chapter is opened. */
window.ProgressiveAtlas={
 async build(canvas,getWorld,request){
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,powerPreference:'low-power'});
  if(!gl)throw Error('WebGL 2 unavailable');
  function program(vs,fs){
   const p=gl.createProgram();
   for(const [kind,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
    const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);
   }
   gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  const mark=await AtlasMark.build(gl,program);
  const blit=program(`#version 300 es
   out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`,
   `#version 300 es
   precision highp float;in vec2 uv;uniform sampler2D image;uniform vec2 fit;out vec4 color;
   void main(){color=texture(image,(uv-.5)*fit+.5);}`);
  const fit=gl.getUniformLocation(blit,'fit'),empty=gl.createVertexArray();gl.useProgram(blit);gl.uniform1i(gl.getUniformLocation(blit,'image'),0);
  let world=null,worldJob=null;
  function loadWorld(){
   if(!worldJob)worldJob=getWorld().then(buffer=>ResearchAtlasRenderer.build(canvas,buffer,request)).then(engine=>{
    world=engine;document.body.dataset.worldReady='true';request();return engine;
   }).catch(error=>{worldJob=null;console.warn('Tour chapter preview retained:',error.message);request()});
  }
  function drawLogo(move){
   const ratio=Math.min(devicePixelRatio||1,1.6),w=Math.max(2,Math.round(canvas.clientWidth*ratio)),h=Math.max(2,Math.round(canvas.clientHeight*ratio));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
   mark.draw(move);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
   gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.colorMask(true,true,true,true);
   gl.useProgram(blit);gl.bindVertexArray(empty);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mark.image);
   const aspect=w/h,source=16/9;gl.uniform2f(fit,Math.min(1,aspect/source)/1.43,Math.min(1,source/aspect)/1.43);
   gl.drawArrays(gl.TRIANGLES,0,3);
  }
  return {
   get camera(){return world?.camera},get geography(){return world?.geography},
   project:(...args)=>world?.project(...args),pick:(...args)=>world?.pick(...args),
   readyFor:progress=>world?world.readyFor(progress):progress<=.025&&!worldJob,
   draw(...args){
    const progress=args[5]??args[0]*.65;
    if(world){world.draw(...args);return}
    // The world builder awaits image decoding while configuring this GL context.
    // Keep its snapshot visible and avoid changing GL bindings during that work.
    if(progress>.025||worldJob){loadWorld();return}
    drawLogo(args[4]||{});
   }
  };
 }
};
