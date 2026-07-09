import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { eventSchema } from "../schemas.js";

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

const tool = defineTool({
  name: "get_hosted_events",
  description:
    "Get all Partiful events you are hosting (any time period), as an `events` array with title, date, location, and guest counts. Use this instead of get_my_events (which covers events you attend/RSVP to, not necessarily host) or get_my_upcoming_events/get_my_past_events (which are home-page views scoped by time, not by host role).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getHostedEvents", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
