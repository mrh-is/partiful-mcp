import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    eligible: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_ticketing_eligibility",
  description:
    "Check whether a Partiful event by ID is eligible for ticketing. Returns an eligibility boolean and, if ineligible, the reason.",
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
  return client.post("/getEventTicketingEligibility", { eventId: args.event_id });
}
