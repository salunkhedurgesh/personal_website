#!/usr/bin/env python3
"""Enrich paper metadata with OpenAlex as an online fallback."""

from __future__ import annotations

import argparse
import hashlib
import logging
from typing import Any
from urllib.parse import quote

import requests

from utils import CROSSREF_MAILTO, OPENALEX_CACHE_DIR, PAPERS_PATH, clear_review_reason, ensure_dirs, mark_review, normalize_doi, read_json, setup_logging, stable_paper_id, write_json

API = "https://api.openalex.org"


def cache_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def request_openalex(url: str, cache_name: str, force: bool = False, mailto: str = CROSSREF_MAILTO) -> dict[str, Any] | None:
    cache_path = OPENALEX_CACHE_DIR / f"{cache_name}.json"
    if cache_path.exists() and not force:
        return read_json(cache_path, None)
    response = requests.get(url, headers={"User-Agent": f"MyBib/0.1 (mailto:{mailto})"}, timeout=20)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    data = response.json()
    write_json(cache_path, data)
    return data


def inverted_abstract(index: dict[str, list[int]] | None) -> str:
    if not index:
        return ""
    words: list[tuple[int, str]] = []
    for word, positions in index.items():
        for position in positions:
            words.append((position, word))
    return " ".join(word for _, word in sorted(words))


def authors(item: dict[str, Any]) -> list[str]:
    names = []
    for authorship in item.get("authorships", []) or []:
        name = (authorship.get("author") or {}).get("display_name", "")
        if name and name not in names:
            names.append(name)
    return names


def venue(item: dict[str, Any]) -> str:
    primary = item.get("primary_location") or {}
    source = primary.get("source") or {}
    if source.get("display_name"):
        return source["display_name"]
    host = item.get("host_venue") or {}
    return host.get("display_name", "") or item.get("publisher", "") or ""


def apply_openalex_item(paper: dict, item: dict[str, Any], match_confidence: float) -> dict:
    doi = normalize_doi(item.get("doi"))
    if item.get("title"):
        paper["title"] = item["title"]
    found_authors = authors(item)
    if found_authors:
        paper["authors"] = found_authors
    if item.get("publication_year"):
        paper["year"] = item["publication_year"]
    found_venue = venue(item)
    if found_venue:
        paper["venue"] = found_venue
    if doi:
        paper["doi"] = doi
        paper["url"] = f"https://doi.org/{doi}"
    elif item.get("id") and not paper.get("url"):
        paper["url"] = item["id"]
    if not paper.get("abstract"):
        paper["abstract"] = inverted_abstract(item.get("abstract_inverted_index"))
    paper["id"] = stable_paper_id(paper.get("pdf", ""), paper.get("file_hash", ""), paper.get("doi", ""), paper.get("title", ""))
    paper.setdefault("source", {})["openalex"] = True
    paper.setdefault("confidence", {})["openalex_match"] = match_confidence
    clear_review_reason(paper, "openalex_not_found")
    if paper.get("title") and (paper.get("authors") or paper.get("doi") or paper.get("year")):
        clear_review_reason(paper, "metadata_not_extracted")
    return paper


def enrich_one(paper: dict, force: bool = False, mailto: str = CROSSREF_MAILTO) -> dict:
    if paper.get("status") in {"removed", "not_selected"}:
        return paper
    doi = normalize_doi(paper.get("doi", ""))
    try:
        if doi:
            url = f"{API}/works/https://doi.org/{quote(doi, safe='')}"
            data = request_openalex(url, f"doi-{cache_key(doi)}", force, mailto)
            if data:
                return apply_openalex_item(paper, data, 0.98)
        title = paper.get("title", "")
        if title:
            url = f"{API}/works?search={quote(title)}&per-page=1&mailto={quote(mailto)}"
            data = request_openalex(url, f"title-{cache_key(title.lower())}", force, mailto)
            results = (data or {}).get("results", [])
            if results:
                score = float(results[0].get("relevance_score", 0.0) or 0.0)
                return apply_openalex_item(paper, results[0], min(score / 100.0, 0.95))
        mark_review(paper, "openalex_not_found")
    except requests.RequestException as exc:
        mark_review(paper, f"openalex_request_error: {exc}")
        logging.error("OpenAlex failed for %s: %s", paper.get("pdf"), exc)
    return paper


def enrich_openalex(papers: list[dict], force: bool = False, mailto: str = CROSSREF_MAILTO) -> list[dict]:
    ensure_dirs()
    for paper in papers:
        if paper.get("status") == "not_selected":
            continue
        has_core = paper.get("authors") and (paper.get("year") or paper.get("doi"))
        if paper.get("status") == "unchanged" and paper.get("source", {}).get("openalex") and has_core and not force:
            continue
        if has_core and paper.get("source", {}).get("crossref") and not force:
            continue
        enrich_one(paper, force=force, mailto=mailto)
        logging.info("openalex: %s", paper.get("pdf"))
    return papers


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich papers with OpenAlex metadata.")
    parser.add_argument("--force", action="store_true", help="Refresh cached OpenAlex responses.")
    parser.add_argument("--mailto", default=CROSSREF_MAILTO, help="Polite mailto contact.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    setup_logging(args.verbose)
    papers = read_json(PAPERS_PATH, [])
    papers = enrich_openalex(papers, force=args.force, mailto=args.mailto)
    write_json(PAPERS_PATH, papers)


if __name__ == "__main__":
    main()
