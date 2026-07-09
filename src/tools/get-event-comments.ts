import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    comments: z
      .array(
        z
          .object({
            id: z.string().optional(),
            eventId: z.string().optional(),
            userId: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_comments",
  description:
    "Get comments/discussion posted on a Partiful event by ID. Returns an array of comment objects (author, text, timestamp) for that event.",
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
  return client.post("/getEventComments", { eventId: args.event_id });
}
