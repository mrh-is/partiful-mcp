import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events for the home page 'Open invite' tab, as an `events` array. Unlike get_my_rsvps/get_my_upcoming_events_for_home_page/get_my_past_events_for_home_page/get_published_events, these events aren't necessarily ones you've been invited to or RSVPed to — they're publicly discoverable events surfaced to you. Distinct from get_my_saved_events (events you've explicitly bookmarked) and get_my_followed_events (events from people/pages you follow).",
  inputSchema: z.object({}),
  outputSchema,
  // /getDiscoverableEvents returns a bare array, not { events: [...] } — wrap
  // it so structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, _args) => {
    const events = await client.post<z.infer<typeof eventSchema>[]>(
      "/getDiscoverableEvents",
      {}
    );
    return { events };
  },
});

export default tool;