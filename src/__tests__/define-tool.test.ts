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
