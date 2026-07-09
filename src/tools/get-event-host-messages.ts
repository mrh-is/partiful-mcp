import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            id: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_host_messages",
  description:
    "Get the host messages displayed on a Partiful event's page by ID. Returns an array of host announcement/message objects for that event.",
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
  return client.post("/getEventDisplayedHostMessages", { eventId: args.event_id });
}
