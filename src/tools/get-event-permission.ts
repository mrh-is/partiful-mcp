import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    role: z.string().optional(),
    canEdit: z.boolean().optional(),
    canInvite: z.boolean().optional(),
    canManageGuests: z.boolean().optional(),
  });

const tool = defineTool({
  name: "get_event_permission",
  description:
    "Get the current authenticated user's permission level and capability flags (e.g. edit, invite, manage guests) for a Partiful event by ID.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventPermission", {
      eventId: args.event_id,
    }),
});

export default tool;