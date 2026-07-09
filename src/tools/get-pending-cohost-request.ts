import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    id: z.string().optional(),
    eventId: z.string().optional(),
    inviterId: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const definition = {
  name: "get_pending_cohost_request",
  description:
    "Get the pending cohost invitation for a Partiful event by ID, if the current user has one outstanding. Returns the invitation record's fields (id, event, inviter, status), or an empty object if none is pending.",
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
  return client.post("/getPendingCohostRequestForEvent", { eventId: args.event_id });
}
