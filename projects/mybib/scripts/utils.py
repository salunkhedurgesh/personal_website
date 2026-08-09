#!/usr/bin/env python3
"""Shared helpers for the MyBib paper-library pipeline."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import unicodedata
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - surfaced by load_yaml
    yaml = None


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "pdfs"
DATA_DIR = ROOT / "data"
GROBID_CACHE_DIR = DATA_DIR / "cache" / "grobid"
CROSSREF_CACHE_DIR = DATA_DIR / "cache" / "crossref"
OPENALEX_CACHE_DIR = DATA_DIR / "cache" / "openalex"

PAPERS_PATH = DATA_DIR / "papers.json"
NOTES_PATH = DATA_DIR / "notes.json"
CATEGORIES_PATH = DATA_DIR / "categories.json"
OVERRIDES_PATH = DATA_DIR / "manual_overrides.yaml"
NEEDS_REVIEW_PATH = DATA_DIR / "needs_review.json"
REFERENCES_PATH = DATA_DIR / "references.bib"

CROSSREF_MAILTO = "your.email@example.com"
GROBID_URL = "http://localhost:8070"
DEFAULT_ONEDRIVE_URL = os.environ.get(
    "MYBIB_ONEDRIVE_URL",
    "https://1drv.ms/f/c/051778c98f101335/IgCyAWQzFkU8Q7cuR-Y7G6NVAbM67bS47AXxK5pWIblFYGs?e=vbd6jw",
)
ONEDRIVE_MANIFEST_PATH = DATA_DIR / "onedrive_manifest.json"


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(format="%(levelname)s: %(message)s", level=level)


def ensure_dirs() -> None:
    for path in (PDF_DIR, DATA_DIR, GROBID_CACHE_DIR, CROSSREF_CACHE_DIR, OPENALEX_CACHE_DIR):
        path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_yaml(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    if yaml is None:
        raise RuntimeError("PyYAML is required. Install dependencies with: pip install -r scripts/requirements.txt")
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    return default if data is None else data


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value: str, max_len: int = 72) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return (value[:max_len].strip("-") or "paper")


def title_from_filename(path: str | Path) -> str:
    stem = Path(path).stem
    stem = re.sub(r"[_-]+", " ", stem).strip()
    return re.sub(r"\s+", " ", stem).title() or "Untitled Paper"


def normalize_doi(doi: str | None) -> str:
    if not doi:
        return ""
    doi = doi.strip()
    doi = re.sub(r"^(https?://(dx\.)?doi\.org/)", "", doi, flags=re.I)
    doi = re.sub(r"^doi:\s*", "", doi, flags=re.I)
    return doi.strip().rstrip(".").lower()


def surname(author: str) -> str:
    if not author:
        return ""
    if "," in author:
        return author.split(",", 1)[0].strip()
    parts = author.strip().split()
    return parts[-1] if parts else ""


def short_title(title: str, words: int = 2) -> str:
    stopwords = {"a", "an", "and", "for", "from", "in", "of", "on", "the", "to", "with", "using"}
    tokens = re.findall(r"[A-Za-z0-9]+", title or "")
    picked = [token for token in tokens if token.lower() not in stopwords][:words]
    return "".join(token[:1].upper() + token[1:] for token in picked) or "Paper"


def safe_int(value: Any) -> int | None:
    try:
        if value in ("", None):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def stable_paper_id(pdf_path: str, file_hash: str, doi: str = "", title: str = "") -> str:
    doi = normalize_doi(doi)
    if doi:
        return slugify(doi.replace("/", "-"))
    basis = title or Path(pdf_path).stem
    return f"{slugify(basis, 48)}-{file_hash[:10]}"


def default_paper(relative_pdf: str, file_hash: str) -> dict[str, Any]:
    title = title_from_filename(relative_pdf)
    return {
        "id": stable_paper_id(relative_pdf, file_hash, title=title),
        "title": title,
        "authors": [],
        "year": None,
        "venue": "",
        "doi": "",
        "url": "",
        "pdf": relative_pdf,
        "file_hash": file_hash,
        "bibtex_key": "",
        "bibtex": "",
        "abstract": "",
        "categories": [],
        "projects": [],
        "tags": [],
        "notes": "",
        "source": {"grobid": False, "crossref": False},
        "confidence": {"metadata": 0.0, "doi_match": 0.0},
        "needs_review": True,
        "review_reasons": ["metadata_not_extracted"],
        "status": "new",
    }


def merge_paper(existing: dict[str, Any] | None, scanned: dict[str, Any]) -> dict[str, Any]:
    if not existing:
        return scanned
    merged = dict(existing)
    merged["pdf"] = scanned["pdf"]
    merged["file_hash"] = scanned["file_hash"]
    merged["status"] = scanned["status"]
    clear_review_reason(merged, "pdf_removed")
    return merged


def apply_manual_overrides(papers: list[dict[str, Any]], overrides: dict[str, Any]) -> list[dict[str, Any]]:
    override_map = (overrides or {}).get("papers", {})
    if not isinstance(override_map, dict):
        logging.warning("manual_overrides.yaml has no usable 'papers' mapping")
        return papers

    for paper in papers:
        keys = [
            paper.get("id", ""),
            paper.get("pdf", ""),
            Path(paper.get("pdf", "")).name,
            normalize_doi(paper.get("doi", "")),
        ]
        patch: dict[str, Any] = {}
        for key in keys:
            if key and key in override_map and isinstance(override_map[key], dict):
                patch.update(override_map[key])
        if not patch:
            continue
        for field, value in patch.items():
            paper[field] = value
        paper.setdefault("source", {})["manual_override"] = True
    return papers


def validate_paper(paper: dict[str, Any]) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if not paper.get("id"):
        reasons.append("missing_id")
    if not paper.get("title"):
        reasons.append("missing_title")
    if not paper.get("pdf"):
        reasons.append("missing_pdf")
    for list_field in ("authors", "categories", "projects", "tags", "review_reasons"):
        if not isinstance(paper.get(list_field, []), list):
            reasons.append(f"{list_field}_not_list")
    if paper.get("year") is not None and safe_int(paper.get("year")) is None:
        reasons.append("year_not_integer")
    return (not reasons, reasons)


def mark_review(paper: dict[str, Any], reason: str) -> None:
    paper["needs_review"] = True
    reasons = paper.setdefault("review_reasons", [])
    if reason not in reasons:
        reasons.append(reason)


def clear_review_reason(paper: dict[str, Any], reason: str) -> None:
    reasons = paper.setdefault("review_reasons", [])
    paper["review_reasons"] = [item for item in reasons if item != reason]
    if not paper["review_reasons"]:
        paper["needs_review"] = False


def clear_review_reasons_matching(paper: dict[str, Any], prefix: str) -> None:
    reasons = paper.setdefault("review_reasons", [])
    paper["review_reasons"] = [item for item in reasons if not str(item).startswith(prefix)]
    if not paper["review_reasons"]:
        paper["needs_review"] = False
