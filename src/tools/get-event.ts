import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema, myRsvpsDataSchema } from "../schemas.js";

const tool = defineTool({
  name: "get_event",
  description:
    "Get full details for a specific Partiful event by ID. Returns the complete event object: title, dates, location, ownership, host/guest display settings, guest status counts, and the current user's own RSVP (guest) record.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema: eventSchema,
  handler: async (client: ApiClient, args) => {
    const data = await client.post<z.infer<typeof myRsvpsDataSchema>>(
      "/getMyRsvps",
      {}
    );
    const event = data.events.find((e) => e.id === args.event_id);
    if (!event) {
      throw new Error(
        `Event ${args.event_id} not found in your invites. Check the event ID and make sure you've been invited.`
      );
    }
    return event;
  },
});

export default tool;