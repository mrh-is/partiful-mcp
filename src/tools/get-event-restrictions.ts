import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    minAge: z.number().optional(),
    maxCapacity: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_event_restrictions",
  description:
    "Get the restrictions (e.g. minimum age, capacity, approval requirements) configured for a Partiful event by ID.",
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
    client.post<z.infer<typeof outputSchema>>("/getEventRestrictions", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
