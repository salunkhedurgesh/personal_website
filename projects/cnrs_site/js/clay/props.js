/* Halloween costume models; seasonal light, snow and ice sets live in seasonal.js. */
window.ClayProps = {
  build(e) {
    const {
      T,
      PI: P,
      mat,
      M,
      grp,
      ell,
      box,
      cyl,
      rod,
      curve,
      lathe,
      clamp,
      units,
      root,
      tex,
      theme,
    } = e;
    const brass = mat('#af8956', 0.4, 0.56);
    function witch(x) {
      let g = grp(units.find((u) => u.x === x).g, 0, 1.0, 0);
      g.rotation.z = 0.13;
      let felt = mat('#382f42', 0.92, 0, { bumpMap: tex, bumpScale: 0.012 }),
        band = mat('#633f37', 0.69);
      let profile = [
          [0.45, 0],
          [0.46, 0.017],
          [0.37, 0.057],
          [0.27, 0.067],
          [0.25, 0.11],
          [0.2, 0.27],
          [0.15, 0.41],
          [0.095, 0.54],
          [0.068, 0.65],
          [0.039, 0.7],
          [0.01, 0.66],
        ],
        geo = new T.LatheGeometry(
          profile.map((p) => new T.Vector2(...p)),
          56,
        ),
        v = geo.attributes.position;
      for (let i = 0; i < v.count; i++) {
        let x = v.getX(i),
          y = v.getY(i),
          z = v.getZ(i),
          a = Math.atan2(z, x);
        v.setXYZ(
          i,
          x - 0.28 * (y / 0.72) ** 2,
          y + 0.026 * Math.cos(3 * a) * clamp((0.14 - y) / 0.14),
          z + 0.055 * (y / 0.72) ** 2,
        );
      }
      geo.computeVertexNormals();
      M(g, geo, felt);
      lathe(
        g,
        [
          [0.256, 0.087],
          [0.222, 0.183],
        ],
        band,
      );
      let buckle = brass;
      box(g, -0.045, 0.13, 0.236, 0.135, 0.077, 0.023, buckle);
      box(g, -0.045, 0.131, 0.251, 0.083, 0.043, 0.01, band);
    }
    function cloak(u) {
      let p = grp(u.g, 0, 0, -0.01);
      let cloth = mat('#59404b', 0.91, 0, { side: T.DoubleSide, bumpMap: tex, bumpScale: 0.022 });
      let vert = [],
        inds = [];
      for (let i = 0; i <= 18; i++)
        for (let j = 0; j <= 32; j++) {
          let a = (j / 32) * P * 1.64 + 0.18 * P,
            t = i / 18,
            r = 0.18 + 0.37 * t + 0.052 * Math.sin(a * 10) * t;
          vert.push(
            r * Math.sin(a),
            0.91 - 0.85 * t + 0.036 * t * Math.cos(a * 7),
            0.025 + r * Math.cos(a),
          );
          if (i && j) {
            let k = i * 33 + j;
            inds.push(k - 34, k - 1, k, k - 34, k, k - 33);
          }
        }
      let g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(vert, 3));
      g.setIndex(inds);
      g.computeVertexNormals();
      M(p, g, cloth);
      for (let k of [-1, 1])
        curve(
          p,
          [
            [k * 0.11, 0.9, 0.17],
            [k * 0.23, 0.74, 0.18],
            [k * 0.39, 0.48, 0.28],
            [k * 0.41, 0.12, 0.4],
          ],
          0.013,
          brass,
        );
      ell(p, 0, 0.91, 0.2, 0.065, 0.063, 0.022, brass);
    }
    function web(x) {
      let base = [x, 1.42, -0.13],
        pts = [];
      for (let j = 0; j < 8; j++) {
        let a = -1.5 + j * 0.25;
        pts.push([0.91 * Math.cos(a), 0.92 * Math.sin(a)]);
      }
      let m = mat('#c6b6ab', 0.5);
      for (let d of pts) rod(root, base, [x + d[0], base[1] + d[1], -0.13], 0.005, m);
      for (let i = 1; i < 6; i++) {
        let s = i / 5;
        for (let j = 1; j < pts.length; j++) {
          let a = pts[j - 1],
            b = pts[j];
          curve(
            root,
            [
              [x + s * a[0], base[1] + s * a[1], -0.13],
              [x + s * (a[0] + b[0]) * 0.48, base[1] + s * (a[1] + b[1]) * 0.48, -0.12],
              [x + s * b[0], base[1] + s * b[1], -0.13],
            ],
            0.004,
            m,
          );
        }
      }
    }
    if (theme === 'halloween') {
      witch(units[1].x);
      cloak(units[9]);
      web(units[4].x);
    }
  },
};
