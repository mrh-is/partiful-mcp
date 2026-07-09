import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    restrictions: z
      .array(
        z
          .object({
            eventId: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_all_event_restrictions",
  description:
    "Get restrictions across all of your Partiful events. Returns a list of per-event restriction records.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getAllEventRestrictions", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
