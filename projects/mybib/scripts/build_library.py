#!/usr/bin/env python3
"""Build the MyBib static paper library from local PDFs."""

from __future__ import annotations

import argparse
import logging

from enrich_crossref import enrich_crossref
from enrich_openalex import enrich_openalex
from extract_grobid import GrobidUnavailable, extract_grobid
from generate_bib import generate_bibtex, write_references
from scan_pdfs import scan_pdfs
from sync_rclone import RcloneSyncError, sync_rclone
from sync_onedrive import OneDriveSyncError, sync_onedrive
from utils import DEFAULT_ONEDRIVE_URL, NEEDS_REVIEW_PATH, OVERRIDES_PATH, PAPERS_PATH, apply_manual_overrides, ensure_dirs, load_yaml, mark_review, setup_logging, validate_paper, write_json


def build_library(args: argparse.Namespace) -> list[dict]:
    ensure_dirs()
    if args.rclone_remote:
        try:
            sync_rclone(args.rclone_remote, mode=args.rclone_mode, verbose=args.verbose, dry_run=args.rclone_dry_run)
        except RcloneSyncError as exc:
            logging.error(str(exc))
            logging.error("Continuing with whatever PDFs are already present in projects/mybib/pdfs/.")
    elif not args.no_sync:
        try:
            sync_onedrive(args.onedrive_url, force=args.force, limit=args.limit)
        except OneDriveSyncError as exc:
            logging.error(str(exc))
            logging.error("Continuing with whatever PDFs are already present in projects/mybib/pdfs/.")
    else:
        logging.info("Skipping OneDrive sync")

    logging.info("Scanning PDFs in projects/mybib/pdfs/")
    papers, _ = scan_pdfs(limit=args.limit)
    logging.info("Scan complete: %s paper records", len(papers))

    if not args.skip_grobid:
        try:
            candidates = [
                paper for paper in papers
                if paper.get("status") not in {"removed", "not_selected"}
                and (args.force or not paper.get("source", {}).get("grobid"))
            ]
            logging.info("Starting GROBID extraction for %s papers", len(candidates))
            papers = extract_grobid(papers, force=args.force)
        except GrobidUnavailable as exc:
            logging.error(str(exc))
            for paper in papers:
                if paper.get("status") != "removed":
                    mark_review(paper, "grobid_unavailable")
    else:
        logging.info("Skipping GROBID extraction")

    if not args.skip_crossref:
        papers = enrich_crossref(papers, force=args.force, mailto=args.mailto)
    else:
        logging.info("Skipping Crossref enrichment")

    if not args.skip_openalex:
        papers = enrich_openalex(papers, force=args.force, mailto=args.mailto)
    else:
        logging.info("Skipping OpenAlex enrichment")

    overrides = load_yaml(OVERRIDES_PATH, {"papers": {}})
    papers = apply_manual_overrides(papers, overrides)
    papers = generate_bibtex(papers)

    needs_review = []
    for paper in papers:
        valid, validation_reasons = validate_paper(paper)
        for reason in validation_reasons:
            mark_review(paper, reason)
        if paper.get("needs_review") or not valid:
            needs_review.append(
                {
                    "id": paper.get("id"),
                    "pdf": paper.get("pdf"),
                    "title": paper.get("title"),
                    "reasons": paper.get("review_reasons", []) + validation_reasons,
                }
            )

    papers.sort(key=lambda item: (item.get("year") or 0, item.get("title") or ""), reverse=True)
    write_json(PAPERS_PATH, papers)
    write_json(NEEDS_REVIEW_PATH, needs_review)
    write_references(papers)
    logging.info("Wrote %s papers and %s review items", len(papers), len(needs_review))
    return papers


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build/update the MyBib static paper library.")
    parser.add_argument("--force", action="store_true", help="Reprocess PDFs and refresh external caches.")
    parser.add_argument("--skip-grobid", action="store_true", help="Do not call GROBID.")
    parser.add_argument("--skip-crossref", action="store_true", help="Do not call Crossref.")
    parser.add_argument("--skip-openalex", action="store_true", help="Do not call OpenAlex online fallback.")
    parser.add_argument("--no-sync", action="store_true", help="Do not sync the default OneDrive folder before scanning local PDFs.")
    parser.add_argument("--onedrive-url", default=DEFAULT_ONEDRIVE_URL, help="Shared OneDrive bibliography folder URL.")
    parser.add_argument("--rclone-remote", default="", help="Use an authenticated rclone remote path instead of the public OneDrive URL, e.g. onedrive:Bibliography.")
    parser.add_argument("--rclone-mode", choices=("copy", "sync"), default="copy", help="rclone copy is safe by default; sync also deletes local PDFs absent from the remote.")
    parser.add_argument("--rclone-dry-run", action="store_true", help="Show rclone changes without downloading/deleting files.")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N PDFs.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    parser.add_argument("--mailto", default="your.email@example.com", help="Crossref mailto contact.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)
    build_library(args)


if __name__ == "__main__":
    main()
