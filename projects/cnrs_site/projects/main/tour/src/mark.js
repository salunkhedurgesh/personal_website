(() => {
  'use strict';
  const cache = new WeakMap();
  async function build(g, program) {
    const raw = new Uint8Array(await PlayView.get('clay', 'assets/mark.glb')),
      dv = new DataView(raw.buffer),
      jl = dv.getUint32(12, true),
      j = JSON.parse(new TextDecoder().decode(raw.subarray(20, 20 + jl))),
      start = 28 + jl;
    const vs = `#version 300 es
precision highp float;layout(location=0)in vec3 aP;layout(location=1)in vec3 aN;layout(location=2)in vec2 aUv;layout(location=3)in vec2 aAo;uniform vec3 R,U,D;uniform float scale,aspect;uniform vec2 shift;out vec3 P,N;out vec2 uv,au;void main(){P=aP;N=aN;uv=aUv;au=aAo;gl_Position=vec4(dot(aP,R)*scale/aspect+shift.x,dot(aP,U)*scale+shift.y,-dot(aP,D)*.48,1.);}`;
    const fs = `#version 300 es
precision highp float;in vec3 P,N;in vec2 uv,au;uniform vec3 base,D;uniform vec4 photoMap;uniform float hasAO,strength,photoFace;uniform sampler2D normalTex,occTex,photoTex;out vec4 C;void main(){if(photoFace>.5&&N.z<-.001){vec3 photo=texture(photoTex,photoMap.zw-P.xy*photoMap.xy).rgb;C=vec4(photo*(.94+.06*abs(dot(normalize(N),D))),1.);return;}vec3 n=normalize(N),px=dFdx(P),py=dFdy(P);vec2 dx=dFdx(uv),dy=dFdy(uv);float de=dx.x*dy.y-dx.y*dy.x;vec3 map=texture(normalTex,uv).xyz*2.-1.;if(abs(de)>.000000001){vec3 T=normalize((px*dy.y-py*dx.y)*sign(de));vec3 B=normalize((-px*dy.x+py*dx.x)*sign(de));n=normalize(n+strength*(T*map.x+B*map.y));}vec3 L=normalize(vec3(-.88,1.35,1.38)),F=normalize(vec3(1.03,.6,.79)),K=normalize(vec3(.63,1.,-1.1));float ao=mix(1.,texture(occTex,au).r,.85*hasAO);float key=max(0.,dot(n,L)),fill=max(0.,dot(n,F)),rim=max(0.,dot(n,K));vec3 irr=vec3(.30+.08*(.5+.5*n.y))*ao+vec3(1.07,1.015,.94)*key*1.06*mix(.65,1.,ao)+vec3(.82,.94,1.12)*fill*.29+vec3(.95,1.,1.065)*rim*.63;float spec=.018*pow(max(0.,dot(n,normalize(D+L))),13.)*key;vec3 col=base*irr+spec;col=mix(col,.7+.3*(1.-exp(-max(vec3(0),col-.7)/.3)),greaterThan(col,vec3(.7)));C=vec4(mix(col*12.92,1.055*pow(max(vec3(0),col),vec3(1./2.4))-.055,greaterThan(col,vec3(.0031308))),1.);}`;
    function shader(type, src) {
      const o = g.createShader(type);
      g.shaderSource(o, src);
      g.compileShader(o);
      if (!g.getShaderParameter(o, g.COMPILE_STATUS)) throw Error(g.getShaderInfoLog(o));
      return o;
    }
    const p = g.createProgram();
    g.attachShader(p, shader(g.VERTEX_SHADER, vs));
    g.attachShader(p, shader(g.FRAGMENT_SHADER, fs));
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw Error(g.getProgramInfoLog(p));
    g.useProgram(p);
    const u = {};
    for (const name of [
      'R',
      'U',
      'D',
      'scale',
      'aspect',
      'shift',
      'base',
      'hasAO',
      'strength',
      'normalTex',
      'occTex',
      'photoFace',
      'photoTex',
      'photoMap',
    ])
      u[name] = g.getUniformLocation(p, name);
    const vbytes = (i) => {
      const v = j.bufferViews[i];
      return raw.subarray(start + (v.byteOffset || 0), start + (v.byteOffset || 0) + v.byteLength);
    };
    const objs = j.meshes.map((mesh) => {
      const pr = mesh.primitives[0],
        vao = g.createVertexArray();
      g.bindVertexArray(vao);
      for (const [id, k, dim] of [
        [0, 'POSITION', 3],
        [1, 'NORMAL', 3],
        [2, 'TEXCOORD_0', 2],
        [3, 'TEXCOORD_1', 2],
      ]) {
        if (pr.attributes[k] === undefined) continue;
        const a = j.accessors[pr.attributes[k]],
          b = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, b);
        g.bufferData(g.ARRAY_BUFFER, vbytes(a.bufferView), g.STATIC_DRAW);
        g.enableVertexAttribArray(id);
        g.vertexAttribPointer(id, dim, g.FLOAT, false, 0, 0);
      }
      const ai = j.accessors[pr.indices],
        ib = g.createBuffer();
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib);
      g.bufferData(g.ELEMENT_ARRAY_BUFFER, vbytes(ai.bufferView), g.STATIC_DRAW);
      return {
        vao,
        count: ai.count,
        mat: j.materials[pr.material],
        badge: mesh.name === 'Badge_blue_clay',
      };
    });
    for (let i = 0; i < j.images.length; i++) {
      const im = new Image(),
        objURL = URL.createObjectURL(
          new Blob([vbytes(j.images[i].bufferView)], { type: 'image/png' }),
        );
      await new Promise((res, rej) => {
        im.onload = res;
        im.onerror = rej;
        im.src = objURL;
      });
      const tex = g.createTexture();
      g.activeTexture(g.TEXTURE0 + 9 + i);
      g.bindTexture(g.TEXTURE_2D, tex);
      g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL, g.NONE);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, im);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.generateMipmap(g.TEXTURE_2D);
      URL.revokeObjectURL(objURL);
    }
    g.uniform1i(u.normalTex, 9);
    g.uniform1i(u.occTex, 10);
    g.uniform1i(u.photoTex, 11);
    let photo = null;
    try {
      const portrait = new Image();
      await new Promise((resolve, reject) => {
        portrait.onload = resolve;
        portrait.onerror = reject;
        portrait.src = '../../../images/profile_pic_nino.png?v=' + window.ATLAS_VERSION;
      });
      const texture = g.createTexture();
      g.activeTexture(g.TEXTURE0 + 11);
      g.bindTexture(g.TEXTURE_2D, texture);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, portrait);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.generateMipmap(g.TEXTURE_2D);
      // Print directly onto the badge's own back faces. Their geometry cuts the
      // photo to the exact CNRS outline, including its curved, irregular edge.
      const badge = j.meshes.find((mesh) => mesh.name === 'Badge_blue_clay'),
        bounds = j.accessors[badge.primitives[0].attributes.POSITION],
        width = bounds.max[0] - bounds.min[0],
        height = bounds.max[1] - bounds.min[1],
        aspect = width / height,
        photoAspect = portrait.width / portrait.height,
        sx = Math.min(1, aspect / photoAspect) / width,
        sy = Math.min(1, photoAspect / aspect) / height;
      photo = {
        texture,
        map: [
          sx,
          sy,
          0.5 + ((bounds.min[0] + bounds.max[0]) / 2) * sx,
          0.5 + ((bounds.min[1] + bounds.max[1]) / 2) * sy,
        ],
      };
    } catch {
      // The CNRS face remains usable if the portrait cannot be downloaded.
    }
    const W = 1440,
      H = 810,
      fb = g.createFramebuffer(),
      image = g.createTexture();
    g.activeTexture(g.TEXTURE0 + 8);
    g.bindTexture(g.TEXTURE_2D, image);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, W, H, 0, g.RGBA, g.UNSIGNED_BYTE, null);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    const depth = g.createRenderbuffer();
    g.bindRenderbuffer(g.RENDERBUFFER, depth);
    g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, W, H);
    g.bindFramebuffer(g.FRAMEBUFFER, fb);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, image, 0);
    g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, depth);
    if (g.checkFramebufferStatus(g.FRAMEBUFFER) !== g.FRAMEBUFFER_COMPLETE)
      throw Error('Mark target');
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    const sky = program(
        `#version 300 es
out vec2 st;void main(){st=vec2((gl_VertexID<<1)&2,gl_VertexID&2)*2.-1.;gl_Position=vec4(st,0,1);}`,
        `#version 300 es
precision highp float;in vec2 st;uniform vec2 offset;out vec4 col;void main(){vec2 P=st-offset;float s=exp(-pow((P.x-.025)/.21,2.)-pow((P.y+.592)/.032,2.))*.22+exp(-pow((P.x-.074)/.32,2.)-pow((P.y+.61)/.068,2.))*.094;vec3 b=vec3(.980392,.984314,.972549);col=vec4(b*(1.-s),1);}`,
      ),
      su = g.getUniformLocation(sky, 'offset'),
      empty = g.createVertexArray();
    let last = '',
      pose = { yaw: 0.38, pitch: 0.14, mx: 0, my: 0 };
    return {
      image,
      hasPortrait: !!photo,
      hit(x, y, canvas) {
        const rect = canvas.getBoundingClientRect(),
          aspect = rect.width / Math.max(1, rect.height),
          source = W / H,
          px = ((2 * (x - rect.left)) / rect.width - 1) * Math.min(1, aspect / source) / 1.43,
          py = (1 - (2 * (y - rect.top)) / rect.height) * Math.min(1, source / aspect) / 1.43,
          rx = (0.602 / source) * Math.max(0.2, Math.abs(Math.cos(pose.yaw))),
          ry = 0.602 * Math.cos(pose.pitch);
        return ((px - pose.mx) / rx) ** 2 + ((py - pose.my) / ry) ** 2 <= 1.05;
      },
      draw(m = {}) {
        const { myaw = 0, mpitch = 0, mx = 0, my = 0, mflip = 0 } = m,
          key = [myaw, mpitch, mx, my, mflip].join('/');
        if (key === last) return;
        last = key;
        const yaw = 0.38 + myaw + (photo ? mflip : 0),
          pitch = 0.14 + mpitch,
          cy = Math.cos(yaw),
          sy = Math.sin(yaw),
          cp = Math.cos(pitch),
          sp = Math.sin(pitch),
          shift = [mx, my];
        pose = { yaw, pitch, mx, my };
        g.bindFramebuffer(g.FRAMEBUFFER, fb);
        g.viewport(0, 0, W, H);
        g.disable(g.DEPTH_TEST);
        g.disable(g.CULL_FACE);
        g.disable(g.BLEND);
        g.useProgram(sky);
        g.uniform2fv(su, shift);
        g.bindVertexArray(empty);
        g.drawArrays(g.TRIANGLES, 0, 3);
        g.clear(g.DEPTH_BUFFER_BIT);
        g.enable(g.DEPTH_TEST);
        g.enable(g.CULL_FACE);
        g.useProgram(p);
        g.uniform2fv(u.shift, shift);
        g.uniform3fv(u.D, [sy * cp, sp, cy * cp]);
        g.uniform3fv(u.R, [cy, 0, -sy]);
        g.uniform3fv(u.U, [-sy * sp, cp, -cy * sp]);
        g.uniform1f(u.scale, 0.602);
        g.uniform1f(u.aspect, W / H);
        if (photo) {
          g.uniform4fv(u.photoMap, photo.map);
          g.activeTexture(g.TEXTURE0 + 11);
          g.bindTexture(g.TEXTURE_2D, photo.texture);
        }
        for (const o of objs) {
          g.uniform1f(u.photoFace, photo && o.badge ? 1 : 0);
          g.uniform3fv(u.base, o.mat.pbrMetallicRoughness.baseColorFactor.slice(0, 3));
          g.uniform1f(u.hasAO, o.mat.occlusionTexture ? 1 : 0);
          g.uniform1f(u.strength, o.mat.normalTexture.scale);
          g.bindVertexArray(o.vao);
          g.drawElements(g.TRIANGLES, o.count, g.UNSIGNED_SHORT, 0);
        }
        g.disable(g.CULL_FACE);
        g.bindFramebuffer(g.FRAMEBUFFER, null);
        g.activeTexture(g.TEXTURE0 + 8);
        g.bindTexture(g.TEXTURE_2D, image);
        g.generateMipmap(g.TEXTURE_2D);
        g.activeTexture(g.TEXTURE0);
      },
    };
  }
  window.AtlasMark = {
    build(g, program) {
      if (!cache.has(g))
        cache.set(
          g,
          build(g, program).catch((error) => {
            cache.delete(g);
            throw error;
          }),
        );
      return cache.get(g);
    },
  };
})();
