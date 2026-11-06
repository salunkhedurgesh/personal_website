importScripts('kinematics.js');
onmessage = ({ data }) => {
  try {
    postMessage(GofaMath.solvePose(data.pose, data.q));
  } catch (e) {
    postMessage({ error: e.message });
  }
};
