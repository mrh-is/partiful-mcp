import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool, orEmptyObject } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    eligible: z.boolean().optional(),
    reason: z.string().optional(),
  });

const tool = defineTool({
  name: "get_event_ticketing_eligibility",
  description:
    "Check whether a Partiful event by ID is eligible for ticketing. Returns an eligibility boolean and, if ineligible, the reason.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>(
      "/getEventTicketingEligibility",
      { eventId: args.event_id }
    );
    // The real response shape isn't documented; the outputSchema is a best-effort
    // guess. orEmptyObject() guards against a non-object (or missing) response so a
    // mismatched shape doesn't throw an MCP protocol error at the SDK's
    // output-validation step.
    return orEmptyObject<z.infer<typeof outputSchema>>(result);
  },
});

export default tool;