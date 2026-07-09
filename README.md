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

## License

MIT
