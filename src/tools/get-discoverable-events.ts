import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events for the home page 'Open invite' tab, as an `events` array. Unlike get_my_events/get_my_upcoming_events/get_my_past_events/get_hosted_events, these events aren't necessarily ones you've been invited to or RSVPed to — they're publicly discoverable events surfaced to you. Distinct from get_saved_events (events you've explicitly bookmarked) and get_followed_events (events from people/pages you follow).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getDiscoverableEvents", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
