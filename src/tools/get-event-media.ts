import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    media: z
      .array(
        z
          .object({
            id: z.string().optional(),
            url: z.string().optional(),
            contentType: z.string().optional(),
            uploaderId: z.string().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_media",
  description:
    "Get photos and media uploaded to a Partiful event by ID. Returns an array of media items (URL, content type, uploader) shared to that event.",
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
  return client.post("/getEventMedia", { eventId: args.event_id });
}
