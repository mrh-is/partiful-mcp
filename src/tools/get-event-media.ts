import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_media",
  description: "Get photos and media uploaded to a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventMedia", { eventId: args.event_id });
}
