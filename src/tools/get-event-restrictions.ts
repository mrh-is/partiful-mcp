import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    minAge: z.number().optional(),
    maxCapacity: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  });

const tool = defineTool({
  name: "get_event_restrictions",
  description:
    "Get the restrictions (e.g. minimum age, capacity, approval requirements) configured for a Partiful event by ID.",
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