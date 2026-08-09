#!/usr/bin/env python3
"""Scan local PDFs and detect new, unchanged, modified, and removed files."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from utils import PDF_DIR, PAPERS_PATH, default_paper, ensure_dirs, file_sha256, merge_paper, read_json, setup_logging, write_json


def scan_pdfs(limit: int | None = None) -> tuple[list[dict], list[dict]]:
    ensure_dirs()
    existing = read_json(PAPERS_PATH, [])
    existing_by_pdf = {paper.get("pdf"): paper for paper in existing if paper.get("pdf")}
    seen: set[str] = set()
    scanned: list[dict] = []

    all_pdfs = sorted(PDF_DIR.rglob("*.pdf"))
    all_pdf_paths = {path.relative_to(PDF_DIR.parent).as_posix() for path in all_pdfs}
    pdfs = all_pdfs
    if limit:
        pdfs = all_pdfs[:limit]

    for path in pdfs:
        rel_pdf = path.relative_to(PDF_DIR.parent).as_posix()
        digest = file_sha256(path)
        old = existing_by_pdf.get(rel_pdf)
        status = "new"
        if old:
            status = "unchanged" if old.get("file_hash") == digest else "modified"
        paper = default_paper(rel_pdf, digest)
        paper["status"] = status
        scanned.append(merge_paper(old, paper))
        seen.add(rel_pdf)
        logging.info("%s: %s", status, rel_pdf)

    if limit:
        for paper in existing:
            pdf = paper.get("pdf")
            if pdf and pdf in all_pdf_paths and pdf not in seen:
                preserved = dict(paper)
                preserved["status"] = "not_selected"
                scanned.append(preserved)
                seen.add(pdf)

    removed = []
    for paper in existing:
        pdf = paper.get("pdf")
        if pdf and pdf not in all_pdf_paths:
            removed_paper = dict(paper)
            removed_paper["status"] = "removed"
            removed_paper["needs_review"] = True
            reasons = removed_paper.setdefault("review_reasons", [])
            if "pdf_removed" not in reasons:
                reasons.append("pdf_removed")
            removed.append(removed_paper)
            logging.warning("removed: %s", pdf)

    return scanned + removed, removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan projects/mybib/pdfs for PDF files.")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N PDFs.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    args = parser.parse_args()
    setup_logging(args.verbose)
    papers, _ = scan_pdfs(args.limit)
    write_json(PAPERS_PATH, papers)
    print(f"Wrote {len(papers)} paper records to {PAPERS_PATH}")


if __name__ == "__main__":
    main()
