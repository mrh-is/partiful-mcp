import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    ticketTypes: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            price: z.number().optional(),
            currency: z.string().optional(),
            quantity: z.number().optional(),
            disabled: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_host_ticket_types",
  description:
    "Get ticket types/tiers for a Partiful event you're hosting. Returns a list of ticket type objects (name, price, quantity, enabled/disabled state).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    include_disabled: z
      .boolean()
      .optional()
      .describe("Include disabled ticket types (defaults to true)"),
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
  args: { event_id: string; include_disabled?: boolean }
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getHostTicketTypes", {
    eventId: args.event_id,
    includeDisabled: args.include_disabled ?? true,
  });
}
