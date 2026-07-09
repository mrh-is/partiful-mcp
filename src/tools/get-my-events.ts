import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_my_events",
  description:
    "Get every Partiful event you've been invited to or RSVPed to (any status, any time period), as an `events` array with the richest per-event data available (RSVP status, guest counts, image, display settings). Broader than get_my_upcoming_events/get_my_past_events (which are time-filtered home-page views) and distinct from get_hosted_events (events you host rather than attend) and get_discoverable_events/get_saved_events/get_followed_events (events you haven't necessarily RSVPed to).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyRsvps", {}),
});

export default tool;
// Temporary aliases: server.ts and tools.test.ts still import the pre-refactor
// `definition`/`handler` names. Removed once the server.ts auto-discovery task
// rewires both to the default export.
export const definition = tool;
export const handler = tool.handler;
