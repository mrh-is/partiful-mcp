import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  restrictions: z.array(z.looseObject({})).optional(),
});

const tool = defineTool({
  name: "get_event_restrictions",
  description:
    "Get the restrictions (e.g. minimum age, capacity, approval requirements) configured for a Partiful event by ID. Returns a `restrictions` array; the real per-restriction shape isn't documented, so entries pass through as-is.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  // /getEventRestrictions returns a bare array, not { restrictions: [...] }
  // — wrap it so structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, args) => {
    const restrictions = await client.post<Record<string, unknown>[]>(
      "/getEventRestrictions",
      { eventId: args.event_id }
    );
    return { restrictions };
  },
});

export default tool;