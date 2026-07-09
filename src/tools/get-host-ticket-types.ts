import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_host_ticket_types",
  description:
    "Get ticket types/tiers for a Partiful event you're hosting. Returns a list of ticket type objects (name, price, quantity, enabled/disabled state).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    include_disabled: z
      .boolean()
      .optional()
      .describe("Include disabled ticket types (defaults to true)"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostTicketTypes", {
      eventId: args.event_id,
      includeDisabled: args.include_disabled ?? true,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
