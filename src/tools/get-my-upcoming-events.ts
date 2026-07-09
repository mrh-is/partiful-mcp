import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_upcoming_events",
  description:
    "Get your upcoming Partiful events for the home page (the 'Upcoming' view).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyUpcomingEventsForHomePage", {});
}
