# Durgesh Salunkhe — green letterhead revision

## Publish

This is a static website: HTML, CSS, JavaScript and local assets. No Node build,
Docker, database or application backend is needed. Upload the directory contents
to your existing static host. For a local preview, from this directory run:

```sh
python3 -m http.server 8000
```

Keep the `projects/main/resources/` directory from your existing website when
merging this package: publication PDFs and BibTeX continue to reference it.
The package is a complete interface update, not another copy of that large archive.

## This revision

- A transparent 3D letterhead sits on the page's warm-white background.
- The standard lettering uses five restrained shades of green; no pedestal or
  backdrop. The finish options change the geometry, not the academic colour scheme.
- Appearance holds the finish selector, seasonal previews, replay and physics
  status. It also offers warm-white and pure-white page surfaces.
- Green navigation accents, a quiet role selector, white research-theme cards and
  publication rows create one hierarchy for the academic content.
- Non-immersive robot showcases use a neutral surface. The office/night, city
  and globe retain their contextual lighting and environment.
- Robot assembly has two arms: GoFa places the first D; KUKA iiwa 7 places the
  final E of SALUNKHE. The older SCARA / S placement is replaced.
- The local robot meshes are cached across lettering editions. Dragging empty
  letterhead space does not orbit the scene; individual letters remain interactive.
- Diwali uses sculpted terracotta lamps with oil, wicks, and layered flames, plus
  folded-paper kandil lanterns, brass ribs, and moving tassels. Roof lamps sit on
  measured flat tops of U, E, H, A, and N, directly over the U and N uprights.
  After placing the letters, the robots grasp and lift the lantern rope, then
  continue a gentle supporting motion. The rope's left end sits above the middle
  of D, keeping the left robot inside the letterhead; bulbs follow the shorter span.
- Christmas adds a decorated background fir, three red stockings attached to letters,
  and a continuous snow drift beneath the name.
- “Cold winter in Strasbourg” starts gentle, six-per-second shivers at the robot placements.
  A thin ice glaze and icicles form over ten seconds. Three winter scarves wrap
  around R, S, and K, and a knitted cap settles on D. Then shivering stops and
  the ice melts over five seconds. The collars stay fitted; six lightweight Jolt
  cloth sheets animate the hanging tails in stable letter-local frames. Each
  sheet has 55 particles, with a fixed top edge and bounded mesh deformation.
  The letters regain their original green finish while the scarves stay on.
  A continuous wind-shaped snow drift surrounds the letter feet. Reduced motion
  shows the completed, thawed scene.
- Marionette uses a rope bridle tied to both tops of H, K, N, and U. Other letters
  have one rope connected to their actual top surface, including offset tops.
  The robots hold the wooden rail from the beginning and give it a short, gentle
  shake. Rope anchors and the Jolt support body follow the rail motion.
- Research cards and expanded panels use white surfaces in the default theme.
  SVG view boxes trim the outer white margins from the Science Robotics figures
  while preserving the original images and their scientific annotations.
- A small “+” beside the letterhead shows only the selected theme title and active
  dates. The winter theme also shows Strasbourg’s current temperature when it is
  available from the weather data; otherwise it says “Temperature unavailable.”
  On smaller screens the panel opens below the name. Escape closes it.
  National-day titles are “Indian Republic Day” on 26 January, “Indian Independence
  Day” on 15 August, and “France · la Fête nationale” on 14 July.

Live calendar selects Diwali, Holi, and Christmas for seven days each: three days
before the festival, the festival itself, and three days after. Christmas runs
December 22–28. These windows take precedence over the ordinary theme rotation.
Holi and Diwali use the existing festival date table through 2031 in `js/scene.js`.

Seasonal models and effects are in `js/clay/seasonal.js`; placement timing is
shared through `groundedAt` in `js/clay/arms.js`.
`js/clay/rig-ik.js` fits the robot display poses to the rope and rail endpoints.

## Chess evaluation

Analysis checks Lichess first. Its public cloud-eval endpoint returns cached
evaluations; it does not launch searches for new positions. Valid cloud results
must report depth 8 or higher and a legal principal variation.

On a cloud miss, error, timeout, or insufficient depth, five bundled open-source
worker builds calculate live, in order: Stockfish 19 Lite WASM, tomitankChess 7,
Lozza 11, Stockfish 19 ASM JavaScript, then Garbochess-JS. These are local live
engines, not five independent cloud services. Both Stockfish builds come from
Stockfish.js 19.0.1; the JavaScript build also works without WebAssembly. The old
430 ms, three-ply material estimate has been removed.

Every worker runs `go depth 8`. An evaluation is accepted only after an exact
score at completed depth 8 or greater and a matching `bestmove`; shallow,
bounded, illegal, and stale results are rejected. Positive scores favour White,
including when Black is to move. Played branch history is sent to the workers.
Moving to another position or disabling analysis terminates the active worker
and cancels pending requests. Lichess requests are serialized and HTTP 429
respects a minimum one-minute cooldown. If every provider fails, the panel says
analysis is unavailable. Checkmate and stalemate are displayed directly.

The previous/next arrows stay 32px wide and the current-move label stays 104px
wide. Left/Right arrow keys navigate moves whenever the chess board is active,
including while a square has focus; text fields retain normal cursor editing.
Up/Down moves focus between board squares. The New position and PGN upload
controls, and the drawing-help paragraph, have been removed.

Serve the `.wasm` asset as `application/wasm` and the worker scripts as JavaScript.
The single-threaded builds need no cross-origin isolation headers. Assets load
only when analysis needs a fallback. Keep `lib/chess/` and `notices/` together
when publishing; `notices/chess-engines.html` includes licenses and complete
engine source, including Stockfish's source archive and exact neural weights.
`python3 tools/vendor_chess_engines.py` verifies or restores pinned assets using
`lib/chess/manifest.json`.

## iiwa source and motion

`models/kuka-iiwa7.glb` uses the uploaded meshes and visual offsets, with seven
joint-origin frames. `models/iiwa7.urdf` is the original input.
`js/clay/iiwa-motion.js` contains 201 sampled configurations generated by numerical
pose IK against those frames. All sampled configurations are within the uploaded
URDF limits. The grip travels on the right of the name; the animation then opens
and withdraws the gripper. Intermediate rendering interpolates neighbouring
joint samples. This is a website choreography, not a certified hardware program;
collision checking and dynamics were not certified.

## Physics: exact scope

Letter lifting and the neighbour response use the existing lightweight damped
motion and artist-directed impact impulses. They are not a flexible-floor solve.
Jolt 1.1.0 is bundled locally in `lib/`, with its MIT notice in `notices/`.
Marionettes and scarf cloth load this WebAssembly module on demand. Scarf tails
use open cloth sheets with stretch, shear, and bend constraints, fixed top edges,
and local box colliders. Global letter movement cannot teleport the cloth pins.
The visible fabric is skinned to the coarse simulation with a maximum 0.08 scene
unit offset. The scripted wrapping completes before cloth simulation starts.
Reduced motion shows the finished clothing without simulation.
The marionette edition retains its labelled local-motion fallback if WebAssembly
is unavailable. `tools/vendor_jolt.py` can refresh the pinned runtime;
`tools/jolt-check.html` checks native marionette physics.

## Checks

A Chromium software-WebGL check exercised the new title, assembly, letter lift
and impact, role switching, and a 390px mobile viewport. No JavaScript page errors
were observed; mobile content did not overflow horizontally. See
`tools/green-revision-qa.json`. The no-WebGL fallback uses the green title still.
No connected live website or repository has been modified by this package.

Seasonal changes were also checked in headless Chromium at 1440px and 390px,
including placement timing, ten-second ice growth, scarf wrapping, melting back
to the original letters, continuous snow geometry, icicles, three red stockings, reduced motion,
and the existing robot and Halloween sets. See `tools/seasonal-qa.json`.
Run `node tools/check-festival-weeks.cjs`
for the calendar window and boundary checks.

Marionette attachments were checked against the real glyph meshes, then during
keyboard lifting, release, and rotation in the local motion fallback at 1440px
and 390px. See `tools/puppet-rope-qa.json`. Run
`node tools/check-puppet-tops.cjs` for the glyph surface checks.

Real Jolt scarf deformation, orbiting, dragging, tilting, pauses, replay, and
cleanup are checked by `node tools/check-scarf-physics.mjs`. Browser checks cover
the full scarf sequence under movement, the cap, compact occasion dates and
temperature, and responsive layout at 1440px and 390px. See
`tools/scarf-repair-qa.json`. Run `node tools/check-occasion-info.cjs` for date
ranges, cross-month festivals, leap years, and unavailable-temperature handling.

The festival robot changes are checked at their placement, pickup, lifting, and
holding stages, along with rail shaking, rope attachment, disabled letterhead
orbit, default research-card surfaces, figure cropping, mobile layout, and
reduced motion. See `tools/festival-rigs-qa.json`. Run
`node tools/check-lamp-supports.cjs` for the five measured, level lamp supports.

Run `node tools/check-chess-analysis.cjs` for chess protocol, failover, depth,
score orientation, cancellation, cache, and rate-limit checks. With the local
preview at port 8765 and Chromium's remote debugging enabled at port 9223, run
`node tools/check-chess-engines.mjs` to exercise all five real engine builds on
opening and White/Black mate positions. Ports can be overridden with
`CHESS_PREVIEW_URL` and `CHESS_DEBUG_URL`. Results are in
`tools/chess-engine-qa.json`. `node tools/check-chess-panel.mjs` checks the panel,
fixed control widths, keyboard navigation, played move history, removed controls,
live cloud lookup, and mobile layout, recording results
in `tools/chess-panel-qa.json`. Set `CHESS_SCREENSHOT_DIR` to save panel images.
`tools/national-occasion-qa.json` records browser checks with the calendar set to
each of the three national days.
