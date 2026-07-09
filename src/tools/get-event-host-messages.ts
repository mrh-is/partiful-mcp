import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    messages: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            text: z.string().optional(),
            createdAt: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_event_host_messages",
  description:
    "Get the host messages displayed on a Partiful event's page by ID. Returns an array of host announcement/message objects for that event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  // The real endpoint responds with { hostMessages: [...] }; remap to
  // `messages` to match the shape this tool promises callers.
  handler: async (client: ApiClient, args) => {
    const data = await client.post<{
      hostMessages?: z.infer<typeof outputSchema>["messages"];
    }>("/getEventDisplayedHostMessages", { eventId: args.event_id });
    return { messages: data.hostMessages ?? [] };
  },
});

export default tool;