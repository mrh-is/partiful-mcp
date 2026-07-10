import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { guestSchema } from "../schemas.js";

const outputSchema = z
  .looseObject({ guests: z.array(guestSchema).optional() });

const tool = defineTool({
  name: "get_guests",
  description:
    "Get the full guest list for a Partiful event by ID. Returns an array of guest RSVP records (guest/event/user IDs and RSVP status) for every invitee.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  // /getGuests returns a bare array, not { guests: [...] } — wrap it so
  // structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, args) => {
    const guests = await client.post<z.infer<typeof guestSchema>[]>(
      "/getGuests",
      { eventId: args.event_id }
    );
    return { guests };
  },
});

export default tool;