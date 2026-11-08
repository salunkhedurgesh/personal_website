/* Shared lightweight navigation sculptures for the main menu and comparison page. */
window.NavigationModels = (() => {
  'use strict';
  const T = THREE,
    PI = Math.PI;
  const colours = {
    green: '#426550',
    darkGreen: '#284b3b',
    cream: '#eee7d7',
    paper: '#f7f1e5',
    slate: '#46545a',
    ink: '#60716c',
    ochre: '#b59959',
    wood: '#a98b68',
    skin: '#c8a27f',
    blue: '#667d87',
    red: '#996959',
  };
  const colour = (x) => new T.Color(x).convertSRGBToLinear();
  const material = (hex, rough = 0.74, metal = 0.025) =>
    new T.MeshStandardMaterial({
      color: colour(colours[hex] || hex),
      roughness: rough,
      metalness: metal,
    });
  const mats = Object.fromEntries(Object.keys(colours).map((k) => [k, material(k)]));
  function group(parent, x = 0, y = 0, z = 0) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent?.add(g);
    return g;
  }
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, typeof mat === 'string' ? mats[mat] : mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (p, x, y, z, w, h, d, m) => mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z);
  function round(p, x, y, z, w, h, d, r, m) {
    r = Math.min(r, w * 0.15, h * 0.15, d * 0.45);
    const s = new T.Shape();
    s.moveTo(-w / 2 + r, -h / 2 + r);
    s.lineTo(w / 2 - r, -h / 2 + r);
    s.lineTo(w / 2 - r, h / 2 - r);
    s.lineTo(-w / 2 + r, h / 2 - r);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, {
      depth: d - 2 * r,
      bevelEnabled: true,
      bevelSize: r,
      bevelThickness: r,
      bevelSegments: 3,
      steps: 1,
    });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return mesh(p, g, m, x, y, z);
  }
  const ell = (p, x, y, z, rx, ry, rz, m) => {
    const o = mesh(p, new T.SphereGeometry(1, 24, 16), m, x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
  };
  const cyl = (p, x, y, z, rt, rb, h, m, n = 28) =>
    mesh(p, new T.CylinderGeometry(rt, rb, h, n), m, x, y, z);
  function rod(p, a, b, r, m) {
    const va = new T.Vector3(...a),
      vb = new T.Vector3(...b),
      d = vb.clone().sub(va);
    const o = cyl(p, 0, 0, 0, r, r, d.length(), m, 12);
    o.position.copy(va).add(vb).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  function curve(p, points, r, m) {
    return mesh(
      p,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((q) => new T.Vector3(...q))),
        Math.max(12, points.length * 5),
        r,
        6,
        false,
      ),
      m,
    );
  }
  function texture(type) {
    const c = document.createElement('canvas');
    const scale = type === 'plan' ? 1 : 2;
    c.width = 384 * scale;
    c.height = 512 * scale;
    const q = c.getContext('2d');
    q.scale(scale, scale);
    q.fillStyle = colours.paper;
    q.fillRect(0, 0, 384, 512);
    if (type === 'plan') {
      q.fillStyle = '#e4ebe7';
      q.fillRect(0, 0, 384, 512);
      q.strokeStyle = '#b8c6c2';
      q.lineWidth = 0.8;
      for (let x = 16; x < 384; x += 24) {
        q.beginPath();
        q.moveTo(x, 50);
        q.lineTo(x, 496);
        q.stroke();
      }
      for (let y = 64; y < 512; y += 24) {
        q.beginPath();
        q.moveTo(16, y);
        q.lineTo(368, y);
        q.stroke();
      }
      q.fillStyle = '#526c70';
      q.font = 'bold 21px Georgia';
      q.fillText('PROJECT 01', 31, 39);
      q.strokeStyle = '#526c70';
      q.lineWidth = 5;
      q.strokeRect(54, 102, 274, 286);
      q.strokeRect(70, 118, 242, 254);
      q.beginPath();
      q.moveTo(184, 118);
      q.lineTo(184, 276);
      q.lineTo(312, 276);
      q.moveTo(70, 278);
      q.lineTo(122, 278);
      q.moveTo(70, 204);
      q.lineTo(184, 204);
      q.stroke();
      q.lineWidth = 2;
      q.beginPath();
      q.moveTo(40, 409);
      q.lineTo(340, 409);
      q.moveTo(40, 403);
      q.lineTo(40, 416);
      q.moveTo(340, 403);
      q.lineTo(340, 416);
      q.stroke();
    } else {
      // A shortened title and citation from ral25_salunkhe in js/catalog.js.
      q.fillStyle = '#284b3b';
      q.textAlign = 'center';
      q.font = 'bold 25px Georgia';
      q.fillText('IEEE RA-L', 192, 42);
      q.font = '13px Georgia';
      q.fillText('Robotics and Automation Letters', 192, 64);
      q.fillRect(34, 77, 316, 2);
      q.font = 'bold 31px Georgia';
      q.fillText('Cuspidal', 192, 120);
      q.fillText('Redundant Robots', 192, 156);
      q.font = '17px Georgia';
      q.fillText('Salunkhe et al. · 2025', 192, 185);
      q.fillStyle = '#60716c';
      q.font = 'bold 12px Georgia';
      q.fillText('KINEMATICS & MOTION PLANNING', 192, 220);
      q.strokeStyle = '#a8afa4';
      q.lineWidth = 1.5;
      for (const x of [38, 200])
        for (let j = 0; j < 5; j++) {
          const y = 237 + j * 12;
          q.beginPath();
          q.moveTo(x, y);
          q.lineTo(x + (j === 4 ? 106 : 145), y);
          q.stroke();
        }
      // A small articulated-chain illustration keeps the manuscript recognizable.
      q.strokeStyle = '#426550';
      q.lineWidth = 5;
      q.beginPath();
      q.moveTo(84, 394);
      q.lineTo(110, 350);
      q.lineTo(185, 318);
      q.lineTo(247, 367);
      q.lineTo(301, 335);
      q.stroke();
      for (const [x, y] of [
        [110, 350],
        [185, 318],
        [247, 367],
      ]) {
        q.fillStyle = colours.paper;
        q.beginPath();
        q.arc(x, y, 8, 0, PI * 2);
        q.fill();
        q.stroke();
      }
      q.fillStyle = '#284b3b';
      q.fillRect(34, 420, 316, 1);
      q.font = 'bold 15px Georgia';
      q.fillText('Salunkhe et al. (2025)', 192, 446);
      q.font = '11px Georgia';
      q.fillText('Cuspidal Redundant Robots. IEEE RA-L.', 192, 465);
      q.font = '10px Georgia';
      q.fillText('doi: 10.1109/LRA.2025.3623011', 192, 483);
    }
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  const textures = {};
  const getTexture = (type) => (textures[type] ??= texture(type));
  function chalkboardTexture() {
    if (textures.chalkboard) return textures.chalkboard;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 672;
    const q = c.getContext('2d');
    q.fillStyle = colours.darkGreen;
    q.fillRect(0, 0, c.width, c.height);
    // Seeded marks give the writing a dry chalk finish without a font download.
    let seed = 101;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let j = 0; j < 1500; j++) {
      q.fillStyle = `rgba(231,235,215,${random() * 0.045})`;
      q.fillRect(random() * c.width, random() * c.height, 2 + random() * 18, 1);
    }
    const writing = document.createElement('canvas');
    writing.width = c.width;
    writing.height = c.height;
    const chalk = writing.getContext('2d');
    // Stroke the lettering so the chalk stays handwritten on every platform.
    const glyphs = {
      K: [76, 'M10 0 L9 100 M68 2 L10 57 L70 99'],
      i: [24, 'M12 38 L10 100 M14 13 L14 16'],
      n: [63, 'M8 100 L9 37 M9 57 C27 20 55 29 54 59 L54 100'],
      e: [59, 'M7 67 L51 62 C54 25 9 27 7 64 C3 103 35 108 53 91'],
      m: [
        88,
        'M7 100 L8 37 M9 56 C20 29 40 29 40 56 L40 100 M41 54 C55 26 79 31 79 58 L79 100',
      ],
      a: [62, 'M50 45 C30 21 4 41 7 73 C8 106 34 110 50 85 M51 37 L50 100'],
      t: [44, 'M25 8 L23 84 Q22 108 39 97 M5 40 L41 38'],
      c: [59, 'M51 44 C30 25 7 42 7 70 C6 103 34 109 53 91'],
      s: [55, 'M48 44 C22 23 0 48 18 63 L39 75 C65 96 23 116 7 94'],
      1: [75, 'M15 21 L40 1 L38 100 M13 100 L64 100'],
      0: [82, 'M41 1 C-3 0 -2 101 40 101 C85 101 86 0 41 1'],
    };
    const write = (text, baseline, height) => {
      const scale = height / 100,
        width = [...text].reduce((sum, ch) => sum + glyphs[ch][0] + 8, -8);
      let x = (c.width - width * scale) / 2;
      for (const ch of text) {
        chalk.save();
        chalk.translate(x, baseline - height + (random() - 0.5) * 4);
        chalk.scale(scale, scale);
        chalk.rotate((random() - 0.5) * 0.035);
        chalk.strokeStyle = '#f2f0da';
        chalk.lineWidth = 5.2;
        chalk.lineCap = chalk.lineJoin = 'round';
        chalk.stroke(new Path2D(glyphs[ch][1]));
        chalk.restore();
        x += (glyphs[ch][0] + 8) * scale;
      }
    };
    write('Kinematics', 255, 140);
    write('101', 476, 166);
    chalk.strokeStyle = '#e5e6cb';
    chalk.lineWidth = 5;
    chalk.lineCap = 'round';
    chalk.beginPath();
    chalk.moveTo(214, 536);
    chalk.quadraticCurveTo(505, 521, 806, 532);
    chalk.stroke();
    chalk.globalCompositeOperation = 'destination-out';
    for (let j = 0; j < 8500; j++) {
      chalk.fillStyle = `rgba(0,0,0,${0.12 + random() * 0.55})`;
      chalk.fillRect(random() * c.width, random() * c.height, 1 + random() * 4, 1 + random() * 2);
    }
    q.drawImage(writing, 0, 0);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    textures.chalkboard = t;
    return t;
  }
  function paper(parent, w, h, type = 'manuscript', curl = 0.08) {
    const p = group(parent),
      nx = 20,
      ny = 26,
      positions = [],
      uv = [],
      index = [];
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        const u = x / nx,
          v = y / ny,
          corner = Math.max(0, (u - 0.64) / 0.36) * Math.max(0, (v - 0.68) / 0.32);
        positions.push((u - 0.5) * w, v * h, curl * (Math.sin(v * PI) * 0.18 + corner * corner));
        uv.push(u, v);
        if (x && y) {
          const n = y * (nx + 1) + x;
          index.push(n - nx - 2, n - 1, n, n - nx - 2, n, n - nx - 1);
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    const m = material('paper');
    m.map = getTexture(type);
    m.side = T.DoubleSide;
    const front = mesh(p, g, m);
    front.receiveShadow = false;
    const back = mesh(p, g.clone(), 'cream', 0, 0, -0.009);
    back.material = mats.cream;
    back.receiveShadow = false;
    return p;
  }
  function letterD(parent, scale = 1, mat = 'green') {
    const s = new T.Shape();
    s.moveTo(-0.43, 0);
    s.lineTo(-0.43, 1.22);
    s.lineTo(0.02, 1.22);
    s.bezierCurveTo(0.65, 1.22, 0.69, 0, 0.02, 0);
    s.closePath();
    const hole = new T.Path();
    hole.moveTo(-0.19, 0.24);
    hole.lineTo(0.005, 0.24);
    hole.bezierCurveTo(0.33, 0.24, 0.35, 0.98, 0.005, 0.98);
    hole.lineTo(-0.19, 0.98);
    hole.closePath();
    s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.038,
      bevelThickness: 0.035,
      bevelSegments: 4,
      curveSegments: 32,
    });
    g.translate(0, 0, -0.11);
    const m = mesh(parent, g, mat);
    m.scale.setScalar(scale);
    return m;
  }
  function book(parent, w = 0.95) {
    const b = group(parent),
      half = w / 2;
    for (const side of [-1, 1]) {
      const page = group(b, side * 0.012, 0.04, 0);
      page.rotation.z = side * 0.13;
      round(page, (side * half) / 2, 0.01, 0, half, 0.08, 0.67, 0.016, 'green');
      for (let j = 0; j < 4; j++)
        round(
          page,
          (side * half) / 2,
          0.06 + j * 0.012,
          0,
          half * 0.94,
          0.014,
          0.62,
          0.004,
          'paper',
        );
      const leaf = paper(page, half * 0.92, 0.6, 'manuscript', 0.014);
      leaf.rotation.x = -PI / 2;
      leaf.position.set((side * half) / 2, 0.11, 0.3);
    }
    curve(
      b,
      [
        [0, 0.01, -0.34],
        [0, 0.035, 0],
        [0, 0.01, 0.34],
      ],
      0.022,
      'ochre',
    );
    return b;
  }
  function helmet(parent, scale = 1) {
    const h = group(parent);
    h.scale.setScalar(scale);
    mesh(h, new T.SphereGeometry(0.245, 28, 16, 0, PI * 2, 0, PI / 2), 'ochre', 0, 0.025, 0);
    ell(h, 0, 0.025, 0.035, 0.29, 0.025, 0.3, 'ochre');
    for (const x of [-0.09, 0, 0.09])
      curve(
        h,
        [
          [x, 0.045, 0.21],
          [x, 0.2, 0.13],
          [x, 0.254, -0.015],
          [x, 0.17, -0.18],
        ],
        x === 0 ? 0.014 : 0.009,
        'ochre',
      );
    return h;
  }
  const builders = {
    'home-a': (p) => letterD(p),
    'home-b': (p) => {
      const tile = group(p, 0, 0.68, 0);
      const disc = cyl(tile, 0, 0, 0, 0.66, 0.66, 0.15, 'darkGreen', 64);
      disc.rotation.x = PI / 2;
      const edge = mesh(tile, new T.TorusGeometry(0.606, 0.009, 6, 64), 'ochre', 0, 0, 0.084);
      letterD(tile, 0.72, 'cream').position.set(0.035, -0.44, 0.11);
    },
    'home-c': (p) => {
      const dial = group(p, 0, 0.53, 0);
      dial.rotation.x = -0.3;
      const rim = cyl(dial, 0, 0, 0, 0.61, 0.61, 0.12, 'green', 64);
      rim.rotation.x = PI / 2;
      const face = cyl(dial, 0, 0, 0.075, 0.535, 0.535, 0.02, 'paper', 64);
      face.rotation.x = PI / 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * PI) / 6,
          len = i % 3 === 0 ? 0.075 : 0.035;
        rod(
          dial,
          [Math.sin(a) * 0.43, Math.cos(a) * 0.43, 0.096],
          [Math.sin(a) * (0.43 + len), Math.cos(a) * (0.43 + len), 0.096],
          0.006,
          'ink',
        );
      }
      const needle = new T.Shape();
      needle.moveTo(0, 0.42);
      needle.lineTo(0.095, -0.16);
      needle.lineTo(0, -0.09);
      needle.lineTo(-0.095, -0.16);
      needle.closePath();
      mesh(
        dial,
        new T.ExtrudeGeometry(needle, {
          depth: 0.035,
          bevelEnabled: true,
          bevelSize: 0.008,
          bevelThickness: 0.008,
        }),
        'ochre',
        0,
        0,
        0.11,
      );
      ell(dial, 0, 0, 0.15, 0.044, 0.044, 0.025, 'slate');
    },
    'publications-a': (p) => {
      for (let i = 0; i < 3; i++) {
        const sheet = paper(p, 0.88, 1.22, 'manuscript', i === 2 ? 0.16 : 0.03);
        sheet.position.set((i - 1) * 0.045, 0, i * 0.035);
        sheet.rotation.z = (i - 1) * -0.035;
      }
      round(p, -0.25, 1.215, 0.13, 0.24, 0.075, 0.09, 0.013, 'slate');
    },
    'publications-b': (p) => {
      const sheet = paper(p, 0.91, 1.12, 'scroll', 0.03);
      sheet.position.y = 0.12;
      for (const y of [0.1, 1.25]) {
        const roll = cyl(p, 0, y, 0.015, 0.065, 0.065, 1.06, 'cream', 36);
        roll.rotation.z = PI / 2;
        for (const side of [-1, 1]) {
          const ring = mesh(
            p,
            new T.TorusGeometry(0.045, 0.007, 5, 24),
            'ochre',
            side * 0.538,
            y,
            0.015,
          );
          ring.rotation.y = PI / 2;
        }
      }
    },
    'publications-c': (p) => {
      const b = book(p, 1.24);
      b.rotation.x = 0.46;
      b.position.y = 0.1;
      const ribbon = round(p, 0.18, 0.12, 0.31, 0.06, 0.012, 0.25, 0.003, 'ochre');
      ribbon.rotation.x = -0.12;
    },
    'projects-a': (p) => {
      // A quiet sculptural bust, with the silhouette of a hard hat and a held plan.
      round(p, 0, 0.39, 0, 0.72, 0.64, 0.34, 0.055, 'slate');
      ell(p, 0, 0.67, 0, 0.38, 0.2, 0.18, 'green');
      cyl(p, 0, 0.8, 0, 0.095, 0.11, 0.18, 'skin', 20);
      ell(p, 0, 1.015, 0.005, 0.18, 0.225, 0.165, 'skin');
      ell(p, 0, 1.008, 0.166, 0.035, 0.043, 0.035, 'skin');
      helmet(p).position.set(0, 1.12, 0);
      for (const side of [-1, 1]) {
        rod(p, [side * 0.31, 0.66, 0.02], [side * 0.35, 0.37, 0.16], 0.085, 'green');
        rod(p, [side * 0.35, 0.37, 0.16], [side * 0.23, 0.43, 0.35], 0.07, 'green');
        ell(p, side * 0.255, 0.45, 0.38, 0.07, 0.07, 0.06, 'skin');
        round(p, side * 0.18, 0.47, 0.178, 0.035, 0.32, 0.012, 0.003, 'cream');
      }
      const plan = paper(p, 0.67, 0.49, 'plan', 0.04);
      plan.position.set(0, 0.21, 0.33);
      plan.rotation.x = -0.08;
      plan.rotation.z = -0.07;
      const roll = cyl(p, 0.42, 0.46, 0.1, 0.045, 0.045, 0.65, 'paper', 24);
      roll.rotation.z = 0.18;
    },
    'projects-b': (p) => {
      for (const x of [-0.43, 0.43])
        for (const z of [-0.24, 0.24])
          rod(p, [x, 0.02, z], [x * 0.8, 0.6, z * 0.8], 0.032, 'slate');
      const table = group(p, 0, 0.62, 0);
      table.rotation.x = 0.28;
      round(table, 0, 0, 0, 1.18, 0.075, 0.77, 0.017, 'wood');
      const plan = paper(table, 0.94, 0.61, 'plan', 0.012);
      plan.rotation.x = -PI / 2;
      plan.position.set(0, 0.05, 0.3);
      rod(table, [0.39, 0.07, 0.28], [0.48, 0.07, -0.22], 0.013, 'slate');
      const h = helmet(table, 0.48);
      h.position.set(-0.42, 0.055, -0.21);
    },
    'projects-c': (p) => {
      const plan = paper(p, 1.02, 1.0, 'plan', 0.06);
      plan.rotation.x = -0.16;
      plan.position.set(0, 0.02, -0.1);
      const h = helmet(p, 0.85);
      h.position.set(-0.24, 0.02, 0.28);
      for (const [x, z] of [
        [0.29, 0.2],
        [0.4, 0.12],
      ]) {
        const roll = cyl(p, x, 0.38, z, 0.045, 0.045, 0.72, 'paper', 24);
        roll.rotation.z = -0.12;
        const band = cyl(p, x, 0.38, z, 0.048, 0.048, 0.045, 'green', 24);
        band.rotation.z = -0.12;
      }
    },
    'teaching-a': (p) => {
      for (const x of [-0.4, 0.4]) rod(p, [x, 0.015, 0.1], [x, 0.98, -0.015], 0.027, 'wood');
      round(p, 0, 0.86, 0, 1.2, 0.82, 0.095, 0.018, 'wood');
      round(p, 0, 0.86, 0.052, 1.1, 0.72, 0.025, 0.007, 'darkGreen');
      const ink = material('#dddcc8');
      const board = material('#ffffff', 0.96, 0);
      board.map = chalkboardTexture();
      mesh(p, new T.PlaneGeometry(1.075, 0.697), board, 0, 0.86, 0.066);
      round(p, 0, 0.42, 0.1, 1.2, 0.04, 0.16, 0.01, 'wood');
      round(p, 0.28, 0.46, 0.12, 0.18, 0.055, 0.075, 0.01, 'slate');
      rod(p, [-0.28, 0.454, 0.12], [-0.1, 0.454, 0.12], 0.012, ink);
    },
    'teaching-b': (p) => {
      round(p, 0, 0.035, 0, 0.69, 0.07, 0.53, 0.025, 'slate');
      round(p, 0, 0.35, 0, 0.16, 0.63, 0.18, 0.022, 'wood');
      const desk = group(p, 0, 0.73, 0);
      desk.rotation.x = 0.28;
      round(desk, 0, 0, 0, 1.02, 0.065, 0.65, 0.016, 'green');
      const b = book(desk, 0.9);
      b.position.set(0, 0.035, 0);
      round(desk, 0, 0.04, 0.34, 1.0, 0.06, 0.05, 0.009, 'wood');
    },
    'teaching-c': (p) => {
      const b = book(p, 1.22);
      b.rotation.x = 0.4;
      b.position.y = 0.12;
      rod(p, [0.43, 0.2, 0.39], [0.23, 0.59, -0.23], 0.023, 'wood');
      ell(p, 0.23, 0.59, -0.23, 0.032, 0.032, 0.032, 'slate');
    },
  };
  const categories = [
    {
      id: 'home',
      title: 'Home',
      default: 'c',
      description: 'A personal mark or a point of orientation.',
      options: [
        ['a', 'Sculpted D'],
        ['b', 'D medallion'],
        ['c', 'Navigation compass'],
      ],
    },
    {
      id: 'publications',
      title: 'Publications',
      default: 'a',
      description: 'Paper, writing and the published record.',
      options: [
        ['a', 'Research manuscript'],
        ['b', 'Rolled manuscript'],
        ['c', 'Open journal'],
      ],
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'People and plans behind the work.',
      options: [
        ['a', 'Builder with plans'],
        ['b', 'Drafting table'],
        ['c', 'Plans + hard hat'],
      ],
    },
    {
      id: 'teaching',
      title: 'Teaching',
      description: 'Quiet objects from a working classroom.',
      options: [
        ['a', 'Seminar board'],
        ['b', 'Lectern + book'],
        ['c', 'Book + pointer'],
      ],
    },
  ];
  function create(id) {
    const g = group();
    if (!builders[id]) throw Error('Unknown navigation model ' + id);
    builders[id](g);
    return g;
  }
  const selected = Object.freeze(
    Object.fromEntries(categories.map((c) => [c.id, c.id + '-' + (c.default || 'a')])),
  );
  const orbit = Object.freeze({
    baseYaw: -0.12,
    yawLimit: (25 * PI) / 180,
    pitchLimit: (12 * PI) / 180,
  });
  function setView(entry, yaw, tilt) {
    entry.angle = T.MathUtils.clamp(
      yaw,
      orbit.baseYaw - orbit.yawLimit,
      orbit.baseYaw + orbit.yawLimit,
    );
    entry.tilt = T.MathUtils.clamp(tilt, -orbit.pitchLimit, orbit.pitchLimit);
  }
  function scene(id) {
    const s = new T.Scene(),
      pivot = new T.Group(),
      model = create(id);
    s.add(pivot);
    pivot.add(model);
    model.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model),
      size = bounds.getSize(new T.Vector3()),
      center = bounds.getCenter(new T.Vector3());
    const scale = 1.4 / Math.max(size.y, size.x * 0.9, size.z * 0.85);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const floor = new T.Mesh(
      new T.PlaneGeometry(5, 5),
      new T.ShadowMaterial({ color: 0x3c4b40, opacity: 0.13, depthWrite: false }),
    );
    floor.rotation.x = -PI / 2;
    floor.position.y = -0.016;
    floor.receiveShadow = true;
    s.add(floor);
    s.add(new T.HemisphereLight(0xfffbef, 0xb4c3b4, 0.85), new T.AmbientLight(0xffffff, 0.22));
    for (const [x, y, z, power, c] of [
      [-3.4, 5, 5, 2.8, 0xfff0da],
      [4, 2, 3, 0.65, 0xe3edf8],
      [2, 4, -3, 0.9, 0xffffff],
    ]) {
      const light = new T.DirectionalLight(c, power);
      light.position.set(x, y, z);
      s.add(light);
      if (x < 0) {
        light.castShadow = true;
        light.shadow.mapSize.set(256, 256);
        Object.assign(light.shadow.camera, {
          left: -2,
          right: 2,
          top: 3,
          bottom: -1,
          near: 0.1,
          far: 15,
        });
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.015;
        light.shadow.radius = 3;
      }
    }
    const camera = new T.OrthographicCamera(-0.94, 0.94, 0.98, -0.98, 0.1, 30);
    camera.position.set(2.7, 2.4, 6);
    camera.lookAt(0, 0.65, 0);
    return {
      id,
      s,
      pivot,
      g: pivot,
      camera,
      c: camera,
      angle: orbit.baseYaw,
      tilt: 0,
      canvases: [],
    };
  }
  function frame(entry, width, height) {
    setView(entry, entry.angle, entry.tilt);
    const camera = entry.camera,
      aspect = width / Math.max(1, height);
    camera.top = 0.98;
    camera.bottom = -0.98;
    camera.left = -0.98 * aspect;
    camera.right = 0.98 * aspect;
    camera.updateProjectionMatrix();
    entry.pivot.rotation.set(entry.tilt, entry.angle, 0);
  }
  return { create, categories, selected, orbit, setView, scene, frame };
})();
