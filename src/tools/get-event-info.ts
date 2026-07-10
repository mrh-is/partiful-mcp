import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({
  event: eventSchema.omit({ guest: true }),
  passwordRequired: z.boolean().optional(),
});

const tool = defineTool({
  name: "get_event_info",
  description:
    "Get full details for a specific Partiful event by ID, as an `event` object: title, dates, location, ownership, host/guest display settings, and guest status counts. Works for any event you can view (not just ones you've been invited to), unlike the RSVP-list tools — but unlike those, it does not include the current user's own RSVP (guest) status.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventInfo", {
      eventId: args.event_id,
    }),
});

export default tool;
