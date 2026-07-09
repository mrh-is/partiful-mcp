import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_event_permission",
  description: "Get the current user's permissions for a Partiful event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getEventPermission", { eventId: args.event_id });
}
