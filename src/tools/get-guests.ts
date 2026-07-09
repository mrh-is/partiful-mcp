import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_guests",
  description: "Get the full guest list for a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getGuests", { eventId: args.event_id });
}
