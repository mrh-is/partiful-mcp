import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_ticketing_eligibility",
  description: "Check whether a Partiful event supports ticketing.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventTicketingEligibility", { eventId: args.event_id });
}
