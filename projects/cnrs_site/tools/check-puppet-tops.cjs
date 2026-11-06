// Run with: node tools/check-puppet-tops.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');
const T = require('../lib/three.js');
const context = { window: {}, THREE: T };
runInNewContext(readFileSync(join(__dirname, '../js/clay/forms.js'), 'utf8'), context);
runInNewContext(readFileSync(join(__dirname, '../js/clay/atelier.js'), 'utf8'), context);
const suspensionTops = context.window.AtelierArt.suspensionTops;
const binary = (value) => Uint8Array.from(Buffer.from(value, 'base64')).buffer;

for (const ch of new Set('DURGESH SALUNKHE'.replace(/ /g, ''))) {
  test(`${ch} has ${'HKUN'.includes(ch) ? 'two' : 'one'} suspension top on its actual surface`, () => {
    const data = context.window.ClayForms.E[ch][1];
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(
        Float32Array.from(new Int16Array(binary(data[0])), (n) => n / 12000),
        3,
      ),
    );
    geometry.setIndex(new T.BufferAttribute(new Uint16Array(binary(data[1])), 1));
    for (const shape of [geometry, geometry.toNonIndexed()]) {
      const tops = suspensionTops(shape);
      assert.equal(tops.length, 'HKUN'.includes(ch) ? 2 : 1);
      if (tops.length === 2) {
        assert(tops[0].x < -0.05 && tops[1].x > 0.05);
        assert(tops[1].x - tops[0].x > 0.3);
      }
      const mesh = new T.Mesh(shape, new T.MeshBasicMaterial({ side: T.DoubleSide }));
      mesh.updateMatrixWorld(true);
      for (const top of tops) {
        const ray = new T.Raycaster(new T.Vector3(top.x, 2, 0), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh)[0];
        assert(hit, `${ch} must have a surface directly below its attachment`);
        assert(hit.point.distanceTo(top) < 0.001, `${ch} attachment must touch its top surface`);
      }
    }
  });
}
