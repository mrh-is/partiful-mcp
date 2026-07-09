# Partiful MCP Server — Design Spec

## Overview

An MCP (Model Context Protocol) server that exposes Partiful's unofficial API as tools for AI agents. Published to npm as `partiful-mcp`, runnable via `npx partiful-mcp`. TypeScript, read-only tools initially, structured for adding write tools later.

## Distribution

- **Package:** `partiful-mcp` on npm
- **Runtime:** Node.js (anyone using Claude Code, Cursor, etc. already has it)
- **Invocation:** `npx -y partiful-mcp` in MCP client config

Example MCP client config:
```json
{
  "mcpServers": {
    "partiful": {
      "command": "npx",
      "args": ["-y", "partiful-mcp"],
      "env": {
        "PARTIFUL_REFRESH_TOKEN": "<token>",
        "PARTIFUL_FIREBASE_API_KEY": "AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k"
      }
    }
  }
}
```

The Firebase API key is public (embedded in Partiful's web app) and can be documented as a default. Users only need to provide their refresh token.

## Authentication

Partiful uses Firebase Auth (phone number / SMS OTP). The MCP server handles token management:

1. On startup, load config (env vars first, then `~/.partiful-config.json` fallback)
2. Proactively refresh to get a fresh JWT before the first API call
3. On 401/403, refresh once and retry (one-retry guard prevents loops)
4. On refresh failure, return a clear error pointing to setup instructions

### Config sources (in priority order)

1. Environment variables: `PARTIFUL_REFRESH_TOKEN`, `PARTIFUL_FIREBASE_API_KEY`, `PARTIFUL_USER_ID`
2. Config file: `~/.partiful-config.json` (same format as the existing shell script — existing users migrate for free)

### Token refresh

```
POST https://securetoken.googleapis.com/v1/token?key=<firebase-api-key>
Content-Type: application/x-www-form-urlencoded
Referer: https://partiful.com/

grant_type=refresh_token&refresh_token=<refresh-token>
```

The `Referer` header is required — Google blocks requests without it. Response contains `id_token` (new JWT) and `refresh_token` (may rotate; must be persisted).

### Getting the refresh token

Users extract their refresh token from Chrome DevTools:
1. Log in to partiful.com
2. DevTools → Application → IndexedDB → firebaseLocalStorageDb → firebaseLocalStorage
3. Expand the stored object → stsTokenManager → refreshToken

Future improvement: a helper script or bookmarklet to simplify extraction.

## Endpoint Discovery

The 5 known endpoints (`getMyRsvps`, `getHostedEvents`, `getMutuals`, `getUsers`, `getInvitableContacts`) were found ad hoc. Before finalizing the tool list, we need a systematic discovery pass to find all endpoints the Partiful web app uses.

### Strategy

1. Open partiful.com in Chrome with DevTools Network tab filtering to `api.partiful.com`
2. Navigate through every section of the app:
   - Home / feed
   - Your events (past and upcoming)
   - Individual event pages (click into several)
   - Guest list on an event
   - Photos on an event
   - Profile page
   - Settings
   - Create event flow (don't submit)
   - RSVP flow (change RSVP on a past event)
   - Invite flow
   - Search / discover
   - Notifications
3. Record each unique function name, the params it was called with, and the response shape
4. Classify each as read or write

This can be done manually or automated with claude-in-chrome (`read_network_requests` while navigating with `navigate` / `computer`).

### Impact on implementation

The tool list below is provisional — based on currently known endpoints. The discovery phase happens before implementation begins. Once complete, we update this spec with the full endpoint catalog, then finalize which ones become v1 tools (all read endpoints) and which are deferred (write endpoints).

## MCP Tools (provisional — pending discovery)

All tools return structured JSON for agent consumption. This list will be updated after endpoint discovery.

**Known read endpoints:**

| Tool | Endpoint | Description | Parameters |
|------|----------|-------------|------------|
| `get_my_events` | `getMyRsvps` | All events you've been invited to / RSVPed to | none |
| `get_event` | (none — filters from `getMyRsvps`) | Full detail for a specific event (the `getEvent` endpoint 404s) | `event_id: string` |
| `get_hosted_events` | `getHostedEvents` | Events you're hosting | none |
| `get_mutuals` | `getMutuals` | Mutual connections | none |
| `get_users` | `getUsers` | User profiles by ID | `user_ids: string[]` |

**Known but not yet tooled:**

| Endpoint | Description | Why deferred |
|----------|-------------|-------------|
| `getInvitableContacts` | Contacts that can be invited to an event | Useful mainly for write flows (inviting) |

**Likely undiscovered:** photo endpoints, notification endpoints, search, event detail views, guest list fetching, profile updates, and more.

## Architecture

```
partiful-mcp/
├── src/
│   ├── index.ts              # Entry point — starts MCP server
│   ├── server.ts             # MCP server setup, tool registration
│   ├── tools/                # One file per tool
│   │   ├── get-my-events.ts
│   │   ├── get-event.ts
│   │   ├── get-hosted-events.ts
│   │   ├── get-mutuals.ts
│   │   └── get-users.ts
│   ├── api/
│   │   ├── client.ts         # Core API client — POST wrapper, auth, error handling
│   │   └── auth.ts           # Token refresh logic
│   ├── config.ts             # Load from env vars → config file fallback
│   └── types.ts              # All TypeScript types
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### Key design decisions

- **`types.ts` is the backbone.** Rich types for every API response shape: `Event`, `Guest`, `GuestStatusCounts`, `DisplaySettings`, `Image`, `RsvpStatus`, `User`, etc. Derived from documented response structures. Makes the codebase self-documenting.
- **`client.ts` is a single `apiPost(endpoint, params)` function.** Handles the `{data: {params, userId}}` request envelope, Bearer auth, and auto-refresh-on-401 with one-retry guard. All tools call through it.
- **One file per tool.** Each exports a tool definition (name, description, input schema) and a handler. `server.ts` imports and registers them all. Adding a write tool later = adding a file + an import.
- **No classes.** Plain functions and types. The API client takes config as a parameter, not instance state.
- **Helper functions and types for readability.** Many small, well-named helpers rather than dense logic.

### API client details

All Partiful API calls follow the same pattern:
- Method: POST
- URL: `https://api.partiful.com/<functionName>`
- Headers: `Authorization: Bearer <jwt>`, `Content-Type: application/json`, `Origin: https://partiful.com`, `Referer: https://partiful.com/`
- Body: `{"data": {"params": {<endpoint-specific>}, "userId": "<firebase-uid>"}}`
- Response: JSON at `.result.data`

## Error handling

- API errors surface as MCP tool errors with HTTP status and Partiful's error message
- Missing config on startup returns a clear error pointing to README setup instructions
- Network errors pass through with their original message
- No silent error swallowing

## Preserved quirks

These behaviors were discovered during reverse engineering and must be maintained:

- `Referer: https://partiful.com/` on token refresh requests (Google blocks without it)
- `Origin` and `Referer` headers on all API calls
- Response data at `.result.data` (not `.result` or `.data`)
- `getMyRsvps` response nests events at `.result.data.events`
- One-retry guard on auth refresh to prevent infinite loops

## Scope boundaries

### In scope (v1)
- Endpoint discovery pass (systematic crawl of partiful.com to catalog all API endpoints)
- Read-only tools for all discovered read endpoints
- Token auto-refresh
- Env var + config file auth
- npm publishing via npx

### Out of scope (future)
- Write tools (RSVP, create event, invite, photos)
- Interactive setup command
- Token extraction helper
- Pagination (not yet observed in the API)
- WebSocket / real-time subscriptions
