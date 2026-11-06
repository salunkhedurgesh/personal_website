// Run with: node tools/check-scarf-physics.mjs
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  T = require('../lib/three.js');
const { default: init } = await import('../lib/jolt-physics-1.1.0.mjs');
const J = await init();
const context = {
  window: {},
  THREE: T,
  matchMedia: () => ({ matches: false }),
  PuppetJolt: { library: () => Promise.resolve(J) },
  console,
};
vm.runInNewContext(
  await readFile(new URL('../js/clay/scarf-jolt.js', import.meta.url), 'utf8'),
  context,
);
const root = new T.Group(),
  letter = new T.Group();
root.add(letter);
const body = new T.Mesh(new T.BoxGeometry(0.8, 1, 0.5));
body.geometry.translate(0, 0.5, 0);
body.geometry.computeBoundingBox();
letter.add(body);
const unit = { g: letter, body, winterScarf: { userData: { wrapProgress: 1 } } };
const mesh = new T.Mesh(new T.BoxGeometry(0.14, 0.43, 0.026, 3, 16, 1));
mesh.geometry.translate(0, -0.215, 0);
mesh.position.set(0.25, 0.69, 0.33);
mesh.name = 'Winter scarf / cloth tail 1';
letter.add(mesh);
const physics = context.window.ScarfJolt;
physics.register(mesh, unit, { pin: (p) => p.y > -0.002 });
await new Promise((r) => setTimeout(r, 10));
const before = mesh.geometry.attributes.position.array.slice();
for (let i = 0; i < 120; i++) physics.step((i * 1000) / 120, 20 + i / 120);
const after = mesh.geometry.attributes.position.array;
assert(Array.from(after).every(Number.isFinite));
assert(after.some((v, i) => Math.abs(v - before[i]) > 0.001));
assert.equal(physics.inspection().mode, 'jolt');
assert.equal(physics.inspection().clothBodies, 1);
console.log(JSON.stringify(physics.inspection()));
// Orbiting and dragging used to teleport world-space anchors and tear the mesh.
let maxOffset = 0;
for (let frame = 120; frame < 840; frame++) {
  root.rotation.y = 0.22 * Math.sin(frame * 0.08);
  letter.position.x = frame % 180 > 90 ? 0.24 : -0.2;
  letter.rotation.z = 0.18 * Math.sin(frame * 0.04);
  physics.step((frame * 1000) / 120, 20 + frame / 120);
  const positions = mesh.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const distance = Math.hypot(
      positions[i] - before[i],
      positions[i + 1] - before[i + 1],
      positions[i + 2] - before[i + 2],
    );
    assert(Number.isFinite(distance));
    assert(distance <= 0.08001);
    maxOffset = Math.max(maxOffset, distance);
    if (Math.abs(before[i + 1]) < 1e-6) assert(distance < 1e-5);
  }
}
assert.equal(physics.inspection().recoveries, 0);
physics.step(60000, 80); // Returning from an inactive tab must not accumulate a huge time step.
unit.winterScarf.userData.wrapProgress = 0.4;
physics.step(60010, 0);
assert.equal(physics.inspection().clothBodies, 0);
assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), Array.from(before));
unit.winterScarf.userData.wrapProgress = 1;
physics.step(60020, 30);
assert.equal(physics.inspection().clothBodies, 1);
console.log(
  'Orbit, drag, tilt, pause, and replay regression checks passed. Maximum offset:',
  maxOffset,
);
physics.clear();
assert.equal(physics.inspection().clothBodies, 0);
console.log('Real Jolt cloth deformation and disposal passed.');
