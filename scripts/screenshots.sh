#!/bin/sh
# Captures the README screenshots from the built demo with headless Chrome.
# The ?t= query parameter seeks the demo so cues are visible in the capture.
#
#   sh scripts/screenshots.sh
#
# CHROME can point at any Chrome or Chromium binary.
set -eu

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-4179}"
PROFILE="$(mktemp -d)"

BASE_PATH=/ npx vite build >/dev/null
npx vite preview --port "$PORT" --strictPort >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$PROFILE"' EXIT
sleep 2

shot() { # theme time
  "$CHROME" --headless=new --hide-scrollbars --force-prefers-reduced-motion \
    --user-data-dir="$PROFILE/$1" --window-size=1280,860 --virtual-time-budget=15000 \
    --screenshot="docs/images/demo-$1.png" "http://localhost:$PORT/?t=$2&theme=$1" 2>/dev/null
}
mkdir -p docs/images
shot light 10.5
shot dark 34
ls -l docs/images
