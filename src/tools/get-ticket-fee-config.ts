import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  flatFee: z.number().optional(),
  feeRate: z.number().optional(),
  isCustomFee: z.boolean().optional(),
});

const tool = defineTool({
  name: "get_ticket_fee_config",
  description:
    "Get Partiful's ticketing fee configuration (flat fee, fee rate, whether it's a custom rate) for a specific event, or the platform default if no event is given.",
  inputSchema: z.object({
    event_id: z
      .string()
      .optional()
      .describe("The Partiful event ID (omit for the platform default)"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getTicketFeeConfig", {
      eventId: args.event_id,
    }),
});

export default tool;
