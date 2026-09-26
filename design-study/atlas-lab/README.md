# Atlas / iteration 02

This is the next design study after selecting Atlas's clarity. The homepage now introduces Durgesh first, followed by research topics, recent work, current investigations, a course invitation, and contact. Past students are deferred; no placeholder people or positions are invented.

## Open the preview

With the repository served locally, visit `/design-study/atlas-lab/`. For this session a server was started at **http://localhost:8766/design-study/atlas-lab/**. If it is stopped, run `python3 -m http.server 8766 --bind 127.0.0.1` from the repository root.

Open **Experiment: color, fonts & effects** at the top. Controls apply across all preview pages; choices persist locally and in the URL. They are a review tool, not proposed controls for the public portfolio.

For the focused follow-up, open `mint.html`. It compares Mist line, Fresh frame, Seafoam wash, and Sage panels using the hybrid type system. Space Grotesk handles identity, navigation, headings, labels, and buttons; Inter handles paragraphs, explanations, abstracts, and longer reading. Each card links to the full homepage with that treatment applied, with an all-Inter comparison beside it.

Open `marine.html` for the selected seafoam direction and five related marine alternatives. The study separates color from placement: each card previews white, black, and one accent with the same content and typography. Seafoam is the recommended public identity; lagoon, horizon blue, deep current, whale blue, and reef coral show how the character changes with saturation, temperature, and depth.

Suggested starting combinations:

- `index.html?accent=mint-seafoam&font=hybrid&effect=quiet&treatment=frame` — current direction: seafoam with Space Grotesk for identity and Inter for reading.
- `index.html?accent=blue&font=inter&effect=quiet` — neutral, clear baseline.
- `index.html?accent=lime&font=grotesk&effect=lift` — neon and geometric typography.
- `index.html?accent=lilac&font=editorial&effect=spotlight` — pastel and editorial typography.
- `index.html?accent=mint&font=plex&effect=quiet` — pastel with a technical, humanist sans-serif.

Available accents: electric blue, neon lime, signal coral, vivid violet, pastel lilac, mint, peach, and blue. The site uses white, near-black, and one accent. Neutral grays are shades of black. The portrait uses a CSS grayscale filter. Scientific simulation previews retain their own dark palette and meaningful image colors.

## Page roles

- `index.html`: personal introduction → topics → recent impactful work → current projects → courses/contact.
- `research.html`: the research agenda, questions, and established contributions.
- `research-detail.html`: sample Science Robotics story, explanation, method, evidence, scope, and paper links.
- `projects.html`: concrete investigations and confirmed collaborators from the existing website.
- `publications.html`: 20-paper bibliography with combined topic/year/search filters.
- `courses.html`: a separate entry point to ENG-654 lectures and existing teaching modules.
- `notes.html`: structure, color/font/effect reasoning, and the deferred students section.

Navigation deliberately retains distinct Research and Projects entries. Connections run in both directions between themes, investigations, and papers.

## Fonts and effects

Four real, locally hosted font families: Inter, Space Grotesk, IBM Plex Sans, and Newsreader. Editorial mode pairs Newsreader headings with Inter body text. Font sources, verified axes, and hashes are in `fonts/SOURCES.md`, alongside the SIL OFL licenses. There is no font CDN dependency in the preview.

Quiet provides ordinary hover/focus feedback. Lift adds a slight card/button elevation. Spotlight adds a restrained, single-accent pointer highlight inside cards. Motion effects are disabled for reduced-motion preferences. No information depends on them.

Text over accent surfaces switches to the higher-contrast black or white option. Pale accents do not serve as body text, focus outlines, or the sole boundary of controls. This reflects [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). A full accessibility audit remains part of production implementation.

## Scope and review

These are static discussion templates with functioning design controls and publication filters. No new simulation was built. Existing course links remain attached to the existing site, whose styling has not been migrated. Incoming CNRS wording is provisional until the lab and appointment details are confirmed. Current investigations are sourced from the existing site and should be reconfirmed before publication.

Browser checks covered all seven pages at 1440, 390, and 320 CSS pixels: no horizontal overflow or broken images. All font families loaded; alternate font treatments also fit at 320px. Checked all eight accent controls, preset/reset behavior, preference persistence through actual navigation, publication filtering/no-results/reset, and reduced-motion behavior. No JavaScript exceptions were observed. Local file/fragment links were checked. `review-results.json` records these checks, and `previews/` contains screenshots.

Only design-study files were changed for this iteration. The pre-existing user modification to `start_server.sh` was preserved.
