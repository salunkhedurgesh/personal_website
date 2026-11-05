// Run with: node tools/check-lamp-supports.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {join} = require('node:path');
const T = require('../lib/three.js');
const context = {window: {}, THREE: T};
runInNewContext(readFileSync(join(__dirname, '../js/clay/forms.js'), 'utf8'), context);
runInNewContext(readFileSync(join(__dirname, '../js/clay/atelier.js'), 'utf8'), context);
const suspensionTops = context.window.AtelierArt.suspensionTops;
const binary = value => Uint8Array.from(Buffer.from(value, 'base64')).buffer;

for (const [ch,top] of [['U',0],['E',0],['H',1],['A',0],['N',1]]) {
 const data=context.window.ClayForms.E[ch][1],g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(Float32Array.from(new Int16Array(binary(data[0])),n=>n/12000),3));
 g.setIndex(new T.BufferAttribute(new Uint16Array(binary(data[1])),1));
 const point=suspensionTops(g)[top],mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld(true);
 const hit=new T.Raycaster(new T.Vector3(point.x,2,0),new T.Vector3(0,-1,0)).intersectObject(mesh)[0];
 assert(hit&&hit.point.distanceTo(point)<.001);assert(hit.face.normal.y>.9,ch+' needs a level supporting top');
 console.log(ch,point.toArray(),hit.face.normal.y);
}
