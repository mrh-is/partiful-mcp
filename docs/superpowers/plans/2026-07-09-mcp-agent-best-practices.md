# MCP Agent-Facing Best Practices Implementation Plan

> **For agentic workers:** Tasks 1–5 are independent and MUST be dispatched in parallel per superpowers:dispatching-parallel-agents (one Agent tool call per task, all in the same message). Task 6 is sequential and MUST NOT start until 1–4 have landed and been reviewed. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 30 MCP tools in this server up to current MCP best practice for agent consumption — explicit read/write/idempotency annotations, structured output schemas, disambiguated descriptions, and server-level tool-selection guidance — without changing any tool's runtime behavior.

**Architecture:** Each tool's `definition` object (in `src/tools/<name>.ts`) gains an `annotations` field (MCP `ToolAnnotations`) and an `outputSchema` field (a zod object, defined locally in the same file — never in `src/types.ts`, so parallel tasks never touch a shared file). Descriptions get a one-clause return-shape summary and a one-clause disambiguation from sibling tools. Once every tool file carries these fields, a final integration task migrates `src/server.ts` from the deprecated `server.tool(...)` calls to `server.registerTool(name, config, cb)`, wires `outputSchema`/`annotations` through, returns `structuredContent` alongside `content`, and adds server-wide `instructions`.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` `^1.29.0`, `zod` `^4.4.3`, `vitest`.

## Global Constraints

- SDK version in use is `@modelcontextprotocol/sdk@1.29.0`. `McpServer.registerTool(name, config, cb)` accepts `config: { title?, description?, inputSchema?, outputSchema?, annotations? }` (see `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:150-157`). This replaces the deprecated `server.tool(name, description, schema, cb)` overload currently used in `src/server.ts`.
- `ToolAnnotations` (from `node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts:2361-2367`) is `{ title?: string; readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }`. All fields are optional hints, not enforced.
- Standard annotations for this server:
  - Every read tool (all except `mark_notifications_read`): `{ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }`.
  - `mark_notifications_read`: `{ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }` — it mutates account state but causes no data loss, and calling it twice has the same effect as calling it once.
  - `openWorldHint: true` everywhere because every tool calls the external Partiful API.
- `outputSchema` must be a zod object (not `z.unknown()` — that defeats the purpose). Where the handler already returns a typed value from `src/types.ts` (e.g. `get-event.ts` returns `PartifulEvent`), mirror that shape. Where the handler returns `Promise<unknown>` (most tools), derive the schema from the response description in `docs/api-endpoints.md` and use `.passthrough()` on nested objects whose exact shape hasn't been observed, so validation never fails on an unexpected extra field.
- **Do not modify `src/types.ts`.** Define output schemas locally in each tool file. This is what keeps Tasks 1–4 file-disjoint and safe to run in parallel.
- Do not change any handler's actual HTTP call, endpoint, or request params — this plan is additive metadata only, not a behavior change.
- Run `npm run build` and `npm test` after every task; both must pass before committing.
- Tasks 1–4 touch only `src/tools/*.ts` files (disjoint sets, listed per task). Task 5 touches only `README.md`. Task 6 touches only `src/server.ts` and must run after 1–4 are committed.

---

### Task 1: Event-list tools — annotations, output schemas, disambiguation

**Files:**
- Modify: `src/tools/get-my-events.ts`
- Modify: `src/tools/get-hosted-events.ts`
- Modify: `src/tools/get-my-upcoming-events.ts`
- Modify: `src/tools/get-my-past-events.ts`
- Modify: `src/tools/get-discoverable-events.ts`
- Modify: `src/tools/get-saved-events.ts`
- Modify: `src/tools/get-followed-events.ts`

**Interfaces:**
- Produces: each file's `definition` gains `annotations: ToolAnnotations` and `outputSchema: z.ZodObject<...>` (import `z` from `"zod"`, already a dependency). Field names/shape are for Task 6 to reference by import path only — Task 6 does not need to know their internal contents, just that `definition.annotations` and `definition.outputSchema` exist on every tool.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are improving an MCP (Model Context Protocol) server's tool definitions
so they follow current MCP best practices for agent consumption. Repo:
partiful-mcp, a Node/TypeScript MCP server wrapping the Partiful events API.

Modify exactly these 7 files, and no others:
- src/tools/get-my-events.ts
- src/tools/get-hosted-events.ts
- src/tools/get-my-upcoming-events.ts
- src/tools/get-my-past-events.ts
- src/tools/get-discoverable-events.ts
- src/tools/get-saved-events.ts
- src/tools/get-followed-events.ts

Each file currently exports:
  export const definition = { name: "...", description: "...", inputSchema: z.object({}) };
  export async function handler(client: ApiClient, _args: unknown): Promise<unknown> { ... }

For EACH file, make these changes to the `definition` object only (do not
touch the handler's HTTP call or endpoint):

1. Add an `annotations` field:
   annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }

2. Add an `outputSchema` field: a zod object describing the actual response
   shape. First check src/types.ts (read-only — do NOT edit it) for an
   existing interface that matches this endpoint's response. If one exists,
   mirror it as a zod schema in this file. If not, read docs/api-endpoints.md
   for this tool's endpoint description (endpoint names: getMyRsvps for
   get-my-events, getHostedEvents, getMyUpcomingEventsForHomePage,
   getMyPastEventsForHomePage, getDiscoverableEvents, getMySavedEvents,
   getMyFollowedEvents respectively) and write a best-effort schema for the
   known top-level fields (these all return event list objects — expect an
   `events` array of objects with fields like id, title, startDate,
   location, guest counts, RSVP status). Use `.passthrough()` on nested
   objects so unobserved fields don't fail validation. Define the schema
   in the same file as a `const outputSchema = z.object({...})` above
   `definition`, and reference it as `outputSchema` in the definition.

3. Tighten the `description` string: state the return shape in one clause,
   and add one clause disambiguating this tool from the other 6 in this
   batch (they are all "get events" variants — an agent needs to know when
   to pick get_my_events vs get_hosted_events vs get_my_upcoming_events vs
   get_my_past_events vs get_discoverable_events vs get_saved_events vs
   get_followed_events). Read each file's current description and
   docs/api-endpoints.md's "Event lists" table first so the disambiguation
   is accurate, not guessed.

4. If the handler's return type is currently `Promise<unknown>` and the
   new outputSchema's inferred type is simple to apply, update the
   handler's return type annotation to match (e.g.
   `Promise<z.infer<typeof outputSchema>>`). Skip this if it would require
   editing src/types.ts.

Do not modify src/server.ts, src/types.ts, or any file outside the 7 listed
above. Do not change any endpoint, HTTP method, or request parameter.

After editing, run `npm run build` from the repo root and fix any type
errors your changes introduced. Do not run npm test yet (server.ts hasn't
been updated to use the new fields — existing tests should still pass
unchanged since you didn't touch handlers' runtime behavior).

Return: a short summary of the outputSchema and disambiguation clause you
wrote for each of the 7 tools.
---
```

- [ ] **Step 2: Review the returned diff**

Check: all 7 files touched, no edits to `src/server.ts` or `src/types.ts`, `npm run build` passes, every `definition` has both `annotations` and `outputSchema`, and the 7 descriptions now distinguish each other (not just restating the tool name).

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-my-events.ts src/tools/get-hosted-events.ts src/tools/get-my-upcoming-events.ts src/tools/get-my-past-events.ts src/tools/get-discoverable-events.ts src/tools/get-saved-events.ts src/tools/get-followed-events.ts
git commit -m "feat: add annotations and output schemas to event-list tools"
```

---

### Task 2: Event-detail tools — annotations, output schemas, disambiguation

**Files:**
- Modify: `src/tools/get-event.ts`
- Modify: `src/tools/get-guests.ts`
- Modify: `src/tools/get-event-comments.ts`
- Modify: `src/tools/get-event-media.ts`
- Modify: `src/tools/get-event-restrictions.ts`
- Modify: `src/tools/get-event-permission.ts`
- Modify: `src/tools/get-event-host-messages.ts`
- Modify: `src/tools/get-event-ticketing-eligibility.ts`
- Modify: `src/tools/get-pending-cohost-request.ts`

**Interfaces:**
- Produces: same as Task 1 — each `definition` gains `annotations` and `outputSchema`.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are improving an MCP (Model Context Protocol) server's tool definitions
so they follow current MCP best practices for agent consumption. Repo:
partiful-mcp, a Node/TypeScript MCP server wrapping the Partiful events API.

Modify exactly these 9 files, and no others:
- src/tools/get-event.ts
- src/tools/get-guests.ts
- src/tools/get-event-comments.ts
- src/tools/get-event-media.ts
- src/tools/get-event-restrictions.ts
- src/tools/get-event-permission.ts
- src/tools/get-event-host-messages.ts
- src/tools/get-event-ticketing-eligibility.ts
- src/tools/get-pending-cohost-request.ts

Each file exports:
  export const definition = { name: "...", description: "...", inputSchema: z.object({ event_id: z.string()... }) };
  export async function handler(client: ApiClient, args: { event_id: string }): Promise<unknown | PartifulEvent> { ... }

(get-event.ts already returns a typed `PartifulEvent` from src/types.ts —
read that interface, it's the reference quality bar for the others.)

For EACH file, make these changes to the `definition` object only (do not
touch the handler's HTTP call, endpoint, or event_id parameter):

1. Add an `annotations` field:
   annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }

2. Add an `outputSchema` field: a zod object describing the actual response
   shape for that specific endpoint. Check src/types.ts (read-only — do NOT
   edit it) for a matching interface first (get-event.ts already has one:
   PartifulEvent). For the rest, consult docs/api-endpoints.md's "Event
   details" table for what each endpoint
   (getGuests/getEventComments/getEventMedia/getEventRestrictions/
   getEventPermission/getEventDisplayedHostMessages/
   getEventTicketingEligibility/getPendingCohostRequestForEvent) returns,
   and write a best-effort zod schema for the known top-level fields, using
   `.passthrough()` on nested objects whose exact shape isn't documented.
   Define it as `const outputSchema = z.object({...})` above `definition`
   in the same file.

3. Tighten the `description` string: state the return shape in one clause.
   These 9 tools are NOT ambiguous with each other (each covers a distinct
   facet of one event — guests, comments, media, restrictions, permissions,
   host messages, ticketing, cohost request) so no disambiguation clause is
   needed between them, but each description should make clear it takes an
   `event_id` and what specifically comes back (e.g. "the current user's
   permission level" vs "guest list objects").

4. If a handler's return type is currently `Promise<unknown>` and the new
   outputSchema's inferred type is simple to apply, update the handler's
   return type annotation to match (e.g.
   `Promise<z.infer<typeof outputSchema>>`). Skip if it would require
   editing src/types.ts. get-event.ts already has a typed return — leave
   its handler's return type as PartifulEvent, just add annotations and an
   outputSchema mirroring PartifulEvent.

Do not modify src/server.ts, src/types.ts, or any file outside the 9 listed
above. Do not change any endpoint, HTTP method, or request parameter.

After editing, run `npm run build` from the repo root and fix any type
errors your changes introduced. Do not run npm test yet.

Return: a short summary of the outputSchema you wrote for each of the 9
tools.
---
```

- [ ] **Step 2: Review the returned diff**

Check: all 9 files touched, no edits to `src/server.ts` or `src/types.ts`, `npm run build` passes, every `definition` has both `annotations` and `outputSchema`, `get-event.ts`'s schema is consistent with the existing `PartifulEvent` interface.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-event.ts src/tools/get-guests.ts src/tools/get-event-comments.ts src/tools/get-event-media.ts src/tools/get-event-restrictions.ts src/tools/get-event-permission.ts src/tools/get-event-host-messages.ts src/tools/get-event-ticketing-eligibility.ts src/tools/get-pending-cohost-request.ts
git commit -m "feat: add annotations and output schemas to event-detail tools"
```

---

### Task 3: Host-specific tools — annotations, output schemas, disambiguation

**Files:**
- Modify: `src/tools/get-host-promo-codes.ts`
- Modify: `src/tools/get-host-ticket-types.ts`
- Modify: `src/tools/get-event-discover-status.ts`
- Modify: `src/tools/get-cohost-requested-events.ts`
- Modify: `src/tools/get-all-event-restrictions.ts`
- Modify: `src/tools/get-invitable-contacts.ts`

**Interfaces:**
- Produces: same as Task 1 — each `definition` gains `annotations` and `outputSchema`.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are improving an MCP (Model Context Protocol) server's tool definitions
so they follow current MCP best practices for agent consumption. Repo:
partiful-mcp, a Node/TypeScript MCP server wrapping the Partiful events API.

Modify exactly these 6 files, and no others:
- src/tools/get-host-promo-codes.ts
- src/tools/get-host-ticket-types.ts
- src/tools/get-event-discover-status.ts
- src/tools/get-cohost-requested-events.ts
- src/tools/get-all-event-restrictions.ts
- src/tools/get-invitable-contacts.ts

Each file exports a `definition` object (name, description, inputSchema)
and an async `handler(client, args)`. get-invitable-contacts.ts and the
per-event tools take `{ event_id: string }` (some also take pagination
params — check get-invitable-contacts.ts specifically for `skip`/`limit`
params matching docs/api-endpoints.md's getInvitableContacts entry:
`{eventId, skip, limit}`). get-cohost-requested-events.ts and
get-all-event-restrictions.ts take no args.

For EACH file, make these changes to the `definition` object only (do not
touch the handler's HTTP call, endpoint, or existing parameters):

1. Add an `annotations` field:
   annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }

2. Add an `outputSchema` field: a zod object describing the actual response
   shape. Check src/types.ts (read-only — do NOT edit it) for a matching
   interface first. Otherwise consult docs/api-endpoints.md's
   "Host-specific" table for what each endpoint
   (getHostPromoCodes/getHostTicketTypes/getEventDiscoverStatus/
   getCohostRequestedEvents/getAllEventRestrictions/getInvitableContacts)
   returns, and write a best-effort zod schema for the known top-level
   fields, using `.passthrough()` on nested objects whose exact shape
   isn't documented. Define it as `const outputSchema = z.object({...})`
   above `definition` in the same file.

3. Tighten the `description` string: state the return shape in one clause.
   For get_invitable_contacts specifically, document the `skip`/`limit`
   pagination behavior in the description (how a caller should page
   through results) since that's the one paginated tool in this batch —
   read its current inputSchema to get the exact param names right.

4. If a handler's return type is currently `Promise<unknown>` and the new
   outputSchema's inferred type is simple to apply, update the handler's
   return type annotation to match. Skip if it would require editing
   src/types.ts.

Do not modify src/server.ts, src/types.ts, or any file outside the 6 listed
above. Do not change any endpoint, HTTP method, or request parameter.

After editing, run `npm run build` from the repo root and fix any type
errors your changes introduced. Do not run npm test yet.

Return: a short summary of the outputSchema you wrote for each of the 6
tools, and the pagination behavior you documented for
get_invitable_contacts.
---
```

- [ ] **Step 2: Review the returned diff**

Check: all 6 files touched, no edits to `src/server.ts` or `src/types.ts`, `npm run build` passes, every `definition` has both `annotations` and `outputSchema`, and `get_invitable_contacts`'s description now explains pagination.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-host-promo-codes.ts src/tools/get-host-ticket-types.ts src/tools/get-event-discover-status.ts src/tools/get-cohost-requested-events.ts src/tools/get-all-event-restrictions.ts src/tools/get-invitable-contacts.ts
git commit -m "feat: add annotations and output schemas to host-specific tools"
```

---

### Task 4: Social/explore tools + the write tool — annotations, output schemas, disambiguation

**Files:**
- Modify: `src/tools/get-users.ts`
- Modify: `src/tools/get-users-party-stats.ts`
- Modify: `src/tools/get-mutuals.ts`
- Modify: `src/tools/get-contacts.ts`
- Modify: `src/tools/get-my-communities.ts`
- Modify: `src/tools/get-created-cards.ts`
- Modify: `src/tools/get-discover-event-decorators.ts`
- Modify: `src/tools/mark-notifications-read.ts`

**Interfaces:**
- Produces: same as Task 1 for the 7 read tools. `mark-notifications-read.ts` gets a different `annotations` value (see below) — this is the only tool in the whole server with `readOnlyHint: false`, and Task 6 needs this distinction to exist so its server-wide `instructions` text can reference "the one write tool" accurately.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are improving an MCP (Model Context Protocol) server's tool definitions
so they follow current MCP best practices for agent consumption. Repo:
partiful-mcp, a Node/TypeScript MCP server wrapping the Partiful events API.

Modify exactly these 8 files, and no others:
- src/tools/get-users.ts
- src/tools/get-users-party-stats.ts
- src/tools/get-mutuals.ts
- src/tools/get-contacts.ts
- src/tools/get-my-communities.ts
- src/tools/get-created-cards.ts
- src/tools/get-discover-event-decorators.ts
- src/tools/mark-notifications-read.ts

Each file exports a `definition` object (name, description, inputSchema)
and an async `handler(client, args)`.

For the 7 READ tools (everything except mark-notifications-read.ts), make
these changes to the `definition` object only (do not touch the handler's
HTTP call, endpoint, or existing parameters):

1. Add an `annotations` field:
   annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }

2. Add an `outputSchema` field: a zod object describing the actual response
   shape. Check src/types.ts (read-only — do NOT edit it) for a matching
   interface first. Otherwise consult docs/api-endpoints.md's "Users and
   social" and "Explore / discover" tables for what each endpoint
   (getUsers/getUsersPartyStats/getMutuals/getContacts/getMyCommunities/
   getCreatedCards/getDiscoverEventItemDecorators) returns, and write a
   best-effort zod schema for the known top-level fields, using
   `.passthrough()` on nested objects whose exact shape isn't documented.
   Define it as `const outputSchema = z.object({...})` above `definition`
   in the same file. Note get_users and get_users_party_stats both take
   arrays of user IDs (`ids`/`userIds`) and return per-user data — make
   their outputSchemas keyed/array-shaped consistently with what
   docs/api-endpoints.md documents for each.

3. Tighten the `description` string: state the return shape in one clause.
   get_users and get_users_party_stats overlap conceptually (both take
   user IDs) — add a one-clause disambiguation to each explaining when to
   use which (get_users = profile info, includes an optional party-stats
   flag; get_users_party_stats = just attended/hosted counts). Read both
   files' current inputSchema and docs/api-endpoints.md before writing this
   so it's accurate.

4. If a handler's return type is currently `Promise<unknown>` and the new
   outputSchema's inferred type is simple to apply, update the handler's
   return type annotation to match. Skip if it would require editing
   src/types.ts.

For mark-notifications-read.ts (the ONLY write tool in this entire MCP
server), make these changes instead:

1. Add an `annotations` field:
   annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
   (it mutates account state — marks notifications read — but causes no
   data loss, and calling it twice has the same effect as calling it once,
   hence idempotentHint: true and destructiveHint: false.)

2. Add an `outputSchema`: check docs/api-endpoints.md's
   markAllNotificationsForEventAsRead entry for what the endpoint returns;
   if the response is just an ack/empty object, use
   `z.object({}).passthrough()`.

3. The description already states this is a write action — leave that
   sentence, but add a one-clause note that it should only be called when
   the user's intent is clearly to mark something read, not speculatively
   (agents should not call write tools to "check" something).

Do not modify src/server.ts, src/types.ts, or any file outside the 8 listed
above. Do not change any endpoint, HTTP method, or request parameter.

After editing, run `npm run build` from the repo root and fix any type
errors your changes introduced. Do not run npm test yet.

Return: a short summary of the outputSchema and annotations you wrote for
each of the 8 tools, calling out that mark_notifications_read's
annotations differ from the other 7.
---
```

- [ ] **Step 2: Review the returned diff**

Check: all 8 files touched, no edits to `src/server.ts` or `src/types.ts`, `npm run build` passes, `mark-notifications-read.ts` has `readOnlyHint: false` while the other 7 have `readOnlyHint: true`, `get_users`/`get_users_party_stats` descriptions now disambiguate each other.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-users.ts src/tools/get-users-party-stats.ts src/tools/get-mutuals.ts src/tools/get-contacts.ts src/tools/get-my-communities.ts src/tools/get-created-cards.ts src/tools/get-discover-event-decorators.ts src/tools/mark-notifications-read.ts
git commit -m "feat: add annotations and output schemas to social/explore tools and the write tool"
```

---

### Task 5: README — Agent Usage Notes section

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: a new "## Agent Usage Notes" section in `README.md`, after the existing "## Available Tools" section. No dependency on Tasks 1–4 or 6 — this is prose about tool *selection*, not about the schema/annotation fields those tasks add.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are writing agent-facing documentation for an MCP (Model Context
Protocol) server. Repo: partiful-mcp, a Node/TypeScript MCP server
wrapping the Partiful events API. Modify exactly one file: README.md.
Do not touch any other file.

Read the current README.md, specifically its "## Available Tools" table
(lists 29 read tools plus mark_notifications_read) and "## Configuration"
section, and read docs/api-endpoints.md for what each underlying endpoint
does.

Add a new section titled "## Agent Usage Notes" immediately after the
"## Available Tools" section (before "## Configuration"), containing:

1. A short paragraph explaining this section is aimed at the AI agent/LLM
   using this server via an MCP client, not at the human installing it.

2. A disambiguation table or short list for the 7 overlapping "get events"
   tools (get_my_events, get_hosted_events, get_my_upcoming_events,
   get_my_past_events, get_discoverable_events, get_saved_events,
   get_followed_events), explaining in one line each which one to reach
   for given a user's intent (e.g. "what am I doing this weekend" vs
   "what events have I saved" vs "what am I hosting"). Base this on what
   each endpoint actually returns per docs/api-endpoints.md's "Event
   lists" table — do not invent behavior not documented there.

3. A short note that get_users and get_users_party_stats overlap (both
   take user IDs) and when to use which — get_users returns full profile
   info and can optionally include party stats inline; get_users_party_stats
   returns just the attended/hosted counts.

4. A clearly marked note that mark_notifications_read is the ONLY tool in
   this server that mutates state (marks notifications read for an event)
   — it should be called only when the user's intent is clearly to mark
   something read, never speculatively or "just in case." All other 29
   tools are pure reads with no side effects.

5. A short note on the expected auth failure mode: if
   PARTIFUL_REFRESH_TOKEN is missing, expired, or invalid, calls will fail
   with an error from the underlying Partiful API — read src/api/auth.ts
   and src/api/client.ts to describe accurately what error/message an
   agent should expect to see and what it implies (token needs refreshing
   per the "Getting Your Refresh Token" section above in the README).

Keep the new section concise — use tables/bullets over prose paragraphs
where it fits the existing README's style (it already uses tables for
Available Tools and Environment Variables).

After editing, do not run any build/test commands (README.md has no
effect on the build) — just confirm the file is valid Markdown by eye.

Return: the full text of the new "## Agent Usage Notes" section you added.
---
```

- [ ] **Step 2: Review the returned diff**

Check: only `README.md` touched, new section is factually grounded in `docs/api-endpoints.md` (not invented), placed between "Available Tools" and "Configuration".

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Agent Usage Notes section for MCP clients"
```

---

### Task 6: Integrate annotations/output schemas into server.ts (sequential — run only after Tasks 1–4 are committed)

**Files:**
- Modify: `src/server.ts`

**Interfaces:**
- Consumes: `definition.annotations` and `definition.outputSchema` now present on all 30 tool definitions (added by Tasks 1–4). `McpServer.registerTool(name, config, cb)` from `@modelcontextprotocol/sdk@1.29.0` (config: `{ title?, description?, inputSchema?, outputSchema?, annotations? }`, see `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:150-157`).
- Produces: `src/server.ts` fully migrated off the deprecated `server.tool(...)` overload; `toolResult()` helper returns both `content` and `structuredContent`.

- [ ] **Step 1: Dispatch this agent**

```
Dispatch a general-purpose agent with this exact self-contained prompt:

---
You are integrating per-tool MCP metadata (annotations and output schemas)
into an MCP server's registration code. Repo: partiful-mcp, a
Node/TypeScript MCP server. Modify exactly one file: src/server.ts. Do not
touch any file under src/tools/ or src/types.ts.

Context: every file under src/tools/ now exports a `definition` object
with `name`, `description`, `inputSchema` (a zod object), `annotations`
(an MCP ToolAnnotations object), and `outputSchema` (a zod object). Read a
few of them (e.g. src/tools/get-event.ts, src/tools/get-guests.ts,
src/tools/mark-notifications-read.ts) to see the current shape.

src/server.ts currently registers each tool with the deprecated overload:
  server.tool(def.name, def.description, def.inputSchema.shape, async (args) => {...})
(some with a `.parse(args)` call first, some zero-arg tools calling the
handler with `{}` directly — read the full file first, it's ~375 lines
with one registration block per tool.)

The installed SDK is @modelcontextprotocol/sdk@1.29.0, which supports:
  server.registerTool(name, config, callback)
where config is:
  {
    title?: string;
    description?: string;
    inputSchema?: ZodRawShape;   // pass def.inputSchema.shape, same as today
    outputSchema?: ZodRawShape;  // pass def.outputSchema.shape
    annotations?: ToolAnnotations; // pass def.annotations directly
  }
and the callback, when outputSchema is set, should return both `content`
(JSON-stringified, for backward compatibility with clients that don't read
structuredContent) and `structuredContent` (the raw structured object) —
per MCP spec, servers should populate both fields when outputSchema is
declared.

Do this:

1. Migrate the shared `toolResult()` helper (currently
   `function toolResult(data: unknown): ToolResult { return { content:
   [{ type: "text", text: JSON.stringify(data, null, 2) }] }; }`) to accept
   an optional flag or second parameter so callers can request
   structuredContent too. A reasonable shape:
     function toolResult(data: unknown): ToolResult & { structuredContent?: unknown } {
       return {
         content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
         structuredContent: data as Record<string, unknown>,
       };
     }
   (Every tool here has an outputSchema now, so it's fine to always
   populate structuredContent — no conditional branching needed.)

2. Replace every `server.tool(defX.name, defX.description,
   defX.inputSchema.shape, async (...) => {...})` call with:
     server.registerTool(
       defX.name,
       {
         description: defX.description,
         inputSchema: defX.inputSchema.shape,
         outputSchema: defX.outputSchema.shape,
         annotations: defX.annotations,
       },
       async (args) => { ...same callback body as before... }
     )
   Keep each callback's existing body (the `.parse(args)` call for
   args-taking tools, the try/catch calling `toolResult`/`toolError`)
   unchanged — only the registration call and config object change. Do
   this for all 30 tools currently registered in the file.

3. Add server-wide `instructions` to the McpServer constructor:
     const server = new McpServer(
       { name: "partiful-mcp", version: "2026.7.0" },
       { instructions: "..." }
     );
   Write the instructions string to briefly cover: (a) which of the 7
   overlapping get_*_events tools to use for common intents (mirror
   README.md's new "Agent Usage Notes" section — read it first, it should
   already exist from a parallel task; if it doesn't exist yet, base this
   on docs/api-endpoints.md's "Event lists" table), (b) that
   mark_notifications_read is the only tool that mutates state and should
   not be called speculatively. Keep it under ~150 words — this gets sent
   to the model on every session, so it should be dense, not a repeat of
   full tool descriptions.

Do not modify src/tools/*.ts or src/types.ts. Do not change any tool's
name, endpoint, or request/response behavior — this is a registration-
layer change only.

After editing, run `npm run build` and `npm test` from the repo root.
Fix any type errors or test failures your changes introduced. If a test
asserts on the exact shape of a tool's `content` array and now fails
because `structuredContent` was added alongside it, update the test's
expectation to include structuredContent rather than removing the
assertion.

Return: confirmation that npm run build and npm test both pass, plus a
list of any test files you had to update and why.
---
```

- [ ] **Step 2: Review the returned diff**

Check: only `src/server.ts` (and possibly `src/__tests__/*.test.ts`) touched, `npm run build` and `npm test` both reported passing, all 30 tools migrated to `registerTool`, `instructions` added to the `McpServer` constructor, no tool's endpoint/params changed.

- [ ] **Step 3: Run the full verification suite yourself**

```bash
npm run build
npm test
```

Expected: both pass with zero errors/failures.

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: migrate tool registration to registerTool with annotations, output schemas, and server instructions"
```

---

## Self-Review Notes

- **Spec coverage:** annotations (1–4) ✓, output schemas (1–4) ✓, description/disambiguation pass (1–4) ✓, server-wide tool-selection guidance (F's `instructions`) ✓, error-message consistency — **not covered by this plan**, called out below as a follow-up, not blocking this push. README Agent Usage Notes (E) ✓.
- **File-disjointness check:** 1/2/3/4 each list a distinct set of `src/tools/*.ts` files with no overlap; E touches only `README.md`; F touches only `src/server.ts` and runs after 1–4. No two parallel tasks share a file.
- **Sequencing check:** F's prompt explicitly depends on `definition.annotations`/`definition.outputSchema` existing on all 30 tools — it must not be dispatched until 1–4 are committed. E has no such dependency and can run alongside 1–4.

**Follow-up not included in this plan (flag to the user separately if desired):** consistent actionable error messages across handlers (today only `get-event.ts` throws a custom, agent-readable error; the rest propagate raw API errors). Worth a sixth task later, but it touches handler logic (not just definitions) and deserves its own review pass rather than being bundled here.
