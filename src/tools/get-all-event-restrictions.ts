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
  // /getAllEventRestrictions returns a bare array, not { restrictions: [...] }
  // — wrap it so structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, _args) => {
    const restrictions = await client.post<Record<string, unknown>[]>(
      "/getAllEventRestrictions",
      {}
    );
    return { restrictions };
  },
});

export default tool;