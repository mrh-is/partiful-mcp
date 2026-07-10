import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

// Real response shape isn't confirmed — this account doesn't host any
// ticketed events, so live testing only got a 403 (consistent with the
// {eventId} param shape being correct, but not verifying the payload).
const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "get_tickets_for_event",
  description:
    "Get all tickets sold for a ticketed Partiful event (host-only). Distinct from get_tickets_for_ticket_type (scoped to one ticket type) and get_guest_payment_info (payment history for one guest).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getTicketsForEvent", {
      eventId: args.event_id,
    });
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
