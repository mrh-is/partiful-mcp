import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_my_past_events",
  description:
    "Get your past Partiful events for the home page 'All past events' tab, as an `events` array. This is the past-only counterpart to get_my_upcoming_events — for the complete unfiltered history (past and future) use get_my_events instead.",
  inputSchema: z.object({}),
  outputSchema,
  // The real endpoint responds with { pastEvents: [...] }; remap to `events`
  // to keep a consistent field name across all get-*-events tools.
  handler: async (client: ApiClient, _args) => {
    const data = await client.post<{ pastEvents?: z.infer<typeof eventSchema>[] }>(
      "/getMyPastEventsForHomePage",
      {}
    );
    return { events: data.pastEvents ?? [] };
  },
});

export default tool;