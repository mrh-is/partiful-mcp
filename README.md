# partiful-mcp

An MCP server that gives AI agents access to the [Partiful](https://partiful.com) API. View your events, RSVPs, hosted events, mutual connections, and user profiles — all from your AI assistant.

> **Note:** This is an unofficial, community-built tool. It is not affiliated with or endorsed by Partiful.

## Quick Start

Add to your MCP client config (Claude Code, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "partiful": {
      "command": "npx",
      "args": ["-y", "partiful-mcp"],
      "env": {
        "PARTIFUL_REFRESH_TOKEN": "<your-refresh-token>"
      }
    }
  }
}
```

## Getting Your Refresh Token

1. Log in to [partiful.com](https://partiful.com) in Chrome
2. Open DevTools (`Cmd+Opt+I` / `Ctrl+Shift+I`)
3. Go to **Application** → **IndexedDB** → **firebaseLocalStorageDb** → **firebaseLocalStorage**
4. Click the entry — expand `value` → `stsTokenManager` → copy the `refreshToken` value

## Available Tools

Tool names mirror their underlying Partiful API route (snake_case of the
route name) rather than an invented name, so the tool you call and the
endpoint it hits are always obviously the same thing — see "Verifying or
discovering an endpoint" below for how that's kept honest.

| Tool | Description |
|------|-------------|
| `get_my_rsvps` | All events you've been invited to or RSVPed to |
| `get_published_events` | Events you're hosting |
| `get_my_upcoming_events_for_home_page` | Your upcoming events (home page 'Upcoming' view) |
| `get_my_past_events_for_home_page` | Your past events (home page 'All past events' tab) |
| `get_discoverable_events` | Open-invite events (home page 'Open invite' tab) |
| `get_my_saved_events` | Your saved/bookmarked events |
| `get_my_followed_events` | Events you're following |
| `get_event_info` | Full details for a specific event by ID (works for any viewable event, not just ones you've RSVPed to) |
| `get_guests` | Full guest list for an event |
| `get_mutual_guests` | Guests you have in common with a specific event |
| `get_event_comments` | Comments/discussion on an event |
| `get_event_media` | Photos and media uploaded to an event |
| `get_event_restrictions` | Restrictions (age, capacity, etc.) for an event |
| `get_event_permission` | Current user's permissions for an event |
| `get_event_displayed_host_messages` | Host messages displayed on an event page |
| `get_event_ticketing_eligibility` | Whether an event supports ticketing |
| `get_pending_cohost_request_for_event` | Pending cohost invitation for an event, if any |
| `get_host_promo_codes` | Promo codes for a hosted event |
| `get_host_ticket_types` | Ticket types/tiers for a hosted event |
| `get_ticket_fee_config` | Partiful's ticketing fee configuration for an event (or the platform default) |
| `get_tickets_for_event` | All tickets sold for a hosted, ticketed event |
| `get_tickets_for_ticket_type` | Tickets sold for one ticket type on a hosted event |
| `get_guest_payment_info` | Ticket payment history for a specific guest on a hosted event |
| `get_payout_summary_for_event` | Host payout summary for a ticketed event |
| `get_event_discover_status` | Whether an event is listed on explore/discover |
| `get_event_discover_info` | Discover-page info (region, sections, tags) for an event |
| `get_discover_curation_options` | Host-side discover-page curation settings for an event |
| `get_cohost_requested_events` | Events where you've been asked to cohost |
| `get_all_event_restrictions` | Restrictions across all your events |
| `get_contacts_filtered_by_event` | Contacts that can be invited to an event |
| `get_mutuals` | Your mutual connections |
| `get_followers` | Your followers |
| `get_following` | Who you follow |
| `get_users` | Look up user profiles by ID |
| `get_users_party_stats` | Party stats (events attended, hosted) for user profiles |
| `get_contacts` | Your contact list |
| `get_my_communities` | Communities you belong to |
| `get_created_cards` | Digital cards you've created |
| `get_last_questionnaire_answers` | Your most recent RSVP questionnaire answers |
| `get_discover_event_item_decorators` | Decorators for explore page event cards (badges like 'friends going', trending, etc.) |
| `mark_all_notifications_for_event_as_read` | Mark all notifications for an event as read (write action) |

## Agent Usage Notes

This section is for the AI agent/LLM calling this server through an MCP client — not for the human setting it up.

### Which "get events" tool to use

Seven tools return different event lists. Pick the one that matches the user's intent:

| User intent | Tool |
|---|---|
| "What have I RSVPed to / been invited to?" (richest event data overall) | `get_my_rsvps` |
| "What am I hosting?" | `get_published_events` |
| "What's on my schedule coming up?" / "this weekend" | `get_my_upcoming_events_for_home_page` |
| "What events have I already been to?" | `get_my_past_events_for_home_page` |
| "What's open to join / discover?" (not necessarily invited) | `get_discoverable_events` |
| "What have I bookmarked/saved?" | `get_my_saved_events` |
| "What events am I following?" | `get_my_followed_events` |

`get_my_rsvps` is the broadest and most detail-rich source of events the user is already connected to; the others are narrower, home-page-tab-specific views — reach for those only when the user's phrasing matches that specific tab (upcoming, past, open invite, saved, followed).

### `get_event_info` vs the event-list tools

`get_event_info` fetches a single event by ID and works for **any** viewable event — not just ones the user has been invited to or RSVPed to, unlike every tool in the table above. The trade-off: its response has no per-user RSVP/guest status field, since it's not scoped to the current user's relationship to the event. If you need the current user's own RSVP status for an event, pull it from `get_my_rsvps` (or another list tool) instead.

### `get_mutuals` vs `get_mutual_guests`

- `get_mutuals` — the current user's mutual connections in general (people they've been at events with in common), not scoped to any one event.
- `get_mutual_guests` — mutual connections scoped to one specific event's guest list, i.e. "who do I know that's also going to this event."

Pick by whether the question is about one event or in general.

### `get_followers` vs `get_following`

Not interchangeable: `get_followers` returns who follows the current user (as `{users: [...]}`, full profiles); `get_following` returns who the current user follows (as `{userIds: [...]}`, IDs only — pass them to `get_users` for profiles).

### Three similarly-named discover-page tools

- `get_event_discover_status` — is the event listed on explore/discover at all (a simple flag/status).
- `get_event_discover_info` — the region/sections/tags actually shown once listed.
- `get_discover_curation_options` — host-only settings controlling *how* the event can be listed (curation config, not the listing's current state).

### `get_users` vs `get_users_party_stats`

Both take a list of user IDs and overlap in purpose:

- `get_users` — full profile info (name, display name, username, profile image) for a batch of users; it also has party stats (events attended/hosted) baked into every response, so it's the right call when you need identity info, stats, or both.
- `get_users_party_stats` — returns only the attended/hosted counts, with no profile info. Use it only when profile details are already known and just the stats are needed.

In practice, prefer `get_users` unless you specifically want to avoid fetching profile data.

### The only write tool: `mark_all_notifications_for_event_as_read`

Every tool in this server is a pure read with no side effects, **except `mark_all_notifications_for_event_as_read`**, which marks all notifications for an event as read on the user's real Partiful account. Call it only when the user's intent is clearly to mark notifications read — never speculatively, never "just in case," and never as a side effect of answering an unrelated question.

### Host-only ticketing/payment tools

`get_tickets_for_event`, `get_tickets_for_ticket_type`, `get_guest_payment_info`, `get_payout_summary_for_event`, and `get_discover_curation_options` only work for events the current user hosts — Partiful returns a 403 otherwise. Their output schemas are intentionally loose (`z.looseObject({})`): the live test account used during development doesn't host any ticketed events, so the exact response shape for these five is unconfirmed beyond the request succeeding. Tighten the schema for one of these if you get a real response and notice it's wrong.

### Expected auth failure mode

If `PARTIFUL_REFRESH_TOKEN` is missing, malformed, expired, or revoked, the first tool call that needs a token will fail. Two shapes of error are possible:

- **Refresh itself fails**: an error like `Token refresh failed: <message>` (e.g. Google's `INVALID_REFRESH_TOKEN`), or `Token refresh failed: HTTP <status> <statusText>` if the token endpoint request itself failed.
- **Refresh succeeded earlier but the token is later rejected by the Partiful API** (401/403): the client retries once with a fresh token automatically; if that retry also fails, the error surfaces as `Partiful API error: HTTP 401 Unauthorized on /<endpoint>` (or 403).

Either error means the refresh token needs to be re-obtained — see "Getting Your Refresh Token" above. This is not a transient failure the agent should retry; it requires the human to get a new token.

## How It Works

Partiful has no official API. This server talks to Partiful's actual
production backend — the same Firebase Cloud Functions the partiful.com web
app itself calls — reverse-engineered from its public JS bundles (see
`docs/poc/partiful-api-notes.md` for the discovery methodology and
`docs/api-endpoints.md` for the confirmed endpoint list). There's no sandbox
or test account to build against, so every endpoint here has been called at
least once against a real Partiful account.

A rough map of the source, for anyone extending this server:

- `src/index.ts` — entry point: loads config, builds the API client and MCP
  server, connects to stdio.
- `src/config.ts` — resolves `PARTIFUL_REFRESH_TOKEN` etc. from env vars or
  `~/.partiful-config.json`.
- `src/api/auth.ts` — exchanges the refresh token for a short-lived Firebase
  access token via Google's token endpoint.
- `src/api/client.ts` — POSTs to `https://api.partiful.com/<endpoint>`,
  wraps/unwraps Partiful's request/response envelope, retries once on a
  401/403 with a fresh token.
- `src/schemas.ts` — shared Zod schemas (event, user, guest, ...) reused
  across multiple tools' `outputSchema`s.
- `src/define-tool.ts` — the `Tool` shape every file in `src/tools/` exports,
  plus sane default MCP annotations (read-only, idempotent, etc.).
- `src/tools/*.ts` — one file per tool, each a thin mapping from an MCP tool
  call to one Partiful endpoint. `src/server.ts` auto-discovers every file in
  this directory at startup — dropping in a new tool module is all that's
  needed to register it, no manual wiring.
- `src/server.ts` — builds the `McpServer`, registers discovered tools,
  adapts handler results/errors to the MCP protocol.

Every tool's request/response shape was pinned down by calling the real API
during development (see "Verifying or discovering an endpoint" below) and,
for most tools, is continuously re-verified against the live API by
`src/__tests__/live.test.ts` (see "Development"). Where a shape is marked
unconfirmed in a tool's description or in `docs/api-endpoints.md`, that's
because the live test account couldn't reach that code path (e.g. hosting a
ticketed event) — not a guess made without checking.

## Configuration

### Environment Variables (recommended for MCP)

| Variable | Required | Description |
|----------|----------|-------------|
| `PARTIFUL_REFRESH_TOKEN` | Yes | Firebase refresh token |
| `PARTIFUL_FIREBASE_API_KEY` | No | Defaults to Partiful's public key |
| `PARTIFUL_USER_ID` | No | Firebase UID — found in the same IndexedDB entry as the refresh token (the `uid` field) |

### Config File (alternative)

The server also reads `~/.partiful-config.json`:

```json
{
  "refresh_token": "<token>",
  "firebase_api_key": "<key>",
  "user_id": "<uid>"
}
```

Environment variables take priority over the config file.

## Development

`npm test` runs the mocked unit suite plus an opt-in live-integration suite
(`src/__tests__/live.test.ts`) that exercises the real Partiful API and
validates every tool's `outputSchema` against the live response. It's
skipped automatically unless `PARTIFUL_REFRESH_TOKEN` is set:

```sh
PARTIFUL_REFRESH_TOKEN=<your-refresh-token> npm test
```

Run it after changing any `outputSchema` or endpoint-handling logic — it
catches schema drift (endpoints wrapping/naming their payloads differently
than assumed) that the mocked tests can't. Never commit a token; the suite
only reads it from the environment.

`mark_all_notifications_for_event_as_read` (the only write tool — see above) is deliberately
**not** in that suite, so it never runs unattended in the weekly CI job. It
has its own opt-in live test, `src/__tests__/live-write.test.ts`, which you
run yourself when you want to confirm it still works:

```sh
PARTIFUL_REFRESH_TOKEN=<your-refresh-token> PARTIFUL_LIVE_WRITE_TESTS=1 \
  npx vitest run src/__tests__/live-write.test.ts
```

Both `PARTIFUL_REFRESH_TOKEN` and `PARTIFUL_LIVE_WRITE_TESTS` must be set —
the token alone isn't enough — since this test marks real notifications as
read on that token's account.

### Verifying or discovering an endpoint

Before trusting a guessed endpoint name (or hunting for one that isn't in
`docs/api-endpoints.md` yet), grep Partiful's own public JS bundles rather
than guessing from naming convention — see "Static alternative: grep the
public JS bundle" in `docs/poc/partiful-api-notes.md` and run
`docs/poc/discover-endpoints.sh`. This is how the `getHostedEvents` →
`getPublishedEvents` and `getInvitableContacts` → `getContactsFilteredByEvent`
404s were found and fixed, and how every tool name in this server came to
match its real route — tool names are the snake_case of the route, not an
invented name (see "Available Tools" above).

The same pass surfaced a few endpoints that are confirmed real (they're
called via the fetch wrapper in the bundle) but whose exact param shape
couldn't be pinned down — every guess either 400'd, 500'd, or 404'd live.
Those are intentionally **not** wired up as tools; see "Confirmed real, but
not wired up" in `docs/api-endpoints.md` before attempting one, so you don't
redo the same failed guesses.

## License

MIT
