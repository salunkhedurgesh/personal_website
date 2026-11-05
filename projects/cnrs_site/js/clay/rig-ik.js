/* Pose fitting for the two display robots; endpoints stay on the carried props. */
window.ClayRigIK = {
  create({root, joints, axes, contact, orientation, seed, limits}) {
    const T = THREE, q = seed.slice();
    const apply = angles => {
      joints.forEach((joint, i) => joint.quaternion.setFromAxisAngle(axes[i], angles[i]));
      root.updateWorldMatrix(true, true);
    };
    function linearSolve(matrix, vector) {
      const a = matrix.map((row, i) => [...row, vector[i]]);
      for (let i = 0; i < 6; i++) {
        let best = i;
        for (let j = i + 1; j < 6; j++) if (Math.abs(a[j][i]) > Math.abs(a[best][i])) best = j;
        [a[i], a[best]] = [a[best], a[i]];
        const scale = a[i][i];
        if (Math.abs(scale) < 1e-12) return Array(6).fill(0);
        for (let k = i; k <= 6; k++) a[i][k] /= scale;
        for (let j = 0; j < 6; j++) if (j !== i) {
          const f = a[j][i];
          for (let k = i; k <= 6; k++) a[j][k] -= f * a[i][k];
        }
      }
      return a.map(row => row[6]);
    }
    let initialized = false;
    function solve(target, targetRotation) {
      const position = new T.Vector3(), currentRotation = new T.Quaternion();
      const origin = new T.Vector3(), axis = new T.Vector3(), parentRotation = new T.Quaternion();
      let weight = .28;
      apply(q);
      const iterations = initialized ? 40 : 180;
      for (let iteration = 0; iteration < iterations; iteration++) {
        contact.getWorldPosition(position); orientation.getWorldQuaternion(currentRotation);
        // A reachable contact takes precedence over a preferred wrist orientation.
        if(iteration>=iterations/2&&position.distanceTo(target)>.004)weight=.015;
        if(iteration>=iterations-10&&position.distanceTo(target)>.001)weight=0;
        const delta = targetRotation.clone().multiply(currentRotation.invert());
        if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
        const error = [target.x-position.x,target.y-position.y,target.z-position.z,
          2*delta.x*weight,2*delta.y*weight,2*delta.z*weight];
        if (Math.hypot(...error) < .0006) break;
        const columns = joints.map((joint, i) => {
          joint.getWorldPosition(origin); joint.parent.getWorldQuaternion(parentRotation);
          axis.copy(axes[i]).applyQuaternion(parentRotation).normalize();
          const velocity = axis.clone().cross(position.clone().sub(origin));
          return [velocity.x,velocity.y,velocity.z,axis.x*weight,axis.y*weight,axis.z*weight];
        });
        const a = Array.from({length:6}, (_, row) => Array.from({length:6}, (_, col) =>
          columns.reduce((sum, column) => sum + column[row]*column[col], 0) + (row===col?.0004:0)));
        const update = linearSolve(a, error);
        columns.forEach((column, i) => {
          const step = T.MathUtils.clamp(column.reduce((sum, value, j) => sum+value*update[j], 0), -.16, .16);
          const range = limits?.[i] || [-Math.PI*2, Math.PI*2];
          q[i] = T.MathUtils.clamp(q[i]+step, range[0], range[1]);
        });
        apply(q);
      }
      initialized = true;
      contact.getWorldPosition(position);
      root.userData.gripError = position.distanceTo(target);
      root.userData.gripTarget = target.toArray();
      root.userData.gripAngles = q.slice();
      return q.slice();
    }
    return {solve, apply};
  }
};
