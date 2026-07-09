import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_invitable_contacts",
  description: "Get contacts that can be invited to a specific Partiful event, paginated.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    skip: z.number().describe("Number of contacts to skip (pagination offset)"),
    limit: z.number().describe("Maximum number of contacts to return"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string; skip: number; limit: number }
): Promise<unknown> {
  return client.post("/getInvitableContacts", {
    eventId: args.event_id,
    skip: args.skip,
    limit: args.limit,
  });
}
