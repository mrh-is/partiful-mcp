import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    id: z.string().optional(),
    eventId: z.string().optional(),
    inviterId: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
  });

const tool = defineTool({
  name: "get_pending_cohost_request",
  description:
    "Get the pending cohost invitation for a Partiful event by ID, if the current user has one outstanding. Returns the invitation record's fields (id, event, inviter, status), or an empty object if none is pending.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  // The real endpoint wraps the record (or null) under
  // { pendingCohostRequest: ... }; unwrap it to match the flat shape this
  // tool promises callers.
  handler: async (client: ApiClient, args) => {
    const data = await client.post<{
      pendingCohostRequest?: z.infer<typeof outputSchema> | null;
    }>("/getPendingCohostRequestForEvent", { eventId: args.event_id });
    return data.pendingCohostRequest ?? {};
  },
});

export default tool;