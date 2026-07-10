import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    comments: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            eventId: z.string().optional(),
            userId: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_event_comments",
  description:
    "Get comments/discussion posted on a Partiful event by ID. Returns an array of comment objects (author, text, timestamp) for that event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getEventComments", {
      eventId: args.event_id,
    }),
});

export default tool;