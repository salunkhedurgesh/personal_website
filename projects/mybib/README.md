# MyBib

MyBib is a self-contained academic PDF mini-library for this static website. It scans local PDFs, extracts metadata with GROBID, enriches records with Crossref, generates BibTeX, and serves a lightweight Zotero-style browser from plain HTML, CSS, and JavaScript.

The project lives entirely in `projects/mybib/` and does not change the rest of the website.

## Bibliography Storage

The default bibliography source is this shared OneDrive folder:

```text
https://1drv.ms/f/c/051778c98f101335/IgCyAWQzFkU8Q7cuR-Y7G6NVAbM67bS47AXxK5pWIblFYGs?e=vbd6jw
```

By default, `python scripts/build_library.py` tries to sync PDFs from that shared folder into the local cache at `projects/mybib/pdfs/`, then scans the local cache. This keeps the static website dependable because the UI opens PDFs from local static files.

If Microsoft requires an authenticated sync client on your machine, the script reports that clearly and continues with the PDFs already present in `projects/mybib/pdfs/`. In that case, use the rclone workflow below, or sync the shared folder into `projects/mybib/pdfs/` with OneDrive Desktop and run:

```bash
python scripts/build_library.py --no-sync --verbose
```

Nested folders under `pdfs/` are supported.

## Rclone OneDrive Sync

For dependable OneDrive access, configure an authenticated rclone remote once:

```bash
rclone config
```

Choose Microsoft OneDrive, complete the browser login, and give the remote a name such as `onedrive`.

To inspect your remote:

```bash
rclone lsd onedrive:
rclone ls onedrive:
```

Then build MyBib using the remote folder as the master bibliography storage:

```bash
python scripts/build_library.py --rclone-remote "onedrive:Path/To/Bibliography" --verbose
```

For this repository, the convenience update script defaults to your current remote path, `onedrive:Work/literature`:

```bash
./update_mybib.sh
```

It syncs PDFs with rclone, starts GROBID when Docker is available, rebuilds `data/papers.json`, updates `data/references.bib`, and leaves the static page ready to deploy.

By default this uses `rclone copy`, which downloads PDFs but does not delete local files. To make `projects/mybib/pdfs/` exactly mirror the OneDrive folder:

```bash
python scripts/build_library.py --rclone-remote "onedrive:Path/To/Bibliography" --rclone-mode sync --verbose
```

Preview changes first:

```bash
python scripts/build_library.py --rclone-remote "onedrive:Path/To/Bibliography" --rclone-dry-run --skip-grobid --skip-crossref --verbose
```

When deployed, visitors access the static files published with your website. They do not access your OneDrive account directly. Make sure your deployment includes:

- `projects/mybib/index.html`
- `projects/mybib/css/`
- `projects/mybib/js/`
- `projects/mybib/data/`
- `projects/mybib/pdfs/`

If your hosting workflow builds the site on a server or CI runner, that environment must also have rclone configured before deployment.

## Automatic Update Script

Run the full local update:

```bash
cd projects/mybib
./update_mybib.sh
```

Useful variants:

```bash
MYBIB_SKIP_GROBID=1 ./update_mybib.sh
MYBIB_SKIP_CROSSREF=1 ./update_mybib.sh
MYBIB_SKIP_OPENALEX=1 ./update_mybib.sh
MYBIB_RCLONE_MODE=sync ./update_mybib.sh
MYBIB_RCLONE_REMOTE="onedrive:Another/Folder" ./update_mybib.sh
MYBIB_CROSSREF_MAILTO="your.name@example.com" ./update_mybib.sh
```

Pass build-script options after the command:

```bash
./update_mybib.sh --force
./update_mybib.sh --limit 20
```

For a cron job:

```bash
0 7 * * * cd /home/durghy/Documents/Projects/my_website/personal_website/projects/mybib && MYBIB_SKIP_GROBID=1 ./update_mybib.sh >> data/update.log 2>&1
```

For deployment, run `./update_mybib.sh` before uploading/publishing the website so `projects/mybib/data/` and `projects/mybib/pdfs/` are current.

## Install

From the repository root:

```bash
cd projects/mybib
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

## Start GROBID

```bash
docker compose -f docker/docker-compose.yml up -d
```

GROBID will be available at `http://localhost:8070`.

If GROBID is not running, the pipeline keeps scanned PDFs in the library, marks them as needing review, and prints the command above.

## Add PDFs

The preferred flow is to add PDFs to the shared OneDrive folder, then run:

```bash
python scripts/build_library.py --verbose
```

The script downloads readable PDFs from OneDrive into:

```text
projects/mybib/pdfs/
```

You can also place PDFs there manually and skip online sync:

```bash
python scripts/build_library.py --no-sync --verbose
```

Useful options:

```bash
python scripts/build_library.py --force
python scripts/build_library.py --no-sync
python scripts/build_library.py --onedrive-url "https://1drv.ms/f/..."
python scripts/build_library.py --rclone-remote "onedrive:Path/To/Bibliography"
python scripts/build_library.py --rclone-remote "onedrive:Path/To/Bibliography" --rclone-mode sync
python scripts/build_library.py --skip-grobid
python scripts/build_library.py --skip-crossref
python scripts/build_library.py --skip-openalex
python scripts/build_library.py --limit 10 --verbose
python scripts/build_library.py --mailto your.name@example.com
```

To change the default shared folder without editing code:

```bash
MYBIB_ONEDRIVE_URL="https://1drv.ms/f/..." python scripts/build_library.py --verbose
```

Set a real Crossref contact email with `--mailto` or by editing `CROSSREF_MAILTO` in `scripts/utils.py`.

## Generated Data

The build writes:

- `data/papers.json`: complete paper database.
- `data/references.bib`: complete BibTeX library.
- `data/needs_review.json`: records needing manual attention.
- `data/onedrive_manifest.json`: remote sync state for the shared OneDrive folder.
- `data/cache/grobid/`: cached TEI XML from GROBID.
- `data/cache/crossref/`: cached Crossref JSON.
- `data/cache/openalex/`: cached OpenAlex JSON.

Unchanged PDFs are not reprocessed unless `--force` is used.

## Manual Overrides

Edit `data/manual_overrides.yaml` to correct metadata, categories, projects, tags, notes, or BibTeX keys. Overrides are applied after GROBID and Crossref, so they are not overwritten by extraction.

You can also edit metadata directly in the MyBib browser interface with **Edit metadata**. Browser edits are saved immediately in `localStorage` and affect search, project/category filters, and BibTeX downloads on that browser. Use **Export metadata** for a JSON backup/import round trip, or **Export YAML** to download a `manual_overrides.yaml` file that can be copied into `data/manual_overrides.yaml` for permanent pipeline-level overrides.

Keys may be:

- DOI, for example `10.1126/scirobotics.xxxx`
- generated paper id
- relative PDF path, for example `pdfs/my-paper.pdf`
- PDF filename, for example `my-paper.pdf`

Example:

```yaml
papers:
  "10.1126/scirobotics.xxxx":
    bibtex_key: "Salunkhe2026DemonstrateOnce"
    categories:
      - robot-learning
      - kinematic-intelligence
    projects:
      - cross-robot-skill-transfer
    tags:
      - LfD
      - kinematics
      - transfer-learning
    notes: "Important paper for Kinematic Intelligence project."
```

## Categories and Projects

Edit `data/categories.json` to change the available filters shown in the browser. Paper assignments should usually be made through `manual_overrides.yaml`.

## Notes

The static UI supports browser editing with `localStorage`.

- Existing notes from `data/notes.json` are loaded on startup.
- Edited notes are saved in the browser.
- Use **Export notes** to download an updated `notes.json`.
- Use **Import notes** to restore or merge notes from a JSON file.

Because this is a static website, browser edits cannot directly write back to `data/notes.json`.

## BibTeX

The pipeline generates stable citation keys in the form:

```text
FirstAuthorYearShortTitle
```

Examples:

```text
Billard2008RobotProgramming
KhansariZadeh2011LearningStable
Salunkhe2026DemonstrateOnce
```

Collisions are resolved with `A`, `B`, `C`, and so on. You can pin a key with `manual_overrides.yaml`.

The web UI supports:

- Copy BibTeX for one paper.
- Download BibTeX for one paper.
- Download BibTeX for the current filtered result set.
- Download BibTeX for a selected category.
- Download BibTeX for a selected project.
- Download complete `references.bib`.

## Open the Library

Open:

```text
projects/mybib/index.html
```

Some browsers restrict `fetch()` from local files. If the page shows missing data even though JSON files exist, serve the repository locally:

```bash
cd ../..
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/projects/mybib/
```

## Troubleshooting

- **GROBID unavailable**: run `docker compose -f docker/docker-compose.yml up -d`.
- **OneDrive unavailable**: sync the shared folder into `projects/mybib/pdfs/` with an authenticated client, then run `python scripts/build_library.py --no-sync`.
- **Crossref errors**: pass `--mailto your.name@example.com`; cached responses are reused automatically.
- **Bad metadata**: edit `data/manual_overrides.yaml`, then rerun `python scripts/build_library.py --skip-grobid --skip-crossref`.
- **Missing papers in UI**: check `data/papers.json` and browser console. Use a local HTTP server if opening from `file://` is blocked.
- **Needs review**: inspect `data/needs_review.json`; PDFs are intentionally retained even when extraction fails.

## Optional Main-Site Link

To link this project from the main website, add a normal static link wherever appropriate:

```html
<a href="projects/mybib/">MyBib</a>
```

No site-wide framework or build step is required.
