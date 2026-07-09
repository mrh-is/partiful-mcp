import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_host_promo_codes",
  description:
    "Get promo codes for a Partiful event you're hosting. Returns a list of promo code objects (code, discount, usage limits) for the event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostPromoCodes", {
      eventId: args.event_id,
    }),
});

export default tool;