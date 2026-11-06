/* Seasonal sets use local solid geometry and the robot assembly's placement clock. */
window.ClaySeasons = {
  build(e) {
    const {T, TAU, mat, keep, M, grp, ell, box, cyl, rod, curve, lathe, bevel,
      C, V, clamp, ease, rand, units, root, width, snowMat, tex, actions} = e;
    const left = -width / 2, right = width / 2;
    if (!['diwali', 'christmas', 'snow'].includes(e.theme)) return;

    const gold = mat('#d5a340', .3, .65);
    const cord = mat('#695541', .9);
    const glow = (hex, intensity = 1.2) => mat(hex, .27, .05, {
      emissive: C(hex), emissiveIntensity: intensity
    });
    const warm = glow('#ffd98a');

    function ring(parent, x, y, z, radius, tube, material) {
      const mesh = M(parent, new T.TorusGeometry(radius, tube, 6, 32), material, x, y, z);
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    }

    function solidShape(parent, shape, depth, material) {
      const geometry = new T.ExtrudeGeometry(shape, {
        depth, bevelEnabled: true, bevelSize: .012,
        bevelThickness: .012, bevelSegments: 3, curveSegments: 12
      });
      geometry.translate(0, 0, -depth / 2);
      return M(parent, geometry, material);
    }

    function instances(parent, geometry, material, entries, name) {
      const mesh = new T.InstancedMesh(geometry, material, entries.length);
      const obj = new T.Object3D();
      entries.forEach((item, i) => {
        obj.position.fromArray(item.p);
        obj.scale.fromArray(item.s || [1, 1, 1]);
        obj.rotation.set(...(item.r || [0, 0, 0]));
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
        if (item.c) mesh.setColorAt(i, C(item.c));
      });
      mesh.name = name;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function snowfall() {
      const count = 128, positions = new Float32Array(count * 3);
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(positions, 3));
      const material = keep(new T.PointsMaterial({
        color: C('#d9e8ef'), size: .033, transparent: true, opacity: .85, depthWrite: false
      }));
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>',
          'float flake = length(gl_PointCoord - .5) * 2.;\n' +
          'if (flake > 1.) discard; diffuseColor.a *= 1. - smoothstep(.25, 1., flake);\n' +
          '#include <alphatest_fragment>');
      };
      const flakes = new T.Points(geo, material);
      flakes.name = 'Slow falling snow';
      flakes.frustumCulled = false;
      root.add(flakes);
      actions.push(t => {
        for (let i = 0; i < count; i++) {
          positions[i * 3] = left - .65 + rand(i + 81) * (width + 1.3) + .07 * Math.sin(t * .7 + i);
          positions[i * 3 + 1] = 2.8 - ((rand(i + 90) * 3 + t * (.15 + rand(i + 77) * .24)) % 3);
          positions[i * 3 + 2] = -.9 + rand(i + 380) * 1.45;
        }
        geo.attributes.position.needsUpdate = true;
      });
    }

    function snowbed() {
      // One wind-shaped surface spans the name, with broad, shallow variations.
      // The footprint fades into the ground instead of piling a sphere at each foot.
      const depth = e.theme === 'snow' ? 2.2 : 1;
      const nx = 160, nz = 20, positions = [], uv = [], indices = [];
      for (let i = 0; i <= nx; i++) {
        const along = i / nx;
        const x = left - .60 + (width + 1.2) * along;
        const taper = ease(along / .065) * (1 - ease((along - .935) / .065));
        const back = -.52 + .035 * Math.sin(x * .53 + 1.2);
        const front = .52 + .035 * Math.sin(x * .71) + .018 * Math.sin(x * 1.44 + .7);
        for (let j = 0; j <= nz; j++) {
          const across = j / nz, z = back + (front - back) * across;
          const profile = Math.sin(Math.PI * across) ** 1.6;
          const broadDrift = .067 * (1 + .10 * Math.sin(x * .56 + .4) + .06 * Math.cos(x * .93 - across));
          const windRipple = .0012 * Math.sin(x * 4.6 + across * 5.1) + .0007 * Math.cos(x * 7.2 - across * 3);
          const y = -.012 + depth * taper * profile * (broadDrift + windRipple);
          positions.push(x, y, z);
          uv.push(x * .9, z * 2);
          if (i && j) {
            const a = i * (nz + 1) + j;
            indices.push(a - nz - 2, a, a - 1, a - nz - 2, a - nz - 1, a);
          }
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const driftMaterial = mat('#cadce5', .98, 0, {bumpMap: tex, bumpScale: .003, envMapIntensity: .12});
      const bed = M(root, geo, driftMaterial);
      bed.name = 'Continuous soft snow beneath the letters';
    }

    function diwali() {
      const terracotta = mat('#b75b34', .72, .03, {bumpMap: tex, bumpScale: .006});
      const clayEdge = mat('#ce8050', .68, .03), oil = mat('#a76a22', .16, .24);
      const wick = mat('#ead7af', .98), char = mat('#3c2e27', .98);
      const flameAmber = glow('#ffac31', 1.5), flameCore = glow('#fff0b5', 1.6);
      const ruby = mat('#ad3840', .72, .05);
      const sparksMaterial = keep(new T.MeshBasicMaterial({color: C('#ffd483')}));

      function diya(parent, x, y, z, scale, phase) {
        const lamp = grp(parent, x, y, z);
        lamp.name = 'Diwali / sculpted terracotta oil lamp';
        lamp.scale.setScalar(scale);
        lathe(lamp, [[.063,0],[.085,.007],[.091,.021],[.076,.03]], terracotta,0,0,0,48);
        const bowl = lathe(lamp, [[0,.018],[.075,.021],[.15,.047],[.204,.088],[.239,.128],
          [.242,.139],[.227,.142],[.209,.117],[.172,.083],[.106,.047],[0,.036]], terracotta,0,0,0,72);
        const p=bowl.geometry.attributes.position;
        for(let i=0;i<p.count;i++){
          const forward=Math.max(0,p.getX(i)/.242),pinch=forward**7*clamp(p.getY(i)/.13);
          p.setXYZ(i,p.getX(i)+.082*pinch,p.getY(i)+.015*pinch,p.getZ(i)*.78*(1-.18*pinch));
        }
        bowl.geometry.computeVertexNormals();
        const rim=[];
        for(let i=0;i<=64;i++){
          const a=i*TAU/64,f=Math.max(0,Math.cos(a))**7;
          rim.push([.239*Math.cos(a)+.082*f,.14+.015*f,.239*Math.sin(a)*.78*(1-.18*f)]);
        }
        curve(lamp,rim,.008,clayEdge);
        curve(lamp,rim.map(p=>[p[0],p[1]+.004,p[2]]),.0038,gold);
        ell(lamp,0,.097,0,.181,.005,.139,oil);
        curve(lamp,[[.10,.102,0],[.205,.13,0],[.29,.155,0]],.011,wick);
        ell(lamp,.293,.156,0,.013,.013,.011,char);
        const fire=grp(lamp,.291,.158,0);
        fire.name='Oil lamp / layered teardrop flame';
        const outer=lathe(fire,[[0,0],[.025,.016],[.035,.052],[.029,.092],[.018,.145],[.005,.205],[0,.217]],flameAmber,0,0,0,28);
        const fp=outer.geometry.attributes.position;
        for(let i=0;i<fp.count;i++)fp.setX(i,fp.getX(i)+.024*(fp.getY(i)/.217)**2);
        outer.geometry.computeVertexNormals();outer.scale.z=.66;
        const inner=lathe(fire,[[0,0],[.017,.014],[.020,.046],[.013,.083],[0,.137]],flameCore,0,0,.017,24);
        inner.scale.z=.60;
        for(let j=0;j<16;j++){
          const a=j*TAU/16;
          ell(lamp,.201*Math.cos(a),.095,.201*Math.sin(a)*.78,.009,.007,.006,gold);
        }
        actions.push(t=>{
          fire.rotation.z=.055*Math.sin(t*5.1+phase)+.022*Math.sin(t*8.7+phase);
          fire.scale.set(1+.035*Math.sin(t*7+phase),1+.065*Math.sin(t*6+phase),1);
        });
        return lamp;
      }
      // Roof lamps rest on measured cap surfaces, including the separate U/N uprights.
      [{i:1,top:0},{i:4,top:0},{i:6,top:1},{i:8,top:0},{i:11,top:1}].forEach(({i,top},j)=>{
        const u=units[i],support=AtelierArt.suspensionTops(u.body.geometry)[top];
        const lamp=diya(u.g,support.x,support.y+.002,0,.64,j);
        lamp.userData.roofSupport={letter:u.ch,index:i,top,point:support.toArray()};
        u.roofLamp=lamp;
      });
      [left+.5,left+3,right-2.85,right-.42].forEach((x,i)=>diya(root,x,.006,.48,.90,i+5));
      for(const x of [left+2.5,right-2.5]){
        const light=new T.PointLight(0xffa83b,.40,2.4,2);light.position.set(x,.65,.48);root.add(light);
      }

      const carrier=grp(root);carrier.name='Robot-lifted Diwali lantern rope';
      const wireY=x=>1.30+.22*(x/(width/2+.20))**2;
      // End the left side over D so GoFa holds the rope inside the letterhead.
      const wireLeft=units[0].x,wireRight=right+.20,wireSpan=wireRight-wireLeft;
      const grips=[V(wireLeft,wireY(wireLeft),-.65),V(wireRight,wireY(wireRight),-.65)];
      e.carriedRig={kind:'lanterns',object:carrier,grips,gripDepth:.006};
      const moveCarrier=t=>{
        const lift=ease((t-11.3)/3.2),sway=ease((t-14.5)/1.2);
        carrier.position.y=.27*lift+.014*Math.sin((t-14.5)*.85)*sway;
        carrier.rotation.z=.0018*Math.sin((t-14.5)*.7)*sway;
        carrier.userData.liftProgress=lift;
      };
      e.carriedRig.update=moveCarrier;actions.push(moveCarrier);
      const wirePoints=Array.from({length:49},(_,i)=>{const x=wireLeft+wireSpan*i/48;return [x,wireY(x),-.65]});
      curve(carrier,wirePoints,.011,cord).name='Diwali / braided festoon rope';
      // Small end sleeves give the robot fingers a clear, solid grasp.
      grips.forEach(p=>{const sleeve=cyl(carrier,p.x,p.y,p.z,.018,.018,.08,gold,16);sleeve.rotation.z=Math.PI/2});
      const bulbs=[],sockets=[];
      for(let i=0;i<30;i++){
        const x=wireLeft+.12+(wireSpan-.24)*i/29,y=wireY(x);
        sockets.push({p:[x,y-.027,-.65],s:[.020,.045,.020]});
        bulbs.push({p:[x,y-.083,-.65],s:[.030,.045,.030]});
      }
      instances(carrier,new T.CylinderGeometry(1,1,1,12),gold,sockets,'Diwali / brass bulb sockets');
      const lights=instances(carrier,new T.SphereGeometry(1,16,10),warm,bulbs,'Diwali / warm glass light bulbs');lights.castShadow=false;
      const papers=[mat('#df9b46',.72,0,{emissive:C('#f3ac4c'),emissiveIntensity:.32,side:T.DoubleSide}),
        mat('#ca6950',.78,0,{emissive:C('#e59552'),emissiveIntensity:.22,side:T.DoubleSide}),
        mat('#e8c47a',.76,0,{emissive:C('#f5cb74'),emissiveIntensity:.30,side:T.DoubleSide})];
      function lantern(x,index){
        const g=grp(carrier,x,wireY(x)-.02,-.65);g.name='Diwali / folded-paper kandil lantern';
        g.scale.setScalar(.72);
        curve(g,[[0,0,0],[0,-.09,0],[.025,-.13,0]],.007,cord);
        const body=grp(g,0,-.34,0),profile=[[.055,.23],[.17,.12],[.19,-.07],[.068,-.22]];
        for(let side=0;side<8;side++){
          const a=side*TAU/8,b=(side+1)*TAU/8,vertices=[],indices=[];
          for(const [r,y] of profile)vertices.push(r*Math.cos(a),y,r*Math.sin(a),r*Math.cos(b),y,r*Math.sin(b));
          for(let row=1;row<profile.length;row++){const k=row*2;indices.push(k-2,k,k+1,k-2,k+1,k-1)}
          const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
          M(body,geo,papers[(side+index)%papers.length]);
          curve(body,profile.map(([r,y])=>[r*Math.cos(a),y,r*Math.sin(a)]),.006,gold);
          const tail=grp(body,.068*Math.cos(a),-.22,.068*Math.sin(a));
          const length=.20+.065*(side%3),strip=box(tail,0,-length/2,0,.021,length,.005,papers[(side+index)%3]);
          strip.rotation.z=.12*Math.sin(side*2);ell(tail,0,-length,.002,.008,.015,.008,gold);
          actions.push(t=>tail.rotation.z=.035*Math.sin(t*1.8+side+index));
        }
        cyl(body,0,.245,0,.058,.058,.034,gold,16);cyl(body,0,-.225,0,.071,.071,.024,gold,16);
        ell(body,0,0,0,.055,.11,.055,warm);
        actions.push(t=>{g.rotation.z=.035*Math.sin(t*.95+index*2.1);g.rotation.y=.10*Math.sin(t*.48+index)});
      }
      [left+1.65,(units[6].x+units[7].x)/2,right-1.65].forEach(lantern);

      function fountain(x, phase) {
        const g = grp(root, x, .012, .58);
        g.name = 'Diwali / cone firecracker fountain';
        cyl(g, 0, .13, 0, .025, .12, .26, ruby, 24);
        ring(g, 0, .044, 0, .095, .008, gold);
        ring(g, 0, .113, 0, .064, .008, gold);
        curve(g, [[0, .265, 0], [.018, .28, 0], [.04, .27, 0]], .006, cord);
        const count = 34, mesh = new T.InstancedMesh(new T.SphereGeometry(1, 6, 4), sparksMaterial, count);
        mesh.name = 'Firecracker / arcing gold embers';
        mesh.frustumCulled = false;
        g.add(mesh);
        const obj = new T.Object3D();
        actions.push(t => {
          // Gentle staggered fountains; sparks follow 3D ballistic arcs.
          const cycle = (t + phase) % 5.2;
          for (let i = 0; i < count; i++) {
            const age = (cycle + rand(i + 402) * 1.1) % 1.1;
            const a = rand(i + 601) * TAU, speed = .15 + rand(i + 916) * .36;
            obj.position.set(Math.cos(a) * speed * age, .26 + (1.65 + rand(i + 55) * .7) * age - 2.8 * age * age,
              Math.sin(a) * speed * age);
            const visible = cycle < 2.8 && obj.position.y > .26;
            const size = visible ? .010 * (1 - age * .65) : 0;
            obj.scale.set(size, size * 2.6, size);
            obj.rotation.z = -.3 + .6 * rand(i + 3);
            obj.updateMatrix();
            mesh.setMatrixAt(i, obj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        });
      }
      fountain(left + 1.60, .1);
      fountain(right - 1.65, 2.7);

      const pack = grp(root, .3, .035, .53);
      pack.name = 'Diwali / red firecracker bundle and braided fuse';
      pack.rotation.set(0, .12, -.07);
      for (let i = 0; i < 7; i++) {
        const cracker = grp(pack, (i - 3) * .085, .06 + .012 * Math.sin(i), 0);
        cracker.rotation.x = Math.PI / 2;
        cyl(cracker, 0, 0, 0, .037, .037, .24, ruby, 14);
        for (const y of [-.085, .085]) ring(cracker, 0, y, 0, .038, .007, gold);
        cyl(cracker, 0, .122, 0, .028, .028, .007, wick, 12);
      }
      curve(pack, [[-.34, .07, .14], [0, .085, .15], [.35, .07, .14], [.44, .045, .22]], .008, cord);
    }

    function christmas() {
      const pine = mat('#285a42', .9), pineTip = mat('#3c7658', .88);
      const bark = mat('#74533b', .96), red = mat('#b43540', .92, 0, {bumpMap: tex, bumpScale: .012});
      const bauble = mat('#bd3542', .23, .35);
      const gap = (units[6].x + units[7].x) / 2;
      const tree = grp(root, gap, .005, -1.05);
      tree.name = 'Christmas / decorated background fir tree';
      cyl(tree, 0, .2, 0, .065, .085, .4, bark, 12);
      ell(tree, 0, .006, 0, .76, .075, .48, snowMat);
      for (let i = 0; i < 5; i++) {
        const y = .40 + i * .315, radius = .69 - i * .117, height = .72 - i * .052;
        const tier = cyl(tree, 0, y + height / 2, 0, .018, radius, height, i % 2 ? pineTip : pine, 13);
        tier.rotation.y = i * .41;
        const cap = cyl(tree, 0, y + height * .68, 0, .014, radius * .56, height * .62, snowMat, 13);
        cap.rotation.y = i * .41;
      }
      const ribbon = [], bulbs = [], ornaments = [];
      for (let i = 0; i <= 96; i++) {
        const u = i / 96, y = .53 + 1.4 * u, radius = .64 * (1 - u) + .09, a = u * TAU * 3.6;
        ribbon.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
        if (i % 4 === 0) bulbs.push({p: ribbon[i], s: [.024, .027, .024]});
      }
      curve(tree, ribbon, .009, gold);
      instances(tree, new T.SphereGeometry(1, 10, 8), warm, bulbs, 'Christmas tree / warm fairy lights');
      for (let i = 0; i < 18; i++) {
        const u = i / 18, y = .55 + 1.25 * u, a = i * 2.4, radius = .66 * (1 - u) + .04;
        ornaments.push({p: [Math.cos(a) * radius, y, Math.sin(a) * radius], s: [.053, .061, .053]});
      }
      instances(tree, new T.SphereGeometry(1, 12, 8), bauble, ornaments, 'Christmas tree / red glass ornaments');
      const star = new T.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + i * TAU / 10, radius = i % 2 ? .073 : .17;
        if (i === 0) star.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else star.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      star.closePath();
      solidShape(tree, star, .04, gold).position.y = 2.20;

      function stocking(u, index) {
        // Anchor the loop on an actual top surface, including curved glyphs.
        const p = u.body.geometry.attributes.position;
        let anchor = 0, best = Infinity;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > .95 && Math.abs(p.getX(i)) < best) {
          anchor = p.getX(i); best = Math.abs(anchor);
        }
        const sock = grp(u.g, anchor, 1.018, .31);
        sock.name = 'Christmas / hanging stocking ' + (index + 1);
        curve(sock, [[-.045, -.075, 0], [-.06, .032, -.04], [.02, .045, -.06], [.052, -.075, 0]], .011, gold);
        const body = new T.Shape();
        body.moveTo(-.12, -.085); body.lineTo(.11, -.085); body.lineTo(.10, -.33);
        body.bezierCurveTo(.12, -.39, .26, -.36, .275, -.45);
        body.bezierCurveTo(.30, -.57, .10, -.61, -.02, -.55);
        body.bezierCurveTo(-.15, -.49, -.115, -.37, -.12, -.085);
        body.closePath();
        solidShape(sock, body, .10, red);
        bevel(sock, -.005, -.11, .015, .29, .115, .14, .028, snowMat);
        ell(sock, -.055, -.43, .062, .065, .075, .014, snowMat);
        ell(sock, .228, -.48, .063, .046, .060, .014, snowMat);
        for (let j = 0; j < 6; j++) {
          ell(sock, -.122 + j * .047, -.10 + .005 * Math.sin(j), .075, .029, .049, .025, snowMat);
        }
        // Simple stitched snowflake on the front of each stocking.
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          rod(sock, [-.065 * Math.cos(a), -.285 - .065 * Math.sin(a), .071],
            [.065 * Math.cos(a), -.285 + .065 * Math.sin(a), .071], .006, snowMat);
        }
        actions.push(t => sock.rotation.z = -.09 + index * .08 + .035 * Math.sin(t * 1.3 + index * 2));
      }
      [2, 7, 10].forEach((index, i) => stocking(units[index], i));
    }

    function winterScarf(u, index, start, duration) {
      const scarf = grp(u.g);
      scarf.name = 'Snowfall / winter scarf / ' + u.ch;
      scarf.visible = false;
      const base = ['#b64038', '#bd9138', '#466d8b'][index], cream = '#f2dfb3';
      const knit = mat('#ffffff', .96, 0, {vertexColors: true, bumpMap: tex, bumpScale: .008});
      const plain = mat(base, .96, 0, {bumpMap: tex, bumpScale: .008});
      const fringe = mat(cream, .97);
      const bounds = u.body.geometry.boundingBox;
      const center = (bounds.min.x + bounds.max.x) / 2;
      const rx = (bounds.max.x - bounds.min.x) / 2 + .055;
      const rz = Math.max(Math.abs(bounds.min.z), bounds.max.z) * u.body.scale.z + .055;
      const radius = .095, y = .69;
      // A rounded rectangular collar wraps outside the full depth of the glyph.
      const path = new T.Shape();
      path.moveTo(rx - radius, rz);
      path.lineTo(-rx + radius, rz);
      path.quadraticCurveTo(-rx, rz, -rx, rz - radius);
      path.lineTo(-rx, -rz + radius);
      path.quadraticCurveTo(-rx, -rz, -rx + radius, -rz);
      path.lineTo(rx - radius, -rz);
      path.quadraticCurveTo(rx, -rz, rx, -rz + radius);
      path.lineTo(rx, rz - radius);
      path.quadraticCurveTo(rx, rz, rx - radius, rz);
      const segments = 96, sides = 8, points = path.getSpacedPoints(segments);
      const positions = [], colors = [], uv = [], indices = [];
      for (let i = 0; i <= segments; i++) {
        const point = points[i], prev = points[i ? i - 1 : segments - 1], next = points[i === segments ? 1 : i + 1];
        const tangent = new T.Vector2().subVectors(next, prev).normalize();
        const normal = new T.Vector2(tangent.y, -tangent.x);
        const color = C(i % 24 < 4 ? cream : base);
        for (let j = 0; j <= sides; j++) {
          const a = j * TAU / sides, fold = .019 * Math.cos(a);
          positions.push(center + point.x + normal.x * fold,
            y + .072 * Math.sin(a) + .004 * Math.sin(i * .27), point.y + normal.y * fold);
          colors.push(color.r, color.g, color.b);
          uv.push(i / segments * 4, j / sides);
          if (i && j) {
            const k = i * (sides + 1) + j;
            indices.push(k - sides - 2, k, k - 1, k - sides - 2, k - sides - 1, k);
          }
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.setDrawRange(0, 0);
      const collar = M(scarf, geometry, knit);
      collar.name = 'Winter scarf / wrapping knitted collar';
      collar.frustumCulled = false;
      const knot = ell(scarf, center + rx - radius, y - .015, rz + .025, .082, .075, .052, plain);
      knot.name = 'Winter scarf / soft knot';
      const tails = [];
      for (let j = 0; j < 2; j++) {
        const length = j ? .29 : .43, width = j ? .115 : .145;
        const tail = grp(scarf, center + rx - radius + (j ? -.075 : .025), y - .045, rz + .05 + j * .028);
        tail.name = 'Winter scarf / fringed tail ' + (j + 1);
        const geo = new T.BoxGeometry(width, length, .026, 3, 16, 1);
        const p = geo.attributes.position, color = [];
        for (let i = 0; i < p.count; i++) {
          const down = .5 - p.getY(i) / length;
          p.setXYZ(i, p.getX(i) + (j ? -.045 : .035) * down,
            -length * down, p.getZ(i) + .035 * Math.sin(down * Math.PI * .85));
          const c = C(Math.floor(down * 11) % 5 === 3 ? cream : base);
          color.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new T.Float32BufferAttribute(color, 3));
        geo.computeVertexNormals();
        const cloth = M(tail, geo, knit);
        cloth.name = 'Winter scarf / cloth tail ' + (j + 1);
        const strands = [];
        for (let k = 0; k < 6; k++) {
          const x = -width * .42 + k * width * .168 + (j ? -.045 : .035);
          const z = .035 * Math.sin(Math.PI * .85);
          strands.push(rod(tail, [x, -length, z], [x + .004 * Math.sin(k), -length - .035 - .01 * rand(k + j * 7), z + .008], .004, fringe));
        }
        ScarfJolt.register(cloth, u, {width, length, skew: j ? -.045 : .035, fringe: strands, request: e.request});
        tails.push(tail);
      }
      u.winterScarf = scarf;
      actions.push(t => {
        const amount = ease((t - start) / duration);
        scarf.visible = amount > 0;
        geometry.setDrawRange(0, Math.floor(amount * segments) * sides * 6);
        knot.visible = amount > .84;
        const unfold = ease((amount - .65) / .35);
        tails.forEach(tail => {
          tail.visible = unfold > 0;
          tail.scale.y = unfold;
        });
        scarf.userData.wrapProgress = amount;
      });
    }

    function winterCap(u, start) {
      const cap = grp(u.g, 0, 1, 0);
      cap.name = 'Snowfall / knitted winter cap on D';
      const wool = mat('#a24444', .97, 0, {bumpMap: tex, bumpScale: .009});
      const rib = mat('#bb5e56', .96), cream = mat('#eee2c9', .98);
      cap.scale.z = .74;
      const crown = lathe(cap, [[.37, .10], [.39, .18], [.35, .27], [.28, .35], [.17, .41], [.04, .44], [0, .44]], wool);
      const p = crown.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + .10 * (p.getY(i) / .44) ** 2);
      crown.geometry.computeVertexNormals();
      lathe(cap, [[.405, -.025], [.437, -.008], [.442, .05], [.428, .11], [.401, .13], [.39, .10]], cream);
      for (let i = 0; i < 22; i++) {
        const a = i * TAU / 22;
        curve(cap, [[.378 * Math.cos(a), .12, .378 * Math.sin(a)],
          [.335 * Math.cos(a) + .03, .27, .335 * Math.sin(a)],
          [.16 * Math.cos(a) + .08, .40, .16 * Math.sin(a)], [.10, .44, 0]], .0045, rib);
        rod(cap, [.44 * Math.cos(a), -.006, .44 * Math.sin(a)],
          [.432 * Math.cos(a), .095, .432 * Math.sin(a)], .006, cream);
      }
      ell(cap, .10, .47, 0, .083, .081, .083, cream);
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10;
        ell(cap, .10 + .057 * Math.cos(a), .47 + .035 * Math.sin(a * 2), .05 * Math.sin(a), .032, .033, .031, cream);
      }
      u.winterCap = cap;
      actions.push(t => {
        const amount = ease((t - start) / 1.2);
        cap.visible = amount > 0;
        cap.position.y = 1 + .40 * (1 - amount);
        cap.rotation.z = -.08 * amount;
        cap.userData.progress = amount;
      });
    }

    function freezeLetters() {
      // Stable random seeds keep each letter's frost reproducible when seeking.
      const schedules = units.map((u, i) => ({
        start: u.groundedAt + rand(1701 + i * 13) * 1.25,
        duration: 9 + rand(1831 + i * 17) * 4,
        meltDuration: 4.8 + rand(1931 + i * 19) * 2.8,
        phase: rand(2053 + i * 23) * TAU
      }));
      const frozenAt = Math.max(...schedules.map(s => s.start + s.duration));
      const warmedAt = frozenAt + 3;
      winterCap(units[0], frozenAt + .15);
      [2, 7, 12].forEach((letter, i) => winterScarf(units[letter], i, frozenAt + .15 + i * .18, 2.4));
      const icicleMaterial = keep(new T.MeshPhysicalMaterial({
        color: C('#d3f0ff'), roughness: .105, metalness: .025, transparent: true,
        opacity: .87, depthWrite: false, clearcoat: 1, clearcoatRoughness: .065,
        vertexColors: true, bumpMap: tex, bumpScale: .0015, envMapIntensity: 1.1
      }));
      units.forEach((u, index) => {
        const schedule = schedules[index];
        const meltStart = warmedAt + rand(2141 + index * 29) * 1.1;
        u.freezeStartsAt = schedule.start;
        u.freezeCompleteAt = schedule.start + schedule.duration;
        u.settledAt = warmedAt;
        u.thawStartsAt = meltStart;
        u.restoredAt = meltStart + schedule.meltDuration;
        const shiverDuration = warmedAt - u.groundedAt;
        // Expand the entire glyph along its normals: front, back and side walls.
        const geo = u.body.geometry.clone();
        const positions = geo.attributes.position, normals = geo.attributes.normal;
        for (let i = 0; i < positions.count; i++) {
          const thickness = .003 + .001 * rand(i + index * 71);
          positions.setXYZ(i, positions.getX(i) + normals.getX(i) * thickness,
            positions.getY(i) + normals.getY(i) * thickness,
            positions.getZ(i) + normals.getZ(i) * thickness);
        }
        const ice = keep(new T.MeshPhysicalMaterial({
          color: C('#c5e7f5'), roughness: .22, metalness: .03, transparent: true,
          opacity: .42, depthWrite: false, clearcoat: 1, clearcoatRoughness: .13,
          bumpMap: tex, bumpScale: .0025, envMapIntensity: .65
        }));
        u.body.geometry.computeBoundingBox();
        const bounds = u.body.geometry.boundingBox;
        const size = bounds.getSize(V());
        function seeds(offset) {
          return Array.from({length: 3}, (_, j) => {
            const n = offset + index * 97 + j * 31, p = [rand(n), rand(n + 2), rand(n + 5)];
            p[Math.floor(rand(n + 8) * 3)] = rand(n + 11) > .5 ? 1 : 0;
            return new T.Vector4(...p, .025 + rand(n + 13) * .16);
          });
        }
        const origins = seeds(2371), thaws = seeds(3313);
        const metric = V(.75 + rand(index + 4121) * .6, .75 + rand(index + 4221) * .6,
          .7 + rand(index + 4321) * .5);
        const freeze = {value: 0}, thaw = {value: 0};
        // Several expanding, warped fronts meet around the entire glyph. Thaw
        // starts from independent faces, rather than reversing a vertical wipe.
        const noise = p => Math.sin(p.x * 17.4 + p.y * 23.2 + p.z * 11.3 + schedule.phase) *
          Math.sin(p.x * 31.1 - p.y * 19.7 + p.z * 27.9) * .5 +
          Math.sin(p.x * 67.7 + p.y * 53.1 - p.z * 41.3) * .16;
        function arrival(p, seeds, offset = 0) {
          let first = Infinity;
          seeds.forEach((s, j) => {
            const dx = (p.x - s.x) * metric.x, dy = (p.y - s.y) * metric.y, dz = (p.z - s.z) * metric.z;
            first = Math.min(first, s.w + Math.hypot(dx, dy, dz) * (.52 + j * .085));
          });
          return clamp(first + noise(p.clone().addScalar(offset)) * .075, .025, .94);
        }
        const normalize = p => p.clone().sub(bounds.min).divide(size);
        const paced = (p, phase) => {
          p = clamp(p);
          return ease(p + .065 * (Math.sin(TAU * p + phase) - Math.sin(phase)) +
            .018 * (Math.sin(2 * TAU * p + phase * .7) - Math.sin(phase * .7)));
        };
        function phases(t) {
          return [paced((t - schedule.start) / schedule.duration, schedule.phase),
            paced((t - meltStart) / schedule.meltDuration, schedule.phase + 1.7)];
        }
        u.iceField = {origins: origins.map(v => v.toArray()), thawOrigins: thaws.map(v => v.toArray()),
          duration: schedule.duration, meltDuration: schedule.meltDuration};
        u.sampleIceAt = (point, t) => {
          const p = normalize(V(...point)), [f, m] = phases(t);
          return f >= arrival(p, origins) && m < arrival(p, thaws, 1.73);
        };
        ice.onBeforeCompile = shader => {
          shader.uniforms.freezeProgress = freeze;
          shader.uniforms.thawProgress = thaw;
          shader.uniforms.iceOrigins = {value: origins};
          shader.uniforms.thawOrigins = {value: thaws};
          shader.uniforms.iceMetric = {value: metric};
          shader.uniforms.iceMinimum = {value: bounds.min};
          shader.uniforms.iceSize = {value: size};
          shader.uniforms.icePhase = {value: schedule.phase};
          shader.vertexShader = 'varying vec3 vIceRest;\n' + shader.vertexShader.replace(
            '#include <begin_vertex>', '#include <begin_vertex>\nvIceRest = position;');
          shader.fragmentShader = `uniform float freezeProgress, thawProgress, icePhase;
uniform vec4 iceOrigins[3], thawOrigins[3];
uniform vec3 iceMetric, iceMinimum, iceSize;
varying vec3 vIceRest;
float iceNoise(vec3 p) {
 return sin(dot(p,vec3(17.4,23.2,11.3))+icePhase)*sin(dot(p,vec3(31.1,-19.7,27.9)))*.5
  + sin(dot(p,vec3(67.7,53.1,-41.3)))*.16;
}
float iceArrival(vec3 p, vec4 origins[3], float offset) {
 float first=10.;
 for(int j=0;j<3;j++) first=min(first,origins[j].w+length((p-origins[j].xyz)*iceMetric)*(.52+float(j)*.085));
 return clamp(first+iceNoise(p+vec3(offset))*.075,.025,.94);
}
` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
vec3 icePoint=(vIceRest-iceMinimum)/iceSize;
float frostEdge=freezeProgress-iceArrival(icePoint,iceOrigins,0.);
float thawEdge=iceArrival(icePoint,thawOrigins,1.73)-thawProgress;
if(frostEdge<0. || thawEdge<0.) discard;
diffuseColor.a *= smoothstep(0.,.025,min(frostEdge,thawEdge));
diffuseColor.rgb *= .92+.08*iceNoise(icePoint);
diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.83,.96,1.),(1.-smoothstep(0.,.04,frostEdge))*.4);
`);
        };
        const shell = M(u.g, geo, ice);
        shell.name = 'Snowfall / full ice shell / ' + (index + 1);
        shell.scale.copy(u.body.scale);
        shell.castShadow = false;
        shell.visible = false;
        u.iceShell = shell;

        // Scalloped melt rings, asymmetric ridges and a crooked needle tip give
        // each icicle a glassy silhouette instead of a plain low-poly cone.
        function icicleGeometry(length, radius, seed) {
          const rows = 22, sides = 13, vertices = [], colors = [], uv = [], ids = [];
          for (let row = 0; row <= rows; row++) {
            const p = row / rows, ring = .90 + .10 * Math.sin(p * 44 + seed) + .045 * Math.sin(p * 89 + seed * 2);
            const taper = (1 - p) ** .73, bend = p * p * radius * (.25 + rand(seed + 7) * .6);
            for (let side = 0; side <= sides; side++) {
              const a = side * TAU / sides, ridge = 1 + .115 * Math.sin(a * 5 + p * 6 + seed);
              const r = radius * taper * ring * ridge;
              vertices.push(r * Math.cos(a) + bend, -length * p,
                r * Math.sin(a) + .25 * bend * Math.sin(seed));
              const glint = .77 + .23 * Math.max(0, Math.sin(a * 3 + seed));
              colors.push(glint * .92, glint * .98, glint);
              uv.push(side / sides * 2, p * 4);
              if (row && side) {
                const n = row * (sides + 1) + side;
                ids.push(n - sides - 2, n - sides - 1, n, n - sides - 2, n, n - 1);
              }
            }
          }
          const geometry = new T.BufferGeometry();
          geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
          geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
          geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
          geometry.setIndex(ids);geometry.computeVertexNormals();
          return geometry;
        }
        const bodyPositions = u.body.geometry.attributes.position;
        const bodyIndex = u.body.geometry.index;
        const triangleCount = bodyIndex ? bodyIndex.count : bodyPositions.count;
        const vertex = i => V().fromBufferAttribute(bodyPositions, bodyIndex ? bodyIndex.getX(i) : i);
        const candidates = [];
        // Read real downward-facing surfaces: the roofs of counters, crossbar
        // undersides and exposed ledges. Ground-level feet cannot carry icicles.
        for (let i = 0; i < triangleCount; i += 3) {
          const a = vertex(i), b = vertex(i + 1), c = vertex(i + 2);
          const normal = b.clone().sub(a).cross(c.clone().sub(a));
          const area = normal.length() / 2;
          normal.normalize();
          if (normal.y > -.42 || area < .000015) continue;
          const front = [a, b, c].reduce((p, q) => p.z > q.z ? p : q);
          // Bias within the actual triangle toward its visible drip edge.
          const point = a.clone().add(b).add(c).multiplyScalar(.2).addScaledVector(front, .4);
          if (point.y < .24 || point.z < 0) continue;
          candidates.push({point, normal, score: point.y * .14 + point.z * .6 - normal.y * .12 +
            Math.sqrt(area) * .5 + rand(i + index * 191) * .045});
        }
        candidates.sort((a, b) => b.score - a.score);
        function clearanceBelow(point) {
          const ray = new T.Ray(point.clone().add(V(0, -.008, 0)), V(0, -1, 0)), hit = V();
          let clearance = point.y - .035;
          for (let i = 0; i < triangleCount; i += 3) {
            if (ray.intersectTriangle(vertex(i), vertex(i + 1), vertex(i + 2), false, hit)) {
              const gap = point.y - hit.y;
              if (gap > .01) clearance = Math.min(clearance, gap);
            }
          }
          return clearance;
        }
        const icicles = [];
        const maximum = 2 + Math.floor(rand(index + 5261) * 3);
        for (const {point, normal} of candidates) {
          if (icicles.length >= maximum) break;
          if (icicles.some(ice => Math.hypot(ice.position.x - point.x,
            ice.position.y - point.y) < .14)) continue;
          const clearance = clearanceBelow(point);
          // Counter openings and lower bars limit how far an icicle can grow.
          const length = Math.min(.30 + .26 * rand(index * 9 + icicles.length + 420), clearance * .72);
          if (length < .15) continue;
          const j = icicles.length;
          const radius = Math.min(.029 + .014 * rand(index * 7 + j + 219), length * .105);
          const geometry = icicleGeometry(length, radius, index * 17 + j * 7);
          const cone = M(u.g, geometry, icicleMaterial, point.x, point.y + .003,
            point.z * u.body.scale.z);
          cone.name = 'Snowfall / sculpted ridged icicle / ' + (index + 1) + ' / ' + (j + 1);
          const p = normalize(point);
          cone.userData = {length, radius, freezeAt: arrival(p, origins), thawAt: arrival(p, thaws, 1.73),
            support: {point: point.toArray(), normal: normal.toArray(), clearance}};
          cone.visible = false;
          cone.castShadow = false;
          icicles.push(cone);
        }
        u.icicles = icicles;
        const drops = icicles.slice(0, 2).map((cone, i) => {
          const drop = ell(u.g, cone.position.x, .6, cone.position.z + .025, .011, .019, .011, icicleMaterial);
          const white = new Float32Array(drop.geometry.attributes.position.count * 3).fill(1);
          drop.geometry.setAttribute('color', new T.BufferAttribute(white, 3));
          drop.name = 'Snowfall / meltwater drop / ' + (index + 1) + ' / ' + (i + 1);
          drop.visible = false;
          return drop;
        });
        actions.push(t => {
          const elapsed = t - u.groundedAt;
          const [frozen, melt] = phases(t);
          const coverage = frozen * (1 - melt);
          freeze.value = frozen;
          thaw.value = melt;
          shell.visible = coverage > 0;
          ice.opacity = .42 * (1 - melt * .55);
          u.freezeProgress = frozen;
          u.meltProgress = melt;
          u.iceCoverage = coverage;
          icicles.forEach(cone => {
            const {freezeAt, thawAt} = cone.userData;
            const growth = ease((frozen - freezeAt) / Math.min(.3, 1 - freezeAt));
            const shrink = 1 - ease(melt / Math.min(1, thawAt + .25));
            const amount = growth * shrink;
            cone.visible = amount > .002;
            cone.scale.set((.4 + .6 * growth) * shrink, amount, (.4 + .6 * growth) * shrink);
            cone.userData.growth = amount;
          });
          drops.forEach((drop, i) => {
            const cone = icicles[i], age = ((t - warmedAt) * 1.1 + index * .17 + i * .4) % 1;
            const length = cone.userData.length * cone.scale.y;
            drop.position.y = cone.position.y - length - .9 * age * age;
            drop.visible = melt > 0 && melt < .97 && drop.position.y > .06;
          });
          u.chattering = elapsed >= 0 && t < u.settledAt;
          if (!u.chattering) return;
          // Shivering continues through freezing, then settles over the final 750 ms.
          const envelope = ease(elapsed / .22) * (1 - ease((elapsed - (shiverDuration - .75)) / .75));
          const burst = .65 + .35 * Math.sin(TAU * 1.15 * elapsed) ** 2;
          const chatter = Math.sin(TAU * 6 * elapsed + index * .9) * burst * envelope;
          u.g.position.x += .016 * chatter;
          u.g.position.y += .009 * Math.abs(chatter);
          u.g.rotation.z += .024 * chatter;
          u.g.rotation.x += .007 * Math.sin(TAU * 7 * elapsed) * envelope;
        });
      });
    }

    if (e.theme === 'diwali') diwali();
    else {
      snowfall();
      snowbed();
      if (e.theme === 'christmas') christmas();
      else freezeLetters();
    }
  }
};
