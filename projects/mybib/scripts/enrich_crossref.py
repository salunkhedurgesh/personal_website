#!/usr/bin/env python3
"""Enrich paper metadata with Crossref."""

from __future__ import annotations

import argparse
import hashlib
import logging
from typing import Any
from urllib.parse import quote

import requests

from utils import CROSSREF_CACHE_DIR, CROSSREF_MAILTO, PAPERS_PATH, clear_review_reason, ensure_dirs, mark_review, normalize_doi, read_json, safe_int, setup_logging, stable_paper_id, write_json

API = "https://api.crossref.org"


def user_agent(mailto: str = CROSSREF_MAILTO) -> str:
    return f"MyBib/0.1 (mailto:{mailto})"


def cache_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def request_crossref(url: str, cache_name: str, force: bool = False, mailto: str = CROSSREF_MAILTO) -> dict[str, Any] | None:
    cache_path = CROSSREF_CACHE_DIR / f"{cache_name}.json"
    if cache_path.exists() and not force:
        return read_json(cache_path, None)
    response = requests.get(url, headers={"User-Agent": user_agent(mailto)}, timeout=20)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    data = response.json()
    write_json(cache_path, data)
    return data


def flatten_authors(item: dict[str, Any]) -> list[str]:
    authors = []
    for author in item.get("author", []) or []:
        given = author.get("given", "")
        family = author.get("family", "")
        name = " ".join(part for part in (given, family) if part).strip()
        if name:
            authors.append(name)
    return authors


def item_year(item: dict[str, Any]) -> int | None:
    for key in ("published-print", "published-online", "published", "issued"):
        parts = item.get(key, {}).get("date-parts", [])
        if parts and parts[0]:
            year = safe_int(parts[0][0])
            if year:
                return year
    return None


def first_value(item: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        value = item.get(key)
        if isinstance(value, list) and value:
            return str(value[0])
        if isinstance(value, str):
            return value
    return ""


def apply_crossref_item(paper: dict, item: dict[str, Any], match_confidence: float) -> dict:
    title = first_value(item, ("title",))
    venue = first_value(item, ("container-title", "short-container-title", "publisher"))
    doi = normalize_doi(item.get("DOI") or paper.get("doi"))
    authors = flatten_authors(item)
    year = item_year(item)

    if title:
        paper["title"] = title
    if authors:
        paper["authors"] = authors
    if year:
        paper["year"] = year
    if venue:
        paper["venue"] = venue
    if doi:
        paper["doi"] = doi
        paper["url"] = f"https://doi.org/{doi}"
    if item.get("abstract") and not paper.get("abstract"):
        paper["abstract"] = item["abstract"]
    paper["id"] = stable_paper_id(paper.get("pdf", ""), paper.get("file_hash", ""), paper.get("doi", ""), paper.get("title", ""))
    paper.setdefault("source", {})["crossref"] = True
    paper.setdefault("confidence", {})["doi_match"] = match_confidence
    clear_review_reason(paper, "crossref_not_found")
    if paper.get("title") and (paper.get("authors") or paper.get("doi") or paper.get("year")):
        clear_review_reason(paper, "metadata_not_extracted")
    return paper


def enrich_one(paper: dict, force: bool = False, mailto: str = CROSSREF_MAILTO) -> dict:
    if paper.get("status") in {"removed", "not_selected"}:
        return paper
    doi = normalize_doi(paper.get("doi", ""))
    try:
        if doi:
            data = request_crossref(f"{API}/works/{quote(doi, safe='')}", f"doi-{cache_key(doi)}", force, mailto)
            item = (data or {}).get("message")
            if item:
                return apply_crossref_item(paper, item, 0.98)
        title = paper.get("title", "")
        if title:
            url = f"{API}/works?query.title={quote(title)}&rows=1&mailto={quote(mailto)}"
            data = request_crossref(url, f"title-{cache_key(title.lower())}", force, mailto)
            items = (data or {}).get("message", {}).get("items", [])
            if items:
                score = float(items[0].get("score", 0))
                return apply_crossref_item(paper, items[0], min(score / 100.0, 0.95))
        mark_review(paper, "crossref_not_found")
    except requests.RequestException as exc:
        mark_review(paper, f"crossref_request_error: {exc}")
        logging.error("Crossref failed for %s: %s", paper.get("pdf"), exc)
    return paper


def enrich_crossref(papers: list[dict], force: bool = False, mailto: str = CROSSREF_MAILTO) -> list[dict]:
    ensure_dirs()
    for paper in papers:
        if paper.get("status") == "not_selected":
            continue
        has_core = paper.get("authors") and (paper.get("year") or paper.get("doi"))
        if paper.get("status") == "unchanged" and paper.get("source", {}).get("crossref") and has_core and not force:
            continue
        enrich_one(paper, force=force, mailto=mailto)
        logging.info("crossref: %s", paper.get("pdf"))
    return papers


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich papers with Crossref metadata.")
    parser.add_argument("--force", action="store_true", help="Refresh cached Crossref responses.")
    parser.add_argument("--mailto", default=CROSSREF_MAILTO, help="Polite Crossref mailto contact.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    setup_logging(args.verbose)
    papers = read_json(PAPERS_PATH, [])
    papers = enrich_crossref(papers, force=args.force, mailto=args.mailto)
    write_json(PAPERS_PATH, papers)


if __name__ == "__main__":
    main()
