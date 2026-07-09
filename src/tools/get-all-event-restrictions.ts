import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    restrictions: z
      .array(
        z
          .looseObject({
            eventId: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_all_event_restrictions",
  description:
    "Get restrictions across all of your Partiful events. Returns a list of per-event restriction records.",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getAllEventRestrictions", {}),
});

export default tool;