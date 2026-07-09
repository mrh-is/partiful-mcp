# Tool Registration Refactor — Design

## Motivation

The MCP best-practices push (see `docs/superpowers/plans/2026-07-09-mcp-agent-best-practices.md`) added `annotations` and `outputSchema` to all 30 tools, but exposed three structural weaknesses in the codebase:

1. **`src/server.ts` hardcodes every tool.** 30 import statements and 30 near-identical `registerTool(...)` blocks. Adding, removing, or renaming a tool file requires a matching manual edit in `server.ts` — nothing enforces the two stay in sync, and the final whole-branch review of the prior push already had to check this by hand across all 30 entries.
2. **`outputSchema` (zod) and domain types (`src/types.ts` interfaces) are two independent, hand-maintained definitions of the same shape.** The event shape alone (`PartifulEvent`/`EventImage`/`DisplaySettings`/`GuestStatusCounts`/`Guest`) is duplicated as a zod schema in 8 tool files, each copy-pasted from the others, while `src/types.ts` maintains a ninth, TypeScript-only copy. Nothing prevents these from drifting apart.
3. **Every tool file repeats the same boilerplate shape** (a `definition` object plus a `handler` function, wired into `server.ts` with an identical `.parse()` → try/catch → `toolResult`/`toolError` pattern), which is where the duplication in (1) and (2) actually lives.

## Architecture

Three pieces change:

### 1. `src/schemas.ts` — shared domain schemas, zod-first

Zod schemas become the single source of truth for shared domain shapes; TypeScript types are derived via `z.infer`, not hand-written separately. This file holds every shape currently duplicated across 2+ tool files:

- `imageSchema`, `displaySettingsSchema`, `guestStatusCountsSchema`, `guestSchema`, `eventSchema` (composed from the previous four) — currently duplicated across `get-my-events.ts`, `get-hosted-events.ts`, `get-my-upcoming-events.ts`, `get-my-past-events.ts`, `get-discoverable-events.ts`, `get-saved-events.ts`, `get-followed-events.ts`, `get-event.ts`.
- `userSchema`, `mutualSchema` — used by `get-users.ts`/`get-mutuals.ts` and reused conceptually by `get-users-party-stats.ts`.

Each schema exports its `z.infer` type alongside it, e.g.:

```ts
export const eventSchema = z.object({ id: z.string(), /* ... */ }).passthrough();
export type PartifulEvent = z.infer<typeof eventSchema>;
```

`src/types.ts` shrinks to only the plumbing types that have no domain/response-shape overlap and were never duplicated: `PartifulConfig`, `TokenSet`, `RefreshResponse`, `ApiRequestBody`, `ApiResponse<T>`, `RsvpStatus`. `MyRsvpsData`, `PartifulEvent`, `EventImage`, `DisplaySettings`, `GuestStatusCounts`, `Guest`, `User`, `Mutual` move to `schemas.ts` as inferred types and are deleted from `types.ts`.

Tool-specific one-off shapes (promo codes, ticket types, discover status, ticketing eligibility, pending cohost request, and similar single-use shapes) are **not** moved to `schemas.ts` — they stay defined inline in their one tool file, since centralizing a shape used by exactly one file would just move the duplication problem sideways without solving anything. They still import shared building blocks from `schemas.ts` where they genuinely overlap (e.g. a shape that embeds a guest record reuses `guestSchema`).

The existing defensive posture (`.passthrough()`, most fields `.optional()`) carries over unchanged — this refactor centralizes definitions, it does not tighten or loosen validation.

### 2. `src/define-tool.ts` — the `Tool` type and `defineTool()` factory

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

`defineTool()` is a typed identity function — its only job is to make TypeScript check that a tool's `handler` return type actually matches its `outputSchema`'s inferred type, and that `handler`'s `args` parameter matches `inputSchema`'s inferred type. A mismatch becomes a compile error in the tool file itself, instead of a shape that silently diverges. Each tool file's public surface shrinks from two named exports (`definition`, `handler`) to one default export:

```ts
export default defineTool({
  name: "get_my_events",
  description: "...",
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  inputSchema: z.object({}),
  outputSchema: z.object({ events: z.array(eventSchema) }).passthrough(),
  handler: async (client, _args) => client.post("/getMyRsvps", {}),
});
```

### 3. `src/server.ts` — auto-discovery + one generic registration loop

`createServer(client)` becomes `async`. At startup it:

1. Resolves the compiled tools directory relative to its own location (`path.join(path.dirname(fileURLToPath(import.meta.url)), "tools")`).
2. Reads the directory (`readdir`), filters to `.js` files.
3. `import()`s each file and reads its `default` export.
4. Validates the default export has the shape of a `Tool` (`name`/`description`/`inputSchema`/`outputSchema`/`annotations`/`handler`, each of the right basic type) — if any file's default export doesn't match, **the server throws at startup** naming the offending file, rather than silently skipping it or registering something malformed.
5. Registers every discovered tool through one shared block: `server.registerTool(tool.name, { description, inputSchema: tool.inputSchema.shape, outputSchema: tool.outputSchema.shape, annotations: tool.annotations }, async (rawArgs) => { const parsed = tool.inputSchema.parse(rawArgs); try { return toolResult(await tool.handler(client, parsed)); } catch (err) { return toolError(err); } })`.

The shared `toolResult`/`toolError` helpers, the `McpServer` constructor, and the hand-written `instructions` string are unchanged — only the per-tool import/registration boilerplate is replaced.

`src/index.ts`'s `main()` gains an `await` on `createServer(client)`.

## Data Flow

Unchanged from the caller's perspective: an MCP client calls a tool by name, `server.ts`'s generic callback parses args against that tool's `inputSchema`, calls its `handler`, and returns `content` + `structuredContent` validated against its `outputSchema`. The only thing that changes is *where* that wiring is defined (once, generically, in `server.ts`) versus *what* each tool file needs to declare (a single `defineTool()` call, importing shared shapes from `schemas.ts` where applicable).

## Error Handling

- **Startup-time:** a tool file with a missing/malformed `default` export fails the server's startup with a clear, file-named error (via the discovery loop's validation step) — this is stricter than today's behavior, where a mistake would only be caught by TypeScript at compile time (still true), or in the worst case silently compile with a wrong-shaped object if the type-checking were somehow bypassed.
- **Call-time:** unchanged — `tool.inputSchema.parse()` throwing on bad args, or `tool.handler()` throwing, both still funnel into the existing `toolError()` path.

## Testing

- `src/__tests__/tools.test.ts` currently imports each tool's named `definition`/`handler` exports; it's updated to import the default `Tool` export and destructure `.handler`/`.inputSchema`/etc. from it. Same assertions, mechanical rename.
- New test: boot `createServer()` against a mocked `ApiClient` and assert all 30 expected tool names were actually registered — a direct regression guard against the desync risk this refactor exists to close.
- New test (optional, low-cost): a schema round-trip check confirming `schemas.ts`'s shared schemas still validate a representative example event/user/mutual object shape.

## Out of Scope

- Changing any tool's actual endpoint, HTTP method, or request/response behavior — this is a structural refactor only.
- Tightening or loosening any `outputSchema`'s validation strictness (the `.passthrough()`/`.optional()` defensive posture from the prior push's final-review fix carries over as-is).
- Consolidating the tool-specific one-off schemas (promo codes, ticket types, etc.) into `schemas.ts` — they're single-use today and moving them wouldn't reduce duplication.
- Reconciling `Guest.status`'s type (currently `RsvpStatus` in `types.ts` but `z.string().optional()` in the zod schemas) — a pre-existing minor inconsistency, not introduced or worsened by this refactor, and not something either of the two questions in this session's request asked for.
- A build-time codegen step — auto-discovery is a runtime directory scan (per your choice), not a generated static registry.
