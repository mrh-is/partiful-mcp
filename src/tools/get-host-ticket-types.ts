import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_host_ticket_types",
  description: "Get ticket types/tiers for a Partiful event you're hosting.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    include_disabled: z
      .boolean()
      .optional()
      .describe("Include disabled ticket types (defaults to true)"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string; include_disabled?: boolean }
): Promise<unknown> {
  return client.post("/getHostTicketTypes", {
    eventId: args.event_id,
    includeDisabled: args.include_disabled ?? true,
  });
}
