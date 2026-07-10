# Field Selection for MCP Tools

Add an optional `fields` parameter to every tool so callers can request only specific fields in responses, reducing token usage. Inspired by GraphQL field selection.

## Behavior

Every tool accepts an optional `fields` input parameter: an array of dot-path strings identifying which fields to include in the response. When omitted, the full response is returned (backward compatible).

### Dot-path syntax

Paths use dots to address nested fields at any depth:

```
"event.title"              -- scalar inside a top-level object
"event.image.url"          -- scalar two levels deep
"event.guestStatusCounts"  -- stops at an object, returns it whole
"passwordRequired"         -- top-level scalar
"events.id"                -- field inside each element of an array
"events.guest.userId"      -- nested field inside array elements
```

When a path segment resolves to an array, the remaining path is applied to every element in that array.

When a path stops at an object or array (no further segments), the entire value is returned.

### Examples

**`get_event_info` with `fields: ["event.title", "event.startDate", "passwordRequired"]`**

```json
{
  "event": { "title": "Rooftop Party", "startDate": "2026-07-15T19:00:00Z" },
  "passwordRequired": false
}
```

**`get_my_rsvps` with `fields: ["events.id", "events.title", "events.guest.status"]`**

```json
{
  "events": [
    { "id": "abc", "title": "Rooftop Party", "guest": { "status": "GOING" } },
    { "id": "def", "title": "Beach Day", "guest": { "status": "MAYBE" } }
  ]
}
```

**`get_guests` with `fields: ["guests.userId", "guests.status"]`**

```json
{
  "guests": [
    { "userId": "u1", "status": "GOING" },
    { "userId": "u2", "status": "DECLINED" }
  ]
}
```

## Architecture

### Where filtering lives

Filtering is a cross-cutting concern applied in `server.ts`'s tool-call wrapper, between the handler return and MCP result construction. Individual tool handlers are untouched.

```
caller request (with fields)
  -> parse & validate input (including fields)
  -> run handler (returns full data)
  -> filterFields(data, requestedFields)  <-- new step
  -> toolResult(filtered)
  -> MCP response
```

### Deriving available fields from Zod schemas

At tool registration time, walk each tool's `outputSchema` (a Zod object) to extract all valid dot-paths. This serves two purposes:

1. **Validation**: reject unknown field paths with a clear error naming the invalid path and listing available ones.
2. **Discoverability**: include the available fields in the `fields` parameter's description so LLMs can see what's selectable.

The schema walker handles these Zod types:
- `ZodObject` / loose object: enumerate keys from `.shape`, recurse into each value
- `ZodArray`: recurse into `.element`
- `ZodOptional` / `ZodNullable`: unwrap and recurse into inner type
- `ZodUnion`: take the union of paths across all variants (fields valid in any variant are selectable)
- Leaf types (`ZodString`, `ZodNumber`, `ZodBoolean`, `ZodLiteral`, etc.): terminal, no further paths

The walker produces paths like `["event.title", "event.startDate", "event.image", "event.image.url", ...]` — both intermediate and leaf paths are valid (selecting an intermediate returns the whole subtree).

### Input schema injection

The `fields` parameter is added to each tool's input schema automatically in `server.ts` at registration time, not in individual tool files. This keeps tool definitions clean.

The injected parameter:

```typescript
fields: z.array(z.string())
  .optional()
  .describe("Dot-path field names to include in the response (e.g. [\"event.title\", \"events.id\"]). Omit to return all fields. Available fields: <enumerated from outputSchema>")
```

The `fields` parameter is stripped from `rawArgs` before passing to the tool handler, so handlers never see it.

### Filtering algorithm

```
filterFields(data, paths):
  group paths by first segment -> { segment: [remaining paths...] }
  for each key in data:
    if key not in grouped segments: omit it
    if key in grouped segments:
      remainingPaths = grouped[key]
      if remainingPaths includes "" (i.e. the full key was requested): include whole value
      else if value is array: map each element through filterFields(element, remainingPaths)
      else if value is object: filterFields(value, remainingPaths)
      else: include value (leaf reached, remaining paths are invalid but data wins)
```

### Output schema

The MCP `outputSchema` registered with the SDK remains the full schema. Since all fields are already optional/partial in every tool's output schema, a filtered response (with fields omitted) still passes validation. No schema modification needed.

## Files changed

| File | Change |
|------|--------|
| `src/field-selection.ts` | New. Schema walker (`extractFieldPaths`), field validator (`validateFields`), response filter (`filterFields`) |
| `src/server.ts` | Inject `fields` into each tool's input schema at registration. Strip `fields` from args before handler. Apply `filterFields` to handler result when fields are present. |
| `src/__tests__/field-selection.test.ts` | New. Unit tests for schema walking, validation, and filtering |
| `src/__tests__/server.test.ts` | Add integration test: call a tool with `fields` and verify filtered output |

## Edge cases

- **Empty `fields: []`**: return the full response (treat same as omitted). An empty selection is almost certainly unintentional.
- **`fields` on tools with `z.looseObject({})`** (no declared fields, e.g. `get_payout_summary_for_event`): the schema walker finds no paths, so any field request fails validation with "no selectable fields available for this tool." The pass-through of undeclared fields from `looseObject` still works when `fields` is omitted.
- **Unknown field in `fields`**: return an error naming the bad path and listing available ones.
- **`fields` with only invalid paths**: error, no partial results.
- **Duplicate paths**: deduplicate silently.
- **Superset paths** (e.g. both `event.image` and `event.image.url`): the broader path wins, return the whole subtree.

## Not in scope

- Field selection on input parameters (what to send to the API)
- Renaming/aliasing fields
- Computed/derived fields
- Per-array-element filtering (e.g. "only events where status is GOING")
