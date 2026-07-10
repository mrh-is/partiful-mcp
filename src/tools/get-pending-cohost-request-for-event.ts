import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  pendingCohostRequest: z
    .looseObject({
      id: z.string().optional(),
      eventId: z.string().optional(),
      inviterId: z.string().optional(),
      status: z.string().optional(),
      createdAt: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const tool = defineTool({
  name: "get_pending_cohost_request_for_event",
  description:
    "Get the pending cohost invitation for a Partiful event by ID, if the current user has one outstanding. Returns `pendingCohostRequest`, the invitation record's fields (id, event, inviter, status), or null if none is pending.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getPendingCohostRequestForEvent",
      { eventId: args.event_id }
    ),
});

export default tool;