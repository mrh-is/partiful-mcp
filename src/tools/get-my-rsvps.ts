import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_my_rsvps",
  description:
    "Get every Partiful event you've been invited to or RSVPed to (any status, any time period), as an `events` array with the richest per-event data available (RSVP status, guest counts, image, display settings). Broader than get_my_upcoming_events_for_home_page/get_my_past_events_for_home_page (which are time-filtered home-page views) and distinct from get_published_events (events you host rather than attend) and get_discoverable_events/get_my_saved_events/get_my_followed_events (events you haven't necessarily RSVPed to).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyRsvps", {}),
});

export default tool;