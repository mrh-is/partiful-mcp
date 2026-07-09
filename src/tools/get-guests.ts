import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { guestSchema } from "../schemas.js";

const outputSchema = z
  .object({ guests: z.array(guestSchema).optional() })
  .passthrough();

const tool = defineTool({
  name: "get_guests",
  description:
    "Get the full guest list for a Partiful event by ID. Returns an array of guest RSVP records (guest/event/user IDs and RSVP status) for every invitee.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getGuests", {
      eventId: args.event_id,
    }),
});

export default tool;