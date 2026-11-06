# 6-RSS geometry derived from the preserved GLB

`models/zamanov-6rss-kinematics.json` is a geometrically consistent **visual-model** configuration for `models/zamanov-6rss.glb`, not a calibration of a physical robot. The source GLB calls its assembly a visual rest pose. Its SHA-256 is recorded in the JSON and was unchanged by extraction.

Coordinates are right-handed glTF: metres, +Y up, XZ ground plane. Matrix arrays use glTF/Three.js column-major order. Platform node **6**, `P / Moving platform`, starts at `[0, 0.264, 0]` with identity rotation. Each actuator coordinate is a delta from this drawn pose: all six home angles are zero.

## Essential offsets and axes

- Each radial crank is **0.077 m**. Its lower spherical joint is crank-local `[0.077, 0.010, 0]`: the **10 mm axial stand-off must remain**. The revolute pivot and the spherical joint therefore do not lie in one zero-depth crank plane.
- The geometric shaft direction is motor-pair-local **+Z**, equivalently crank-home-local **+Y**. The crank group's `extras.axis_local: [0,0,1]` does not describe that shaft in the crank's own home frame; the JSON retains it as `metadataAxisLocal` for comparison and uses `[0,1,0]` as `crankRotationAxisLocal`.
- The revolute pivot is the crank group origin, 8 mm in front of the fixed motor node origin. Positive q is right-handed about the stored `baseAxis`; the mirrored legs already have mirrored home radial vectors, so no additional sign flip is needed.
- The rigid rod's actual ball-centre spacing is **0.2379558287 m**, read from its upper polished-ball child. Its extras value, 237.9558 mm, is rounded. Use `rodLengthM` to preserve the existing mesh length exactly.
- Platform attachment points come from the **upper polished-ball centres**, transformed into platform-local coordinates, rather than from saddle or bearing-pin origins. For pair 1 they are `[−0.149, 0, 0.1041080939]` and `[+0.149, 0, 0.1041080939]` to source precision. A ball centre is 11.2 mm in front of its saddle origin along the pair's +Z direction.

## Nodes to articulate

| Leg | Fixed motor | Crank | Rod | Lower ball | Upper ball | Platform saddle | Platform pin |
|---|---:|---:|---:|---:|---:|---:|---:|
| R01 | 10 | 65 | 81 | 85 | 111 | 79 | 80 |
| R02 | 137 | 192 | 208 | 212 | 238 | 206 | 207 |
| R03 | 266 | 321 | 337 | 341 | 367 | 335 | 336 |
| R04 | 393 | 448 | 464 | 468 | 494 | 462 | 463 |
| R05 | 522 | 577 | 593 | 597 | 623 | 591 | 592 |
| R06 | 649 | 704 | 720 | 724 | 750 | 718 | 719 |

Update the platform node once; its plate and all saddle descendants follow. Set each crank matrix to `crankHomeLocalMatrix * RotationY(q)`, retaining its original translation. Compute the lower spherical point from the stored radial vector, tangent vector, and axial offset. Place each rod origin at that lower point and rigidly align its local +Y axis with the upper-minus-lower direction. Keep rod scale at one. A shortest-arc rotation from `rodHomeDirectionBase` to the new direction, pre-multiplied onto `rodHomeBaseMatrix`'s rotation, provides a continuous roll convention near home; convert the result through the inverse motor-pair transform before assigning the rod's local matrix. Spherical joints do not determine rod roll uniquely.

The JSON's `closure` object gives the squared-length constraint and analytic inverse-angle equation. The home roots use signs **`[−1,+1,−1,+1,−1,+1]`** in `phase + sign*acos(k/hypot(a,b))`. The alternate home solutions are approximately `−2.93191675536` rad on odd legs and `+2.93191675536` rad on even legs. Continue the selected branch from q=0 and unwrap to the nearest previous value; reject unreachable poses instead of stretching rods or jumping branches. No actuator or spherical-joint travel limits can be inferred from the mesh, so `jointLimitsRad` is null.

All six home constraints close within **4.1 × 10⁻¹² m** using the stored JSON precision. The home platform constraint Jacobian has rank six. Sixty-four sampled nearby 6-DoF poses (translation up to 4/5/4 mm and rotations up to 2° per axis) retained all rod lengths within **3.9 × 10⁻¹⁶ m** on the selected branch. These checks validate the geometry and equations, not hardware collision clearance or calibration.

## Inverse kinematics used in the interactive scene

For limb i, let B be its revolute pivot, u its unit shaft direction, h the axial offset, r its home radial crank vector (length a), and v = u × r. Let p be the platform-local attachment. At platform pose (t, R):

```
P = t + R p
E(q) = B + h u + r cos(q) + v sin(q)
D = P − B − h u
||P − E(q)||² = b²
A = D · r
Bq = D · v
C = (D · D + a² − b²) / 2
q = atan2(Bq, A) + branchSign × acos(C / hypot(A, Bq))
```

`js/rss-ik.js` solves all six angles analytically. It rejects an invalid cosine instead of accepting unreachable targets, keeps the home branch, and checks the normalized platform Jacobian's reciprocal condition and the crank transmission margin. The interactive example holds the platform orientation at home while allowing translation in the camera-facing plane. The solver itself accepts a full position and quaternion pose.

The platform and crank subtrees are articulated in the original GLB; each rod is rigidly aligned between the solved spherical centres. Rod meshes are never stretched. Instancing retains the original mesh resolution with about 50 shared draw batches. The high-resolution ABB GoFa model and the playground assets are unchanged.

The demonstration's conservative envelope is a **25 mm displacement radius**, **±25° crank travel**, **18° rod-direction change** and **8° platform rotation** about home. These are software limits for this reconstructed visual model, not measured physical joint limits or collision certification. Interactive rotation is held at zero. A continuous path check clips requests before a limit or invalid branch is reached.

## Virtual spring

A displayed spring joins the unloaded platform position to its current position. Its restoring force is `F = −k x`; the panel displays `k ||x||` in newtons. The user can vary k from 200 to 1200 N/m. A second virtual coupling joins the pointer's bounded target to the platform (2000 N/m). A 0.5 kg virtual mass and damping ratio 1.05 integrate the resulting force with substeps no longer than 1/180 s. Increasing k visibly reduces platform displacement for the same pointer target. Releasing the pointer removes the hand coupling and returns the platform to home, following the same IK branch. This is visual force emulation, not haptic output.

Elapsed integration time is capped at 50 ms per frame; cancelled drags, loss of focus, hiding the view, and tab suspension release the coupling. Arrow keys and Page Up/Down supply bounded translation targets while held; Home resets. The spring and handle are overlays for this demonstration.

Related research: [Sensorless full body active compliance in a 6 DOF parallel manipulator](https://doi.org/10.1016/j.rcim.2019.04.010), Dutta et al., Robotics and Computer-Integrated Manufacturing 59 (2019), 278–290. The browser spring is an illustrative interaction, separate from the paper's hardware controller.

Validation: `node tools/check-rss-ik.cjs` checks 500 six-DoF poses, 200 clipped large targets, assembly continuity, rod-length closure, spring stiffness response, stable release and paused-tab integration. The browser check in `tools/check-kinematics-live.mjs` additionally tests actual mesh joint closure, native pointer/keyboard/touch input, page-title models, and responsive layout.
