import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  region: z.string().nullable().optional(),
  sections: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const tool = defineTool({
  name: "get_event_discover_info",
  description:
    "Get discover-page info (region, sections, tags) for a Partiful event by ID. Distinct from get_event_discover_status (whether the event is listed at all) and get_discover_curation_options (host-side curation settings).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventDiscoverInfo", {
      eventId: args.event_id,
    }),
});

export default tool;
