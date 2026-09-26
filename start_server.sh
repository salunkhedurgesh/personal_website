#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8766}"
cd "$SCRIPT_DIR"
echo "Serving Dr. Durgesh Salunkhe Website"
echo "Serving: $SCRIPT_DIR"
echo "Open: http://localhost:$PORT"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
