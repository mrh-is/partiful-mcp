# Expand MCP Tool Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up MCP tools for every Partiful Cloud Function endpoint discovered in `docs/api-endpoints.md` that isn't already covered, so agents can read event details, host tooling, social data, and explore/discover data — not just the five endpoints currently wired.

**Architecture:** Every endpoint becomes one file under `src/tools/<name>.ts` exporting `definition` (name, description, zod `inputSchema`) and an async `handler(client, args)` that calls `client.post(endpoint, params)` and returns the raw response — identical to the five existing tools in `src/tools/`. Each tool gets a unit test in `src/__tests__/tools.test.ts` (mocking `ApiClient.post`) and a registration block in `src/server.ts`. No new response types are added to `src/types.ts` — like the existing `get-hosted-events` and `get-mutuals` tools, untyped endpoints return `Promise<unknown>` and let the caller (the LLM) interpret the JSON. This keeps the diff mechanical and avoids guessing at response shapes we haven't observed.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod` v4, `vitest`.

## Global Constraints

- Follow the existing file pattern exactly: one file per tool in `src/tools/`, `export const definition = {...}` and `export async function handler(client: ApiClient, args: ...): Promise<unknown> {...}`.
- Tool names are `snake_case` (e.g. `get_guests`), matching existing tools (`get_my_events`, `get_hosted_events`, `get_mutuals`, `get_users`, `get_event`).
- Zero-arg tools use `inputSchema: z.object({})` and `_args: unknown` in the handler signature, exactly like `get-hosted-events.ts` and `get-mutuals.ts`.
- Args-taking tools use a typed args object (e.g. `{ event_id: string }`) and call `definition.inputSchema.parse(args)` in `server.ts` before invoking the handler, exactly like `get-event.ts` / `get-users.ts` do today.
- Every new tool must be registered in `src/server.ts` using the same `server.tool(def.name, def.description, def.inputSchema.shape, async (args) => {...})` block shape already there.
- Do not implement `getEventInfo` (its request shape is unclear per `docs/api-endpoints.md:31`) or any of the "Not yet discovered" write endpoints (RSVP, create/edit event, send invites, upload photos) — out of scope for this plan.
- Run `npm test` and `npm run build` after every task; both must pass before committing.

---

### Task 1: Zero-arg event list tools

**Files:**
- Create: `src/tools/get-my-upcoming-events.ts`
- Create: `src/tools/get-my-past-events.ts`
- Create: `src/tools/get-discoverable-events.ts`
- Create: `src/tools/get-saved-events.ts`
- Create: `src/tools/get-followed-events.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)` from `src/api/client.ts:41-46`.
- Produces: `definition`/`handler` exports for each of the 5 tools above, each following the exact shape of `src/tools/get-hosted-events.ts`.

- [ ] **Step 1: Write failing tests for all 5 tools**

Add to `src/__tests__/tools.test.ts` (append after the existing `describe("get-users", ...)` block):

```ts
import { handler as getMyUpcomingEventsHandler } from "../tools/get-my-upcoming-events.js";
import { handler as getMyPastEventsHandler } from "../tools/get-my-past-events.js";
import { handler as getDiscoverableEventsHandler } from "../tools/get-discoverable-events.js";
import { handler as getSavedEventsHandler } from "../tools/get-saved-events.js";
import { handler as getFollowedEventsHandler } from "../tools/get-followed-events.js";

describe("get-my-upcoming-events", () => {
  it("calls getMyUpcomingEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getMyUpcomingEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyUpcomingEventsForHomePage", {});
  });
});

describe("get-my-past-events", () => {
  it("calls getMyPastEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e2" }] };
    const client = mockClient(data);

    const result = await getMyPastEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyPastEventsForHomePage", {});
  });
});

describe("get-discoverable-events", () => {
  it("calls getDiscoverableEvents and returns result", async () => {
    const data = { events: [{ id: "e3" }] };
    const client = mockClient(data);

    const result = await getDiscoverableEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverableEvents", {});
  });
});

describe("get-saved-events", () => {
  it("calls getMySavedEvents and returns result", async () => {
    const data = { events: [{ id: "e4" }] };
    const client = mockClient(data);

    const result = await getSavedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMySavedEvents", {});
  });
});

describe("get-followed-events", () => {
  it("calls getMyFollowedEvents and returns result", async () => {
    const data = { events: [{ id: "e5" }] };
    const client = mockClient(data);

    const result = await getFollowedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyFollowedEvents", {});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools.test.ts`
Expected: FAIL — `Cannot find module '../tools/get-my-upcoming-events.js'` (and similarly for the other 4).

- [ ] **Step 3: Implement the 5 tool files**

`src/tools/get-my-upcoming-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_upcoming_events",
  description:
    "Get your upcoming Partiful events for the home page (the 'Upcoming' view).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyUpcomingEventsForHomePage", {});
}
```

`src/tools/get-my-past-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_past_events",
  description:
    "Get your past Partiful events for the home page (the 'All past events' tab).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyPastEventsForHomePage", {});
}
```

`src/tools/get-discoverable-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events (the home page 'Open invite' tab).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getDiscoverableEvents", {});
}
```

`src/tools/get-saved-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_saved_events",
  description: "Get your saved/bookmarked Partiful events.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMySavedEvents", {});
}
```

`src/tools/get-followed-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_followed_events",
  description: "Get Partiful events you're following.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyFollowedEvents", {});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tools.test.ts`
Expected: PASS, all 5 new describe blocks green.

- [ ] **Step 5: Register the 5 tools in `src/server.ts`**

Add imports near the top (after the `getUsersDef` import on `src/server.ts:7`):

```ts
import { definition as getMyUpcomingEventsDef, handler as getMyUpcomingEventsHandler } from "./tools/get-my-upcoming-events.js";
import { definition as getMyPastEventsDef, handler as getMyPastEventsHandler } from "./tools/get-my-past-events.js";
import { definition as getDiscoverableEventsDef, handler as getDiscoverableEventsHandler } from "./tools/get-discoverable-events.js";
import { definition as getSavedEventsDef, handler as getSavedEventsHandler } from "./tools/get-saved-events.js";
import { definition as getFollowedEventsDef, handler as getFollowedEventsHandler } from "./tools/get-followed-events.js";
```

Add registration blocks before the final `return server;` in `src/server.ts:83`:

```ts
  server.tool(
    getMyUpcomingEventsDef.name,
    getMyUpcomingEventsDef.description,
    getMyUpcomingEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyUpcomingEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMyPastEventsDef.name,
    getMyPastEventsDef.description,
    getMyPastEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyPastEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getDiscoverableEventsDef.name,
    getDiscoverableEventsDef.description,
    getDiscoverableEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getDiscoverableEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getSavedEventsDef.name,
    getSavedEventsDef.description,
    getSavedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getSavedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getFollowedEventsDef.name,
    getFollowedEventsDef.description,
    getFollowedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getFollowedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-my-upcoming-events.ts src/tools/get-my-past-events.ts src/tools/get-discoverable-events.ts src/tools/get-saved-events.ts src/tools/get-followed-events.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add zero-arg event list tools (upcoming, past, discoverable, saved, followed)"
```

---

### Task 2: eventId-only event detail tools

**Files:**
- Create: `src/tools/get-guests.ts`
- Create: `src/tools/get-event-comments.ts`
- Create: `src/tools/get-event-media.ts`
- Create: `src/tools/get-event-restrictions.ts`
- Create: `src/tools/get-event-permission.ts`
- Create: `src/tools/get-event-host-messages.ts`
- Create: `src/tools/get-event-ticketing-eligibility.ts`
- Create: `src/tools/get-pending-cohost-request.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`; args shape `{ event_id: string }` (matching `src/tools/get-event.ts:9-11`'s `event_id` naming).
- Produces: `definition`/`handler` exports for the 8 tools above.

- [ ] **Step 1: Write failing tests for all 8 tools**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as getGuestsHandler } from "../tools/get-guests.js";
import { handler as getEventCommentsHandler } from "../tools/get-event-comments.js";
import { handler as getEventMediaHandler } from "../tools/get-event-media.js";
import { handler as getEventRestrictionsHandler } from "../tools/get-event-restrictions.js";
import { handler as getEventPermissionHandler } from "../tools/get-event-permission.js";
import { handler as getEventHostMessagesHandler } from "../tools/get-event-host-messages.js";
import { handler as getEventTicketingEligibilityHandler } from "../tools/get-event-ticketing-eligibility.js";
import { handler as getPendingCohostRequestHandler } from "../tools/get-pending-cohost-request.js";

describe("get-guests", () => {
  it("calls getGuests with eventId", async () => {
    const data = { guests: [{ id: "g1" }] };
    const client = mockClient(data);

    const result = await getGuestsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getGuests", { eventId: "e1" });
  });
});

describe("get-event-comments", () => {
  it("calls getEventComments with eventId", async () => {
    const data = { comments: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getEventCommentsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventComments", { eventId: "e1" });
  });
});

describe("get-event-media", () => {
  it("calls getEventMedia with eventId", async () => {
    const data = { media: [{ id: "m1" }] };
    const client = mockClient(data);

    const result = await getEventMediaHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventMedia", { eventId: "e1" });
  });
});

describe("get-event-restrictions", () => {
  it("calls getEventRestrictions with eventId", async () => {
    const data = { minAge: 21 };
    const client = mockClient(data);

    const result = await getEventRestrictionsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventRestrictions", { eventId: "e1" });
  });
});

describe("get-event-permission", () => {
  it("calls getEventPermission with eventId", async () => {
    const data = { canEdit: true };
    const client = mockClient(data);

    const result = await getEventPermissionHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventPermission", { eventId: "e1" });
  });
});

describe("get-event-host-messages", () => {
  it("calls getEventDisplayedHostMessages with eventId", async () => {
    const data = { messages: [] };
    const client = mockClient(data);

    const result = await getEventHostMessagesHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDisplayedHostMessages", { eventId: "e1" });
  });
});

describe("get-event-ticketing-eligibility", () => {
  it("calls getEventTicketingEligibility with eventId", async () => {
    const data = { eligible: false };
    const client = mockClient(data);

    const result = await getEventTicketingEligibilityHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventTicketingEligibility", { eventId: "e1" });
  });
});

describe("get-pending-cohost-request", () => {
  it("calls getPendingCohostRequestForEvent with eventId", async () => {
    const data = { request: null };
    const client = mockClient(data);

    const result = await getPendingCohostRequestHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getPendingCohostRequestForEvent", { eventId: "e1" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools.test.ts`
Expected: FAIL — modules not found for all 8 new tool files.

- [ ] **Step 3: Implement the 8 tool files**

`src/tools/get-guests.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_guests",
  description: "Get the full guest list for a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getGuests", { eventId: args.event_id });
}
```

`src/tools/get-event-comments.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_comments",
  description: "Get comments/discussion posted on a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventComments", { eventId: args.event_id });
}
```

`src/tools/get-event-media.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_media",
  description: "Get photos and media uploaded to a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventMedia", { eventId: args.event_id });
}
```

`src/tools/get-event-restrictions.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_restrictions",
  description: "Get restrictions (age, capacity, etc.) for a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventRestrictions", { eventId: args.event_id });
}
```

`src/tools/get-event-permission.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_permission",
  description: "Get the current user's permissions for a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventPermission", { eventId: args.event_id });
}
```

`src/tools/get-event-host-messages.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_host_messages",
  description: "Get host messages displayed on a Partiful event page.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventDisplayedHostMessages", { eventId: args.event_id });
}
```

`src/tools/get-event-ticketing-eligibility.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_ticketing_eligibility",
  description: "Check whether a Partiful event supports ticketing.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventTicketingEligibility", { eventId: args.event_id });
}
```

`src/tools/get-pending-cohost-request.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_pending_cohost_request",
  description: "Get the pending cohost invitation for a Partiful event, if any.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getPendingCohostRequestForEvent", { eventId: args.event_id });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tools.test.ts`
Expected: PASS, all 8 new describe blocks green.

- [ ] **Step 5: Register the 8 tools in `src/server.ts`**

Add imports:

```ts
import { definition as getGuestsDef, handler as getGuestsHandler } from "./tools/get-guests.js";
import { definition as getEventCommentsDef, handler as getEventCommentsHandler } from "./tools/get-event-comments.js";
import { definition as getEventMediaDef, handler as getEventMediaHandler } from "./tools/get-event-media.js";
import { definition as getEventRestrictionsDef, handler as getEventRestrictionsHandler } from "./tools/get-event-restrictions.js";
import { definition as getEventPermissionDef, handler as getEventPermissionHandler } from "./tools/get-event-permission.js";
import { definition as getEventHostMessagesDef, handler as getEventHostMessagesHandler } from "./tools/get-event-host-messages.js";
import { definition as getEventTicketingEligibilityDef, handler as getEventTicketingEligibilityHandler } from "./tools/get-event-ticketing-eligibility.js";
import { definition as getPendingCohostRequestDef, handler as getPendingCohostRequestHandler } from "./tools/get-pending-cohost-request.js";
```

Add registration blocks before `return server;`, each following the args-taking shape used for `get_event`/`get_users`:

```ts
  server.tool(
    getGuestsDef.name,
    getGuestsDef.description,
    getGuestsDef.inputSchema.shape,
    async (args) => {
      const parsed = getGuestsDef.inputSchema.parse(args);
      try { return toolResult(await getGuestsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventCommentsDef.name,
    getEventCommentsDef.description,
    getEventCommentsDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventCommentsDef.inputSchema.parse(args);
      try { return toolResult(await getEventCommentsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventMediaDef.name,
    getEventMediaDef.description,
    getEventMediaDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventMediaDef.inputSchema.parse(args);
      try { return toolResult(await getEventMediaHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventRestrictionsDef.name,
    getEventRestrictionsDef.description,
    getEventRestrictionsDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventRestrictionsDef.inputSchema.parse(args);
      try { return toolResult(await getEventRestrictionsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventPermissionDef.name,
    getEventPermissionDef.description,
    getEventPermissionDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventPermissionDef.inputSchema.parse(args);
      try { return toolResult(await getEventPermissionHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventHostMessagesDef.name,
    getEventHostMessagesDef.description,
    getEventHostMessagesDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventHostMessagesDef.inputSchema.parse(args);
      try { return toolResult(await getEventHostMessagesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventTicketingEligibilityDef.name,
    getEventTicketingEligibilityDef.description,
    getEventTicketingEligibilityDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventTicketingEligibilityDef.inputSchema.parse(args);
      try { return toolResult(await getEventTicketingEligibilityHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getPendingCohostRequestDef.name,
    getPendingCohostRequestDef.description,
    getPendingCohostRequestDef.inputSchema.shape,
    async (args) => {
      const parsed = getPendingCohostRequestDef.inputSchema.parse(args);
      try { return toolResult(await getPendingCohostRequestHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-guests.ts src/tools/get-event-comments.ts src/tools/get-event-media.ts src/tools/get-event-restrictions.ts src/tools/get-event-permission.ts src/tools/get-event-host-messages.ts src/tools/get-event-ticketing-eligibility.ts src/tools/get-pending-cohost-request.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add eventId-scoped event detail tools (guests, comments, media, restrictions, permission, host messages, ticketing eligibility, cohost request)"
```

---

### Task 3: Host tools with an eventId param

**Files:**
- Create: `src/tools/get-host-promo-codes.ts`
- Create: `src/tools/get-host-ticket-types.ts`
- Create: `src/tools/get-event-discover-status.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`.
- Produces: `definition`/`handler` for the 3 tools above. `get_host_ticket_types` takes an extra `include_disabled` boolean per `docs/api-endpoints.md:46`.

- [ ] **Step 1: Write failing tests**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as getHostPromoCodesHandler } from "../tools/get-host-promo-codes.js";
import { handler as getHostTicketTypesHandler } from "../tools/get-host-ticket-types.js";
import { handler as getEventDiscoverStatusHandler } from "../tools/get-event-discover-status.js";

describe("get-host-promo-codes", () => {
  it("calls getHostPromoCodes with eventId", async () => {
    const data = { codes: [] };
    const client = mockClient(data);

    const result = await getHostPromoCodesHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostPromoCodes", { eventId: "e1" });
  });
});

describe("get-host-ticket-types", () => {
  it("calls getHostTicketTypes with eventId and includeDisabled", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    const result = await getHostTicketTypesHandler(client, {
      event_id: "e1",
      include_disabled: true,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });

  it("defaults includeDisabled to true when omitted", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    await getHostTicketTypesHandler(client, { event_id: "e1" });
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });
});

describe("get-event-discover-status", () => {
  it("calls getEventDiscoverStatus with eventId", async () => {
    const data = { listed: false };
    const client = mockClient(data);

    const result = await getEventDiscoverStatusHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDiscoverStatus", { eventId: "e1" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the 3 tool files**

`src/tools/get-host-promo-codes.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_host_promo_codes",
  description: "Get promo codes for a Partiful event you're hosting.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getHostPromoCodes", { eventId: args.event_id });
}
```

`src/tools/get-host-ticket-types.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_host_ticket_types",
  description: "Get ticket types/tiers for a Partiful event you're hosting.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    include_disabled: z
      .boolean()
      .optional()
      .describe("Include disabled ticket types (defaults to true)"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string; include_disabled?: boolean }
): Promise<unknown> {
  return client.post("/getHostTicketTypes", {
    eventId: args.event_id,
    includeDisabled: args.include_disabled ?? true,
  });
}
```

`src/tools/get-event-discover-status.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_discover_status",
  description: "Check whether a Partiful event is listed on explore/discover.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventDiscoverStatus", { eventId: args.event_id });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tools.test.ts`
Expected: PASS, all new describe blocks green (4 tests total across 3 describes).

- [ ] **Step 5: Register the 3 tools in `src/server.ts`**

Add imports:

```ts
import { definition as getHostPromoCodesDef, handler as getHostPromoCodesHandler } from "./tools/get-host-promo-codes.js";
import { definition as getHostTicketTypesDef, handler as getHostTicketTypesHandler } from "./tools/get-host-ticket-types.js";
import { definition as getEventDiscoverStatusDef, handler as getEventDiscoverStatusHandler } from "./tools/get-event-discover-status.js";
```

Add registration blocks before `return server;`:

```ts
  server.tool(
    getHostPromoCodesDef.name,
    getHostPromoCodesDef.description,
    getHostPromoCodesDef.inputSchema.shape,
    async (args) => {
      const parsed = getHostPromoCodesDef.inputSchema.parse(args);
      try { return toolResult(await getHostPromoCodesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getHostTicketTypesDef.name,
    getHostTicketTypesDef.description,
    getHostTicketTypesDef.inputSchema.shape,
    async (args) => {
      const parsed = getHostTicketTypesDef.inputSchema.parse(args);
      try { return toolResult(await getHostTicketTypesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventDiscoverStatusDef.name,
    getEventDiscoverStatusDef.description,
    getEventDiscoverStatusDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventDiscoverStatusDef.inputSchema.parse(args);
      try { return toolResult(await getEventDiscoverStatusHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-host-promo-codes.ts src/tools/get-host-ticket-types.ts src/tools/get-event-discover-status.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add host tools for promo codes, ticket types, and discover status"
```

---

### Task 4: Host tools with other param shapes

**Files:**
- Create: `src/tools/get-cohost-requested-events.ts`
- Create: `src/tools/get-all-event-restrictions.ts`
- Create: `src/tools/get-invitable-contacts.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`.
- Produces: `definition`/`handler` for the 3 tools above. `get_invitable_contacts` takes `event_id`, `skip`, `limit` per `docs/api-endpoints.md:50`.

- [ ] **Step 1: Write failing tests**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as getCohostRequestedEventsHandler } from "../tools/get-cohost-requested-events.js";
import { handler as getAllEventRestrictionsHandler } from "../tools/get-all-event-restrictions.js";
import { handler as getInvitableContactsHandler } from "../tools/get-invitable-contacts.js";

describe("get-cohost-requested-events", () => {
  it("calls getCohostRequestedEvents and returns result", async () => {
    const data = { events: [] };
    const client = mockClient(data);

    const result = await getCohostRequestedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCohostRequestedEvents", {});
  });
});

describe("get-all-event-restrictions", () => {
  it("calls getAllEventRestrictions and returns result", async () => {
    const data = { restrictions: [] };
    const client = mockClient(data);

    const result = await getAllEventRestrictionsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getAllEventRestrictions", {});
  });
});

describe("get-invitable-contacts", () => {
  it("calls getInvitableContacts with eventId, skip, and limit", async () => {
    const data = { contacts: [] };
    const client = mockClient(data);

    const result = await getInvitableContactsHandler(client, {
      event_id: "e1",
      skip: 0,
      limit: 20,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getInvitableContacts", {
      eventId: "e1",
      skip: 0,
      limit: 20,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the 3 tool files**

`src/tools/get-cohost-requested-events.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_cohost_requested_events",
  description: "Get events where you've been asked to cohost.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getCohostRequestedEvents", {});
}
```

`src/tools/get-all-event-restrictions.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_all_event_restrictions",
  description: "Get restrictions across all of your Partiful events.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getAllEventRestrictions", {});
}
```

`src/tools/get-invitable-contacts.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_invitable_contacts",
  description: "Get contacts that can be invited to a specific Partiful event, paginated.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    skip: z.number().describe("Number of contacts to skip (pagination offset)"),
    limit: z.number().describe("Maximum number of contacts to return"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string; skip: number; limit: number }
): Promise<unknown> {
  return client.post("/getInvitableContacts", {
    eventId: args.event_id,
    skip: args.skip,
    limit: args.limit,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tools.test.ts`
Expected: PASS, all new describe blocks green.

- [ ] **Step 5: Register the 3 tools in `src/server.ts`**

Add imports:

```ts
import { definition as getCohostRequestedEventsDef, handler as getCohostRequestedEventsHandler } from "./tools/get-cohost-requested-events.js";
import { definition as getAllEventRestrictionsDef, handler as getAllEventRestrictionsHandler } from "./tools/get-all-event-restrictions.js";
import { definition as getInvitableContactsDef, handler as getInvitableContactsHandler } from "./tools/get-invitable-contacts.js";
```

Add registration blocks before `return server;`:

```ts
  server.tool(
    getCohostRequestedEventsDef.name,
    getCohostRequestedEventsDef.description,
    getCohostRequestedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getCohostRequestedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getAllEventRestrictionsDef.name,
    getAllEventRestrictionsDef.description,
    getAllEventRestrictionsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getAllEventRestrictionsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getInvitableContactsDef.name,
    getInvitableContactsDef.description,
    getInvitableContactsDef.inputSchema.shape,
    async (args) => {
      const parsed = getInvitableContactsDef.inputSchema.parse(args);
      try { return toolResult(await getInvitableContactsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-cohost-requested-events.ts src/tools/get-all-event-restrictions.ts src/tools/get-invitable-contacts.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add cohost-requested events, all-restrictions, and invitable-contacts tools"
```

---

### Task 5: User/social tools

**Files:**
- Create: `src/tools/get-users-party-stats.ts`
- Create: `src/tools/get-contacts.ts`
- Create: `src/tools/get-my-communities.ts`
- Create: `src/tools/get-created-cards.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`.
- Produces: `definition`/`handler` for the 4 tools above. `get_users_party_stats` takes `user_ids: string[]`, matching the `user_ids` naming already used in `src/tools/get-users.ts:9-11`.

- [ ] **Step 1: Write failing tests**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as getUsersPartyStatsHandler } from "../tools/get-users-party-stats.js";
import { handler as getContactsHandler } from "../tools/get-contacts.js";
import { handler as getMyCommunitiesHandler } from "../tools/get-my-communities.js";
import { handler as getCreatedCardsHandler } from "../tools/get-created-cards.js";

describe("get-users-party-stats", () => {
  it("calls getUsersPartyStats with userIds", async () => {
    const data = { stats: [] };
    const client = mockClient(data);

    const result = await getUsersPartyStatsHandler(client, { user_ids: ["u1", "u2"] });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsersPartyStats", { userIds: ["u1", "u2"] });
  });
});

describe("get-contacts", () => {
  it("calls getContacts and returns result", async () => {
    const data = { contacts: [] };
    const client = mockClient(data);

    const result = await getContactsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getContacts", {});
  });
});

describe("get-my-communities", () => {
  it("calls getMyCommunities and returns result", async () => {
    const data = { communities: [] };
    const client = mockClient(data);

    const result = await getMyCommunitiesHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyCommunities", {});
  });
});

describe("get-created-cards", () => {
  it("calls getCreatedCards and returns result", async () => {
    const data = { cards: [] };
    const client = mockClient(data);

    const result = await getCreatedCardsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCreatedCards", {});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the 4 tool files**

`src/tools/get-users-party-stats.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_users_party_stats",
  description:
    "Get party stats (events attended, hosted) for a batch of Partiful user profiles.",
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { user_ids: string[] }
): Promise<unknown> {
  return client.post("/getUsersPartyStats", { userIds: args.user_ids });
}
```

`src/tools/get-contacts.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_contacts",
  description: "Get your Partiful contact list.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getContacts", {});
}
```

`src/tools/get-my-communities.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_communities",
  description: "Get the Partiful communities you belong to.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyCommunities", {});
}
```

`src/tools/get-created-cards.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_created_cards",
  description: "Get digital cards you've created on Partiful.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getCreatedCards", {});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tools.test.ts`
Expected: PASS, all new describe blocks green.

- [ ] **Step 5: Register the 4 tools in `src/server.ts`**

Add imports:

```ts
import { definition as getUsersPartyStatsDef, handler as getUsersPartyStatsHandler } from "./tools/get-users-party-stats.js";
import { definition as getContactsDef, handler as getContactsHandler } from "./tools/get-contacts.js";
import { definition as getMyCommunitiesDef, handler as getMyCommunitiesHandler } from "./tools/get-my-communities.js";
import { definition as getCreatedCardsDef, handler as getCreatedCardsHandler } from "./tools/get-created-cards.js";
```

Add registration blocks before `return server;`:

```ts
  server.tool(
    getUsersPartyStatsDef.name,
    getUsersPartyStatsDef.description,
    getUsersPartyStatsDef.inputSchema.shape,
    async (args) => {
      const parsed = getUsersPartyStatsDef.inputSchema.parse(args);
      try { return toolResult(await getUsersPartyStatsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getContactsDef.name,
    getContactsDef.description,
    getContactsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getContactsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMyCommunitiesDef.name,
    getMyCommunitiesDef.description,
    getMyCommunitiesDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyCommunitiesHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getCreatedCardsDef.name,
    getCreatedCardsDef.description,
    getCreatedCardsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getCreatedCardsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-users-party-stats.ts src/tools/get-contacts.ts src/tools/get-my-communities.ts src/tools/get-created-cards.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add user/social tools (party stats, contacts, communities, created cards)"
```

---

### Task 6: Explore/discover decorator tool

**Files:**
- Create: `src/tools/get-discover-event-decorators.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`.
- Produces: `definition`/`handler` for `get_discover_event_decorators`, taking `event_ids: string[]` per `docs/api-endpoints.md:67`.

- [ ] **Step 1: Write failing test**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as getDiscoverEventDecoratorsHandler } from "../tools/get-discover-event-decorators.js";

describe("get-discover-event-decorators", () => {
  it("calls getDiscoverEventItemDecorators with eventIds", async () => {
    const data = { decorators: [] };
    const client = mockClient(data);

    const result = await getDiscoverEventDecoratorsHandler(client, {
      event_ids: ["e1", "e2"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverEventItemDecorators", {
      eventIds: ["e1", "e2"],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the tool file**

`src/tools/get-discover-event-decorators.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_discover_event_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.).",
  inputSchema: z.object({
    event_ids: z.array(z.string()).describe("Array of Partiful event IDs"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_ids: string[] }
): Promise<unknown> {
  return client.post("/getDiscoverEventItemDecorators", { eventIds: args.event_ids });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Register the tool in `src/server.ts`**

Add import:

```ts
import { definition as getDiscoverEventDecoratorsDef, handler as getDiscoverEventDecoratorsHandler } from "./tools/get-discover-event-decorators.js";
```

Add registration block before `return server;`:

```ts
  server.tool(
    getDiscoverEventDecoratorsDef.name,
    getDiscoverEventDecoratorsDef.description,
    getDiscoverEventDecoratorsDef.inputSchema.shape,
    async (args) => {
      const parsed = getDiscoverEventDecoratorsDef.inputSchema.parse(args);
      try { return toolResult(await getDiscoverEventDecoratorsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/get-discover-event-decorators.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add explore page decorator tool"
```

---

### Task 7: Write tool — mark notifications read

**Files:**
- Create: `src/tools/mark-notifications-read.ts`
- Modify: `src/server.ts`
- Test: `src/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `ApiClient.post<T>(endpoint, params)`.
- Produces: `definition`/`handler` for `mark_notifications_read`, taking `event_id: string` per `docs/api-endpoints.md:73`. This is the one write endpoint observed; it mutates state, so its description must make that explicit (unlike every other tool in this plan, which is read-only).

- [ ] **Step 1: Write failing test**

Append to `src/__tests__/tools.test.ts`:

```ts
import { handler as markNotificationsReadHandler } from "../tools/mark-notifications-read.js";

describe("mark-notifications-read", () => {
  it("calls markAllNotificationsForEventAsRead with eventId", async () => {
    const data = { success: true };
    const client = mockClient(data);

    const result = await markNotificationsReadHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/markAllNotificationsForEventAsRead", {
      eventId: "e1",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the tool file**

`src/tools/mark-notifications-read.ts`:
```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "mark_notifications_read",
  description:
    "Mark all notifications for a Partiful event as read. This is a write action — it changes state on your account.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/markAllNotificationsForEventAsRead", { eventId: args.event_id });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Register the tool in `src/server.ts`**

Add import:

```ts
import { definition as markNotificationsReadDef, handler as markNotificationsReadHandler } from "./tools/mark-notifications-read.js";
```

Add registration block before `return server;`:

```ts
  server.tool(
    markNotificationsReadDef.name,
    markNotificationsReadDef.description,
    markNotificationsReadDef.inputSchema.shape,
    async (args) => {
      const parsed = markNotificationsReadDef.inputSchema.parse(args);
      try { return toolResult(await markNotificationsReadHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/mark-notifications-read.ts src/server.ts src/__tests__/tools.test.ts
git commit -m "feat: add mark-notifications-read write tool"
```

---

### Task 8: README and full verification pass

**Files:**
- Modify: `README.md`
- No new source files.

**Interfaces:**
- Consumes: nothing new — this is a documentation + verification task confirming Tasks 1–7 compose correctly.

- [ ] **Step 1: Read the current README tool list**

Open `README.md` and find the section listing available MCP tools (mirrors the 5 tools currently in `src/server.ts`).

- [ ] **Step 2: Add the 24 new tools to the README's tool list**

Add one line per tool (name + one-sentence description), grouped under the same headings used in `docs/api-endpoints.md` (Event lists, Event details, Host-specific, Users and social, Explore/discover, Write endpoints), using the `snake_case` tool names defined in Tasks 1–7: `get_my_upcoming_events`, `get_my_past_events`, `get_discoverable_events`, `get_saved_events`, `get_followed_events`, `get_guests`, `get_event_comments`, `get_event_media`, `get_event_restrictions`, `get_event_permission`, `get_event_host_messages`, `get_event_ticketing_eligibility`, `get_pending_cohost_request`, `get_host_promo_codes`, `get_host_ticket_types`, `get_event_discover_status`, `get_cohost_requested_events`, `get_all_event_restrictions`, `get_invitable_contacts`, `get_users_party_stats`, `get_contacts`, `get_my_communities`, `get_created_cards`, `get_discover_event_decorators`, `mark_notifications_read`.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — every describe block from Tasks 1–7 plus the pre-existing tests, 0 failures.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: PASS with no TypeScript errors, `dist/tools/` contains all 24 new compiled tool files.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document all newly added MCP tools in README"
```

---

## Self-Review Notes

- **Spec coverage:** Every endpoint in `docs/api-endpoints.md` is covered except `getEventInfo` (unclear request shape, explicitly out of scope) and the "Not yet discovered" write endpoints (RSVP, create/edit event, invites, photo upload — genuinely not observed, nothing to implement). All 24 discovered-but-unwired endpoints (across Tasks 1–6, plus 1 write endpoint in Task 7) map to a task.
- **Placeholder scan:** Every step has complete, runnable code — no "similar to Task N" shorthand, since tools are implemented out of file-reading order by different agents/sessions.
- **Type consistency:** All new tools return `Promise<unknown>`, matching the existing `get-hosted-events.ts` / `get-mutuals.ts` precedent (not `MyRsvpsData`/`PartifulEvent`, which are only used by the two tools that already have observed, stable shapes). Args field naming (`event_id`, `user_ids`, `event_ids`, `skip`, `limit`, `include_disabled`) is consistent across every task and matches the one existing precedent (`get-users.ts`'s `user_ids`).
