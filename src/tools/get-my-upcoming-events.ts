import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_my_upcoming_events",
  description:
    "Get your upcoming Partiful events for the home page 'Upcoming' view, as an `events` array. This is the future-only, home-page-curated subset — for the complete unfiltered RSVP/invite history use get_my_events, and for hosted-only events regardless of date use get_hosted_events.",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getMyUpcomingEventsForHomePage",
      {}
    ),
});

export default tool;