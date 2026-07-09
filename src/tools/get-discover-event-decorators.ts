import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    decorators: z
      .array(
        z
          .object({
            eventId: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_discover_event_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.). Returns an array of per-event decorator objects keyed by event ID.",
  inputSchema: z.object({
    event_ids: z.array(z.string()).describe("Array of Partiful event IDs"),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  outputSchema,
};

export async function handler(
  client: ApiClient,
  args: { event_ids: string[] }
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getDiscoverEventItemDecorators", { eventIds: args.event_ids });
}
