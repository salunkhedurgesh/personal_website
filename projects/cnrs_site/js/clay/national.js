/* National-day props are created only when their lettering edition is selected. */
window.ClayNational = {
  build(e) {
    const { T, mat, ownTexture, M, grp, cyl, curve, V, ease, rand, units, root, actions } = e;
    const republic = e.theme === 'republic';
    if (!republic && !['independence', 'france'].includes(e.theme)) return;
    const carrier = grp(root);
    carrier.name = republic
      ? 'Republic Day / robot-unrolled Constitution parchment'
      : (e.theme === 'france' ? 'France' : 'Independence Day') + ' / robot-held flag bunting';
    const left = units[0].x,
      right = units.at(-1).x + 0.18,
      span = right - left;
    const top = republic ? 1.52 : 1.8,
      raisedTop = republic ? 2.45 : 2.36,
      z = -0.65;
    const liftEnd = republic ? 15.3 : 14.5;
    const cord = mat('#c9b68c', 0.92),
      brass = mat('#a78950', 0.38, 0.55);
    const grips = [V(left, top, z), V(right, top, z)];
    function update(t) {
      const lift = ease((t - 11.3) / (liftEnd - 11.3)),
        breeze = ease((t - liftEnd) / 1.5);
      carrier.visible = true;
      carrier.position.y =
        (raisedTop - top) * lift + (republic ? 0 : 0.008 * Math.sin(t * 0.8) * breeze);
      carrier.rotation.z = republic ? 0 : 0.0012 * Math.sin(t * 0.63) * breeze;
      carrier.userData.liftProgress = lift;
      carrier.userData.gripHeight = top + carrier.position.y;
    }
    e.carriedRig = {
      kind: republic ? 'constitution' : 'bunting',
      object: carrier,
      grips,
      gripDepth: republic ? 0.034 : 0.012,
      update,
    };
    actions.push(update);
    grips.forEach((p) => {
      const handle = cyl(carrier, p.x, p.y, p.z, 0.034, 0.034, 0.12, brass, 16);
      handle.rotation.z = Math.PI / 2;
      handle.name = 'National day / robot grip sleeve';
    });

    function canvasTexture(width, height, draw) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      draw(canvas.getContext('2d'), canvas);
      const texture = ownTexture(new T.CanvasTexture(canvas));
      texture.encoding = T.sRGBEncoding;
      texture.anisotropy = 4;
      return { texture, canvas };
    }
    function clothGeometry(nx, ny) {
      const positions = new Float32Array((nx + 1) * (ny + 1) * 3);
      const uv = new Float32Array((nx + 1) * (ny + 1) * 2),
        indices = [];
      for (let y = 0; y <= ny; y++)
        for (let x = 0; x <= nx; x++) {
          const i = y * (nx + 1) + x;
          uv[i * 2] = x / nx;
          uv[i * 2 + 1] = 1 - y / ny;
          if (x && y) indices.push(i - nx - 2, i - 1, i, i - nx - 2, i, i - nx - 1);
        }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        'position',
        new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage),
      );
      geometry.setAttribute('uv', new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage));
      geometry.setIndex(indices);
      return geometry;
    }

    if (republic) {
      // The roll waits behind the name. Only after the robots finish lifting
      // does gravity unspool the page, ending with the lower roll on the floor.
      const coreRadius = 0.026,
        floor = 0.028;
      const pageHeight = raisedTop - floor - coreRadius,
        pageLeft = left + 0.09,
        pageWidth = span - 0.18;
      const preamble = [
        'WE, THE PEOPLE OF INDIA,',
        'having solemnly resolved to constitute India into a',
        'SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC',
        'and to secure to all its citizens:',
        'JUSTICE, social, economic and political;',
        'LIBERTY of thought, expression, belief, faith and worship;',
        'EQUALITY of status and of opportunity; and to promote among them all',
        'FRATERNITY assuring the dignity of the individual and the unity and integrity of the Nation;',
        'IN OUR CONSTITUENT ASSEMBLY this twenty-sixth day of November, 1949,',
        'do HEREBY ADOPT, ENACT AND GIVE TO OURSELVES THIS CONSTITUTION.',
      ];
      const { texture, canvas } = canvasTexture(2560, 512, (c, cv) => {
        const wash = c.createLinearGradient(0, 0, 0, cv.height);
        wash.addColorStop(0, '#f4e8cc');
        wash.addColorStop(0.5, '#fcf4e1');
        wash.addColorStop(1, '#e4cda6');
        c.fillStyle = wash;
        c.fillRect(0, 0, cv.width, cv.height);
        c.strokeStyle = '#a98b56';
        c.lineWidth = 3;
        c.strokeRect(18, 16, cv.width - 36, cv.height - 32);
        c.lineWidth = 1;
        c.strokeRect(26, 24, cv.width - 52, cv.height - 48);
        const family = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
        const center = cv.width * 0.535,
          maxWidth = cv.width * 0.83;
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        const bodyStyles = [
          [27, 'italic', 9],
          [28, 'bold', 9],
          [26, 'italic', 10],
          [28, '', 9],
          [28, '', 9],
          [27, '', 9],
          [26, '', 12],
          [26, '', 9],
          [27, 'bold', 0],
        ];
        const rows = [
          ['THE CONSTITUTION OF INDIA', 52, 'bold', 12],
          ['P R E A M B L E', 38, '', 14],
          [preamble[0], 32, 'bold', 15],
          ...preamble.slice(1).map((line, i) => [line, ...bodyStyles[i]]),
        ];
        let lineTop = 34;
        rows.forEach(([line, initialSize, weight, gap], i) => {
          let size = initialSize,
            metrics;
          do {
            c.font = `${weight} ${size}px ${family}`;
            metrics = c.measureText(line);
            if (metrics.width <= maxWidth) break;
            size--;
          } while (size > 20);
          const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
          const descent = Math.max(0, metrics.actualBoundingBoxDescent || 0);
          c.fillStyle = i < 2 ? '#684322' : i === 2 ? '#6d3824' : '#392c23';
          c.fillText(line, center, lineTop + ascent);
          if (i === 1) {
            c.strokeStyle = '#b39763';
            c.lineWidth = 1;
            const inner = metrics.width / 2 + 34,
              y = lineTop + (ascent + descent) / 2;
            for (const side of [-1, 1]) {
              c.beginPath();
              c.moveTo(center + side * inner, y);
              c.lineTo(center + side * maxWidth * 0.42, y);
              c.stroke();
            }
          }
          // Place the next line below the actual ink bounds, including descenders.
          lineTop += ascent + descent + gap;
        });
        // Fine paper fibres are baked once, with no per-frame texture uploads.
        c.fillStyle = 'rgba(124,92,48,.055)';
        for (let i = 0; i < 800; i++)
          c.fillRect(
            rand(i + 5001) * cv.width,
            rand(i + 6001) * cv.height,
            1 + rand(i + 7001) * 4,
            0.6,
          );
      });
      const emblem = new Image();
      e.ready.push(
        new Promise((resolve, reject) => {
          emblem.onload = () => {
            const h = 180,
              w = (h * emblem.width) / emblem.height;
            canvas.getContext('2d').drawImage(emblem, 82, 151, w, h);
            texture.needsUpdate = true;
            e.request();
            resolve();
          };
          emblem.onerror = () => reject(Error('Republic Day emblem unavailable'));
          emblem.src = e.asset('images/occasions/india-emblem.png');
        }),
      );
      const paper = mat('#ffffff', 0.91, 0, { map: texture, side: T.DoubleSide });
      const rollPaper = mat('#e6d5b1', 0.9, 0, { bumpMap: e.tex, bumpScale: 0.002 });
      const columns = 96,
        rows = 32,
        geometry = clothGeometry(columns, rows),
        sheet = M(carrier, geometry, paper);
      sheet.name = 'Republic Day / full Preamble of the Indian Constitution';
      sheet.userData.preamble = preamble.join(' ');
      sheet.userData.source = 'https://yas.nic.in/sites/default/files/preambleenglish.pdf';
      sheet.frustumCulled = false;
      sheet.castShadow = false;
      const dowel = cyl(carrier, (left + right) / 2, top, z, 0.029, 0.029, span, brass, 20);
      dowel.rotation.z = Math.PI / 2;
      const roll = grp(carrier, (left + right) / 2, top, z + 0.035);
      roll.name = 'Republic Day / descending rolled paper';
      const scroll = cyl(roll, 0, 0, 0, 1, 1, pageWidth, rollPaper, 32);
      scroll.rotation.z = Math.PI / 2;
      // Concentric paper edges are visible at both ends of the roll.
      for (const side of [-1, 1])
        for (const radius of [0.55, 0.76, 0.94]) {
          const edge = M(
            roll,
            new T.TorusGeometry(radius, 0.018, 4, 28),
            rollPaper,
            (side * pageWidth) / 2,
            0,
            0,
          );
          edge.rotation.y = Math.PI / 2;
        }
      // Keep the long cylinder's axial length fixed while its radius shrinks.
      actions.push((t) => {
        const unroll = ease((t - liftEnd - 0.25) / 6),
          flutter = ease((t - liftEnd) / 1.2);
        carrier.userData.unrollProgress = unroll;
        sheet.visible = unroll > 0;
        const p = geometry.attributes.position,
          uv = geometry.attributes.uv;
        for (let y = 0; y <= rows; y++)
          for (let x = 0; x <= columns; x++) {
            const u = x / columns,
              v = y / rows,
              i = y * (columns + 1) + x;
            p.setXYZ(
              i,
              pageLeft + pageWidth * u,
              top - v * pageHeight * unroll,
              z +
                0.042 +
                0.012 * Math.sin(u * Math.PI * 4 + t * 0.8) * Math.sin(v * Math.PI) * flutter,
            );
            uv.setXY(i, u, 1 - v * unroll);
          }
        p.needsUpdate = uv.needsUpdate = true;
        geometry.computeVertexNormals();
        const outerRadius = 0.105,
          radius = Math.sqrt(coreRadius ** 2 + (outerRadius ** 2 - coreRadius ** 2) * (1 - unroll));
        scroll.scale.set(radius, 1, radius);
        roll.position.y = top - pageHeight * unroll;
        roll.position.z = z + 0.042 - radius;
        roll.rotation.x =
          (2 * pageHeight * (outerRadius - radius)) / (outerRadius ** 2 - coreRadius ** 2);
        roll.children.slice(1).forEach((edge) => edge.scale.setScalar(radius));
        carrier.userData.paperBottom = top + carrier.position.y - pageHeight * unroll;
        carrier.userData.rollBottom = carrier.userData.paperBottom - radius;
      });
    } else {
      const france = e.theme === 'france';
      // The entire strand reads as a tricolour: eight solid pennants per third.
      const colours = france
        ? ['#002395', '#f4eedc', '#ed2939']
        : ['#ff9933', '#f4eedc', '#138808'];
      const cloth = colours.map((colour) =>
        mat(colour, 0.9, 0, {
          side: T.DoubleSide,
          bumpMap: e.tex,
          bumpScale: 0.002,
        }),
      );
      const sag = 0.42;
      const wireY = (x) => {
        const u = (x - left) / span;
        return top - 4 * sag * u * (1 - u);
      };
      carrier.userData.ropeProfile = { left, right, top, sag, z };
      curve(
        carrier,
        Array.from({ length: 49 }, (_, i) => {
          const x = left + (span * i) / 48;
          return [x, wireY(x), z];
        }),
        0.012,
        cord,
      ).name = 'National day / parabolic flag-bunting rope';
      const count = 24,
        flagWidth = (span / count) * 0.82,
        flagHeight = flagWidth * 1.45;
      carrier.userData.flagCount = count;
      for (let j = 0; j < count; j++) {
        const x = left + (span * (j + 0.5)) / count,
          y = wireY(x);
        const flag = grp(carrier, x, y - 0.008, z + 0.006);
        flag.name = (france ? 'French' : 'Indian') + ' triangular pennant / ' + (j + 1);
        flag.userData.colour = colours[Math.floor(j / (count / 3))];
        flag.userData.aspect = flagHeight / flagWidth;
        const geo = clothGeometry(16, 8),
          mesh = M(flag, geo, cloth[Math.floor(j / (count / 3))]);
        mesh.frustumCulled = false;
        // The whole top seam follows the parabola. A flat top hung from two
        // points would cut across the curved rope, especially near its ends.
        const hem = Array.from({ length: 9 }, (_, i) => {
          const dx = (i / 8 - 0.5) * flagWidth;
          return [dx, wireY(x + dx) - y, 0.002];
        });
        curve(flag, hem, 0.0035, cloth[Math.floor(j / (count / 3))]).name =
          'Pennant / sewn curved hem';
        actions.push((t) => {
          const breeze = 0.4 + 0.6 * ease((t - 11.3) / 3),
            p = geo.attributes.position;
          for (let row = 0; row <= 8; row++)
            for (let col = 0; col <= 16; col++) {
              const u = col / 16,
                v = row / 8,
                phase = t * (1.2 + (j % 3) * 0.13) + j * 1.7;
              const dx = (u - 0.5) * flagWidth,
                topCurve = wireY(x + dx) - y;
              p.setXYZ(
                row * 17 + col,
                dx * (1 - v),
                topCurve * (1 - v) -
                  v * flagHeight +
                  0.013 * Math.sin(u * 8 + phase) * v * (1 - v) * breeze,
                0.038 * Math.sin(u * 7 - v * 2 + phase) * v * (1 - v) * breeze +
                  0.02 * Math.sin(phase) * v * breeze,
              );
            }
          p.needsUpdate = true;
          geo.computeVertexNormals();
        });
      }
    }
  },
};
