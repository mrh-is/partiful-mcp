import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_host_messages",
  description: "Get host messages displayed on a Partiful event page.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventDisplayedHostMessages", { eventId: args.event_id });
}
