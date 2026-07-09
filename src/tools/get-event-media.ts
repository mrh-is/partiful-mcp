import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_event_media",
  description:
    "Get photos and media uploaded to a Partiful event by ID. Returns an array of media items (URL, content type, uploader) shared to that event.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventMedia", {
      eventId: args.event_id,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
