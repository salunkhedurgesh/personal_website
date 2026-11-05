/* Coarse open cloth sheets, simulated in letter-local islands and skinned onto the scarves. */
window.ScarfJolt = (() => {
  const T = THREE, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const COLS = 4, ROWS = 10, DT = 1 / 120, MAX_OFFSET = .08;
  let entries = [], world = null, library = null, loading = false, generation = 0;
  let mode = 'idle', last = 0, accumulator = 0, steps = 0, recoveries = 0, notify = () => {};
  const get = (v, axis) => v['Get' + axis] ? v['Get' + axis]() : v[axis.toLowerCase()];
  const set = (v, x, y, z) => {
    if (v.Set) v.Set(x, y, z);
    else { v.x = x; v.y = y; v.z = z; }
  };
  function makeWorld(J) {
    const settings = new J.JoltSettings();
    settings.mMaxWorkerThreads = 0; settings.mMaxBodies = 64;
    settings.mMaxBodyPairs = 256; settings.mMaxContactConstraints = 512;
    const pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(0, 1);
    const layers = new J.BroadPhaseLayerInterfaceTable(2, 2);
    const fixed = new J.BroadPhaseLayer(0), cloth = new J.BroadPhaseLayer(1);
    layers.MapObjectToBroadPhaseLayer(0, fixed); layers.MapObjectToBroadPhaseLayer(1, cloth);
    J.destroy(fixed); J.destroy(cloth);
    settings.mObjectLayerPairFilter = pairs; settings.mBroadPhaseLayerInterface = layers;
    settings.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(layers, 2, pairs, 2);
    const engine = new J.JoltInterface(settings); J.destroy(settings);
    const system = engine.GetPhysicsSystem();
    return {J, engine, bodies: system.GetBodyInterface(), colliders: new Map()};
  }
  function load() {
    if (library || loading || reduced.matches || mode === 'unavailable') return;
    const stamp = generation; loading = true; mode = 'loading';
    PuppetJolt.library().then(J => {
      if (stamp !== generation) return;
      library = J; loading = false; mode = 'jolt'; notify();
    }).catch(error => {
      if (stamp !== generation) return;
      loading = false; mode = 'unavailable'; console.warn('Scarf Jolt could not start:', error);
    });
  }
  function weights(p, width, length, skew) {
    const v = T.MathUtils.clamp(-p.y / length, 0, 1);
    const u = T.MathUtils.clamp((p.x - skew * v) / width + .5, 0, 1);
    const x = Math.min(COLS - 1, Math.floor(u * COLS)), y = Math.min(ROWS - 1, Math.floor(v * ROWS));
    const fx = u * COLS - x, fy = v * ROWS - y, a = y * (COLS + 1) + x;
    return {ids: [a, a + 1, a + COLS + 1, a + COLS + 2], w: [(1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy]};
  }
  function register(mesh, unit, options = {}) {
    const p = mesh.geometry.attributes.position, rest = p.array.slice();
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const width = options.width || box.max.x - box.min.x, length = options.length || -box.min.y, skew = options.skew || 0;
    const grid = [];
    for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLS; x++) {
      const v = y / ROWS;
      grid.push(new T.Vector3((x / COLS - .5) * width + skew * v, -length * v, .035 * Math.sin(v * Math.PI * .85)));
    }
    const skin = Array.from({length: p.count}, (_, i) => weights(new T.Vector3().fromBufferAttribute(p, i), width, length, skew));
    const fringe = (options.fringe || []).map(object => ({object, position: object.position.clone(), skin: weights(object.position, width, length, skew)}));
    entries.push({mesh, unit, rest, grid, skin, fringe, body: null});
    mesh.frustumCulled = false; notify = options.request || notify;
    if (reduced.matches) mode = 'still'; else load();
  }
  function island(unit) {
    if (world.colliders.has(unit)) return world.colliders.get(unit);
    const {J, bodies} = world, bounds = unit.body.geometry.boundingBox;
    const offset = world.colliders.size * 3;
    const half = new J.Vec3((bounds.max.x-bounds.min.x)/2, (bounds.max.y-bounds.min.y)/2, (bounds.max.z-bounds.min.z)*unit.body.scale.z/2);
    const shape = new J.BoxShape(half, .008, null);
    const position = new J.RVec3(offset+(bounds.min.x+bounds.max.x)/2, (bounds.min.y+bounds.max.y)/2, 0);
    const rotation = new J.Quat(0, 0, 0, 1);
    const settings = new J.BodyCreationSettings(shape, position, rotation, J.EMotionType_Static, 0);
    settings.mFriction = .4; settings.mRestitution = 0;
    const body = bodies.CreateBody(settings); bodies.AddBody(body.GetID(), J.EActivation_DontActivate);
    [half, position, rotation, settings].forEach(v => J.destroy(v));
    const item = {body, offset}; world.colliders.set(unit, item); return item;
  }
  function createBody(entry) {
    const {J, bodies} = world, frame = island(entry.unit);
    entry.mesh.updateWorldMatrix(true, false); entry.unit.g.updateWorldMatrix(true, false);
    // Global dragging, orbiting and shivering never teleport the simulation's pins.
    const toFrame = new T.Matrix4().copy(entry.unit.g.matrixWorld).invert().multiply(entry.mesh.matrixWorld);
    entry.fromFrame = toFrame.clone().invert(); entry.offset = frame.offset;
    entry.simRest = entry.grid.map(p => { const q = p.clone().applyMatrix4(toFrame); q.x += frame.offset; return q; });
    const settings = new J.SoftBodySharedSettings(), vertex = new J.SoftBodySharedSettingsVertex();
    entry.simRest.forEach((p, i) => {
      set(vertex.mPosition, p.x, p.y, p.z); vertex.mInvMass = i <= COLS ? 0 : 1;
      settings.mVertices.push_back(vertex);
    });
    const face = new J.SoftBodySharedSettingsFace(0, 0, 0, 0);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const a = y * (COLS + 1) + x;
      for (const tri of [[a,a+COLS+1,a+1],[a+1,a+COLS+1,a+COLS+2]]) {
        tri.forEach((v,i) => face.set_mVertex(i,v)); settings.AddFace(face);
      }
    }
    const attributes = new J.SoftBodySharedSettingsVertexAttributes();
    attributes.mCompliance = 1e-6; attributes.mShearCompliance = 1e-6; attributes.mBendCompliance = 5e-5;
    settings.CreateConstraints(attributes, 1, J.SoftBodySharedSettings_EBendType_Dihedral); settings.Optimize();
    const position = new J.RVec3(0,0,0), rotation = new J.Quat(0,0,0,1);
    const creation = new J.SoftBodyCreationSettings(settings, position, rotation, 1);
    creation.mUpdatePosition = false; creation.mNumIterations = 8; creation.mLinearDamping = 1.5;
    creation.mMaxLinearVelocity = .65; creation.mVertexRadius = .004; creation.mFriction = .4;
    creation.mGravityFactor = 0; creation.mAllowSleeping = false; creation.mFacesDoubleSided = true;
    entry.body = bodies.CreateSoftBody(creation); bodies.AddBody(entry.body.GetID(), J.EActivation_Activate);
    const vertices = J.castObject(entry.body.GetMotionProperties(), J.SoftBodyMotionProperties).GetVertices();
    entry.vertices = entry.grid.map((_,i) => vertices.at(i));
    [creation,position,rotation,vertex,face,attributes].forEach(v => J.destroy(v));
  }
  function reseed(entry) {
    entry.vertices.forEach((v,i) => {
      const p=entry.simRest[i]; set(v.mPosition,p.x,p.y,p.z); set(v.mPreviousPosition,p.x,p.y,p.z); set(v.mVelocity,0,0,0);
    });
  }
  function resetEntry(entry) {
    if (entry.body && world) { world.bodies.RemoveBody(entry.body.GetID()); world.bodies.DestroyBody(entry.body.GetID()); }
    entry.body = null; entry.vertices = null;
    entry.mesh.geometry.attributes.position.array.set(entry.rest); entry.mesh.geometry.attributes.position.needsUpdate = true;
    entry.mesh.geometry.computeVertexNormals(); entry.fringe.forEach(f => f.object.position.copy(f.position));
  }
  function blend(skin, deltas) {
    const p = new T.Vector3(); skin.ids.forEach((id,i) => p.addScaledVector(deltas[id],skin.w[i])); return p;
  }
  function step(ms, sceneTime) {
    if (!entries.length || reduced.matches) return;
    load(); if (!library) return; if (!world) world = makeWorld(library);
    for (const entry of entries) {
      const ready = entry.unit.winterScarf.userData.wrapProgress === 1;
      if (ready && !entry.body) createBody(entry); else if (!ready && entry.body) resetEntry(entry);
    }
    const active = entries.filter(e => e.body);
    if (!active.length) { last=ms; accumulator=0; return; }
    accumulator += last ? Math.max(0,Math.min((ms-last)/1000,8*DT)) : DT; last=ms;
    const inverse = new T.Quaternion();
    active.forEach(entry => {
      entry.unit.g.getWorldQuaternion(inverse).invert();
      entry.gravity = new T.Vector3(0,-9.8,0).applyQuaternion(inverse);
    });
    while (accumulator >= DT) {
      for (const entry of active) entry.vertices.forEach((v,i) => {
        if (i <= COLS) return;
        const vel=v.mVelocity, breeze=.025*Math.sin(sceneTime+entry.grid[i].y*4);
        set(vel,get(vel,'X')+(entry.gravity.x+breeze)*DT,get(vel,'Y')+entry.gravity.y*DT,get(vel,'Z')+entry.gravity.z*DT);
      });
      world.engine.Step(DT,1); accumulator-=DT; steps++;
    }
    for (const entry of active) {
      const simulated=entry.vertices.map(v => {const p=v.mPosition;return new T.Vector3(get(p,'X'),get(p,'Y'),get(p,'Z'));});
      if (simulated.some((p,i) => ![p.x,p.y,p.z].every(Number.isFinite) || p.distanceTo(entry.simRest[i])>.22)) {
        reseed(entry); recoveries++; simulated.forEach((p,i)=>p.copy(entry.simRest[i]));
      }
      const deltas=simulated.map((p,i)=>{p.x-=entry.offset;return p.applyMatrix4(entry.fromFrame).sub(entry.grid[i]).clampLength(0,MAX_OFFSET);});
      const attribute=entry.mesh.geometry.attributes.position;
      entry.skin.forEach((skin,i)=>{const d=blend(skin,deltas);attribute.setXYZ(i,entry.rest[i*3]+d.x,entry.rest[i*3+1]+d.y,entry.rest[i*3+2]+d.z);});
      attribute.needsUpdate=true;entry.mesh.geometry.computeVertexNormals();
      entry.fringe.forEach(f=>f.object.position.copy(f.position).add(blend(f.skin,deltas)));
    }
  }
  function clear() {
    generation++; loading=false; entries.forEach(resetEntry);
    if (world) { world.colliders.forEach(({body})=>{world.bodies.RemoveBody(body.GetID());world.bodies.DestroyBody(body.GetID());}); world.J.destroy(world.engine); }
    entries=[];world=null;last=accumulator=steps=recoveries=0;mode=library?'jolt':'idle';
  }
  function inspection() {
    return {mode,steps,recoveries,clothBodies:entries.filter(e=>e.body).length,particles:entries.reduce((n,e)=>n+(e.vertices?.length||0),0),collars:0,tails:entries.filter(e=>e.body).length,maxVisualOffset:MAX_OFFSET};
  }
  return {register,step,clear,inspection};
})();
