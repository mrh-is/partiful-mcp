import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

// Real response shape isn't confirmed — this account doesn't host the test
// event, so live testing only got a 403 (consistent with the {eventId} param
// shape being correct, but not verifying the payload).
const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "get_discover_curation_options",
  description:
    "Get discover-page curation options for a hosted Partiful event (host-only) — the host-side settings controlling how the event can appear on the explore/discover page. Distinct from get_event_discover_info (the resulting discover-page info) and get_event_discover_status (whether it's currently listed).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getDiscoverCurationOptions", {
      eventId: args.event_id,
    });
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
