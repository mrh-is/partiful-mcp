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

| Tool | Description |
|------|-------------|
| `get_my_events` | All events you've been invited to or RSVPed to |
| `get_hosted_events` | Events you're hosting |
| `get_my_upcoming_events` | Your upcoming events (home page 'Upcoming' view) |
| `get_my_past_events` | Your past events (home page 'All past events' tab) |
| `get_discoverable_events` | Open-invite events (home page 'Open invite' tab) |
| `get_saved_events` | Your saved/bookmarked events |
| `get_followed_events` | Events you're following |
| `get_event` | Full details for a specific event by ID |
| `get_guests` | Full guest list for an event |
| `get_event_comments` | Comments/discussion on an event |
| `get_event_media` | Photos and media uploaded to an event |
| `get_event_restrictions` | Restrictions (age, capacity, etc.) for an event |
| `get_event_permission` | Current user's permissions for an event |
| `get_event_host_messages` | Host messages displayed on an event page |
| `get_event_ticketing_eligibility` | Whether an event supports ticketing |
| `get_pending_cohost_request` | Pending cohost invitation for an event, if any |
| `get_host_promo_codes` | Promo codes for a hosted event |
| `get_host_ticket_types` | Ticket types/tiers for a hosted event |
| `get_event_discover_status` | Whether an event is listed on explore/discover |
| `get_cohost_requested_events` | Events where you've been asked to cohost |
| `get_all_event_restrictions` | Restrictions across all your events |
| `get_invitable_contacts` | Contacts that can be invited to an event (paginated) |
| `get_mutuals` | Your mutual connections |
| `get_users` | Look up user profiles by ID |
| `get_users_party_stats` | Party stats (events attended, hosted) for user profiles |
| `get_contacts` | Your contact list |
| `get_my_communities` | Communities you belong to |
| `get_created_cards` | Digital cards you've created |
| `get_discover_event_decorators` | Decorators for explore page event cards (badges like 'friends going', trending, etc.) |
| `mark_notifications_read` | Mark all notifications for an event as read (write action) |

## Agent Usage Notes

This section is for the AI agent/LLM calling this server through an MCP client — not for the human setting it up.

### Which "get events" tool to use

Seven tools return different event lists. Pick the one that matches the user's intent:

| User intent | Tool |
|---|---|
| "What have I RSVPed to / been invited to?" (richest event data overall) | `get_my_events` |
| "What am I hosting?" | `get_hosted_events` |
| "What's on my schedule coming up?" / "this weekend" | `get_my_upcoming_events` |
| "What events have I already been to?" | `get_my_past_events` |
| "What's open to join / discover?" (not necessarily invited) | `get_discoverable_events` |
| "What have I bookmarked/saved?" | `get_saved_events` |
| "What events am I following?" | `get_followed_events` |

`get_my_events` (`getMyRsvps`) is the broadest and most detail-rich source of events the user is already connected to; the others are narrower, home-page-tab-specific views — reach for those only when the user's phrasing matches that specific tab (upcoming, past, open invite, saved, followed).

### `get_users` vs `get_users_party_stats`

Both take a list of user IDs and overlap in purpose:

- `get_users` — full profile info (name, display name, username, profile image) for a batch of users; it also has party stats (events attended/hosted) baked into every response, so it's the right call when you need identity info, stats, or both.
- `get_users_party_stats` — returns only the attended/hosted counts, with no profile info. Use it only when profile details are already known and just the stats are needed.

In practice, prefer `get_users` unless you specifically want to avoid fetching profile data.

### The only write tool: `mark_notifications_read`

Every tool in this server is a pure read with no side effects, **except `mark_notifications_read`**, which marks all notifications for an event as read on the user's real Partiful account. Call it only when the user's intent is clearly to mark notifications read — never speculatively, never "just in case," and never as a side effect of answering an unrelated question.

### Expected auth failure mode

If `PARTIFUL_REFRESH_TOKEN` is missing, malformed, expired, or revoked, the first tool call that needs a token will fail. Two shapes of error are possible:

- **Refresh itself fails**: an error like `Token refresh failed: <message>` (e.g. Google's `INVALID_REFRESH_TOKEN`), or `Token refresh failed: HTTP <status> <statusText>` if the token endpoint request itself failed.
- **Refresh succeeded earlier but the token is later rejected by the Partiful API** (401/403): the client retries once with a fresh token automatically; if that retry also fails, the error surfaces as `Partiful API error: HTTP 401 Unauthorized on /<endpoint>` (or 403).

Either error means the refresh token needs to be re-obtained — see "Getting Your Refresh Token" above. This is not a transient failure the agent should retry; it requires the human to get a new token.

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

`mark_notifications_read` (the only write tool — see above) is deliberately
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
404s were found and fixed.

## License

MIT
