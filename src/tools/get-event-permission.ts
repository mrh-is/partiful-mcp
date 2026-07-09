import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    role: z.string().optional(),
    canEdit: z.boolean().optional(),
    canInvite: z.boolean().optional(),
    canManageGuests: z.boolean().optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_permission",
  description:
    "Get the current authenticated user's permission level and capability flags (e.g. edit, invite, manage guests) for a Partiful event by ID.",
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
  return client.post("/getEventPermission", { eventId: args.event_id });
}
