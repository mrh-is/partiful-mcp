import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    decorators: z
      .array(
        z
          .looseObject({
            eventId: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_discover_event_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.). Returns an array of per-event decorator objects keyed by event ID.",
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