# Field Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `fields` parameter to every MCP tool so callers can request only specific response fields via dot-paths, reducing token usage.

**Architecture:** A new `src/field-selection.ts` module provides three pure functions: `extractFieldPaths` (walks a Zod output schema to enumerate all valid dot-paths), `validateFields` (checks requested paths against the valid set), and `filterFields` (recursively picks only requested fields from handler output). `server.ts` wires these into the tool registration loop — injecting `fields` into each tool's input schema and applying the filter after the handler returns.

**Tech Stack:** TypeScript, Zod 4 (`zod@^4.4.3`), Vitest

## Global Constraints

- Zod 4 API: use `._zod.def.type` for type detection, `.shape` for object keys, `.element` for array elements, `._zod.def.innerType` to unwrap optional/nullable/nonoptional
- All output schemas use `z.looseObject(...)` — the walker must handle the `catchall` property gracefully
- `fields` is always optional and backward-compatible: omitting it returns all fields
- Empty `fields: []` is treated as omitted (return all fields)
- Tool handlers must never see the `fields` parameter — strip it before calling the handler
- This project uses ESM (`"type": "module"`) — all imports use `.js` extensions

---

### Task 1: `extractFieldPaths` — Zod schema walker

**Files:**
- Create: `src/field-selection.ts`
- Create: `src/__tests__/field-selection.test.ts`

**Interfaces:**
- Consumes: Zod schema instances (the `outputSchema` from any tool definition)
- Produces: `extractFieldPaths(schema: z.ZodType): string[]` — returns sorted array of all valid dot-paths (e.g. `["event", "event.id", "event.image", "event.image.url", "event.title", "passwordRequired"]`)

- [ ] **Step 1: Write failing tests for `extractFieldPaths`**

In `src/__tests__/field-selection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractFieldPaths } from "../field-selection.js";

describe("extractFieldPaths", () => {
  it("extracts top-level keys from a flat object", () => {
    const schema = z.looseObject({
      name: z.string(),
      age: z.number(),
    });
    expect(extractFieldPaths(schema)).toEqual(["age", "name"]);
  });

  it("extracts nested object paths", () => {
    const schema = z.looseObject({
      event: z.looseObject({
        title: z.string(),
        image: z.looseObject({
          url: z.string(),
          width: z.number(),
        }).partial(),
      }).partial(),
    });
    expect(extractFieldPaths(schema)).toEqual([
      "event",
      "event.image",
      "event.image.url",
      "event.image.width",
      "event.title",
    ]);
  });

  it("drills into array elements", () => {
    const schema = z.looseObject({
      events: z.array(
        z.looseObject({ id: z.string(), title: z.string() }).partial()
      ),
    });
    expect(extractFieldPaths(schema)).toEqual([
      "events",
      "events.id",
      "events.title",
    ]);
  });

  it("unwraps optional and nullable", () => {
    const schema = z.looseObject({
      name: z.string().optional(),
      bio: z.string().nullable(),
    });
    expect(extractFieldPaths(schema)).toEqual(["bio", "name"]);
  });

  it("handles union by merging paths from all variants", () => {
    const schema = z.looseObject({
      startDate: z.union([z.string(), z.literal("TBD")]),
    });
    expect(extractFieldPaths(schema)).toEqual(["startDate"]);
  });

  it("handles .partial().required() (nonoptional wrapper)", () => {
    const schema = z
      .looseObject({ id: z.string(), title: z.string() })
      .partial()
      .required({ id: true });
    expect(extractFieldPaths(schema)).toEqual(["id", "title"]);
  });

  it("returns empty array for empty looseObject", () => {
    const schema = z.looseObject({});
    expect(extractFieldPaths(schema)).toEqual([]);
  });

  it("handles the real eventSchema shape", () => {
    const imageSchema = z.looseObject({ url: z.string(), width: z.number() }).partial();
    const guestSchema = z.looseObject({ id: z.string(), status: z.string() }).partial();
    const eventSchema = z
      .looseObject({
        id: z.string(),
        title: z.string(),
        image: imageSchema,
        guest: guestSchema,
      })
      .partial()
      .required({ id: true });

    const outputSchema = z.looseObject({
      event: eventSchema,
      passwordRequired: z.boolean().optional(),
    });

    const paths = extractFieldPaths(outputSchema);
    expect(paths).toContain("event");
    expect(paths).toContain("event.id");
    expect(paths).toContain("event.title");
    expect(paths).toContain("event.image");
    expect(paths).toContain("event.image.url");
    expect(paths).toContain("event.guest");
    expect(paths).toContain("event.guest.id");
    expect(paths).toContain("event.guest.status");
    expect(paths).toContain("passwordRequired");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: FAIL — module `../field-selection.js` not found

- [ ] **Step 3: Implement `extractFieldPaths`**

Create `src/field-selection.ts`:

```typescript
import type { z } from "zod";

interface ZodDef {
  type: string;
  innerType?: z.ZodType;
  options?: z.ZodType[];
}

function getZodDef(schema: z.ZodType): ZodDef {
  return (schema as unknown as { _zod: { def: ZodDef } })._zod.def;
}

function hasShape(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return "shape" in schema;
}

function unwrap(schema: z.ZodType): z.ZodType {
  const def = getZodDef(schema);
  if (
    (def.type === "optional" || def.type === "nullable" || def.type === "nonoptional") &&
    def.innerType
  ) {
    return unwrap(def.innerType);
  }
  return schema;
}

function collectPaths(schema: z.ZodType, prefix: string): string[] {
  const unwrapped = unwrap(schema);
  const def = getZodDef(unwrapped);

  if (hasShape(unwrapped)) {
    const paths: string[] = [];
    for (const key of Object.keys(unwrapped.shape)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push(fullPath);
      const childSchema = unwrap(unwrapped.shape[key] as z.ZodType);
      const childDef = getZodDef(childSchema);
      if (hasShape(childSchema) || childDef.type === "array" || childDef.type === "union") {
        paths.push(...collectPaths(childSchema, fullPath));
      }
    }
    return paths;
  }

  if (def.type === "array") {
    const element = (unwrapped as unknown as { element: z.ZodType }).element;
    return collectPaths(element, prefix);
  }

  if (def.type === "union" && def.options) {
    const merged = new Set<string>();
    for (const variant of def.options) {
      for (const path of collectPaths(variant, prefix)) {
        merged.add(path);
      }
    }
    return [...merged];
  }

  return [];
}

export function extractFieldPaths(schema: z.ZodType): string[] {
  return collectPaths(schema, "").sort();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/field-selection.ts src/__tests__/field-selection.test.ts
git commit -m "feat: add extractFieldPaths — Zod schema walker for field selection"
```

---

### Task 2: `validateFields` — field path validation

**Files:**
- Modify: `src/field-selection.ts`
- Modify: `src/__tests__/field-selection.test.ts`

**Interfaces:**
- Consumes: `extractFieldPaths` from Task 1
- Produces: `validateFields(requestedFields: string[], validPaths: string[]): void` — throws with a descriptive error if any requested field is invalid. Called with the `fields` array from the caller and the precomputed valid paths from `extractFieldPaths`.

- [ ] **Step 1: Write failing tests for `validateFields`**

Append to `src/__tests__/field-selection.test.ts`:

```typescript
import { validateFields } from "../field-selection.js";

describe("validateFields", () => {
  const validPaths = [
    "event",
    "event.id",
    "event.title",
    "event.image",
    "event.image.url",
    "passwordRequired",
  ];

  it("accepts valid field paths", () => {
    expect(() => validateFields(["event.id", "event.title"], validPaths)).not.toThrow();
  });

  it("accepts intermediate paths (returns whole subtree)", () => {
    expect(() => validateFields(["event"], validPaths)).not.toThrow();
  });

  it("throws for an unknown field path", () => {
    expect(() => validateFields(["event.nonexistent"], validPaths)).toThrow(
      /unknown field.*event\.nonexistent/i
    );
  });

  it("error message lists available paths", () => {
    expect(() => validateFields(["bad"], validPaths)).toThrow(/available fields/i);
  });

  it("throws for all invalid paths in one error", () => {
    expect(() => validateFields(["bad1", "event.id", "bad2"], validPaths)).toThrow(
      /bad1.*bad2/s
    );
  });

  it("deduplicates silently", () => {
    expect(() =>
      validateFields(["event.id", "event.id", "event.title"], validPaths)
    ).not.toThrow();
  });

  it("throws when validPaths is empty (no selectable fields)", () => {
    expect(() => validateFields(["anything"], [])).toThrow(
      /no selectable fields/i
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: FAIL — `validateFields` is not exported

- [ ] **Step 3: Implement `validateFields`**

Add to `src/field-selection.ts`:

```typescript
export function validateFields(
  requestedFields: string[],
  validPaths: string[]
): void {
  if (validPaths.length === 0) {
    throw new Error(
      "No selectable fields available for this tool. Omit the `fields` parameter to return the full response."
    );
  }

  const validSet = new Set(validPaths);
  const invalid = [...new Set(requestedFields)].filter((f) => !validSet.has(f));

  if (invalid.length > 0) {
    throw new Error(
      `Unknown field path(s): ${invalid.join(", ")}. Available fields: ${validPaths.join(", ")}`
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/field-selection.ts src/__tests__/field-selection.test.ts
git commit -m "feat: add validateFields — field path validation"
```

---

### Task 3: `filterFields` — response filtering

**Files:**
- Modify: `src/field-selection.ts`
- Modify: `src/__tests__/field-selection.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks (pure function)
- Produces: `filterFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown>` — recursively picks only the requested dot-paths from a data object. Arrays are mapped element-wise. Used by `server.ts` to filter handler output before returning to the caller.

- [ ] **Step 1: Write failing tests for `filterFields`**

Append to `src/__tests__/field-selection.test.ts`:

```typescript
import { filterFields } from "../field-selection.js";

describe("filterFields", () => {
  it("picks top-level scalar fields", () => {
    const data = { name: "Alice", age: 30, email: "a@b.com" };
    expect(filterFields(data, ["name", "age"])).toEqual({ name: "Alice", age: 30 });
  });

  it("picks nested object fields with dot-paths", () => {
    const data = {
      event: { id: "1", title: "Party", image: { url: "http://img", width: 100 } },
      passwordRequired: false,
    };
    expect(
      filterFields(data, ["event.title", "event.image.url", "passwordRequired"])
    ).toEqual({
      event: { title: "Party", image: { url: "http://img" } },
      passwordRequired: false,
    });
  });

  it("returns whole subtree when path stops at an object", () => {
    const data = {
      event: { id: "1", image: { url: "http://img", width: 100 } },
    };
    expect(filterFields(data, ["event.image"])).toEqual({
      event: { image: { url: "http://img", width: 100 } },
    });
  });

  it("filters array elements", () => {
    const data = {
      events: [
        { id: "1", title: "A", location: "NYC" },
        { id: "2", title: "B", location: "LA" },
      ],
    };
    expect(filterFields(data, ["events.id", "events.title"])).toEqual({
      events: [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ],
    });
  });

  it("filters nested objects inside array elements", () => {
    const data = {
      events: [
        { id: "1", guest: { userId: "u1", status: "GOING" } },
        { id: "2", guest: { userId: "u2", status: "MAYBE" } },
      ],
    };
    expect(
      filterFields(data, ["events.id", "events.guest.status"])
    ).toEqual({
      events: [
        { id: "1", guest: { status: "GOING" } },
        { id: "2", guest: { status: "MAYBE" } },
      ],
    });
  });

  it("superset path wins — broader path includes whole subtree", () => {
    const data = {
      event: { image: { url: "http://img", width: 100, height: 200 } },
    };
    expect(
      filterFields(data, ["event.image", "event.image.url"])
    ).toEqual({
      event: { image: { url: "http://img", width: 100, height: 200 } },
    });
  });

  it("handles missing keys gracefully (key not in data)", () => {
    const data = { name: "Alice" };
    expect(filterFields(data, ["name", "age"])).toEqual({ name: "Alice" });
  });

  it("returns whole array when path stops at array field", () => {
    const data = { events: [{ id: "1" }, { id: "2" }] };
    expect(filterFields(data, ["events"])).toEqual({
      events: [{ id: "1" }, { id: "2" }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: FAIL — `filterFields` is not exported

- [ ] **Step 3: Implement `filterFields`**

Add to `src/field-selection.ts`:

```typescript
export function filterFields(
  data: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const grouped = new Map<string, string[]>();
  for (const field of fields) {
    const dot = field.indexOf(".");
    if (dot === -1) {
      grouped.set(field, []);
    } else {
      const head = field.slice(0, dot);
      const tail = field.slice(dot + 1);
      const existing = grouped.get(head);
      if (existing === undefined) {
        grouped.set(head, [tail]);
      } else {
        existing.push(tail);
      }
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, subPaths] of grouped) {
    if (!(key in data)) continue;
    const value = data[key];

    if (subPaths.length === 0) {
      result[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((element) =>
        element && typeof element === "object" && !Array.isArray(element)
          ? filterFields(element as Record<string, unknown>, subPaths)
          : element
      );
    } else if (value && typeof value === "object") {
      result[key] = filterFields(value as Record<string, unknown>, subPaths);
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/field-selection.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/field-selection.ts src/__tests__/field-selection.test.ts
git commit -m "feat: add filterFields — recursive response filtering"
```

---

### Task 4: Wire field selection into `server.ts`

**Files:**
- Modify: `src/server.ts` (lines 1-7 imports, lines 178-202 registration loop)
- Modify: `src/__tests__/server.test.ts`

**Interfaces:**
- Consumes: `extractFieldPaths`, `validateFields`, `filterFields` from `src/field-selection.ts`; `Tool` type from `src/define-tool.ts`; `z` from `zod`
- Produces: updated tool registration that injects `fields` into every tool's input schema, strips it before calling the handler, and filters the response

- [ ] **Step 1: Write failing integration test**

Add to `src/__tests__/server.test.ts`:

```typescript
describe("field selection", () => {
  it("filters response when fields parameter is provided", async () => {
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      event: {
        id: "e1",
        title: "Party",
        location: "NYC",
        image: { url: "http://img", width: 100 },
      },
      passwordRequired: false,
    });

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { callback: Function }> }
    )._registeredTools;

    const getEventInfo = registeredTools["get_event_info"];
    expect(getEventInfo).toBeDefined();

    const result = await getEventInfo.callback({
      event_id: "e1",
      fields: ["event.id", "event.title", "passwordRequired"],
    });

    expect(result.structuredContent).toEqual({
      event: { id: "e1", title: "Party" },
      passwordRequired: false,
    });
  });

  it("returns full response when fields is omitted", async () => {
    const fullData = { event: { id: "e1", title: "Party" }, passwordRequired: false };
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(fullData);

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { callback: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].callback({
      event_id: "e1",
    });

    expect(result.structuredContent).toEqual(fullData);
  });

  it("returns full response when fields is empty array", async () => {
    const fullData = { event: { id: "e1" }, passwordRequired: true };
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(fullData);

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { callback: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].callback({
      event_id: "e1",
      fields: [],
    });

    expect(result.structuredContent).toEqual(fullData);
  });

  it("returns error for invalid field paths", async () => {
    const client = mockClient();
    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { callback: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].callback({
      event_id: "e1",
      fields: ["event.nonexistent"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/unknown field/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/server.test.ts`
Expected: FAIL — field selection not wired in yet (the `fields` param is either rejected by the input schema or ignored)

- [ ] **Step 3: Modify `server.ts` to wire in field selection**

At the top of `src/server.ts`, add the import:

```typescript
import { z } from "zod";
import {
  extractFieldPaths,
  validateFields,
  filterFields,
} from "./field-selection.js";
```

Change the existing `import type { z } from "zod";` to the value import above.

Replace the tool registration loop (the `for (const tool of tools)` block, lines 178-202) with:

```typescript
  for (const tool of tools) {
    const validPaths = extractFieldPaths(tool.outputSchema);
    const fieldsDescription =
      validPaths.length > 0
        ? `Dot-path field names to include in the response. Omit to return all fields. Available fields: ${validPaths.join(", ")}`
        : "No selectable fields available for this tool.";

    const extendedInputShape = {
      ...(tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape,
      fields: z.array(z.string()).optional().describe(fieldsDescription),
    };

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: extendedInputShape,
        outputSchema: (tool.outputSchema as z.ZodObject<z.ZodRawShape>).shape,
        annotations: tool.annotations,
      },
      async (rawArgs: unknown) => {
        try {
          const allArgs = rawArgs ?? {};
          const { fields: requestedFields, ...handlerArgs } =
            allArgs as Record<string, unknown>;

          if (
            Array.isArray(requestedFields) &&
            requestedFields.length > 0
          ) {
            validateFields(requestedFields as string[], validPaths);
          }

          const parsed = tool.inputSchema.parse(handlerArgs);
          const data = await tool.handler(client, parsed);
          assertStructuredContent(data, tool.name);

          if (
            Array.isArray(requestedFields) &&
            requestedFields.length > 0
          ) {
            const filtered = filterFields(
              data as Record<string, unknown>,
              requestedFields as string[]
            );
            return toolResult(filtered);
          }

          return toolResult(data);
        } catch (err) {
          return toolError(err);
        }
      }
    );
  }
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS (both field-selection unit tests and server integration tests)

- [ ] **Step 5: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/server.ts src/__tests__/server.test.ts
git commit -m "feat: wire field selection into tool registration"
```
