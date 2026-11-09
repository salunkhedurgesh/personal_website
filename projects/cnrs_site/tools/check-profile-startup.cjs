const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

function element() {
  return {
    dataset: {},
    listeners: {},
    attributes: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    hasPointerCapture() { return false; },
  };
}
const elements = new Map(),
  canvas = element(),
  context = {
    window: { addEventListener() {} },
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, element());
        return elements.get(selector);
      },
    },
    matchMedia(query) {
      return { matches: query.includes('reduced-motion'), addEventListener() {} };
    },
    performance: { now: () => 1000 },
  };
runInNewContext(
  readFileSync(process.env.PROFILE_CONTROLS_SOURCE || join(__dirname,
    '../projects/main/tour/src/controls.js'), 'utf8'), context,
);
let engine = null;
const motion = context.window.AtlasControls.bind(canvas, {
  portraitFirst: true,
  engine: () => engine,
  request() {},
  canPick: () => false,
});
motion.update(0, 0, false, false);
assert.equal(motion.state.mflip, Math.PI);

// An iframe can briefly restore its old scroll offset while CSS/assets load.
// Returning to the opening chapter must retain the photo without user input.
motion.update(0.2, 0.2 / 0.65, false, false);
assert.equal(motion.state.mflip, 0, 'Office monitor displays CNRS');
motion.update(0, 0, false, false);
assert.equal(motion.state.mflip, Math.PI, 'Opening photo survives scroll restoration');
motion.update(0, 0, true, false);
motion.update(0, 0, false, false);
assert.equal(motion.state.mflip, Math.PI, 'Opening photo survives mode changes');

let prevented = false;
canvas.listeners.wheel({ deltaY: 120, preventDefault() { prevented = true; } });
assert(prevented);
assert.equal(motion.state.mflip, Math.PI, 'Loading snapshot cannot flip prematurely');
engine = { hasPortrait: true };
motion.update(0, 0, false, false);
assert.equal(motion.state.mflip, Math.PI, 'Asset completion keeps the opening photo');
motion.flipMark({ face: 'logo', instant: true });
assert.equal(motion.state.mflip, 2 * Math.PI);
motion.update(0.2, 0.2 / 0.65, false, false);
motion.update(0, 0, false, false);
assert.equal(motion.state.mflip, 2 * Math.PI, 'Deliberately selected CNRS face is retained');
console.log('Photo startup, restored scrolling, delayed assets, and explicit face choice passed.');
