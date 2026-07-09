#!/usr/bin/env bash
#
# partiful.sh — Minimal Partiful API client (curl + jq, no other deps)
#
# Partiful is a Firebase app. All endpoints are POST to https://api.partiful.com/<functionName>
# with body {"data": {"params": {...}, "userId": "<uid>"}} and Bearer auth via Firebase JWT.
#
# Commands:
#   setup    - Interactive first-run: prompts for auth tokens, saves config, tests connection
#   invites  - Table of all events (date, RSVP status, title, URL)
#   event ID - Full JSON for a specific event (filters from invites data; getEvent endpoint 404s)
#   hosted   - Events you're hosting
#   mutuals  - Mutual connections
#   export   - Dump all events to partiful-export.json
#
# Config: ~/.partiful-config.json (auth_token, user_id, refresh_token, firebase_api_key)
#   Also reads env vars PARTIFUL_AUTH_TOKEN, PARTIFUL_USER_ID, etc. as fallbacks.
#   Auth tokens expire in 1 hour; auto-refreshes if refresh_token + firebase_api_key are set.
#
# Quirks learned the hard way:
#   - Token refresh (securetoken.googleapis.com) requires Referer: https://partiful.com/ header
#   - getMyRsvps response nests events at .result.data.events (not .result.events or .data.events)
#   - JSON params passed to api_post must be compact single-line JSON; use jq -cn to build them
#     (bash quoting with nested JSON is fragile — api_post writes params to a tmpfile to avoid this)
#   - Auto-refresh retries once only (_retried guard) to prevent infinite loops on non-auth errors
#
# Derived from https://github.com/plurigrid/asi/tree/main/skills/partiful (Babashka/Clojure)
# Firebase project: getpartiful / API key: AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k

set -euo pipefail

CONFIG_FILE="$HOME/.partiful-config.json"
BASE_URL="https://api.partiful.com"

# --- Config ---

load_config() {
  if [[ -f "$CONFIG_FILE" ]]; then
    AUTH_TOKEN=$(jq -r '.auth_token // empty' "$CONFIG_FILE" 2>/dev/null || true)
    USER_ID=$(jq -r '.user_id // empty' "$CONFIG_FILE" 2>/dev/null || true)
    REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$CONFIG_FILE" 2>/dev/null || true)
    FIREBASE_API_KEY=$(jq -r '.firebase_api_key // empty' "$CONFIG_FILE" 2>/dev/null || true)
  fi
  AUTH_TOKEN="${AUTH_TOKEN:-${PARTIFUL_AUTH_TOKEN:-}}"
  USER_ID="${USER_ID:-${PARTIFUL_USER_ID:-}}"
  REFRESH_TOKEN="${REFRESH_TOKEN:-${PARTIFUL_REFRESH_TOKEN:-}}"
  FIREBASE_API_KEY="${FIREBASE_API_KEY:-${PARTIFUL_FIREBASE_API_KEY:-}}"
}

save_config() {
  jq -n \
    --arg token "$AUTH_TOKEN" \
    --arg uid "$USER_ID" \
    --arg refresh "$REFRESH_TOKEN" \
    --arg fbkey "$FIREBASE_API_KEY" \
    '{auth_token: $token, user_id: $uid, refresh_token: $refresh, firebase_api_key: $fbkey}' \
    > "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
  echo "Config saved to $CONFIG_FILE"
}

# --- Token refresh ---

refresh_token() {
  if [[ -z "$REFRESH_TOKEN" || -z "$FIREBASE_API_KEY" ]]; then
    echo "Cannot refresh: need refresh_token and firebase_api_key" >&2
    return 1
  fi
  echo "Refreshing token..." >&2
  local resp
  resp=$(curl -s -X POST \
    "https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: https://partiful.com/" \
    -d "grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}")

  local new_token new_refresh
  new_token=$(echo "$resp" | jq -r '.id_token // empty')
  new_refresh=$(echo "$resp" | jq -r '.refresh_token // empty')

  if [[ -n "$new_token" ]]; then
    AUTH_TOKEN="$new_token"
    [[ -n "$new_refresh" ]] && REFRESH_TOKEN="$new_refresh"
    save_config
    echo "Token refreshed." >&2
  else
    echo "Refresh failed: $(echo "$resp" | jq -r '.error.message // "unknown error"')" >&2
    return 1
  fi
}

# --- API call ---

api_post() {
  local endpoint="$1"
  local params="${2:-{}}"
  local _retried="${3:-}"

  if [[ -z "$AUTH_TOKEN" ]]; then
    echo "No auth token. Run: $0 setup" >&2
    exit 1
  fi

  local tmpfile body
  tmpfile=$(mktemp)
  printf '%s' "$params" > "$tmpfile"
  body=$(jq -c --arg uid "$USER_ID" '{data: {params: ., userId: $uid}}' "$tmpfile")
  rm -f "$tmpfile"

  local resp http_code body_content
  resp=$(curl -s -w "\n%{http_code}" -X POST \
    "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Origin: https://partiful.com" \
    -H "Referer: https://partiful.com/" \
    -d "$body")

  http_code=$(echo "$resp" | tail -1)
  body_content=$(echo "$resp" | sed '$d')

  if [[ -z "$_retried" && ("$http_code" == "401" || "$http_code" == "403") ]]; then
    echo "Token expired, attempting refresh..." >&2
    if refresh_token; then
      load_config
      api_post "$endpoint" "$params" "1"
      return
    fi
    echo "Auth failed. Run: $0 setup" >&2
    exit 1
  fi

  if [[ "$http_code" != "200" ]]; then
    echo "API error (HTTP $http_code): $body_content" >&2
    exit 1
  fi

  echo "$body_content"
}

# --- Commands ---

cmd_setup() {
  echo "=== Partiful Auth Setup ==="
  echo ""
  echo "To get your tokens, open https://partiful.com in Chrome:"
  echo "  1. Log in to Partiful"
  echo "  2. Open DevTools (Cmd+Opt+I) → Network tab"
  echo "  3. Click on any XHR/Fetch request to api.partiful.com"
  echo "  4. Copy the Authorization header value (without 'Bearer ')"
  echo "  5. From the request body JSON, copy the userId value"
  echo ""
  echo "For token refresh (optional):"
  echo "  6. In DevTools → Application → IndexedDB → firebaseLocalStorageDb"
  echo "     → firebaseLocalStorage → find the refresh token"
  echo "  7. In the Network tab, find a request to googleapis.com with 'key='"
  echo "     → that's the Firebase API key"
  echo ""

  read -rp "Auth token (Bearer value): " AUTH_TOKEN
  read -rp "User ID: " USER_ID
  read -rp "Refresh token (optional, press enter to skip): " REFRESH_TOKEN
  read -rp "Firebase API key (optional, press enter to skip): " FIREBASE_API_KEY

  save_config
  echo ""
  echo "Testing connection..."
  cmd_invites
}

cmd_invites() {
  echo "Fetching your events..."
  local resp
  resp=$(api_post "/getMyRsvps")

  echo ""
  printf "%-12s | %-9s | %-45s | %s\n" "DATE" "RSVP" "EVENT" "URL"
  printf '%0.s-' {1..110}; echo

  echo "$resp" | jq -r '
    .result.data.events // [] | sort_by(.startDate) | .[] |
    [
      (.startDate // "TBD" | if length > 10 then .[0:10] else . end),
      (.guest.status // "?"),
      (.title // "Untitled" | if length > 45 then .[0:42] + "..." else . end),
      "https://partiful.com/e/" + (.id // "?")
    ] | @tsv
  ' | while IFS=$'\t' read -r date status title url; do
    printf "%-12s | %-9s | %-45s | %s\n" "$date" "$status" "$title" "$url"
  done

  local count
  count=$(echo "$resp" | jq '.result.data.events // [] | length')
  echo ""
  echo "Total: $count events"
}

cmd_event() {
  local event_id="$1"
  if [[ -z "$event_id" ]]; then
    echo "Usage: $0 event <event-id>" >&2
    exit 1
  fi
  echo "Fetching event $event_id..."
  local resp
  resp=$(api_post "/getMyRsvps")
  echo "$resp" | jq --arg eid "$event_id" '
    .result.data.events // [] | map(select(.id == $eid)) |
    if length == 0 then error("Event not found in your invites")
    else .[0] end
  '
}

cmd_hosted() {
  echo "Fetching hosted events..."
  local resp
  resp=$(api_post "/getHostedEvents")
  echo "$resp" | jq -r '
    (.result // .events // .data // []) | if type == "array" then .[] else . end |
    "Event: " + (.title // .name // "Untitled") +
    "\n  Date: " + ((.startTime // .startDate // "?") | .[0:10]) +
    "\n  Location: " + (.locationDisplayText // .location // "?") +
    "\n  URL: https://partiful.com/e/" + (.eventId // .id // "?") +
    "\n"
  '
}

cmd_mutuals() {
  echo "Fetching mutuals..."
  local resp
  resp=$(api_post "/getMutuals")
  echo "$resp" | jq -r '
    (.result // .mutuals // .data // []) | if type == "array" then .[] else . end |
    "- " + (.name // .displayName // "?") +
    if .username then " (@" + .username + ")" else "" end
  '
}

cmd_export() {
  echo "Exporting all event data to partiful-export.json..."
  local resp
  resp=$(api_post "/getMyRsvps")
  echo "$resp" | jq '.result.data.events // []' > partiful-export.json
  local count
  count=$(jq 'length' partiful-export.json)
  echo "Exported $count events to partiful-export.json"
}

# --- Main ---

cmd_help() {
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  setup    - Interactive auth token setup (first run)"
  echo "  invites  - List events you've been invited to / attended"
  echo "  event ID - Get details for a specific event"
  echo "  hosted   - List events you're hosting"
  echo "  mutuals  - List mutual connections"
  echo "  export   - Export all events to partiful-export.json"
  echo "  help     - Show this help"
}

load_config

case "${1:-help}" in
  setup)   cmd_setup ;;
  invites) cmd_invites ;;
  event)   cmd_event "${2:-}" ;;
  hosted)  cmd_hosted ;;
  mutuals) cmd_mutuals ;;
  export)  cmd_export ;;
  help)    cmd_help ;;
  *)       echo "Unknown command: $1"; cmd_help; exit 1 ;;
esac
