import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    hostMessages: z
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
    "Get the host messages displayed on a Partiful event's page by ID. Returns `hostMessages`, an array of host announcement/message objects for that event.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getEventDisplayedHostMessages",
      { eventId: args.event_id }
    ),
});

export default tool;