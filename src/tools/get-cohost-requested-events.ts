import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    events: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            title: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_cohost_requested_events",
  description:
    "Get events where you've been asked to cohost. Returns a list of event objects awaiting your cohost response.",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getCohostRequestedEvents",
      {}
    ),
});

export default tool;