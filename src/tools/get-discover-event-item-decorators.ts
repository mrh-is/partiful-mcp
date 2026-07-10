import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  decoratorsByEventId: z.record(z.string(), z.looseObject({})).optional(),
});

const tool = defineTool({
  name: "get_discover_event_item_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.). Returns `decoratorsByEventId`, an object of decorator data keyed by event ID.",
  inputSchema: z.object({
    event_ids: z.array(z.string()).describe("Array of Partiful event IDs"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getDiscoverEventItemDecorators",
      { eventIds: args.event_ids }
    ),
});

export default tool;