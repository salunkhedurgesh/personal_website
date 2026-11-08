#!/usr/bin/env python3
"""Stamp deferred assets with a content-derived release ID for safe HTTP caching."""

from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = [
    ROOT / "index.html",
    ROOT / "projects/main/tour/index.html",
    ROOT / "navigation-models.html",
]


def html_version(text, version):
    text = re.sub(
        r'(<script\b[^>]*src="[^"?]+\.js)(?:\?v=[^"&]*)?("[^>]*>)',
        lambda m: m[1] + "?v=" + version + m[2],
        text,
    )
    text = re.sub(
        r'(<link\b[^>]*href="[^"?]+\.css)(?:\?v=[^"&]*)?(")',
        lambda m: m[1] + "?v=" + version + m[2],
        text,
    )
    text = re.sub(
        r'(src="images/previews/cnrs-(?:logo|profile)\.webp)(?:\?v=[^"]*)?(")',
        lambda m: m[1] + "?v=" + version + m[2],
        text,
    )
    if re.search(r"window\.ATLAS_ASSETS\s*=", text):
        if not re.search(r"window\.ATLAS_VERSION\s*=", text):
            text = re.sub(
                r"(<script\b[^>]*>)(\s*)(?=window\.ATLAS_ASSETS\s*=)",
                lambda m: m[1] + m[2] + "window.ATLAS_VERSION = 'BUILD';" + m[2],
                text,
                count=1,
            )
        text = re.sub(
            r"""(window\.ATLAS_VERSION\s*=\s*)(['"])[^'"]*\2""",
            lambda m: m[1] + m[2] + version + m[2],
            text,
        )
    return text


def css_version(text, version):
    return re.sub(
        r"""url\((['"]?)(images/nav-(?:home|publications|projects|teaching)\.png)(?:\?v=[A-Za-z0-9._-]+)?\1\)""",
        lambda m: "url(" + m[1] + m[2] + "?v=" + version + m[1] + ")",
        text,
    )


def loader_version(text, version):
    """Preserve readable spacing and either quote style around the release ID."""
    return re.sub(
        r"""(\bconst\s+version\s*=\s*)(['"])[^'"]*\2""",
        lambda m: m[1] + m[2] + version + m[2],
        text,
    )


files = set(HTML + [ROOT / "styles.css"])
# Include every public asset, including the detailed robot models, tour assets,
# research figures, and bundled libraries. An edit to any of them starts a release.
for directory in ["js", "images", "models", "lib", "assets", "projects"]:
    files.update(path for path in (ROOT / directory).rglob("*") if path.is_file())
digest = hashlib.sha256()
for path in sorted(files):
    data = path.read_bytes()
    if path.suffix in [".html", ".css", ".js"]:
        text = data.decode()
        if path in HTML:
            text = html_version(text, "BUILD")
        if path == ROOT / "styles.css":
            text = css_version(text, "BUILD")
        if path == ROOT / "js/assets.js":
            text = loader_version(text, "BUILD")
        text = re.sub(r"([?&]v=)[A-Za-z0-9._-]+", r"\1BUILD", text)
        data = text.encode()
    digest.update(str(path.relative_to(ROOT)).encode() + b"\0" + data)
version = digest.hexdigest()[:12]
for path in HTML:
    path.write_text(html_version(path.read_text(), version))
path = ROOT / "styles.css"
path.write_text(css_version(path.read_text(), version))
path = ROOT / "js/assets.js"
path.write_text(loader_version(path.read_text(), version))
print("Asset release:", version)
