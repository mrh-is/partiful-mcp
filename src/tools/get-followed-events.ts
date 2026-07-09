import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_followed_events",
  description:
    "Get Partiful events you're following, as an `events` array. Following tracks events from hosts/pages you follow without necessarily RSVPing, distinct from get_saved_events (explicitly bookmarked events), get_discoverable_events (open invite public events), and get_my_events (events you've been invited to or RSVPed to).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyFollowedEvents", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
