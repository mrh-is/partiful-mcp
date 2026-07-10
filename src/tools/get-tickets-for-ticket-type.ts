import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

// Real response shape isn't confirmed — this account doesn't host any
// ticketed events, so live testing only got a 403 (consistent with the
// {eventId, ticketTypeId} param shape being correct, but not verifying the
// payload).
const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "get_tickets_for_ticket_type",
  description:
    "Get all tickets sold for one ticket type on a hosted Partiful event (host-only). Narrower than get_tickets_for_event (every ticket on the event, all types).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    ticket_type_id: z.string().describe("The ticket type ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getTicketsForTicketType", {
      eventId: args.event_id,
      ticketTypeId: args.ticket_type_id,
    });
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;
