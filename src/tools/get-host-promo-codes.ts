import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    promoCodes: z
      .array(
        z
          .object({
            id: z.string().optional(),
            code: z.string().optional(),
            discount: z.number().optional(),
            maxUses: z.number().optional(),
            usedCount: z.number().optional(),
            disabled: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_host_promo_codes",
  description:
    "Get promo codes for a Partiful event you're hosting. Returns a list of promo code objects (code, discount, usage limits) for the event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  outputSchema,
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getHostPromoCodes", { eventId: args.event_id });
}
