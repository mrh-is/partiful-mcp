import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    guests: z
      .array(
        z
          .object({
            id: z.string().optional(),
            eventId: z.string().optional(),
            userId: z.string().optional(),
            status: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_guests",
  description:
    "Get the full guest list for a Partiful event by ID. Returns an array of guest RSVP records (guest/event/user IDs and RSVP status) for every invitee.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
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
  args: { event_id: string }
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getGuests", { eventId: args.event_id });
}
