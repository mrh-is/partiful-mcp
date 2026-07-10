import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  payments: z
    .array(
      z.looseObject({
        ticketOrderId: z.string().optional(),
        createdAt: z.iso.datetime().optional(),
        ticketCount: z.number().optional(),
        amountCharged: z.number().optional(),
        feesTotal: z.number().optional(),
        taxTotal: z.number().optional(),
        currency: z.string().optional(),
        promoCodes: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

const tool = defineTool({
  name: "get_guest_payment_info",
  description:
    "Get ticket payment history for a specific guest on a hosted Partiful event (host-only). Returns a `payments` array (amounts charged, fees, tax, promo codes used).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    purchaser_user_id: z
      .string()
      .describe("The Firebase user ID of the guest who made the purchase"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getGuestPaymentInfo", {
      eventId: args.event_id,
      purchaserUserId: args.purchaser_user_id,
    }),
});

export default tool;
