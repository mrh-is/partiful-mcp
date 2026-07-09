# Partiful MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server that exposes Partiful's unofficial API as tools for AI agents, published to npm as `partiful-mcp`.

**Architecture:** A single npm package runnable via `npx partiful-mcp`. Plain functions (no classes) organized as: config loading → auth/token refresh → API client → individual MCP tool handlers. Each tool is a separate file exporting a definition and handler. Types are the backbone — rich TypeScript types for all API shapes.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `vitest` for testing, Node.js `fetch` (no axios/got — Node 18+ has it built in)

## Global Constraints

- Node.js >= 18 (for native `fetch`)
- No runtime dependencies beyond `@modelcontextprotocol/sdk` and `zod` (peer dep of MCP SDK)
- All API calls are POST to `https://api.partiful.com/<functionName>`
- All API calls require headers: `Authorization: Bearer <jwt>`, `Content-Type: application/json`, `Origin: https://partiful.com`, `Referer: https://partiful.com/`
- All API request bodies follow: `{"data": {"params": {<endpoint-specific>}, "userId": "<uid>"}}`
- All API responses nest data at `.result.data`
- Token refresh to `securetoken.googleapis.com` requires `Referer: https://partiful.com/` header
- Firebase API key `AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k` is public and used as default
- Read-only tools only in v1; structure code so write tools are easy to add later
- The tool list is provisional — an endpoint discovery pass (Task 0) may add more tools. Tasks 1-7 use the 5 known endpoints; if discovery finds more, add tool files following the same pattern before Task 8.

---

### Task 0: Endpoint Discovery

**This task is manual / browser-assisted and happens before coding begins.** Use Chrome DevTools or claude-in-chrome to systematically crawl partiful.com and record every API endpoint.

**Files:**
- Modify: `partiful-api-notes.md` (add discovered endpoints)
- Modify: `docs/superpowers/specs/2026-07-08-partiful-mcp-server-design.md` (update tool list)

**Interfaces:**
- Consumes: nothing
- Produces: complete endpoint catalog in `partiful-api-notes.md`; updated tool list in the design spec

- [ ] **Step 1: Open partiful.com with network monitoring**

Open partiful.com in Chrome. Open DevTools Network tab, filter requests to `api.partiful.com`.

- [ ] **Step 2: Navigate through every section**

Visit each section in order, waiting for network requests to settle after each navigation:
1. Home / feed
2. Your events (past tab, upcoming tab)
3. Click into 2-3 individual event pages
4. View guest list on an event
5. View photos on an event
6. Profile page
7. Settings
8. Start create event flow (don't submit)
9. Change RSVP on a past event
10. Invite flow on an event you host
11. Search / discover
12. Notifications

- [ ] **Step 3: Record each unique endpoint**

For each unique function name observed in requests to `api.partiful.com`, record:
- Function name (URL path after `api.partiful.com/`)
- The `params` object from the request body
- The response shape (abbreviated — just top-level keys and nesting)
- Classification: read or write

- [ ] **Step 4: Update documentation**

Add all newly discovered endpoints to the "Known endpoints" section of `partiful-api-notes.md`, following the existing format (endpoint name, params, response shape).

- [ ] **Step 5: Update the spec's tool list**

Update the MCP Tools table in `docs/superpowers/specs/2026-07-08-partiful-mcp-server-design.md`:
- Add tool entries for all newly discovered read endpoints
- Add deferred entries for write endpoints
- Remove the "(provisional — pending discovery)" qualifier

- [ ] **Step 6: Commit**

```bash
git add partiful-api-notes.md docs/superpowers/specs/2026-07-08-partiful-mcp-server-design.md
git commit -m "docs: complete endpoint discovery — catalog all Partiful API endpoints"
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: runnable TypeScript project with `npm run build` and `npm run dev`

- [ ] **Step 1: Initialize package.json**

```bash
npm init -y
```

Then replace the contents of `package.json` with:

```json
{
  "name": "partiful-mcp",
  "version": "0.1.0",
  "description": "MCP server for the Partiful API — lets AI agents read your Partiful events, RSVPs, and connections",
  "type": "module",
  "bin": {
    "partiful-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "partiful", "ai", "firebase"],
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "files": ["dist"]
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.tgz
```

- [ ] **Step 5: Create minimal src/index.ts**

```typescript
#!/usr/bin/env node
console.log("partiful-mcp starting...");
```

- [ ] **Step 6: Verify build works**

```bash
npm run build
node dist/index.js
```

Expected: prints "partiful-mcp starting..."

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json src/index.ts .gitignore package-lock.json
git commit -m "feat: scaffold partiful-mcp TypeScript project"
```

---

### Task 2: Types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Consumes: nothing
- Produces: All TypeScript types used by every other task: `PartifulConfig`, `TokenSet`, `RefreshResponse`, `ApiResponse<T>`, `PartifulEvent`, `Guest`, `GuestStatusCounts`, `RsvpStatus`, `DisplaySettings`, `EventImage`, `User`, `Mutual`

- [ ] **Step 1: Write the types file**

```typescript
export interface PartifulConfig {
  refreshToken: string;
  firebaseApiKey: string;
  userId?: string;
  configFilePath?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  id_token?: string;
  refresh_token?: string;
  error?: {
    message: string;
  };
}

export interface ApiRequestBody {
  data: {
    params: Record<string, unknown>;
    userId: string;
  };
}

export interface ApiResponse<T> {
  result: {
    data: T;
  };
}

export type RsvpStatus =
  | "GOING"
  | "MAYBE"
  | "DECLINED"
  | "SENT"
  | "INTERESTED"
  | "WAITLIST"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "WITHDRAWN"
  | "READY_TO_SEND"
  | "SENDING"
  | "SEND_ERROR"
  | "DELIVERY_ERROR"
  | "RESPONDED_TO_FIND_A_TIME"
  | "WAITLISTED_FOR_APPROVAL"
  | "REJECTED";

export interface EventImage {
  url: string;
  contentType: string;
  blurHash?: string;
  width?: number;
  height?: number;
}

export interface DisplaySettings {
  effect?: string;
  theme?: string;
  titleFont?: string;
}

export interface GuestStatusCounts {
  GOING?: number;
  MAYBE?: number;
  DECLINED?: number;
  SENT?: number;
  WAITLIST?: number;
  INTERESTED?: number;
  PENDING_APPROVAL?: number;
}

export interface Guest {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
}

export interface PartifulEvent {
  id: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  timezone?: string;
  location?: string;
  locationDisplayText?: string;
  ownerIds?: string[];
  image?: EventImage;
  displaySettings?: DisplaySettings;
  showHostList?: boolean;
  showGuestList?: boolean;
  showGuestCount?: boolean;
  allowGuestPhotoUpload?: boolean;
  attendedGuestCount?: number;
  guestStatusCounts?: GuestStatusCounts;
  calendarFile?: string;
  guest?: Guest;
}

export interface MyRsvpsData {
  events: PartifulEvent[];
}

export interface User {
  id: string;
  name?: string;
  displayName?: string;
  username?: string;
  profileImageUrl?: string;
}

export interface Mutual {
  id?: string;
  name?: string;
  displayName?: string;
  username?: string;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript types for all Partiful API shapes"
```

---

### Task 3: Config Loading

**Files:**
- Create: `src/config.ts`
- Create: `src/__tests__/config.test.ts`

**Interfaces:**
- Consumes: `PartifulConfig` from `src/types.ts`
- Produces: `loadConfig(): PartifulConfig` — reads env vars first, falls back to `~/.partiful-config.json`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config.js";
import * as fs from "node:fs";

vi.mock("node:fs");

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PARTIFUL_REFRESH_TOKEN;
    delete process.env.PARTIFUL_FIREBASE_API_KEY;
    delete process.env.PARTIFUL_USER_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("loads from environment variables", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    process.env.PARTIFUL_FIREBASE_API_KEY = "env-key";
    process.env.PARTIFUL_USER_ID = "env-uid";

    const config = loadConfig();
    expect(config.refreshToken).toBe("env-refresh");
    expect(config.firebaseApiKey).toBe("env-key");
    expect(config.userId).toBe("env-uid");
  });

  it("falls back to config file when env vars missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        refresh_token: "file-refresh",
        firebase_api_key: "file-key",
        user_id: "file-uid",
      })
    );

    const config = loadConfig();
    expect(config.refreshToken).toBe("file-refresh");
    expect(config.firebaseApiKey).toBe("file-key");
    expect(config.userId).toBe("file-uid");
  });

  it("env vars take priority over config file", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        refresh_token: "file-refresh",
        firebase_api_key: "file-key",
        user_id: "file-uid",
      })
    );

    const config = loadConfig();
    expect(config.refreshToken).toBe("env-refresh");
    expect(config.firebaseApiKey).toBe("file-key");
  });

  it("uses default firebase API key when none provided", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const config = loadConfig();
    expect(config.firebaseApiKey).toBe("AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k");
  });

  it("throws when no refresh token available", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => loadConfig()).toThrow("refresh token");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/config.test.ts
```

Expected: FAIL — `loadConfig` not found

- [ ] **Step 3: Implement config loading**

```typescript
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { PartifulConfig } from "./types.js";

const DEFAULT_FIREBASE_API_KEY = "AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k";
const DEFAULT_CONFIG_PATH = join(homedir(), ".partiful-config.json");

interface ConfigFile {
  auth_token?: string;
  user_id?: string;
  refresh_token?: string;
  firebase_api_key?: string;
}

function readConfigFile(path: string): ConfigFile | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as ConfigFile;
}

export function loadConfig(configPath = DEFAULT_CONFIG_PATH): PartifulConfig {
  const file = readConfigFile(configPath);

  const refreshToken =
    process.env.PARTIFUL_REFRESH_TOKEN ?? file?.refresh_token;
  const firebaseApiKey =
    process.env.PARTIFUL_FIREBASE_API_KEY ??
    file?.firebase_api_key ??
    DEFAULT_FIREBASE_API_KEY;
  const userId = process.env.PARTIFUL_USER_ID ?? file?.user_id;

  if (!refreshToken) {
    throw new Error(
      "Missing Partiful refresh token. Set PARTIFUL_REFRESH_TOKEN env var or add refresh_token to ~/.partiful-config.json. See README for setup instructions."
    );
  }

  return { refreshToken, firebaseApiKey, userId, configFilePath: configPath };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/config.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/__tests__/config.test.ts
git commit -m "feat: add config loading from env vars with config file fallback"
```

---

### Task 4: Auth / Token Refresh

**Files:**
- Create: `src/api/auth.ts`
- Create: `src/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `PartifulConfig`, `TokenSet`, `RefreshResponse` from `src/types.ts`
- Produces: `refreshAccessToken(config: PartifulConfig): Promise<TokenSet>` — calls Firebase token endpoint, returns new access + refresh tokens

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { refreshAccessToken } from "../api/auth.js";

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns new tokens on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id_token: "new-access",
            refresh_token: "new-refresh",
          }),
      })
    );

    const tokens = await refreshAccessToken({
      refreshToken: "old-refresh",
      firebaseApiKey: "test-key",
    });

    expect(tokens.accessToken).toBe("new-access");
    expect(tokens.refreshToken).toBe("new-refresh");
  });

  it("sends correct request with Referer header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id_token: "token",
          refresh_token: "refresh",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await refreshAccessToken({
      refreshToken: "my-refresh",
      firebaseApiKey: "my-key",
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://securetoken.googleapis.com/v1/token?key=my-key"
    );
    expect(options.method).toBe("POST");
    expect(options.headers["Referer"]).toBe("https://partiful.com/");
    expect(options.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(options.body).toBe(
      "grant_type=refresh_token&refresh_token=my-refresh"
    );
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: "TOKEN_EXPIRED" },
          }),
      })
    );

    await expect(
      refreshAccessToken({
        refreshToken: "bad-refresh",
        firebaseApiKey: "key",
      })
    ).rejects.toThrow("TOKEN_EXPIRED");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({}),
      })
    );

    await expect(
      refreshAccessToken({
        refreshToken: "bad",
        firebaseApiKey: "key",
      })
    ).rejects.toThrow("400");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/auth.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement token refresh**

```typescript
import type { PartifulConfig, TokenSet, RefreshResponse } from "../types.js";

const TOKEN_ENDPOINT = "https://securetoken.googleapis.com/v1/token";

function buildRefreshBody(refreshToken: string): string {
  return `grant_type=refresh_token&refresh_token=${refreshToken}`;
}

export async function refreshAccessToken(
  config: Pick<PartifulConfig, "refreshToken" | "firebaseApiKey">
): Promise<TokenSet> {
  const url = `${TOKEN_ENDPOINT}?key=${config.firebaseApiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://partiful.com/",
    },
    body: buildRefreshBody(config.refreshToken),
  });

  if (!response.ok) {
    throw new Error(
      `Token refresh failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RefreshResponse;

  if (data.error) {
    throw new Error(
      `Token refresh failed: ${data.error.message}`
    );
  }

  if (!data.id_token) {
    throw new Error("Token refresh failed: no id_token in response");
  }

  return {
    accessToken: data.id_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/auth.test.ts
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/auth.ts src/__tests__/auth.test.ts
git commit -m "feat: add Firebase token refresh with required Referer header"
```

---

### Task 5: API Client

**Files:**
- Create: `src/api/client.ts`
- Create: `src/__tests__/client.test.ts`

**Interfaces:**
- Consumes: `refreshAccessToken(config)` from `src/api/auth.ts`; `PartifulConfig`, `ApiResponse<T>`, `ApiRequestBody`, `TokenSet` from `src/types.ts`
- Produces: `createApiClient(config: PartifulConfig): ApiClient` where `ApiClient` has method `post<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>`. The client handles auth headers, request envelope, response unwrapping, and auto-refresh on 401/403.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "../api/client.js";

vi.mock("../api/auth.js", () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: "refreshed-token",
    refreshToken: "new-refresh",
  }),
}));

describe("createApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with correct envelope and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          result: { data: { events: [] } },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid-123",
    });
    await client.post("/getMyRsvps", {});

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.partiful.com/getMyRsvps");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer refreshed-token");
    expect(options.headers["Origin"]).toBe("https://partiful.com");
    expect(options.headers["Referer"]).toBe("https://partiful.com/");

    const body = JSON.parse(options.body);
    expect(body.data.userId).toBe("uid-123");
    expect(body.data.params).toEqual({});
  });

  it("unwraps response from result.data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { data: { events: [{ id: "e1" }] } },
          }),
      })
    );

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    const data = await client.post<{ events: Array<{ id: string }> }>(
      "/getMyRsvps"
    );
    expect(data.events).toEqual([{ id: "e1" }]);
  });

  it("retries once on 401 then succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { data: { ok: true } },
          }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    const data = await client.post<{ ok: boolean }>("/test");
    expect(data.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry more than once on 401", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    await expect(client.post("/test")).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("extracts userId from JWT when not provided in config", async () => {
    const payload = Buffer.from(
      JSON.stringify({ user_id: "jwt-uid", sub: "jwt-uid" })
    ).toString("base64url");
    const fakeJwt = `header.${payload}.signature`;

    const { refreshAccessToken } = await import("../api/auth.js");
    vi.mocked(refreshAccessToken).mockResolvedValue({
      accessToken: fakeJwt,
      refreshToken: "new-refresh",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { data: {} } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
    });
    await client.post("/test");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data.userId).toBe("jwt-uid");
  });

  it("throws on non-auth HTTP errors without retrying", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    await expect(client.post("/test")).rejects.toThrow("500");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/client.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the API client**

```typescript
import type { PartifulConfig, ApiRequestBody, ApiResponse } from "../types.js";
import { refreshAccessToken } from "./auth.js";

const BASE_URL = "https://api.partiful.com";

function extractUserId(jwt: string): string {
  const payload = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64url").toString()
  );
  return payload.user_id ?? payload.sub;
}

function buildRequestBody(
  params: Record<string, unknown>,
  userId: string
): string {
  const body: ApiRequestBody = {
    data: { params, userId },
  };
  return JSON.stringify(body);
}

function buildHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://partiful.com",
    Referer: "https://partiful.com/",
  };
}

function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

function unwrapResponse<T>(raw: ApiResponse<T>): T {
  return raw.result.data;
}

export interface ApiClient {
  post<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T>;
}

export function createApiClient(config: PartifulConfig): ApiClient {
  let accessToken: string | null = null;

  async function ensureToken(): Promise<string> {
    if (!accessToken) {
      const tokens = await refreshAccessToken(config);
      accessToken = tokens.accessToken;
      config = { ...config, refreshToken: tokens.refreshToken };
      if (!config.userId) {
        config = { ...config, userId: extractUserId(accessToken) };
      }
    }
    return accessToken;
  }

  async function doPost<T>(
    endpoint: string,
    params: Record<string, unknown>,
    isRetry: boolean
  ): Promise<T> {
    const token = await ensureToken();
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(token),
      body: buildRequestBody(params, config.userId ?? ""),
    });

    if (!response.ok) {
      if (!isRetry && isAuthError(response.status)) {
        accessToken = null;
        const tokens = await refreshAccessToken(config);
        accessToken = tokens.accessToken;
        config = { ...config, refreshToken: tokens.refreshToken };
        return doPost<T>(endpoint, params, true);
      }
      throw new Error(
        `Partiful API error: HTTP ${response.status} ${response.statusText} on ${endpoint}`
      );
    }

    const raw = (await response.json()) as ApiResponse<T>;
    return unwrapResponse(raw);
  }

  return {
    post<T>(
      endpoint: string,
      params: Record<string, unknown> = {}
    ): Promise<T> {
      return doPost<T>(endpoint, params, false);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/client.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/__tests__/client.test.ts
git commit -m "feat: add API client with request envelope, response unwrap, and auto-refresh"
```

---

### Task 6: MCP Tool Handlers

**Files:**
- Create: `src/tools/get-my-events.ts`
- Create: `src/tools/get-event.ts`
- Create: `src/tools/get-hosted-events.ts`
- Create: `src/tools/get-mutuals.ts`
- Create: `src/tools/get-users.ts`
- Create: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient` from `src/api/client.ts`; all event/user/mutual types from `src/types.ts`
- Produces: Each tool file exports `definition: { name, description, inputSchema }` and `handler(client: ApiClient, args: unknown): Promise<object>`. The `ToolDefinition` shape is `{ name: string; description: string; inputSchema: z.ZodType }`.

Note: if endpoint discovery (Task 0) found additional read endpoints, create additional tool files following this same pattern before proceeding to Task 7.

- [ ] **Step 1: Write the tool handler tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { handler as getMyEventsHandler } from "../tools/get-my-events.js";
import { handler as getEventHandler } from "../tools/get-event.js";
import { handler as getHostedEventsHandler } from "../tools/get-hosted-events.js";
import { handler as getMutualsHandler } from "../tools/get-mutuals.js";
import { handler as getUsersHandler } from "../tools/get-users.js";
import type { ApiClient } from "../api/client.js";

function mockClient(data: unknown): ApiClient {
  return {
    post: vi.fn().mockResolvedValue(data),
  };
}

describe("get-my-events", () => {
  it("calls getMyRsvps and returns events", async () => {
    const events = [{ id: "e1", title: "Party" }];
    const client = mockClient({ events });

    const result = await getMyEventsHandler(client, {});
    expect(result).toEqual({ events });
    expect(client.post).toHaveBeenCalledWith("/getMyRsvps", {});
  });
});

describe("get-event", () => {
  it("filters a specific event from getMyRsvps", async () => {
    const events = [
      { id: "e1", title: "Party" },
      { id: "e2", title: "Brunch" },
    ];
    const client = mockClient({ events });

    const result = await getEventHandler(client, { event_id: "e2" });
    expect(result).toEqual({ id: "e2", title: "Brunch" });
  });

  it("throws when event not found", async () => {
    const client = mockClient({ events: [] });
    await expect(
      getEventHandler(client, { event_id: "nope" })
    ).rejects.toThrow("not found");
  });
});

describe("get-hosted-events", () => {
  it("calls getHostedEvents and returns result", async () => {
    const data = { events: [{ id: "h1" }] };
    const client = mockClient(data);

    const result = await getHostedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostedEvents", {});
  });
});

describe("get-mutuals", () => {
  it("calls getMutuals and returns result", async () => {
    const data = { mutuals: [{ name: "Alice" }] };
    const client = mockClient(data);

    const result = await getMutualsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMutuals", {});
  });
});

describe("get-users", () => {
  it("calls getUsers with user IDs", async () => {
    const data = { users: [{ id: "u1", name: "Bob" }] };
    const client = mockClient(data);

    const result = await getUsersHandler(client, {
      user_ids: ["u1"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsers", {
      ids: ["u1"],
      excludePartyStats: false,
      includePartyStats: true,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/tools.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement get-my-events.ts**

```typescript
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData } from "../types.js";

export const definition = {
  name: "get_my_events",
  description:
    "Get all Partiful events you've been invited to or RSVPed to. Returns event details including date, title, location, RSVP status, and guest counts.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<MyRsvpsData> {
  return client.post<MyRsvpsData>("/getMyRsvps", {});
}
```

- [ ] **Step 4: Implement get-event.ts**

```typescript
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData, PartifulEvent } from "../types.js";

export const definition = {
  name: "get_event",
  description:
    "Get full details for a specific Partiful event by ID. Returns the complete event object including title, dates, location, guest counts, RSVP status, and display settings.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<PartifulEvent> {
  const data = await client.post<MyRsvpsData>("/getMyRsvps", {});
  const event = data.events.find((e) => e.id === args.event_id);
  if (!event) {
    throw new Error(
      `Event ${args.event_id} not found in your invites. Check the event ID and make sure you've been invited.`
    );
  }
  return event;
}
```

- [ ] **Step 5: Implement get-hosted-events.ts**

```typescript
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_hosted_events",
  description:
    "Get all Partiful events you're hosting. Returns event details including title, date, location, and guest counts.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getHostedEvents", {});
}
```

- [ ] **Step 6: Implement get-mutuals.ts**

```typescript
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_mutuals",
  description:
    "Get your mutual connections on Partiful — people you've been at the same events with.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMutuals", {});
}
```

- [ ] **Step 7: Implement get-users.ts**

```typescript
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_users",
  description:
    "Fetch Partiful user profiles by their IDs. Returns name, display name, username, and profile image.",
  inputSchema: z.object({
    user_ids: z
      .array(z.string())
      .describe("Array of Partiful user IDs to look up"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { user_ids: string[] }
): Promise<unknown> {
  return client.post("/getUsers", {
    ids: args.user_ids,
    excludePartyStats: false,
    includePartyStats: true,
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/tools.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/tools/ src/__tests__/tools.test.ts
git commit -m "feat: add MCP tool handlers for all read endpoints"
```

---

### Task 7: MCP Server Wiring

**Files:**
- Create: `src/server.ts`
- Modify: `src/index.ts` (replace placeholder with real startup)

**Interfaces:**
- Consumes: `loadConfig()` from `src/config.ts`; `createApiClient(config)` from `src/api/client.ts`; all tool `definition` and `handler` exports from `src/tools/*.ts`
- Produces: a running MCP server on stdio that registers all tools and routes calls to handlers

- [ ] **Step 1: Implement server.ts**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api/client.js";
import { definition as getMyEventsDef, handler as getMyEventsHandler } from "./tools/get-my-events.js";
import { definition as getEventDef, handler as getEventHandler } from "./tools/get-event.js";
import { definition as getHostedEventsDef, handler as getHostedEventsHandler } from "./tools/get-hosted-events.js";
import { definition as getMutualsDef, handler as getMutualsHandler } from "./tools/get-mutuals.js";
import { definition as getUsersDef, handler as getUsersHandler } from "./tools/get-users.js";

function toolResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createServer(client: ApiClient): McpServer {
  const server = new McpServer({
    name: "partiful-mcp",
    version: "0.1.0",
  });

  server.tool(
    getMyEventsDef.name,
    getMyEventsDef.description,
    getMyEventsDef.inputSchema.shape,
    async () => toolResult(await getMyEventsHandler(client, {}))
  );

  server.tool(
    getEventDef.name,
    getEventDef.description,
    getEventDef.inputSchema.shape,
    async (args) => toolResult(await getEventHandler(client, args as { event_id: string }))
  );

  server.tool(
    getHostedEventsDef.name,
    getHostedEventsDef.description,
    getHostedEventsDef.inputSchema.shape,
    async () => toolResult(await getHostedEventsHandler(client, {}))
  );

  server.tool(
    getMutualsDef.name,
    getMutualsDef.description,
    getMutualsDef.inputSchema.shape,
    async () => toolResult(await getMutualsHandler(client, {}))
  );

  server.tool(
    getUsersDef.name,
    getUsersDef.description,
    getUsersDef.inputSchema.shape,
    async (args) => toolResult(await getUsersHandler(client, args as { user_ids: string[] }))
  );

  return server;
}
```

- [ ] **Step 2: Update src/index.ts**

```typescript
#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createApiClient } from "./api/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createApiClient(config);
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start partiful-mcp:", error);
  process.exit(1);
});
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: no errors. The `dist/` directory should contain compiled JS files.

- [ ] **Step 4: Smoke test with MCP inspector (optional)**

If `@modelcontextprotocol/inspector` is available:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a browser UI where you can see the registered tools. Requires valid auth tokens to actually call them.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts src/index.ts
git commit -m "feat: wire up MCP server with stdio transport and all tool handlers"
```

---

### Task 8: README and Publishing Setup

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Modify: `package.json` (add repository, homepage fields)

**Interfaces:**
- Consumes: nothing
- Produces: publishable package with documentation

- [ ] **Step 1: Create LICENSE**

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create README.md**

```markdown
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
```

- [ ] **Step 3: Update package.json with repo info**

Add these fields to `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<username>/partiful-mcp.git"
  },
  "homepage": "https://github.com/<username>/partiful-mcp#readme"
}
```

(Replace `<username>` with the actual GitHub username at publish time.)

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 5: Test npx-style invocation locally**

```bash
npm run build
npm link
partiful-mcp
```

Expected: server starts and waits for MCP messages on stdin (it will hang waiting for input — that's correct for stdio transport). Ctrl+C to exit.

- [ ] **Step 6: Commit**

```bash
git add README.md LICENSE package.json
git commit -m "docs: add README with setup instructions and publish to npm as partiful-mcp"
```

- [ ] **Step 7: Publish to npm**

```bash
npm publish
```

(Requires `npm login` first. If the package name `partiful-mcp` is taken, use a scoped name like `@<username>/partiful-mcp`.)
