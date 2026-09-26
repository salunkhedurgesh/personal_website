# Research portfolio design study

The current iteration is **`atlas-lab/index.html`**: a personal introduction first, separate Research / Projects / Publications / Courses pages, and live color/font/effect experiments. See `atlas-lab/README.md`. Earlier concepts remain available below.

Open `index.html` in a browser for the comparison board, proposed information architecture, design system, and sources. The concept pages themselves work directly from local files. Links into existing lecture/course applications may need the site's HTTP server.

- `atlas.html`: recommended light Research Atlas homepage.
- `field-notes.html`: warm editorial alternative.
- `instrument.html`: dark scientific alternative.
- `publications.html`: working library prototype using the existing 20 paper records, with combined search, year, and topic filters.
- `previews/`: desktop and mobile browser screenshots.

These are discussion artifacts. No production pages, assets, routes, or source bibliography were edited. The future playground remains a design proposal. All affiliation copy says Incoming CNRS researcher until the lab, appointment date, and final title are confirmed. Business positioning and actual openings also need confirmation.

## Audit basis

Read the homepage, biography, research interests, current-work/news data, project and publication pages, CSV bibliography, common navigation/contact structures, styles, paper microsites, and visual assets in this repository. Also reviewed `/home/durghy/Documents/Projects/Teaching/ENG_654/eng-654`: course index, eight serial-robot lecture decks and related documentation, exercise/project structure, simulator modules, symbolic playground, and relevant models/datasets.

The old Projects page foregrounds ECARP 2020–2023 and earlier engineering projects, while newer research is mainly in the bibliography and homepage fragments. Publication categories begin collapsed; actions use small icons. There are valuable research assets already available: the RA-L paper's robot overlays and plots, KUKA course imagery, local PDFs/BibTeX, and a portrait. The teaching work provides especially useful explanations of multiple inverse kinematic solutions, singularities, redundancy, cuspidality, and complete-path feasibility.

Suggested three research themes are editorial groupings, not claims about a future CNRS team structure: kinematic intelligence; geometry and motion planning; mechanically intelligent design. A short biography and CV replace Experience in navigation. Older projects remain available through an archive. Personal material could sit behind a quiet footer link.

## Publication metadata

The library is a static snapshot of `projects/main/publications/papers.csv`; draft takeaways and topic groupings were added for the discussion. A production implementation should generate pages from one maintained source. Keep titles, authors, dates, status, related artifacts, and accessible summaries together.

Three corrections are applied **only to the preview**:

- JMD 2022 citation link uses the existing `.bib` file instead of the missing `.bibtex` path.
- IROS 2023 DOI is `10.1109/IROS55552.2023.10341420`, verified against [the authors' institution, JKU](https://research.jku.at/en/publications/time-optimal-point-to-point-motion-planning-and-assembly-mode-cha/).
- ICRA 2023 title is “Trajectory planning issues in cuspidal commercial robots”; DOI `10.1109/ICRA48891.2023.10161444` is retained. Verified against [the funding agency's project outputs](https://www.fwf.ac.at/en/research-radar/10.55776/I4452).

Science Robotics 2026 is published, as confirmed by [EPFL's April 2026 announcement](https://news.epfl.ch/news/how-to-teach-the-same-skill-to-different-robots-2/). Some older local manuscript/citation files still describe a submission. The concepts use the current CSV's title and author order.

## Later implementation priorities

1. Confirm the visual direction, affiliation copy, and business scope.
2. Write three theme pages using question → visual → significance → contribution → evidence → student entry point.
3. Consolidate content, render core text without JavaScript, and preserve existing publication URLs. Redirect Experience to About/CV rather than breaking old links.
4. Make the student route explicit: prerequisites, starting readings, course links, supervision interests, actual dated openings when available, and contact guidance.
5. Build a small guided playground later, drawing on selected teaching modules. Preserve attribution. Separate browser/precomputed examples from modules needing a native service or runtime downloads. Do not copy private exercises or staged solutions wholesale.

## Design references

The comparison board links Apple HIG Typography, Color, Buttons, and Materials, plus W3C WCAG 2.2. Native platform specifications are reference material; proposed font and target sizes are stated in web CSS pixels. These rough concepts are not a claim of full accessibility conformance.

## Review checks

Browser review covers 1440px, 390px, and 320px widths, horizontal overflow, image loading, and publication filtering (all 20 records, a topic, year 2025, no-result state, reset). Local file links and fragment targets were checked. Desktop/mobile screenshots are saved beside the templates. A full implementation would need assistive-technology, text-zoom, content, and performance review.
