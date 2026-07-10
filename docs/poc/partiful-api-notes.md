# Partiful Unofficial API — Reverse Engineering Notes

> **Status: historical.** These are the raw notes from the original
> discovery pass, kept for the discovery *methodology* (endpoint-finding
> techniques, auth flow, `discover-endpoints.sh` usage). For the current,
> confirmed list of endpoints and their param shapes, see
> [`../api-endpoints.md`](../api-endpoints.md) instead — some endpoint names
> below (`getHostedEvents`, `getInvitableContacts`) turned out to be wrong
> guesses that 404 in production and were superseded; they're left as-written
> below so this file still reads as an accurate record of how the discovery
> happened.

## Architecture

Partiful is a Firebase app. The API is a set of Firebase Cloud Functions at `https://api.partiful.com/<functionName>`. Every endpoint follows the same pattern:

- Method: `POST`
- Auth: `Authorization: Bearer <firebase-id-token>`
- Headers: `Content-Type: application/json`, `Origin: https://partiful.com`, `Referer: https://partiful.com/`
- Body: `{"data": {"params": {<endpoint-specific>}, "userId": "<firebase-uid>"}}`
- Response: JSON, typically `{"result": {"data": {<payload>}}}`

## Authentication

Firebase auth via phone number (SMS OTP). Tokens live in IndexedDB under `firebaseLocalStorageDb > firebaseLocalStorage`. The stored object contains:

```
stsTokenManager.accessToken   — the JWT Bearer token (expires in 1 hour)
stsTokenManager.refreshToken  — long-lived, use to get new access tokens
```

The Firebase project ID is `getpartiful` and the API key is `AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k` (public, embedded in the web app).

### Token refresh

```
POST https://securetoken.googleapis.com/v1/token?key=<firebase-api-key>
Content-Type: application/x-www-form-urlencoded
Referer: https://partiful.com/

grant_type=refresh_token&refresh_token=<refresh-token>
```

The `Referer` header is required — requests without it get blocked. Response includes `id_token` (new access token) and `refresh_token` (may rotate).

### Getting tokens for development

The easiest way is to log into partiful.com in a browser, open DevTools, and grab the tokens from IndexedDB or from the Authorization header on any `api.partiful.com` request.

## Known endpoints

### getMyRsvps
Returns all events the user has been invited to or RSVPed to. This is the richest endpoint — each event object includes title, dates, location, guest counts, RSVP status, image metadata, display settings, and more.

Params: `{}` (none needed)

Response shape (abbreviated):
```json
{
  "result": {
    "data": {
      "events": [
        {
          "id": "dhtT9nyrW10PUQLU2tzy",
          "title": "Rawb's Housewarming Party",
          "startDate": "2026-06-12T23:00:00.000Z",
          "endDate": "2026-06-13T04:00:00.000Z",
          "status": "PUBLISHED",
          "timezone": "America/New_York",
          "location": "123 Main St, Pittsburgh, PA",
          "ownerIds": ["4Kc2N2HXQkQb0pDN9e4Zhop8loE3"],
          "image": {
            "url": "https://firebasestorage.googleapis.com/...",
            "contentType": "image/png",
            "blurHash": "...",
            "width": 1494,
            "height": 1493
          },
          "displaySettings": {
            "effect": "fireflies",
            "theme": "karaoke",
            "titleFont": "nokja"
          },
          "showHostList": true,
          "showGuestList": true,
          "showGuestCount": true,
          "allowGuestPhotoUpload": true,
          "attendedGuestCount": 11,
          "guestStatusCounts": {
            "GOING": 11, "MAYBE": 2, "DECLINED": 1,
            "SENT": 3, "WAITLIST": 0
          },
          "calendarFile": "https://storage.googleapis.com/.../event.ics",
          "guest": {
            "id": "aN5TXjMFdDDvDTUU9kpf",
            "eventId": "dhtT9nyrW10PUQLU2tzy",
            "userId": "RcWTHUleS9aXjWIGqx5phoQYTCO2",
            "status": "GOING"
          }
        }
      ]
    }
  }
}
```

### getMutuals
Returns mutual connections (people you've been at the same events with).

Params: `{}`

### getHostedEvents — wrong guess, see below
Guessed name for "events the user is hosting." **This 404s** — the real
endpoint is `getPublishedEvents` (`{userId}`, bare array response). See
"Verifying against the real client" further down and `../api-endpoints.md`.

### getUsers
Fetches user profiles by ID.

Params: `{"ids": ["uid1", "uid2"], "excludePartyStats": false, "includePartyStats": true}`

### getInvitableContacts — wrong guess, see below
Guessed name for "contacts that can be invited to a specific event," with
guessed pagination params. **This 404s** — the real endpoint is
`getContactsFilteredByEvent` (`{eventId}`, no pagination). See "Verifying
against the real client" further down and `../api-endpoints.md`.

### getEvent — possibly removed
Was documented in an older client but returns 404 as of July 2026. The data it would have returned is available in getMyRsvps anyway.

## Endpoint discovery strategy

All API calls go to `api.partiful.com` as POST requests. To find all endpoints:

1. Open partiful.com in Chrome, open DevTools Network tab, filter to `api.partiful.com`
2. Navigate through every section of the app:
   - Home / feed
   - Your events (past and upcoming)
   - Individual event pages (click into several)
   - Guest list on an event
   - Photos on an event
   - Profile page
   - Settings
   - Create event flow (don't have to submit)
   - RSVP flow (change RSVP on a past event)
   - Invite flow
   - Search / discover
   - Notifications
3. Record each unique function name, the params it was called with, and the response

With Chrome automation (claude-in-chrome), you can intercept requests via `read_network_requests` while navigating with `navigate` / `computer`. Filter for `api.partiful.com` to isolate the API calls from static assets and analytics.

### Static alternative: grep the public JS bundle (no login, no clicking through the app)

When Chrome automation isn't available, or you just need to confirm/find one specific endpoint, you don't need to intercept live traffic at all: Partiful's web app is a Next.js app, and its JS bundles are public static assets. Every Cloud Function name appears in them as a bare string literal (e.g. `let el="getPublishedEvents"`) right next to the call site — string literals survive minification even though variable/function names get mangled, so this is a reliable source of truth for endpoint names and their exact param shapes.

Use `./discover-endpoints.sh <partiful-page-url> [filter]` in this directory: it downloads the page's JS chunks and lists every candidate endpoint-shaped string literal. Confirm a candidate is real (not a coincidental library function name) by grepping its surrounding context for the fetch-wrapper call site — `(0, X.wF)(candidateName, {params: {...}})` in this codebase's bundle — which also reveals the real params object. This is how the `getHostedEvents` → `getPublishedEvents` and `getInvitableContacts` → `getContactsFilteredByEvent` 404 fixes were found (see `../api-endpoints.md`).

## RSVP status values

Observed in `guest.status` and `guestStatusCounts`:
`GOING`, `MAYBE`, `DECLINED`, `SENT`, `INTERESTED`, `WAITLIST`, `PENDING_APPROVAL`, `APPROVED`, `WITHDRAWN`, `READY_TO_SEND`, `SENDING`, `SEND_ERROR`, `DELIVERY_ERROR`, `RESPONDED_TO_FIND_A_TIME`, `WAITLISTED_FOR_APPROVAL`, `REJECTED`

## Shell script: partiful.sh

`partiful.sh` in this directory is a working client. Dependencies: `curl`, `jq` (both standard on macOS). Originally derived from https://github.com/plurigrid/asi/tree/main/skills/partiful (Babashka/Clojure), rewritten to avoid any non-standard dependencies.

### Commands

| Command | What it does |
|---------|-------------|
| `./partiful.sh setup` | Interactive first-run: prompts for tokens, saves to config, tests connection |
| `./partiful.sh invites` | Table of all events you've been invited to — date, RSVP status, title, URL |
| `./partiful.sh event <id>` | Full JSON detail for a specific event (pulled from invites data) |
| `./partiful.sh hosted` | Lists events you're hosting |
| `./partiful.sh mutuals` | Lists mutual connections |
| `./partiful.sh export` | Dumps all event data to `partiful-export.json` |

### Config

Stored at `~/.partiful-config.json` (chmod 600). Fields:

```json
{
  "auth_token": "<firebase JWT — expires in 1 hour>",
  "user_id": "<firebase uid>",
  "refresh_token": "<long-lived, used to get new auth tokens>",
  "firebase_api_key": "<public firebase key for token refresh>"
}
```

Also reads from env vars `PARTIFUL_AUTH_TOKEN`, `PARTIFUL_USER_ID`, `PARTIFUL_REFRESH_TOKEN`, `PARTIFUL_FIREBASE_API_KEY` as fallbacks.

### How it works

- `api_post` is the core function — takes an endpoint name and a JSON params string, wraps it in the standard `{data: {params, userId}}` envelope, sends it with Bearer auth.
- On 401/403, it automatically attempts a token refresh (once only — a `_retried` guard prevents infinite loops).
- The refresh call to `securetoken.googleapis.com` requires a `Referer: https://partiful.com/` header or Google blocks it.
- JSON params are written to a tmpfile and read by jq to avoid bash quoting issues with nested JSON.
- `cmd_event` doesn't use a dedicated API endpoint (the old `getEvent` endpoint 404s as of July 2026). Instead it fetches all events via `getMyRsvps` and filters by ID.

### Known quirks / things to watch for

- The `getMyRsvps` response nests events at `.result.data.events` — not `.result.events` or `.data.events`.
- `getHostedEvents` and `getMutuals` response shapes haven't been fully verified — the jq in `cmd_hosted` and `cmd_mutuals` tries several paths as fallbacks.
- Bash quoting with JSON is fragile. When passing params to `api_post`, always use `jq -cn` to build the JSON string (e.g. `api_post "/getUsers" "$(jq -cn --arg id "$uid" '{ids: [$id]}')"`) rather than manual escaping.

## Things to figure out during discovery

- What endpoint replaced `getEvent`? Or does the web app just use Firestore directly for individual event reads?
- Write endpoints: RSVP, create event, invite guests, upload photos
- Pagination patterns (some endpoints likely paginate with skip/limit, others with cursors)
- Rate limiting behavior
- Whether any endpoints use GET instead of POST
- WebSocket / real-time subscriptions (Firestore listeners for live updates)
