import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_host_promo_codes",
  description: "Get promo codes for a Partiful event you're hosting.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/getHostPromoCodes", { eventId: args.event_id });
}
