import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_pending_cohost_request",
  description: "Get the pending cohost invitation for a Partiful event, if any.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getPendingCohostRequestForEvent", { eventId: args.event_id });
}
