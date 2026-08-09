#!/usr/bin/env python3
"""Extract header metadata from PDFs with a local GROBID server."""

from __future__ import annotations

import argparse
import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import requests

from utils import GROBID_CACHE_DIR, GROBID_URL, PDF_DIR, PAPERS_PATH, clear_review_reason, clear_review_reasons_matching, ensure_dirs, mark_review, normalize_doi, read_json, safe_int, setup_logging, stable_paper_id, write_json

NS = {"tei": "http://www.tei-c.org/ns/1.0"}


class GrobidUnavailable(RuntimeError):
    pass


def check_grobid(base_url: str = GROBID_URL) -> None:
    try:
        response = requests.get(f"{base_url}/api/isalive", timeout=5)
        if response.status_code >= 400:
            raise GrobidUnavailable(f"GROBID responded with HTTP {response.status_code}")
    except requests.RequestException as exc:
        raise GrobidUnavailable(
            "GROBID is not reachable at http://localhost:8070. Start it with:\n"
            "  docker compose -f docker/docker-compose.yml up -d"
        ) from exc


def text_at(root: ET.Element, xpath: str) -> str:
    node = root.find(xpath, NS)
    if node is None:
        return ""
    return " ".join(node.itertext()).strip()


def parse_authors(root: ET.Element) -> list[str]:
    authors: list[str] = []
    for author in root.findall(".//tei:sourceDesc//tei:author", NS):
        forename = " ".join(author.findtext(".//tei:forename", default="", namespaces=NS).split())
        surname = " ".join(author.findtext(".//tei:surname", default="", namespaces=NS).split())
        name = " ".join(part for part in (forename, surname) if part).strip()
        if name and name not in authors:
            authors.append(name)
    return authors


def parse_year(root: ET.Element) -> int | None:
    for attr_path in (
        ".//tei:sourceDesc//tei:date",
        ".//tei:publicationStmt//tei:date",
    ):
        node = root.find(attr_path, NS)
        if node is not None:
            value = node.get("when") or node.text or ""
            year = safe_int(value[:4])
            if year:
                return year
    return None


def parse_grobid_tei(tei: str) -> dict[str, Any]:
    root = ET.fromstring(tei)
    doi = ""
    for node in root.findall(".//tei:idno", NS):
        if (node.get("type") or "").lower() == "doi" and node.text:
            doi = normalize_doi(node.text)
            break
    abstract = text_at(root, ".//tei:profileDesc/tei:abstract")
    return {
        "title": text_at(root, ".//tei:titleStmt/tei:title") or text_at(root, ".//tei:sourceDesc//tei:title"),
        "authors": parse_authors(root),
        "year": parse_year(root),
        "doi": doi,
        "abstract": abstract,
        "venue": text_at(root, ".//tei:monogr/tei:title") or text_at(root, ".//tei:meeting"),
    }


def extract_one(paper: dict, force: bool = False, base_url: str = GROBID_URL) -> dict:
    pdf_rel = paper.get("pdf", "")
    if not pdf_rel or paper.get("status") in {"removed", "not_selected"}:
        return paper
    pdf_path = PDF_DIR.parent / pdf_rel
    cache_path = GROBID_CACHE_DIR / f"{paper.get('file_hash')}.tei.xml"
    if cache_path.exists() and not force:
        tei = cache_path.read_text(encoding="utf-8")
    else:
        with pdf_path.open("rb") as handle:
            response = requests.post(
                f"{base_url}/api/processHeaderDocument",
                files={"input": (pdf_path.name, handle, "application/pdf")},
                data={"consolidateHeader": "0", "includeRawCitations": "0"},
                timeout=60,
            )
        response.raise_for_status()
        tei = response.text
        cache_path.write_text(tei, encoding="utf-8")

    try:
        metadata = parse_grobid_tei(tei)
    except ET.ParseError as exc:
        mark_review(paper, f"grobid_parse_error: {exc}")
        return paper

    for field in ("title", "venue", "doi", "abstract"):
        if metadata.get(field):
            paper[field] = metadata[field]
    if metadata.get("authors"):
        paper["authors"] = metadata["authors"]
    if metadata.get("year"):
        paper["year"] = metadata["year"]
    if paper.get("doi"):
        paper["url"] = f"https://doi.org/{paper['doi']}"
    paper["id"] = stable_paper_id(pdf_rel, paper.get("file_hash", ""), paper.get("doi", ""), paper.get("title", ""))
    paper.setdefault("source", {})["grobid"] = True
    paper.setdefault("confidence", {})["metadata"] = 0.7 if paper.get("title") and paper.get("authors") else 0.45
    clear_review_reason(paper, "metadata_not_extracted")
    clear_review_reason(paper, "grobid_unavailable")
    clear_review_reasons_matching(paper, "grobid_request_error:")
    if not paper.get("title") or not paper.get("authors"):
        mark_review(paper, "incomplete_grobid_metadata")
    return paper


def extract_grobid(papers: list[dict], force: bool = False, base_url: str = GROBID_URL) -> list[dict]:
    ensure_dirs()
    check_grobid(base_url)
    for paper in papers:
        if paper.get("status") == "not_selected":
            continue
        if paper.get("status") != "removed":
            clear_review_reason(paper, "grobid_unavailable")
        if paper.get("status") == "unchanged" and paper.get("source", {}).get("grobid") and not force:
            continue
        try:
            extract_one(paper, force=force, base_url=base_url)
            logging.info("grobid: %s", paper.get("pdf"))
        except requests.RequestException as exc:
            mark_review(paper, f"grobid_request_error: {exc}")
            logging.error("GROBID failed for %s: %s", paper.get("pdf"), exc)
    return papers


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract PDF metadata through GROBID.")
    parser.add_argument("--force", action="store_true", help="Re-query GROBID even when cached.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    setup_logging(args.verbose)
    papers = read_json(PAPERS_PATH, [])
    papers = extract_grobid(papers, force=args.force)
    write_json(PAPERS_PATH, papers)


if __name__ == "__main__":
    main()
