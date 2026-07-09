import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    discoverable: z.boolean().optional(),
    status: z.string().optional(),
  });

const tool = defineTool({
  name: "get_event_discover_status",
  description:
    "Check whether a Partiful event is listed on explore/discover. Returns the event's discoverability flag/status.",
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