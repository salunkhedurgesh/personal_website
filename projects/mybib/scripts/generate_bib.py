#!/usr/bin/env python3
"""Generate BibTeX entries and the complete references.bib file."""

from __future__ import annotations

import argparse
import re
from collections import defaultdict

from utils import PAPERS_PATH, REFERENCES_PATH, read_json, short_title, surname, write_json


def escape_bibtex(value: object) -> str:
    text = "" if value is None else str(value)
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def base_key(paper: dict) -> str:
    first = surname((paper.get("authors") or ["Unknown"])[0]) or "Unknown"
    year = paper.get("year") or "NoYear"
    return re.sub(r"[^A-Za-z0-9]", "", f"{first}{year}{short_title(paper.get('title', 'Paper'))}")


def assign_keys(papers: list[dict]) -> None:
    used: dict[str, int] = defaultdict(int)
    for paper in sorted(papers, key=lambda item: (base_key(item), item.get("id", ""))):
        manual = paper.get("bibtex_key")
        if manual:
            key = re.sub(r"[^A-Za-z0-9:_-]", "", manual)
            used[key] += 1
            paper["bibtex_key"] = key if used[key] == 1 else f"{key}{chr(64 + used[key])}"
            continue
        root = base_key(paper)
        used[root] += 1
        suffix = "" if used[root] == 1 else chr(64 + used[root])
        paper["bibtex_key"] = f"{root}{suffix}"


def entry_type(paper: dict) -> str:
    venue = (paper.get("venue") or "").lower()
    if any(word in venue for word in ("conference", "proceedings", "icra", "iros", "rss", "case")):
        return "inproceedings"
    return "article"


def paper_to_bibtex(paper: dict) -> str:
    fields = {
        "title": paper.get("title"),
        "author": " and ".join(paper.get("authors") or []),
        "year": paper.get("year"),
        "journal": paper.get("venue") if entry_type(paper) == "article" else None,
        "booktitle": paper.get("venue") if entry_type(paper) == "inproceedings" else None,
        "doi": paper.get("doi"),
        "url": paper.get("url"),
    }
    lines = [f"@{entry_type(paper)}{{{paper.get('bibtex_key') or base_key(paper)},"]
    for key, value in fields.items():
        if value:
            lines.append(f"  {key} = {{{escape_bibtex(value)}}},")
    if lines[-1].endswith(","):
        lines[-1] = lines[-1][:-1]
    lines.append("}")
    return "\n".join(lines)


def generate_bibtex(papers: list[dict]) -> list[dict]:
    active = [paper for paper in papers if paper.get("status") != "removed"]
    assign_keys(active)
    for paper in active:
        paper["bibtex"] = paper_to_bibtex(paper)
    return papers


def write_references(papers: list[dict]) -> None:
    entries = [paper.get("bibtex", "") for paper in papers if paper.get("status") != "removed" and paper.get("bibtex")]
    REFERENCES_PATH.write_text("\n\n".join(entries) + ("\n" if entries else ""), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate BibTeX for MyBib papers.")
    parser.parse_args()
    papers = read_json(PAPERS_PATH, [])
    papers = generate_bibtex(papers)
    write_references(papers)
    write_json(PAPERS_PATH, papers)
    print(f"Wrote {REFERENCES_PATH}")


if __name__ == "__main__":
    main()
