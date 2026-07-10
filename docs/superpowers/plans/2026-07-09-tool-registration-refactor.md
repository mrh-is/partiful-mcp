# Tool Registration Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `server.ts`'s 30 hardcoded tool imports/registrations, the duplicated zod-vs-TypeScript domain shapes, and the copy-pasted per-tool boilerplate with a zod-first shared schema module, a typed `defineTool()` factory, and a runtime auto-discovery loop in `server.ts`.

**Architecture:** `src/schemas.ts` becomes the single source of truth for domain shapes shared by 2+ tools (events, images, guests, users, mutuals) — TypeScript types are `z.infer`'d from these schemas, not hand-written. `src/define-tool.ts` exports a `Tool<TInput, TOutput>` interface and a `defineTool()` identity-function factory that every tool file uses to bundle its `name`/`description`/`inputSchema`/`outputSchema`/`annotations`/`handler` into one typed `default` export. `src/server.ts` drops its 30 imports and registration blocks for a directory scan of the compiled `tools/` folder plus one generic registration loop.

**Tech Stack:** TypeScript (`Node16`/ESM, `strict: true`), zod v4 (`^4.4.3`), `@modelcontextprotocol/sdk` `^1.29.0`, vitest.

## Global Constraints

- Zod v4 is the schema library; TypeScript types are derived via `z.infer`, never hand-written in parallel with a zod schema.
- ESM/Node16 module resolution — every relative import must use a `.js` extension (matching the existing convention across the codebase), even though the source files are `.ts`.
- No behavioral changes to any tool's endpoint, HTTP method, or request/response handling — this is a structural refactor only.
- No tightening or loosening of any `outputSchema`'s validation strictness. Preserve the existing `.passthrough()` on every object schema and `.optional()` on every field that currently has it.
- Auto-discovery in `server.ts` is a runtime directory scan (`readdir` + dynamic `import()` of compiled `.js` files), not a build-time codegen step.
- `Tool<TInput, TOutput>` and `defineTool()` must match the signatures below exactly (approved in `docs/superpowers/specs/2026-07-09-tool-registration-refactor-design.md`):

```ts
export interface Tool<TInput extends z.ZodRawShape, TOutput extends z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<TInput>;
  outputSchema: z.ZodObject<TOutput>;
  annotations: ToolAnnotations;
  handler: (client: ApiClient, args: z.infer<z.ZodObject<TInput>>) => Promise<z.infer<z.ZodObject<TOutput>>>;
}

export function defineTool<TInput extends z.ZodRawShape, TOutput extends z.ZodRawShape>(
  tool: Tool<TInput, TOutput>
): Tool<TInput, TOutput> {
  return tool;
}
```

- **Migration safety net:** every tool file keeps its old `definition`/`handler` named exports as aliases of the new `default` export until Task 7 removes them. This keeps `server.ts` and `src/__tests__/tools.test.ts` compiling and passing throughout Tasks 2–6, so each of those tasks is independently buildable and testable without waiting on the others.

---

## File Structure

- `src/schemas.ts` (new) — shared domain zod schemas + inferred types: `imageSchema`/`EventImage`, `displaySettingsSchema`/`DisplaySettings`, `guestStatusCountsSchema`/`GuestStatusCounts`, `guestSchema`/`Guest`, `eventSchema`/`PartifulEvent`, `myRsvpsDataSchema`/`MyRsvpsData`, `userSchema`/`User`, `mutualSchema`/`Mutual`.
- `src/define-tool.ts` (new) — the `Tool<TInput, TOutput>` interface and `defineTool()` factory.
- `src/types.ts` (modified in Task 7) — shrinks to `PartifulConfig`, `TokenSet`, `RefreshResponse`, `ApiRequestBody`, `ApiResponse<T>`, `RsvpStatus` once nothing references the moved types.
- All 30 `src/tools/*.ts` files (modified in Tasks 2–6) — each gains a `default` export built with `defineTool()`; temporarily keeps `definition`/`handler` aliases.
- `src/server.ts` (rewritten in Task 7) — `createServer()` becomes `async`, drops all per-tool imports/registrations for a directory-scan + generic registration loop.
- `src/index.ts` (modified in Task 7) — `main()` awaits the now-async `createServer()`.
- `src/__tests__/tools.test.ts` (modified in Task 7) — switches every import from the old named `handler` export to the new `default` export's `.handler`.
- `src/__tests__/schemas.test.ts` (new, Task 1) — round-trip validation of the shared schemas.
- `src/__tests__/define-tool.test.ts` (new, Task 1) — confirms `defineTool()` is a typed identity function.
- `src/__tests__/server.test.ts` (new, Task 7) — boots `createServer()` against a mocked `ApiClient` and asserts all 30 tools are registered.

---

### Task 1: `src/schemas.ts` and `src/define-tool.ts`

**Files:**
- Create: `src/schemas.ts`
- Create: `src/define-tool.ts`
- Test: `src/__tests__/schemas.test.ts`
- Test: `src/__tests__/define-tool.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 2–7): from `src/schemas.ts` — `imageSchema`, `displaySettingsSchema`, `guestStatusCountsSchema`, `guestSchema`, `eventSchema`, `myRsvpsDataSchema`, `userSchema`, `mutualSchema`, and their `z.infer` types `EventImage`, `DisplaySettings`, `GuestStatusCounts`, `Guest`, `PartifulEvent`, `MyRsvpsData`, `User`, `Mutual`. From `src/define-tool.ts` — the `Tool<TInput, TOutput>` interface and `defineTool<TInput, TOutput>(tool: Tool<TInput, TOutput>): Tool<TInput, TOutput>` factory.

- [ ] **Step 1: Write the failing test for `schemas.ts`**

Create `src/__tests__/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { eventSchema, userSchema, mutualSchema, guestSchema } from "../schemas.js";

describe("schemas", () => {
  it("eventSchema accepts a minimal event with only id", () => {
    const result = eventSchema.safeParse({ id: "e1" });
    expect(result.success).toBe(true);
  });

  it("eventSchema accepts a fully populated event", () => {
    const result = eventSchema.safeParse({
      id: "e1",
      title: "Party",
      startDate: "2026-07-09T00:00:00Z",
      ownerIds: ["u1"],
      image: { url: "https://example.com/img.png", contentType: "image/png" },
      displaySettings: { effect: "confetti", theme: "dark" },
      guestStatusCounts: { GOING: 3, MAYBE: 1 },
      guest: { id: "g1", eventId: "e1", userId: "u1", status: "GOING" },
    });
    expect(result.success).toBe(true);
  });

  it("eventSchema rejects an event missing id", () => {
    const result = eventSchema.safeParse({ title: "No ID" });
    expect(result.success).toBe(false);
  });

  it("eventSchema passes through unknown fields", () => {
    const result = eventSchema.safeParse({ id: "e1", somethingNew: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).somethingNew).toBe(42);
    }
  });

  it("userSchema and mutualSchema accept minimal objects", () => {
    expect(userSchema.safeParse({}).success).toBe(true);
    expect(mutualSchema.safeParse({}).success).toBe(true);
  });

  it("guestSchema accepts a guest record", () => {
    const result = guestSchema.safeParse({
      id: "g1",
      eventId: "e1",
      userId: "u1",
      status: "GOING",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/schemas.test.ts`
Expected: FAIL — `Cannot find module '../schemas.js'` (or equivalent resolution error), since `src/schemas.ts` doesn't exist yet.

- [ ] **Step 3: Implement `src/schemas.ts`**

Create `src/schemas.ts`:

```ts
import { z } from "zod";

export const imageSchema = z
  .object({
    url: z.string().optional(),
    contentType: z.string().optional(),
    blurHash: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .passthrough();
export type EventImage = z.infer<typeof imageSchema>;

export const displaySettingsSchema = z
  .object({
    effect: z.string().optional(),
    theme: z.string().optional(),
    titleFont: z.string().optional(),
  })
  .passthrough();
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;

export const guestStatusCountsSchema = z
  .object({
    GOING: z.number().optional(),
    MAYBE: z.number().optional(),
    DECLINED: z.number().optional(),
    SENT: z.number().optional(),
    WAITLIST: z.number().optional(),
    INTERESTED: z.number().optional(),
    PENDING_APPROVAL: z.number().optional(),
  })
  .passthrough();
export type GuestStatusCounts = z.infer<typeof guestStatusCountsSchema>;

export const guestSchema = z
  .object({
    id: z.string().optional(),
    eventId: z.string().optional(),
    userId: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();
export type Guest = z.infer<typeof guestSchema>;

export const eventSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
    timezone: z.string().optional(),
    location: z.string().optional(),
    locationDisplayText: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    image: imageSchema.optional(),
    displaySettings: displaySettingsSchema.optional(),
    showHostList: z.boolean().optional(),
    showGuestList: z.boolean().optional(),
    showGuestCount: z.boolean().optional(),
    allowGuestPhotoUpload: z.boolean().optional(),
    attendedGuestCount: z.number().optional(),
    guestStatusCounts: guestStatusCountsSchema.optional(),
    calendarFile: z.string().optional(),
    guest: guestSchema.optional(),
  })
  .passthrough();
export type PartifulEvent = z.infer<typeof eventSchema>;

export const myRsvpsDataSchema = z
  .object({ events: z.array(eventSchema) })
  .passthrough();
export type MyRsvpsData = z.infer<typeof myRsvpsDataSchema>;

export const userSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    profileImageUrl: z.string().optional(),
  })
  .passthrough();
export type User = z.infer<typeof userSchema>;

export const mutualSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
  })
  .passthrough();
export type Mutual = z.infer<typeof mutualSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/schemas.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Write the failing test for `define-tool.ts`**

Create `src/__tests__/define-tool.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { defineTool } from "../define-tool.js";
import type { ApiClient } from "../api/client.js";

describe("defineTool", () => {
  it("returns the same object it was given", () => {
    const inputSchema = z.object({ id: z.string() });
    const outputSchema = z.object({ ok: z.boolean() });
    const handler = async (_client: ApiClient, args: { id: string }) => ({
      ok: args.id.length > 0,
    });

    const tool = defineTool({
      name: "example_tool",
      description: "An example tool for testing defineTool.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema,
      outputSchema,
      handler,
    });

    expect(tool.name).toBe("example_tool");
    expect(tool.inputSchema).toBe(inputSchema);
    expect(tool.outputSchema).toBe(outputSchema);
    expect(tool.handler).toBe(handler);
  });

  it("handler receives parsed args and returns a value matching outputSchema", async () => {
    const tool = defineTool({
      name: "example_tool_2",
      description: "Second example tool.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: z.object({ count: z.number() }),
      outputSchema: z.object({ doubled: z.number() }),
      handler: async (_client, args) => ({ doubled: args.count * 2 }),
    });

    const mockClient: ApiClient = { post: vi.fn() };
    const result = await tool.handler(mockClient, { count: 3 });
    expect(result).toEqual({ doubled: 6 });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/define-tool.test.ts`
Expected: FAIL — `Cannot find module '../define-tool.js'`

- [ ] **Step 7: Implement `src/define-tool.ts`**

Create `src/define-tool.ts`:

```ts
import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api/client.js";

export interface Tool<
  TInput extends z.ZodRawShape,
  TOutput extends z.ZodRawShape,
> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<TInput>;
  outputSchema: z.ZodObject<TOutput>;
  annotations: ToolAnnotations;
  handler: (
    client: ApiClient,
    args: z.infer<z.ZodObject<TInput>>
  ) => Promise<z.infer<z.ZodObject<TOutput>>>;
}

export function defineTool<
  TInput extends z.ZodRawShape,
  TOutput extends z.ZodRawShape,
>(tool: Tool<TInput, TOutput>): Tool<TInput, TOutput> {
  return tool;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/define-tool.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Run the full build to confirm no regressions**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (these two new files aren't consumed by anything yet, so this just confirms they compile standalone).

- [ ] **Step 10: Commit**

```bash
git add src/schemas.ts src/define-tool.ts src/__tests__/schemas.test.ts src/__tests__/define-tool.test.ts
git commit -m "feat: add shared domain schemas and defineTool() factory"
```

---

### Task 2: Migrate event-list tools to `defineTool()` (Group A)

**Files:**
- Modify: `src/tools/get-my-events.ts`, `src/tools/get-event.ts`, `src/tools/get-hosted-events.ts`, `src/tools/get-my-upcoming-events.ts`, `src/tools/get-my-past-events.ts`, `src/tools/get-discoverable-events.ts`

**Interfaces:**
- Consumes: `defineTool` from `../define-tool.js` (Task 1); `eventSchema`, `myRsvpsDataSchema` from `../schemas.js` (Task 1).
- Produces: each file's `export default` `Tool` object, plus temporary `definition`/`handler` aliases consumed by `server.ts`/`tools.test.ts` until Task 7.

- [ ] **Step 1: Migrate `src/tools/get-my-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_my_events",
  description:
    "Get every Partiful event you've been invited to or RSVPed to (any status, any time period), as an `events` array with the richest per-event data available (RSVP status, guest counts, image, display settings). Broader than get_my_upcoming_events/get_my_past_events (which are time-filtered home-page views) and distinct from get_hosted_events (events you host rather than attend) and get_discoverable_events/get_saved_events/get_followed_events (events you haven't necessarily RSVPed to).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyRsvps", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 2: Migrate `src/tools/get-event.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema, myRsvpsDataSchema } from "../schemas.js";

const tool = defineTool({
  name: "get_event",
  description:
    "Get full details for a specific Partiful event by ID. Returns the complete event object: title, dates, location, ownership, host/guest display settings, guest status counts, and the current user's own RSVP (guest) record.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema: eventSchema,
  handler: async (client: ApiClient, args) => {
    const data = await client.post<z.infer<typeof myRsvpsDataSchema>>(
      "/getMyRsvps",
      {}
    );
    const event = data.events.find((e) => e.id === args.event_id);
    if (!event) {
      throw new Error(
        `Event ${args.event_id} not found in your invites. Check the event ID and make sure you've been invited.`
      );
    }
    return event;
  },
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 3: Migrate `src/tools/get-hosted-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_hosted_events",
  description:
    "Get all Partiful events you are hosting (any time period), as an `events` array with title, date, location, and guest counts. Use this instead of get_my_events (which covers events you attend/RSVP to, not necessarily host) or get_my_upcoming_events/get_my_past_events (which are home-page views scoped by time, not by host role).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostedEvents", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 4: Migrate `src/tools/get-my-upcoming-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_my_upcoming_events",
  description:
    "Get your upcoming Partiful events for the home page 'Upcoming' view, as an `events` array. This is the future-only, home-page-curated subset — for the complete unfiltered RSVP/invite history use get_my_events, and for hosted-only events regardless of date use get_hosted_events.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getMyUpcomingEventsForHomePage",
      {}
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 5: Migrate `src/tools/get-my-past-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_my_past_events",
  description:
    "Get your past Partiful events for the home page 'All past events' tab, as an `events` array. This is the past-only counterpart to get_my_upcoming_events — for the complete unfiltered history (past and future) use get_my_events instead.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getMyPastEventsForHomePage",
      {}
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 6: Migrate `src/tools/get-discoverable-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events for the home page 'Open invite' tab, as an `events` array. Unlike get_my_events/get_my_upcoming_events/get_my_past_events/get_hosted_events, these events aren't necessarily ones you've been invited to or RSVPed to — they're publicly discoverable events surfaced to you. Distinct from get_saved_events (events you've explicitly bookmarked) and get_followed_events (events from people/pages you follow).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getDiscoverableEvents", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests still pass (they still import the aliased `handler` named exports, whose behavior is unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/tools/get-my-events.ts src/tools/get-event.ts src/tools/get-hosted-events.ts src/tools/get-my-upcoming-events.ts src/tools/get-my-past-events.ts src/tools/get-discoverable-events.ts
git commit -m "refactor: migrate event-list tools to defineTool() and shared eventSchema"
```

---

### Task 3: Migrate remaining event/user/mutual tools to `defineTool()` (Group B)

**Files:**
- Modify: `src/tools/get-followed-events.ts`, `src/tools/get-saved-events.ts`, `src/tools/get-users.ts`, `src/tools/get-mutuals.ts`, `src/tools/get-users-party-stats.ts`, `src/tools/get-guests.ts`

**Interfaces:**
- Consumes: `defineTool` from `../define-tool.js`; `eventSchema`, `userSchema`, `mutualSchema`, `guestSchema` from `../schemas.js` (all from Task 1).
- Produces: each file's `export default` `Tool` object plus temporary aliases (same contract as Task 2).

- [ ] **Step 1: Migrate `src/tools/get-followed-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_followed_events",
  description:
    "Get Partiful events you're following, as an `events` array. Following tracks events from hosts/pages you follow without necessarily RSVPing, distinct from get_saved_events (explicitly bookmarked events), get_discoverable_events (open invite public events), and get_my_events (events you've been invited to or RSVPed to).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyFollowedEvents", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 2: Migrate `src/tools/get-saved-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_saved_events",
  description:
    "Get your saved/bookmarked Partiful events, as an `events` array. These are events you've explicitly saved for later, distinct from get_discoverable_events (open invite public events), get_followed_events (events from people/pages you follow), and get_my_events (events you've been invited to or RSVPed to).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMySavedEvents", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 3: Migrate `src/tools/get-users.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { userSchema } from "../schemas.js";

const outputSchema = z
  .object({ users: z.array(userSchema).optional() })
  .passthrough();

const tool = defineTool({
  name: "get_users",
  description:
    "Fetch Partiful user profiles by their IDs. Returns per-user name, display name, username, and profile image, with party stats (events attended/hosted) baked into every response. Use get_users_party_stats instead if you only need attended/hosted event counts, not full profile info.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    user_ids: z
      .array(z.string())
      .describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getUsers", {
      ids: args.user_ids,
      excludePartyStats: false,
      includePartyStats: true,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 4: Migrate `src/tools/get-mutuals.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { mutualSchema } from "../schemas.js";

const outputSchema = z
  .object({ mutuals: z.array(mutualSchema).optional() })
  .passthrough();

const tool = defineTool({
  name: "get_mutuals",
  description:
    "Get your mutual connections on Partiful — people you've been at the same events with. Returns an array of user profiles (id, name, display name, username).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMutuals", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 5: Migrate `src/tools/get-users-party-stats.ts`**

This tool's `stats` shape (`userId`/`attendedCount`/`hostedCount`) is single-use — it doesn't match `userSchema` or `mutualSchema` — so it stays inline per the design's "tool-specific one-off shapes stay inline" rule.

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    stats: z
      .array(
        z
          .object({
            userId: z.string().optional(),
            attendedCount: z.number().optional(),
            hostedCount: z.number().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_users_party_stats",
  description:
    "Get just the party stats (events attended count, events hosted count) for a batch of Partiful user IDs — lighter weight than get_users, which returns full profile info (name, username, profile image) with party stats always baked in as well.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getUsersPartyStats", {
      userIds: args.user_ids,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 6: Migrate `src/tools/get-guests.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { guestSchema } from "../schemas.js";

const outputSchema = z
  .object({ guests: z.array(guestSchema).optional() })
  .passthrough();

const tool = defineTool({
  name: "get_guests",
  description:
    "Get the full guest list for a Partiful event by ID. Returns an array of guest RSVP records (guest/event/user IDs and RSVP status) for every invitee.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getGuests", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/tools/get-followed-events.ts src/tools/get-saved-events.ts src/tools/get-users.ts src/tools/get-mutuals.ts src/tools/get-users-party-stats.ts src/tools/get-guests.ts
git commit -m "refactor: migrate remaining event/user/mutual tools to defineTool()"
```

---

### Task 4: Migrate single-event-detail tools to `defineTool()` (Group C)

**Files:**
- Modify: `src/tools/get-event-comments.ts`, `src/tools/get-event-discover-status.ts`, `src/tools/get-event-host-messages.ts`, `src/tools/get-event-media.ts`, `src/tools/get-event-permission.ts`, `src/tools/get-event-restrictions.ts`

**Interfaces:**
- Consumes: `defineTool` from `../define-tool.js` (Task 1). None of these six tools share a schema with another tool file, so no imports from `../schemas.js`.
- Produces: each file's `export default` `Tool` object plus temporary aliases (same contract as Task 2).

- [ ] **Step 1: Migrate `src/tools/get-event-comments.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    comments: z
      .array(
        z
          .object({
            id: z.string().optional(),
            eventId: z.string().optional(),
            userId: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_comments",
  description:
    "Get comments/discussion posted on a Partiful event by ID. Returns an array of comment objects (author, text, timestamp) for that event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventComments", {
      eventId: args.event_id,
    }),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 2: Migrate `src/tools/get-event-discover-status.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    discoverable: z.boolean().optional(),
    status: z.string().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_discover_status",
  description:
    "Check whether a Partiful event is listed on explore/discover. Returns the event's discoverability flag/status.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getEventDiscoverStatus", {
      eventId: args.event_id,
    });
    // The real response shape isn't documented; the outputSchema is a best-effort
    // guess. Guard against a non-object (or missing) response so a mismatched
    // shape doesn't throw an MCP protocol error at the SDK's output-validation step.
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 3: Migrate `src/tools/get-event-host-messages.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            id: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_host_messages",
  description:
    "Get the host messages displayed on a Partiful event's page by ID. Returns an array of host announcement/message objects for that event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getEventDisplayedHostMessages",
      { eventId: args.event_id }
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 4: Migrate `src/tools/get-event-media.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    media: z
      .array(
        z
          .object({
            id: z.string().optional(),
            url: z.string().optional(),
            contentType: z.string().optional(),
            uploaderId: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_media",
  description:
    "Get photos and media uploaded to a Partiful event by ID. Returns an array of media items (URL, content type, uploader) shared to that event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventMedia", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 5: Migrate `src/tools/get-event-permission.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    role: z.string().optional(),
    canEdit: z.boolean().optional(),
    canInvite: z.boolean().optional(),
    canManageGuests: z.boolean().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_permission",
  description:
    "Get the current authenticated user's permission level and capability flags (e.g. edit, invite, manage guests) for a Partiful event by ID.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventPermission", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 6: Migrate `src/tools/get-event-restrictions.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    minAge: z.number().optional(),
    maxCapacity: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_restrictions",
  description:
    "Get the restrictions (e.g. minimum age, capacity, approval requirements) configured for a Partiful event by ID.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventRestrictions", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/tools/get-event-comments.ts src/tools/get-event-discover-status.ts src/tools/get-event-host-messages.ts src/tools/get-event-media.ts src/tools/get-event-permission.ts src/tools/get-event-restrictions.ts
git commit -m "refactor: migrate single-event-detail tools to defineTool()"
```

---

### Task 5: Migrate host/ticketing/cohost tools to `defineTool()` (Group D)

**Files:**
- Modify: `src/tools/get-event-ticketing-eligibility.ts`, `src/tools/get-host-promo-codes.ts`, `src/tools/get-host-ticket-types.ts`, `src/tools/get-pending-cohost-request.ts`, `src/tools/get-invitable-contacts.ts`, `src/tools/get-discover-event-decorators.ts`

**Interfaces:**
- Consumes: `defineTool` from `../define-tool.js` (Task 1). None of these six tools share a schema with another tool file, so no imports from `../schemas.js`.
- Produces: each file's `export default` `Tool` object plus temporary aliases (same contract as Task 2).

- [ ] **Step 1: Migrate `src/tools/get-event-ticketing-eligibility.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    eligible: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_ticketing_eligibility",
  description:
    "Check whether a Partiful event by ID is eligible for ticketing. Returns an eligibility boolean and, if ineligible, the reason.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>(
      "/getEventTicketingEligibility",
      { eventId: args.event_id }
    );
    // The real response shape isn't documented; the outputSchema is a best-effort
    // guess. Guard against a non-object (or missing) response so a mismatched
    // shape doesn't throw an MCP protocol error at the SDK's output-validation step.
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 2: Migrate `src/tools/get-host-promo-codes.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    promoCodes: z
      .array(
        z
          .object({
            id: z.string().optional(),
            code: z.string().optional(),
            discount: z.number().optional(),
            maxUses: z.number().optional(),
            usedCount: z.number().optional(),
            disabled: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_host_promo_codes",
  description:
    "Get promo codes for a Partiful event you're hosting. Returns a list of promo code objects (code, discount, usage limits) for the event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostPromoCodes", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 3: Migrate `src/tools/get-host-ticket-types.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    ticketTypes: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            price: z.number().optional(),
            currency: z.string().optional(),
            quantity: z.number().optional(),
            disabled: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_host_ticket_types",
  description:
    "Get ticket types/tiers for a Partiful event you're hosting. Returns a list of ticket type objects (name, price, quantity, enabled/disabled state).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    include_disabled: z
      .boolean()
      .optional()
      .describe("Include disabled ticket types (defaults to true)"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostTicketTypes", {
      eventId: args.event_id,
      includeDisabled: args.include_disabled ?? true,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 4: Migrate `src/tools/get-pending-cohost-request.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    id: z.string().optional(),
    eventId: z.string().optional(),
    inviterId: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_pending_cohost_request",
  description:
    "Get the pending cohost invitation for a Partiful event by ID, if the current user has one outstanding. Returns the invitation record's fields (id, event, inviter, status), or an empty object if none is pending.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getPendingCohostRequestForEvent",
      { eventId: args.event_id }
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 5: Migrate `src/tools/get-invitable-contacts.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    contacts: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            phoneNumber: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
    hasMore: z.boolean().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_invitable_contacts",
  description:
    "Get contacts that can be invited to a specific Partiful event. Returns a page of contact objects. Paginate by starting with skip=0, then repeatedly increase skip by the number of contacts already fetched (or by limit) until a response returns fewer than `limit` contacts (or hasMore is false), indicating the last page.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    skip: z.number().describe("Number of contacts to skip (pagination offset)"),
    limit: z.number().describe("Maximum number of contacts to return"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getInvitableContacts", {
      eventId: args.event_id,
      skip: args.skip,
      limit: args.limit,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 6: Migrate `src/tools/get-discover-event-decorators.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    decorators: z
      .array(
        z
          .object({
            eventId: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_discover_event_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.). Returns an array of per-event decorator objects keyed by event ID.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_ids: z.array(z.string()).describe("Array of Partiful event IDs"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getDiscoverEventItemDecorators",
      { eventIds: args.event_ids }
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/tools/get-event-ticketing-eligibility.ts src/tools/get-host-promo-codes.ts src/tools/get-host-ticket-types.ts src/tools/get-pending-cohost-request.ts src/tools/get-invitable-contacts.ts src/tools/get-discover-event-decorators.ts
git commit -m "refactor: migrate host/ticketing/cohost tools to defineTool()"
```

---

### Task 6: Migrate remaining misc tools to `defineTool()` (Group E)

**Files:**
- Modify: `src/tools/get-all-event-restrictions.ts`, `src/tools/get-cohost-requested-events.ts`, `src/tools/get-contacts.ts`, `src/tools/get-created-cards.ts`, `src/tools/get-my-communities.ts`, `src/tools/mark-notifications-read.ts`

**Interfaces:**
- Consumes: `defineTool` from `../define-tool.js` (Task 1). None of these six tools share a schema with another tool file, so no imports from `../schemas.js`.
- Produces: each file's `export default` `Tool` object plus temporary aliases (same contract as Task 2). This is the last tool-migration task — after this task, all 30 tool files have a `default` `Tool` export, which Task 7 depends on.

- [ ] **Step 1: Migrate `src/tools/get-all-event-restrictions.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    restrictions: z
      .array(
        z
          .object({
            eventId: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_all_event_restrictions",
  description:
    "Get restrictions across all of your Partiful events. Returns a list of per-event restriction records.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getAllEventRestrictions", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 2: Migrate `src/tools/get-cohost-requested-events.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    events: z
      .array(
        z
          .object({
            id: z.string().optional(),
            title: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_cohost_requested_events",
  description:
    "Get events where you've been asked to cohost. Returns a list of event objects awaiting your cohost response.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getCohostRequestedEvents",
      {}
    ),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 3: Migrate `src/tools/get-contacts.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    contacts: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            displayName: z.string().optional(),
            username: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_contacts",
  description:
    "Get your Partiful contact list. Returns an array of contact user profiles (id, name, display name, username).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getContacts", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 4: Migrate `src/tools/get-created-cards.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    cards: z
      .array(
        z
          .object({
            id: z.string().optional(),
            title: z.string().optional(),
            imageUrl: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_created_cards",
  description:
    "Get digital cards you've created on Partiful. Returns an array of card objects (id, title, image).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getCreatedCards", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 5: Migrate `src/tools/get-my-communities.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    communities: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_my_communities",
  description:
    "Get the Partiful communities you belong to. Returns an array of community objects (id, name).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyCommunities", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 6: Migrate `src/tools/mark-notifications-read.ts`**

Replace the full file contents with:

```ts
import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.object({}).passthrough();

const tool = defineTool({
  name: "mark_notifications_read",
  description:
    "Mark all notifications for a Partiful event as read. This is a write action — it changes state on your account. Only call this when the user's intent is clearly to mark notifications read; do not call it speculatively to 'check' notification state.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>(
      "/markAllNotificationsForEventAsRead",
      { eventId: args.event_id }
    );
    // This endpoint may return null/no body on success (a bare ack). The SDK's
    // registerTool() requires `result.structuredContent` to be truthy whenever
    // an outputSchema is registered (see McpServer's tool-call handler), and
    // will throw "has an output schema but no structured content was provided"
    // before schema validation even runs if we pass through null/undefined
    // here. Normalize to `{}` — which satisfies both the truthiness check and
    // this schema's z.object({}).passthrough() — so a genuinely empty ack
    // doesn't hard-fail the tool call.
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
```

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/tools/get-all-event-restrictions.ts src/tools/get-cohost-requested-events.ts src/tools/get-contacts.ts src/tools/get-created-cards.ts src/tools/get-my-communities.ts src/tools/mark-notifications-read.ts
git commit -m "refactor: migrate remaining misc tools to defineTool()"
```

---

### Task 7: Auto-discovery in `server.ts`, update `index.ts` and tests, remove migration aliases

**Files:**
- Modify: `src/server.ts` (full rewrite)
- Modify: `src/index.ts`
- Modify: `src/__tests__/tools.test.ts`
- Modify: `src/types.ts`
- Modify: all 30 `src/tools/*.ts` files (delete the two-line `definition`/`handler` alias block from each)
- Test: `src/__tests__/server.test.ts` (new)

**Interfaces:**
- Consumes: every tool file's `default` `Tool` export (from Tasks 2–6); `Tool<TInput, TOutput>` type from `../define-tool.js` (Task 1).
- Produces: `createServer(client: ApiClient): Promise<McpServer>` (was synchronous — this is the one breaking signature change, contained entirely to `server.ts` and its single caller in `index.ts`).

- [ ] **Step 1: Remove the temporary alias exports from all 30 tool files**

For each of the 30 files in `src/tools/`, delete the trailing two lines:

```ts
export const definition = tool;
export const handler = tool.handler;
```

(and the comment above them, where present: `// Temporary aliases: ...` through `... to the default export.`), leaving each file ending in `export default tool;`.

Run this to do it mechanically across every file at once:

```bash
for f in src/tools/*.ts; do
  perl -0pi -e 's/\n(\/\/ Temporary aliases:.*?\n)?export const definition = tool;\nexport const handler = tool\.handler;\n//s' "$f"
done
```

Verify no file still references the removed names:

```bash
grep -rn "export const definition\|export const handler" src/tools/
```

Expected: no output.

- [ ] **Step 2: Rewrite `src/server.ts`**

Replace the full file contents with:

```ts
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { ApiClient } from "./api/client.js";
import type { Tool } from "./define-tool.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function toolResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

function toolError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

const SERVER_INSTRUCTIONS = `Seven tools return different event lists; pick by user intent:
- RSVPed/invited (richest data) -> get_my_events
- Hosting -> get_hosted_events
- Coming up/this weekend -> get_my_upcoming_events
- Already attended -> get_my_past_events
- Open to join/discover -> get_discoverable_events
- Bookmarked/saved -> get_saved_events
- Following -> get_followed_events
get_my_events is broadest and most detail-rich; use the others only when
phrasing matches that specific tab.

get_users vs get_users_party_stats: both take user IDs. Prefer get_users
(full profile + party stats) unless you specifically want to skip profile
data, in which case use get_users_party_stats (counts only).

mark_notifications_read is the ONLY tool that mutates state. Every other
tool is a pure read. Call it only when intent is clearly to mark
notifications read — never speculatively.`;

// Type-only import of z.ZodRawShape keeps this file free of an explicit
// generic parameter list here; each tool module supplies its own via `Tool`.
type AnyTool = Tool<z.ZodRawShape, z.ZodRawShape>;

function isTool(value: unknown): value is AnyTool {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.inputSchema === "object" &&
    typeof candidate.outputSchema === "object" &&
    typeof candidate.annotations === "object" &&
    typeof candidate.handler === "function"
  );
}

async function discoverTools(): Promise<AnyTool[]> {
  const toolsDir = join(dirname(fileURLToPath(import.meta.url)), "tools");
  const entries = await readdir(toolsDir);
  const files = entries.filter((entry) => entry.endsWith(".js"));

  const tools: AnyTool[] = [];
  for (const file of files) {
    const modulePath = join(toolsDir, file);
    const module = await import(`file://${modulePath}`);
    const candidate = module.default;
    if (!isTool(candidate)) {
      throw new Error(
        `Tool module ${file} does not export a valid Tool as its default export.`
      );
    }
    tools.push(candidate);
  }
  return tools;
}

export async function createServer(client: ApiClient): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "partiful-mcp",
      version: "2026.7.0",
    },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const tools = await discoverTools();

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
        outputSchema: tool.outputSchema.shape,
        annotations: tool.annotations,
      },
      async (rawArgs: unknown) => {
        const parsed = tool.inputSchema.parse(rawArgs ?? {});
        try {
          return toolResult(await tool.handler(client, parsed));
        } catch (err) {
          return toolError(err);
        }
      }
    );
  }

  return server;
}
```

- [ ] **Step 3: Update `src/index.ts`**

Replace the full file contents with:

```ts
#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createApiClient } from "./api/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createApiClient(config);
  const server = await createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start partiful-mcp:", error);
  process.exit(1);
});
```

- [ ] **Step 4: Shrink `src/types.ts`**

Replace the full file contents with:

```ts
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
```

- [ ] **Step 5: Update `src/__tests__/tools.test.ts` to import default exports**

Replace the full file contents with (identical assertions to the current file — every `import { handler as XHandler } from ...` becomes `import XTool from ...` and every call site `XHandler(...)` becomes `XTool.handler(...)`):

```ts
import { describe, it, expect, vi } from "vitest";
import getMyEventsTool from "../tools/get-my-events.js";
import getEventTool from "../tools/get-event.js";
import getHostedEventsTool from "../tools/get-hosted-events.js";
import getMutualsTool from "../tools/get-mutuals.js";
import getUsersTool from "../tools/get-users.js";
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

    const result = await getMyEventsTool.handler(client, {});
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

    const result = await getEventTool.handler(client, { event_id: "e2" });
    expect(result).toEqual({ id: "e2", title: "Brunch" });
  });

  it("throws when event not found", async () => {
    const client = mockClient({ events: [] });
    await expect(
      getEventTool.handler(client, { event_id: "nope" })
    ).rejects.toThrow("not found");
  });
});

describe("get-hosted-events", () => {
  it("calls getHostedEvents and returns result", async () => {
    const data = { events: [{ id: "h1" }] };
    const client = mockClient(data);

    const result = await getHostedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostedEvents", {});
  });
});

describe("get-mutuals", () => {
  it("calls getMutuals and returns result", async () => {
    const data = { mutuals: [{ name: "Alice" }] };
    const client = mockClient(data);

    const result = await getMutualsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMutuals", {});
  });
});

describe("get-users", () => {
  it("calls getUsers with user IDs", async () => {
    const data = { users: [{ id: "u1", name: "Bob" }] };
    const client = mockClient(data);

    const result = await getUsersTool.handler(client, {
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

import getMyUpcomingEventsTool from "../tools/get-my-upcoming-events.js";
import getMyPastEventsTool from "../tools/get-my-past-events.js";
import getDiscoverableEventsTool from "../tools/get-discoverable-events.js";
import getSavedEventsTool from "../tools/get-saved-events.js";
import getFollowedEventsTool from "../tools/get-followed-events.js";

describe("get-my-upcoming-events", () => {
  it("calls getMyUpcomingEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getMyUpcomingEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyUpcomingEventsForHomePage", {});
  });
});

describe("get-my-past-events", () => {
  it("calls getMyPastEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getMyPastEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyPastEventsForHomePage", {});
  });
});

describe("get-discoverable-events", () => {
  it("calls getDiscoverableEvents and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getDiscoverableEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverableEvents", {});
  });
});

describe("get-saved-events", () => {
  it("calls getMySavedEvents and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getSavedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMySavedEvents", {});
  });
});

describe("get-followed-events", () => {
  it("calls getMyFollowedEvents and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getFollowedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyFollowedEvents", {});
  });
});

import getGuestsTool from "../tools/get-guests.js";
import getEventCommentsTool from "../tools/get-event-comments.js";
import getEventMediaTool from "../tools/get-event-media.js";
import getEventRestrictionsTool from "../tools/get-event-restrictions.js";
import getEventPermissionTool from "../tools/get-event-permission.js";
import getEventHostMessagesTool from "../tools/get-event-host-messages.js";
import getEventTicketingEligibilityTool from "../tools/get-event-ticketing-eligibility.js";
import getPendingCohostRequestTool from "../tools/get-pending-cohost-request.js";

describe("get-guests", () => {
  it("calls getGuests with event_id", async () => {
    const data = { guests: [{ id: "g1" }] };
    const client = mockClient(data);

    const result = await getGuestsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getGuests", { eventId: "e1" });
  });
});

describe("get-event-comments", () => {
  it("calls getEventComments with event_id", async () => {
    const data = { comments: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getEventCommentsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventComments", { eventId: "e1" });
  });
});

describe("get-event-media", () => {
  it("calls getEventMedia with event_id", async () => {
    const data = { media: [{ id: "m1" }] };
    const client = mockClient(data);

    const result = await getEventMediaTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventMedia", { eventId: "e1" });
  });
});

describe("get-event-restrictions", () => {
  it("calls getEventRestrictions with event_id", async () => {
    const data = { minAge: 21 };
    const client = mockClient(data);

    const result = await getEventRestrictionsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventRestrictions", { eventId: "e1" });
  });
});

describe("get-event-permission", () => {
  it("calls getEventPermission with event_id", async () => {
    const data = { role: "host" };
    const client = mockClient(data);

    const result = await getEventPermissionTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventPermission", { eventId: "e1" });
  });
});

describe("get-event-host-messages", () => {
  it("calls getEventDisplayedHostMessages with event_id", async () => {
    const data = { messages: [{ id: "m1" }] };
    const client = mockClient(data);

    const result = await getEventHostMessagesTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDisplayedHostMessages", { eventId: "e1" });
  });
});

describe("get-event-ticketing-eligibility", () => {
  it("calls getEventTicketingEligibility with event_id", async () => {
    const data = { eligible: true };
    const client = mockClient(data);

    const result = await getEventTicketingEligibilityTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventTicketingEligibility", { eventId: "e1" });
  });

  it("normalizes a null response to an empty object", async () => {
    const client = mockClient(null);

    const result = await getEventTicketingEligibilityTool.handler(client, { event_id: "e1" });
    expect(result).toEqual({});
  });
});

describe("get-pending-cohost-request", () => {
  it("calls getPendingCohostRequestForEvent with event_id", async () => {
    const data = { id: "req1" };
    const client = mockClient(data);

    const result = await getPendingCohostRequestTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getPendingCohostRequestForEvent", { eventId: "e1" });
  });
});

import getHostPromoCodesTool from "../tools/get-host-promo-codes.js";
import getHostTicketTypesTool from "../tools/get-host-ticket-types.js";
import getEventDiscoverStatusTool from "../tools/get-event-discover-status.js";

describe("get-host-promo-codes", () => {
  it("calls getHostPromoCodes with event_id", async () => {
    const data = { promoCodes: [{ id: "p1" }] };
    const client = mockClient(data);

    const result = await getHostPromoCodesTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostPromoCodes", { eventId: "e1" });
  });
});

describe("get-host-ticket-types", () => {
  it("calls getHostTicketTypes with include_disabled defaulting to true", async () => {
    const data = { ticketTypes: [{ id: "t1" }] };
    const client = mockClient(data);

    const result = await getHostTicketTypesTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });

  it("respects an explicit include_disabled value", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    await getHostTicketTypesTool.handler(client, {
      event_id: "e1",
      include_disabled: false,
    });
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: false,
    });
  });
});

describe("get-event-discover-status", () => {
  it("calls getEventDiscoverStatus with event_id", async () => {
    const data = { discoverable: true };
    const client = mockClient(data);

    const result = await getEventDiscoverStatusTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDiscoverStatus", { eventId: "e1" });
  });

  it("normalizes a null response to an empty object", async () => {
    const client = mockClient(null);

    const result = await getEventDiscoverStatusTool.handler(client, { event_id: "e1" });
    expect(result).toEqual({});
  });
});

import getCohostRequestedEventsTool from "../tools/get-cohost-requested-events.js";
import getAllEventRestrictionsTool from "../tools/get-all-event-restrictions.js";
import getInvitableContactsTool from "../tools/get-invitable-contacts.js";

describe("get-cohost-requested-events", () => {
  it("calls getCohostRequestedEvents and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getCohostRequestedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCohostRequestedEvents", {});
  });
});

describe("get-all-event-restrictions", () => {
  it("calls getAllEventRestrictions and returns result", async () => {
    const data = { restrictions: [{ eventId: "e1" }] };
    const client = mockClient(data);

    const result = await getAllEventRestrictionsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getAllEventRestrictions", {});
  });
});

describe("get-invitable-contacts", () => {
  it("calls getInvitableContacts with pagination args", async () => {
    const data = { contacts: [{ id: "c1" }], hasMore: false };
    const client = mockClient(data);

    const result = await getInvitableContactsTool.handler(client, {
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

import getUsersPartyStatsTool from "../tools/get-users-party-stats.js";
import getContactsTool from "../tools/get-contacts.js";
import getMyCommunitiesTool from "../tools/get-my-communities.js";
import getCreatedCardsTool from "../tools/get-created-cards.js";

describe("get-users-party-stats", () => {
  it("calls getUsersPartyStats with user_ids", async () => {
    const data = { stats: [{ userId: "u1", attendedCount: 3 }] };
    const client = mockClient(data);

    const result = await getUsersPartyStatsTool.handler(client, {
      user_ids: ["u1"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsersPartyStats", {
      userIds: ["u1"],
    });
  });
});

describe("get-contacts", () => {
  it("calls getContacts and returns result", async () => {
    const data = { contacts: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getContactsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getContacts", {});
  });
});

describe("get-my-communities", () => {
  it("calls getMyCommunities and returns result", async () => {
    const data = { communities: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getMyCommunitiesTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyCommunities", {});
  });
});

describe("get-created-cards", () => {
  it("calls getCreatedCards and returns result", async () => {
    const data = { cards: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getCreatedCardsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCreatedCards", {});
  });
});

import getDiscoverEventDecoratorsTool from "../tools/get-discover-event-decorators.js";

describe("get-discover-event-decorators", () => {
  it("calls getDiscoverEventItemDecorators with event_ids", async () => {
    const data = { decorators: [{ eventId: "e1" }] };
    const client = mockClient(data);

    const result = await getDiscoverEventDecoratorsTool.handler(client, {
      event_ids: ["e1"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverEventItemDecorators", {
      eventIds: ["e1"],
    });
  });
});

import markNotificationsReadTool from "../tools/mark-notifications-read.js";

describe("mark-notifications-read", () => {
  it("calls markAllNotificationsForEventAsRead with event_id", async () => {
    const client = mockClient({});

    const result = await markNotificationsReadTool.handler(client, { event_id: "e1" });
    expect(result).toEqual({});
    expect(client.post).toHaveBeenCalledWith(
      "/markAllNotificationsForEventAsRead",
      { eventId: "e1" }
    );
  });

  it("normalizes a null response to an empty object", async () => {
    const client = mockClient(null);

    const result = await markNotificationsReadTool.handler(client, { event_id: "e1" });
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 6: Run the build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors. This is the step that actually proves the alias removal (Step 1) and default-export switch (Step 5) are consistent across all 30 files — if any file still referenced a removed name, this fails.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all tests in `tools.test.ts` pass against the new default-export imports.

- [ ] **Step 8: Write the failing test for server auto-discovery**

Create `src/__tests__/server.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createServer } from "../server.js";
import type { ApiClient } from "../api/client.js";

const EXPECTED_TOOL_NAMES = [
  "get_all_event_restrictions",
  "get_cohost_requested_events",
  "get_contacts",
  "get_created_cards",
  "get_discover_event_decorators",
  "get_discoverable_events",
  "get_event_comments",
  "get_event_discover_status",
  "get_event_host_messages",
  "get_event_media",
  "get_event_permission",
  "get_event_restrictions",
  "get_event_ticketing_eligibility",
  "get_event",
  "get_followed_events",
  "get_guests",
  "get_host_promo_codes",
  "get_host_ticket_types",
  "get_hosted_events",
  "get_invitable_contacts",
  "get_mutuals",
  "get_my_communities",
  "get_my_events",
  "get_my_past_events",
  "get_my_upcoming_events",
  "get_pending_cohost_request",
  "get_saved_events",
  "get_users_party_stats",
  "get_users",
  "mark_notifications_read",
];

function mockClient(): ApiClient {
  return { post: vi.fn().mockResolvedValue({}) };
}

describe("createServer auto-discovery", () => {
  it("registers all expected tools", async () => {
    const server = await createServer(mockClient());
    const registered = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools
    );

    for (const name of EXPECTED_TOOL_NAMES) {
      expect(registered).toContain(name);
    }
    expect(registered).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });
});
```

This test reads the SDK's internal `_registeredTools` map because `McpServer` doesn't expose a public "list registered tool names" API; `registerTool()` is the only public mutator, and `_registeredTools` is where it stores each registration (verified against `@modelcontextprotocol/sdk` `1.29.0`'s `server/mcp.js`). If a future SDK upgrade renames this field, this test's failure will point directly at the rename.

- [ ] **Step 9: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/server.test.ts`
Expected: FAIL initially if run against the pre-Step-2 `server.ts` (synchronous, hardcoded registrations) — since Step 2 already rewrote `server.ts` earlier in this task, run this immediately after Step 2 in practice, before Step 3, to see it fail meaningfully. Since the steps here are already sequenced with the rewrite first, treat this as a confirmation run: temporarily comment out the `for (const tool of tools)` registration loop's body in `server.ts`, rerun to confirm the test fails (0 tools registered), then restore the loop body and proceed to Step 10.

- [ ] **Step 10: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/server.test.ts`
Expected: PASS — all 30 tool names are registered.

- [ ] **Step 11: Run the full build and test suite one more time**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all tests (including the new `server.test.ts`) pass.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor: auto-discover tools at startup instead of hardcoding registration"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers `src/schemas.ts` + `src/define-tool.ts` (design §1, §2). Tasks 2–6 cover migrating all 30 tool files to the `default` `defineTool()` export, reusing `eventSchema`/`userSchema`/`mutualSchema`/`guestSchema` exactly where the design's motivation section identified duplication (the 8 event-list files, `get-users`/`get-mutuals`/`get-guests`), and leaving genuinely single-use shapes inline (design §1's "Tool-specific one-off shapes" rule). Task 7 covers `src/server.ts`'s auto-discovery loop (design §3), `src/index.ts`'s `await`, `src/types.ts`'s shrink, and the testing requirements from the design's Testing section (mechanical `tools.test.ts` rename, new `server.test.ts` registration-count regression test). The optional "schema round-trip test" from the design's Testing section is covered by Task 1's `schemas.test.ts`.
- **Placeholder scan:** no TBDs; every step shows complete file contents, not diffs-with-elisions, so an implementer never has to guess at surrounding code.
- **Type consistency:** `Tool<TInput, TOutput>` (Task 1) is consumed identically in every migrated tool file (Tasks 2–6) and in `server.ts`'s `AnyTool = Tool<z.ZodRawShape, z.ZodRawShape>` (Task 7) — same generic parameter names and constraints throughout. `defineTool()`'s parameter name `tool` matches the local variable name (`const tool = defineTool({...})`) used consistently across all 30 tool files.
- **Build-green-throughout check:** Tasks 2–6 are parallel-safe because each keeps the old `definition`/`handler` names alive as aliases — `server.ts` and `tools.test.ts` (both untouched until Task 7) keep compiling and passing against every intermediate state. Task 7 is strictly sequential and depends on all of Tasks 2–6 having landed (it deletes the alias exports from all 30 files in one pass, which only holds if every file already has the `default` export).
