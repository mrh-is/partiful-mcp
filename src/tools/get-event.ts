import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData, PartifulEvent } from "../types.js";

export const definition = {
  name: "get_event",
  description:
    "Get full details for a specific Partiful event by ID. Returns the complete event object including title, dates, location, guest counts, RSVP status, and display settings.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<PartifulEvent> {
  const data = await client.post<MyRsvpsData>("/getMyRsvps", {});
  const event = data.events.find((e) => e.id === args.event_id);
  if (!event) {
    throw new Error(
      `Event ${args.event_id} not found in your invites. Check the event ID and make sure you've been invited.`
    );
  }
  return event;
}
