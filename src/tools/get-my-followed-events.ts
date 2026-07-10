import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.looseObject({ events: z.array(eventSchema) });

const tool = defineTool({
  name: "get_my_followed_events",
  description:
    "Get Partiful events you're following, as an `events` array. Following tracks events from hosts/pages you follow without necessarily RSVPing, distinct from get_my_saved_events (explicitly bookmarked events), get_discoverable_events (open invite public events), and get_my_rsvps (events you've been invited to or RSVPed to).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyFollowedEvents", {}),
});

export default tool;