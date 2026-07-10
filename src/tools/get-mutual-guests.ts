import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { guestSchema } from "../schemas.js";

const outputSchema = z.looseObject({
  totalCount: z.number().optional(),
  guests: z.array(guestSchema).optional(),
});

const tool = defineTool({
  name: "get_mutual_guests",
  description:
    "Get guests you have in common with a specific Partiful event — i.e. people invited to this event who you're also connected to elsewhere. Distinct from get_guests (every guest, not just mutual ones) and get_mutuals (your mutual connections generally, not scoped to one event).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getMutualGuests", {
      eventId: args.event_id,
    }),
});

export default tool;
