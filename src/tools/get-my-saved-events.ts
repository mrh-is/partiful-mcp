import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_my_saved_events",
  description:
    "Get your saved/bookmarked Partiful events, as an `events` array. These are events you've explicitly saved for later, distinct from get_discoverable_events (open invite public events), get_my_followed_events (events from people/pages you follow), and get_my_rsvps (events you've been invited to or RSVPed to).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMySavedEvents", {}),
});

export default tool;