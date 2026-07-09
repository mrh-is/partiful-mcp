import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    minAge: z.number().optional(),
    maxCapacity: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_restrictions",
  description:
    "Get the restrictions (e.g. minimum age, capacity, approval requirements) configured for a Partiful event by ID.",
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
  return client.post("/getEventRestrictions", { eventId: args.event_id });
}
