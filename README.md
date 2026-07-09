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
| `get_event` | Full details for a specific event by ID |
| `get_hosted_events` | Events you're hosting |
| `get_mutuals` | Your mutual connections |
| `get_users` | Look up user profiles by ID |

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
