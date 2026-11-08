# Durgesh Salunkhe — green letterhead revision

## Publish

This is a static website: HTML, CSS, JavaScript and local assets. No Node build,
Docker, database or application backend is needed. Upload the directory contents
to your existing static host. For a local preview, from this directory run:

```sh
python3 -m http.server 8000
```

## Hidden animation previews

Press **Ctrl+Alt+A** (or **Cmd+Alt+A** on macOS) to open the unlisted animation
preview panel. On phones and tablets, append `?animations=1` to the website URL.
The panel provides every lettering animation and the Live calendar option.
Selecting an animation closes the panel and replays that animation in view.
Press Escape or the close button to dismiss it without changing the animation. The shortcut also works
from Publications, Projects, and Teaching, bringing the letterhead into view.

Direct previews such as `?edition=snow` and `?edition=diwali` also remain available.

## Code formatting

The source uses two-space indentation for HTML, CSS, JavaScript, and JSON;
Python uses four spaces. Formatting settings live in `.prettierrc.json`,
`.editorconfig`, and `pyproject.toml`. Install the optional development tools once:

```sh
npm ci
python3 -m pip install -r requirements-format.txt
```

Run `npm run format` to format the source, or `npm run format:check` to check it.
Run `python3 tools/stamp-assets.py` afterward to update cached asset URLs.
Third-party libraries retain their distributed code and license headers.
Serving the website still requires only static file hosting.

## Updates through cPanel

Push your edits to GitHub, then sync/deploy them in cPanel as usual. Include the
hidden `.htaccess` file in the deployed website directory. A normal browser visit
or reload checks for updated HTML, styles, scripts, images, and models; Shift+Reload
is not required once these settings are deployed. Unchanged files can receive a
small `304 Not Modified` response and reuse their downloaded content.

Scene previews also check the server on each visit. Their separate Cache Storage
copies are used only if the network request fails, so they cannot hide an online
image update. An already-open tab picks up edits when you reload it.

This uses Apache's `mod_headers` support through `.htaccess`. If your hosting adds
a separate proxy/CDN cache, it must honor these response headers too. No additional
cPanel deployment hook or server-side build is needed for ordinary edits.

Keep the `projects/main/resources/` directory from your existing website when
merging this package: publication PDFs and BibTeX continue to reference it.
The package is a complete interface update, not another copy of that large archive.

## Faster startup and scene previews

The page starts with its biography, navigation icons, and a real snapshot of
the selected lettering at animation time zero. It then loads the live letterhead
after the first paint. The CNRS view independently starts loading its live 3D
logo as soon as that view is visible; its snapshot covers loading or an
unavailable 3D model. Each preview remains visible until its models and textures are
ready and the first live frame has rendered. A failed download keeps the image
visible; selecting the theme again retries failed robot downloads.

Only the lettering uses `models/letterhead/abb-gofa-crb15000.glb` and
`models/letterhead/kuka-iiwa7.glb`. Together these are 841,272 bytes and 33,550
triangles, compared with 4,817,064 bytes and 241,673 triangles in the originals.
Joint frames, hierarchy, and materials are preserved. The original high-resolution
GLBs and playground STL files remain unchanged. The kinematics view and research
playground continue to request those detailed models when opened.

`js/assets.js` loads features once, when needed. Chess scripts, Halloween gourd
geometry, and Christmas snow caps do not load with the default Diwali view.
The CNRS iframe starts when its view is visible and does not wait for the
letterhead models. Its first interactive chapter loads only the CNRS mark. Opening a later chapter
loads the Strasbourg scene; approaching the France/Earth chapters loads the
planet textures. Snapshot chapter images remain visible during those downloads.
The iframe pauses outside the viewport. Reduced-motion visitors get lettering
snapshots without loading the header's 3D runtime, while the CNRS logo remains
a live, directly manipulable 3D model. The CNRS image is used if WebGL or the
logo model is unavailable.

`images/previews/` contains desktop/mobile snapshots of the opening frame
(time zero) for all ten lettering editions and a CNRS logo fallback image.
`images/previews/manifest.json` records the capture time and opening-pose checks. After startup, the browser saves all 21 small images in a versioned
Cache Storage cache for future visits. Save-Data connections skip this background
prefetch. If Cache Storage is unavailable, ordinary image loading still works.

Apache settings are included in the hidden `.htaccess` file: GLB/WASM MIME types,
gzip including GLB models, and explicit cache lifetimes. Upload this file too.
All files, including versioned asset URLs, are revalidated on visits and reloads.
These directives require the host's Apache
modules and `.htaccess` support; the Python preview does not apply Apache settings.

To regenerate the content-derived release ID before publishing, run:

```sh
python3 tools/stamp-assets.py
```

This creates a content-derived asset version, so updated files use fresh URLs.
`npm run build` runs the same command without installing any dependencies. The
fingerprint includes all public asset directories, including detailed models,
research figures, tour assets, and bundled libraries. On cPanel, revalidation also
picks up ordinary edits when this optional release step is skipped.
To regenerate the lettering LODs, run `python3 tools/build-letterhead-lod.py`
(Blender required). `models/letterhead/manifest.json` records source checksums,
triangle counts, exact joint-graph comparisons, and silhouette checks. To update
the snapshots, run `node tools/capture-scene-previews.mjs` with the local preview
at port 8765 and Chromium remote debugging at port 9223, then stamp assets again.
The capture tool also uses Pillow to export the CNRS WebP image.

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
- Holi starts with green letters and seven bowls of gulal. The D/E placement
  contacts trigger staggered bowl hops and powder bursts; colourful splashes
  remain on each glyph. Grabbing or landing a letter throws more powder and
  adds persistent layers of colour. Pointer and keyboard interaction use the
  same callbacks. Local paint textures and a fixed pool of 1,008 powder grains
  and twelve clouds keep repeated play bounded. The old static paint atlas is
  not fetched, and the quiet scene stops rendering after the bursts settle.
- “Strasbourg Winter” starts gentle, six-per-second shivers at the robot placements.
  Thin ice spreads from several seeded points on each letter, with different
  directions and varying speeds over 9–13 seconds. Larger icicles have sculpted
  melt rings, ridges, and asymmetric needle tips. They hang from measured downward-facing
  counter ceilings, crossbars and ledges, with lengths limited by the free space
  underneath; there is no fixed number per letter. Three winter scarves wrap
  around R, S, and K, and a knitted cap settles on D. Then shivering stops and
  independent thaw fronts open from other directions over roughly 5–8 seconds.
  Shivering continues until all letters are frozen plus three seconds.
  The collars stay fitted; six lightweight Jolt
  cloth sheets animate the hanging tails in stable letter-local frames. Each
  sheet has 55 particles, with a fixed top edge and bounded mesh deformation.
  The letters regain their original green finish while the scarves stay on.
  A continuous wind-shaped snow drift surrounds the letter feet. Reduced motion
  shows the completed, thawed scene.
- National days keep the original green lettering. Bunting and the Republic Day
  paper roll are visible from the opening frame. After placing the letters, the
  robots lift the props. Republic Day raises the roll near the top of the scene,
  then unspools the full Preamble down behind the lettering until the lower roll
  rests on the floor. The local parchment texture uses classical serif typography,
  a clear hierarchy, the complete constitutional text and the State Emblem; its
  text source is recorded in `images/occasions/preamble-source.txt`.
  Independence Day and 14 July use twenty-four tall isosceles pennants on a higher
  rope with a deeper parabolic sag: eight saffron/blue on the left, eight cream in the
  middle, and eight green/red on the right. Each sewn top edge follows the rope
  curve, while the rest of the pennant can flutter. Each occasion has its own Appearance
  selection and calendar date. National-day code and the Republic Day emblem
  load only when needed; the emblem's source and derivation are recorded in
  `images/occasions/india-emblem-source.txt`.
- Marionette uses a rope bridle tied to both tops of H, K, N, and U. Other letters
  have one rope connected to their actual top surface, including offset tops.
  The robots begin with the wooden rail raised, lower it over 1.15 seconds,
  then let a stronger shake decay exponentially. The letters begin suspended
  at the matching height. Rope anchors and the Jolt support body follow the
  same pose, including when Jolt finishes loading during the descent.
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

`node tools/check-progressive-loading.mjs` verifies first-paint snapshots, all
ten live themes, saved images, delayed city/planet downloads, full-resolution
kinematics/playground assets, and mobile layout. `node
tools/check-progressive-fallbacks.mjs` checks all 20 opening-frame records,
independent CNRS loading and drag interaction, a cold 3 Mbps mobile connection,
reduced motion, unavailable WebGL, failed model downloads, and retry. Results
are saved in `tools/progressive-loading-qa.json` and
`tools/progressive-fallback-qa.json`.

`node tools/check-winter-national.mjs` checks frost/thaw direction and timing,
full freezing and restoration, natural icicle supports and clearance, warm clothing, all three
national-day props visible from the start, tall triangular tricolour bunting, elevated
robot grips, parabolic rope profiles, complete floor-length Preamble unrolling,
lazy loading, green letters, calendar
selection, mobile overflow, and reduced motion. It writes `tools/winter-national-qa.json`.

`node tools/check-holi-marionette.mjs` verifies the descending rail, exponential
shake envelope, real Jolt stability, robot grips, green Holi opening, placement
bursts, pointer/keyboard painting, persistent colour, replay, bounded particle
pools, mobile layout and reduced motion. Results: `tools/holi-marionette-qa.json`.

Open `navigation-models.html` directly to compare twelve actual 3D navigation
sculptures, three per destination. Models can be rotated by pointer or keyboard;
selection updates the menu-size comparison. The selected set is
Home C, Publications A, Projects A and Teaching A. Model factories are in
`js/navigation-models.js` and comparison controls are in `js/navigation-studies.js`; the comparison image is `images/navigation-model-studies.png`.
`node tools/check-navigation-models.mjs` checks the gallery, rotation, selection,
mobile layout and direct local-file use, saving `tools/navigation-models-qa.json`.

The main menu uses the selected compass, manuscript, builder with plans and
seminar board. Icon drags are limited to 25° either side of the default view
and 12° vertically; a drag does not activate the page link. The comparison
page uses the same limits. Snapshot icons cover initial loading, reduced
motion and unavailable WebGL. Regenerate them with
`node tools/capture-navigation-previews.mjs`, then stamp assets.

`node tools/check-navigation-live.mjs` verifies the C/A/A/A menu, limited mouse
and touch dragging, normal link activation, unchanged lettering rendering,
mobile width, static fallback images and deferred loading under reduced motion.
Results are saved in `tools/navigation-live-qa.json`.
