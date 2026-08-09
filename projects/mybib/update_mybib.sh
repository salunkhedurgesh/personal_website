#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RCLONE_REMOTE="${MYBIB_RCLONE_REMOTE:-onedrive:Work/literature}"
RCLONE_MODE="${MYBIB_RCLONE_MODE:-copy}"
CROSSREF_MAILTO="${MYBIB_CROSSREF_MAILTO:-your.email@example.com}"
START_GROBID="${MYBIB_START_GROBID:-auto}"
SKIP_GROBID="${MYBIB_SKIP_GROBID:-0}"
SKIP_CROSSREF="${MYBIB_SKIP_CROSSREF:-0}"
SKIP_OPENALEX="${MYBIB_SKIP_OPENALEX:-0}"
PYTHON_BIN="${MYBIB_PYTHON:-python3}"

if [[ -x ".venv/bin/python" ]]; then
  PYTHON_BIN=".venv/bin/python"
fi

echo "MyBib update"
echo "  remote: $RCLONE_REMOTE"
echo "  rclone mode: $RCLONE_MODE"
echo "  python: $PYTHON_BIN"

if [[ ! -d ".venv" ]]; then
  echo "No .venv found. Creating one and installing dependencies..."
  python3 -m venv .venv
  PYTHON_BIN=".venv/bin/python"
  "$PYTHON_BIN" -m pip install -r scripts/requirements.txt
fi

if [[ "$SKIP_GROBID" != "1" ]]; then
  if curl -fsS "http://localhost:8070/api/isalive" >/dev/null 2>&1; then
    echo "GROBID is already running."
  elif [[ "$START_GROBID" == "1" || "$START_GROBID" == "auto" ]]; then
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
      echo "Starting GROBID with Docker..."
      docker compose -f docker/docker-compose.yml up -d
    else
      echo "Docker is not available to this user; continuing with --skip-grobid."
      SKIP_GROBID="1"
    fi
  fi
fi

BUILD_ARGS=(
  "scripts/build_library.py"
  "--rclone-remote" "$RCLONE_REMOTE"
  "--rclone-mode" "$RCLONE_MODE"
  "--mailto" "$CROSSREF_MAILTO"
  "--verbose"
)

if [[ "$SKIP_GROBID" == "1" ]]; then
  BUILD_ARGS+=("--skip-grobid")
fi

if [[ "$SKIP_CROSSREF" == "1" ]]; then
  BUILD_ARGS+=("--skip-crossref")
fi

if [[ "$SKIP_OPENALEX" == "1" ]]; then
  BUILD_ARGS+=("--skip-openalex")
fi

BUILD_ARGS+=("$@")

"$PYTHON_BIN" "${BUILD_ARGS[@]}"

echo
echo "MyBib is updated:"
echo "  data/papers.json"
echo "  data/references.bib"
echo "  data/needs_review.json"
echo "  pdfs/"
