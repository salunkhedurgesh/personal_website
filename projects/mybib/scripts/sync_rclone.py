#!/usr/bin/env python3
"""Sync PDFs from an authenticated rclone remote into pdfs/."""

from __future__ import annotations

import argparse
import logging
import shutil
import subprocess
from pathlib import Path

from utils import PDF_DIR, ensure_dirs, setup_logging


class RcloneSyncError(RuntimeError):
    pass


def check_rclone() -> None:
    if shutil.which("rclone") is None:
        raise RcloneSyncError(
            "rclone is not installed or not on PATH. Install rclone and configure a OneDrive remote with: rclone config"
        )


def sync_rclone(remote: str, mode: str = "copy", verbose: bool = False, dry_run: bool = False) -> None:
    ensure_dirs()
    check_rclone()
    if mode not in {"copy", "sync"}:
        raise RcloneSyncError("rclone mode must be 'copy' or 'sync'")

    command = [
        "rclone",
        mode,
        remote,
        str(PDF_DIR),
        "--filter",
        "+ **.pdf",
        "--filter",
        "- *",
        "--create-empty-src-dirs",
        "--transfers",
        "4",
        "--checkers",
        "8",
        "--stats",
        "30s",
    ]
    if verbose:
        command.append("--verbose")
    if dry_run:
        command.append("--dry-run")

    logging.info("Running: %s", " ".join(command))
    result = subprocess.run(command, cwd=PDF_DIR.parent, text=True)
    if result.returncode != 0:
        raise RcloneSyncError(f"rclone {mode} failed with exit code {result.returncode}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync PDFs from an rclone remote into projects/mybib/pdfs/.")
    parser.add_argument("remote", help="rclone remote path, for example onedrive:Bibliography")
    parser.add_argument("--mode", choices=("copy", "sync"), default="copy", help="Use copy by default; sync also deletes local files absent from the remote.")
    parser.add_argument("--dry-run", action="store_true", help="Show what rclone would do without changing files.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    setup_logging(args.verbose)
    try:
        sync_rclone(args.remote, mode=args.mode, verbose=args.verbose, dry_run=args.dry_run)
    except RcloneSyncError as exc:
        raise SystemExit(f"ERROR: {exc}") from exc


if __name__ == "__main__":
    main()
