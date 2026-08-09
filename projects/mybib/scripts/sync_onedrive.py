#!/usr/bin/env python3
"""Sync PDFs from the configured shared OneDrive folder into pdfs/."""

from __future__ import annotations

import argparse
import base64
import logging
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

from utils import DEFAULT_ONEDRIVE_URL, ONEDRIVE_MANIFEST_PATH, PDF_DIR, ensure_dirs, read_json, setup_logging, write_json


class OneDriveSyncError(RuntimeError):
    pass


def share_id(shared_url: str) -> str:
    encoded = base64.urlsafe_b64encode(shared_url.encode("utf-8")).decode("ascii").rstrip("=")
    return f"u!{encoded}"


def safe_remote_path(parts: list[str]) -> Path:
    cleaned = []
    for part in parts:
        part = part.replace("\\", "/").split("/")[-1]
        part = re.sub(r"[^\w.\- ()\[\]]+", "_", part, flags=re.UNICODE).strip(" .")
        cleaned.append(part or "untitled")
    return Path(*cleaned)


def get_json(session: requests.Session, url: str) -> dict[str, Any]:
    response = session.get(url, timeout=30)
    if response.status_code in (401, 403):
        raise OneDriveSyncError(
            "The OneDrive folder could not be read anonymously. Sync the shared folder with the OneDrive desktop app, "
            "rclone, or another authenticated client into projects/mybib/pdfs/, then rerun with --no-sync."
        )
    if response.status_code == 404:
        raise OneDriveSyncError("The configured OneDrive shared folder was not found. Check MYBIB_ONEDRIVE_URL.")
    response.raise_for_status()
    return response.json()


def public_api_root(shared_url: str) -> str:
    return f"https://api.onedrive.com/v1.0/shares/{share_id(shared_url)}/root"


def graph_api_root(shared_url: str) -> str:
    return f"https://graph.microsoft.com/v1.0/shares/{share_id(shared_url)}/driveItem"


def children_urls(item: dict[str, Any], api: str, shared_url: str) -> list[str]:
    if api == "public":
        if item.get("id"):
            return [f"https://api.onedrive.com/v1.0/drive/items/{quote(item['id'])}/children"]
        return []
    parent = item.get("parentReference") or {}
    drive_id = parent.get("driveId")
    item_id = item.get("id")
    if drive_id and item_id:
        return [f"https://graph.microsoft.com/v1.0/drives/{quote(drive_id)}/items/{quote(item_id)}/children"]
    return [f"{graph_api_root(shared_url)}/children"]


def download_url(item: dict[str, Any]) -> str:
    return item.get("@content.downloadUrl") or item.get("@microsoft.graph.downloadUrl") or ""


def list_items_with_api(session: requests.Session, shared_url: str, api: str) -> list[tuple[dict[str, Any], list[str]]]:
    root_url = public_api_root(shared_url) if api == "public" else graph_api_root(shared_url)
    root = get_json(session, f"{root_url}?expand=children")
    stack: list[tuple[dict[str, Any], list[str]]] = []
    results: list[tuple[dict[str, Any], list[str]]] = []

    for child in root.get("children", []):
        stack.append((child, [child.get("name", "untitled")]))

    while stack:
        item, parts = stack.pop()
        if item.get("folder"):
            children = item.get("children")
            if children is None:
                children = []
                for url in children_urls(item, api, shared_url):
                    page = get_json(session, url)
                    children.extend(page.get("value") or page.get("children") or [])
                    while page.get("@odata.nextLink"):
                        page = get_json(session, page["@odata.nextLink"])
                        children.extend(page.get("value") or [])
            for child in children:
                stack.append((child, parts + [child.get("name", "untitled")]))
        else:
            results.append((item, parts))
    return results


def list_onedrive_items(session: requests.Session, shared_url: str) -> list[tuple[dict[str, Any], list[str]]]:
    errors = []
    for api in ("public", "graph"):
        try:
            return list_items_with_api(session, shared_url, api)
        except (requests.RequestException, OneDriveSyncError) as exc:
            errors.append(f"{api}: {exc}")
            logging.debug("OneDrive %s API failed: %s", api, exc)
    raise OneDriveSyncError("Could not list the shared OneDrive folder. " + " | ".join(errors))


def sync_onedrive(shared_url: str = DEFAULT_ONEDRIVE_URL, force: bool = False, limit: int | None = None) -> dict[str, Any]:
    ensure_dirs()
    manifest = read_json(ONEDRIVE_MANIFEST_PATH, {"files": {}})
    new_manifest = {"source_url": shared_url, "files": {}}
    session = requests.Session()
    session.headers.update({"User-Agent": "MyBib/0.1"})
    items = list_onedrive_items(session, shared_url)
    pdf_items = [(item, parts) for item, parts in items if (item.get("name") or "").lower().endswith(".pdf")]
    if limit:
        pdf_items = pdf_items[:limit]

    downloaded = 0
    skipped = 0
    for item, parts in pdf_items:
        rel_path = safe_remote_path(parts)
        local_path = PDF_DIR / rel_path
        remote_key = item.get("id") or "/".join(parts)
        remote_version = item.get("eTag") or item.get("cTag") or str(item.get("size", ""))
        previous = manifest.get("files", {}).get(remote_key, {})
        new_manifest["files"][remote_key] = {
            "path": f"pdfs/{rel_path.as_posix()}",
            "name": item.get("name"),
            "eTag": item.get("eTag"),
            "cTag": item.get("cTag"),
            "size": item.get("size"),
            "version": remote_version,
        }
        if local_path.exists() and previous.get("version") == remote_version and not force:
            skipped += 1
            continue
        url = download_url(item)
        if not url:
            logging.warning("No download URL for %s", "/".join(parts))
            continue
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with session.get(url, stream=True, timeout=120) as response:
            response.raise_for_status()
            with local_path.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        handle.write(chunk)
        downloaded += 1
        logging.info("downloaded: %s", local_path.relative_to(PDF_DIR.parent).as_posix())

    for key, value in manifest.get("files", {}).items():
        if key in new_manifest["files"]:
            continue
        logging.info("remote file no longer listed: %s", value.get("path", key))

    write_json(ONEDRIVE_MANIFEST_PATH, new_manifest)
    logging.info("OneDrive sync complete: %s downloaded, %s skipped, %s PDFs listed", downloaded, skipped, len(pdf_items))
    return {"downloaded": downloaded, "skipped": skipped, "listed": len(pdf_items)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync the default shared OneDrive bibliography folder into pdfs/.")
    parser.add_argument("--url", default=DEFAULT_ONEDRIVE_URL, help="Shared OneDrive folder URL.")
    parser.add_argument("--force", action="store_true", help="Download files even if the manifest says they are unchanged.")
    parser.add_argument("--limit", type=int, default=None, help="Sync at most N PDFs.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    setup_logging(args.verbose)
    try:
        sync_onedrive(args.url, force=args.force, limit=args.limit)
    except OneDriveSyncError as exc:
        raise SystemExit(f"ERROR: {exc}") from exc


if __name__ == "__main__":
    main()
