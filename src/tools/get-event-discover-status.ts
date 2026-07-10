import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool, orEmptyObject } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    discoverable: z.boolean().optional(),
    status: z.string().optional(),
  });

const tool = defineTool({
  name: "get_event_discover_status",
  description:
    "Check whether a Partiful event is listed on explore/discover. Returns the event's discoverability flag/status. Distinct from get_event_discover_info (the region/sections/tags shown once listed) and get_discover_curation_options (host-only settings controlling how it can be listed).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getEventDiscoverStatus", {
      eventId: args.event_id,
    });
    // The real response shape isn't documented; the outputSchema is a best-effort
    // guess. orEmptyObject() guards against a non-object (or missing) response so a
    // mismatched shape doesn't throw an MCP protocol error at the SDK's
    // output-validation step.
    return orEmptyObject<z.infer<typeof outputSchema>>(result);
  },
});

export default tool;