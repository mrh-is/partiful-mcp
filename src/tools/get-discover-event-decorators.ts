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
  // The real endpoint responds with { decoratorsByEventId: { <eventId>: {...} } },
  // not a `decorators` array — flatten it back into the array shape this
  // tool promises callers, keyed by eventId as before.
  handler: async (client: ApiClient, args) => {
    const data = await client.post<{
      decoratorsByEventId?: Record<string, Record<string, unknown>>;
    }>("/getDiscoverEventItemDecorators", { eventIds: args.event_ids });
    const decorators = Object.entries(data.decoratorsByEventId ?? {}).map(
      ([eventId, decorator]) => ({ eventId, ...decorator })
    );
    return { decorators };
  },
});

export default tool;