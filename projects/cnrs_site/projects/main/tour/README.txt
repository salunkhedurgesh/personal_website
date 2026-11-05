Research Atlas — static release

Publish the contents of this folder with index.html at the site root. No server application, build step, API key or installation is required. Serve over HTTPS (or localhost). Only weather and the optional online journal masthead contact third parties; the 3D views and IK use local assets.

Direct entries: #playground, #lab-noon, #strasbourg, #strasbourg/winter/night, #strasbourg/rainy/day. Seasons: spring, summer, autumn (fall alias), winter, rainy. On the live city, a fresh Open-Meteo sample supplies current conditions; without data only the calendar season and solar lighting are used. December is used for the manual winter preview.

In the playground, set the six joints or enter the base_link → tool0 position (m) and quaternion (w,x,y,z). Solve IK. Click one branch to set the joints. Hold Shift to preview all branches, Shift-click to keep a subset, or enable Compare on touch devices. Solutions are isolated configurations modulo full turns; singular continuous families are not enumerated. Joint-limit violations are flagged, not silently clamped in the reported angle. The browser implementation does not execute the Linux binary.

Three.js (MIT) and the STL loader load on demand. See vendor/ and notices/. Research display models and location miniatures are illustrations, not surveying or robot-safety data.
