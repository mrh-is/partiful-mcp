import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_event_comments",
  description:
    "Get comments/discussion posted on a Partiful event by ID. Returns an array of comment objects (author, text, timestamp) for that event.",
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
    client.post<z.infer<typeof outputSchema>>("/getEventComments", {
      eventId: args.event_id,
    }),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
