#!/usr/bin/env bash
# Discovers Partiful Cloud Function endpoint names by downloading and
# grepping the public Next.js JS bundles served with a given page — no
# login or token required, since these are just static assets.
#
# Why this works: the web app's minified JS still contains each Cloud
# Function's name as a bare string literal (e.g. `let el="getPublishedEvents"`)
# right next to the code that calls it with `{params: {...}}`. Cloud Function
# names survive minification because they're used as runtime string keys, not
# identifiers, so they can't be renamed/mangled.
#
# Usage:
#   ./discover-endpoints.sh https://partiful.com/e/<eventId>
#   ./discover-endpoints.sh https://partiful.com/e/<eventId> getHosted
#
# The optional second argument filters the final endpoint list by substring
# (case-insensitive) — handy when you're hunting for one specific endpoint
# rather than dumping everything.

set -euo pipefail

URL="${1:?Usage: $0 <partiful-page-url> [filter]}"
FILTER="${2:-}"
WORKDIR="$(mktemp -d)"
# Chunks are left on disk under $WORKDIR after this script exits so their
# call-site context can be inspected (see the closing message) — nothing to
# clean up automatically here.

echo "Fetching $URL ..." >&2
curl -s -A "Mozilla/5.0" "$URL" -o "$WORKDIR/page.html"

# Pull every /_next/static/chunks/*.js URL (with its dpl= cache-busting query
# string intact) out of the page's <script> tags.
grep -o '/_next/static/chunks/[a-zA-Z0-9._-]*\.js?dpl=[a-zA-Z0-9_]*' "$WORKDIR/page.html" \
  | sed 's/&amp;/\&/g' | sort -u > "$WORKDIR/chunk_urls.txt"

if [ ! -s "$WORKDIR/chunk_urls.txt" ]; then
  echo "No Next.js chunk URLs found on that page — is it still a Next.js app?" >&2
  exit 1
fi

BASE="$(echo "$URL" | grep -o 'https\?://[^/]*')"
echo "Downloading $(wc -l < "$WORKDIR/chunk_urls.txt" | tr -d ' ') JS chunks ..." >&2
mkdir -p "$WORKDIR/chunks"
while read -r chunk; do
  fname="$(basename "$chunk" | sed 's/\?.*//')"
  curl -s -A "Mozilla/5.0" "${BASE}${chunk}" -o "$WORKDIR/chunks/$fname" &
done < "$WORKDIR/chunk_urls.txt"
wait

# Cloud Function names are camelCase string literals starting with a verb.
# This is a heuristic, not a guarantee — always confirm a candidate by
# checking it's actually passed to the fetch wrapper (see README section
# below) before wiring it into a tool.
ENDPOINTS=$(grep -ohE '"(get|post|mark|set|create|delete|update|remove|add)[A-Za-z]+"' \
  "$WORKDIR"/chunks/*.js | tr -d '"' | sort -u)

if [ -n "$FILTER" ]; then
  echo "$ENDPOINTS" | grep -i "$FILTER" || { echo "No matches for '$FILTER'." >&2; exit 1; }
else
  echo "$ENDPOINTS"
fi

echo "" >&2
echo "Chunks saved to $WORKDIR/chunks — to confirm a candidate is real (not just" >&2
echo "a coincidental string) and find its real params, grep its context, e.g.:" >&2
echo "  grep -o '.\\{30\\}<name>.\\{200\\}' $WORKDIR/chunks/*.js" >&2
echo "Look for it being passed as the first argument to the fetch wrapper," >&2
echo "alongside a {params: {...}} object — that confirms it's a live call site," >&2
echo "and the params object tells you the real request shape." >&2
echo "Remove $WORKDIR when you're done with it." >&2
