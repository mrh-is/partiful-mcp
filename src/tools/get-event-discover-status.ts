import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_discover_status",
  description: "Check whether a Partiful event is listed on explore/discover.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventDiscoverStatus", { eventId: args.event_id });
}
