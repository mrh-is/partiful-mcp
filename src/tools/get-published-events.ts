import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_published_events",
  description:
    "Get all Partiful events you are hosting (any time period), as an `events` array with title, date, location, and guest counts. Use this instead of get_my_rsvps (which covers events you attend/RSVP to, not necessarily host) or get_my_upcoming_events_for_home_page/get_my_past_events_for_home_page (which are home-page views scoped by time, not by host role).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) => {
    const userId = await client.getUserId();
    // Unlike the other event-list endpoints, this one responds with a bare
    // array rather than an `{ events: [...] }` envelope.
    const events = await client.post<z.infer<typeof eventSchema>[]>(
      "/getPublishedEvents",
      { userId }
    );
    return { events };
  },
});

export default tool;