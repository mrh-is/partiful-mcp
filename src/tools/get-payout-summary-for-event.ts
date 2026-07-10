import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool, orEmptyObject } from "../define-tool.js";

// Real response shape isn't confirmed — this account doesn't host any
// ticketed events, so live testing only got a 403 (consistent with the
// {eventId} param shape being correct, but not verifying the payload).
const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "get_payout_summary_for_event",
  description:
    "Get the host payout summary for a ticketed Partiful event (host-only) — total sales, fees, and amount payable to the host.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>("/getPayoutSummaryForEvent", {
      eventId: args.event_id,
    });
    return orEmptyObject<z.infer<typeof outputSchema>>(result);
  },
});

export default tool;
