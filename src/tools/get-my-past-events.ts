import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_past_events",
  description:
    "Get your past Partiful events for the home page (the 'All past events' tab).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyPastEventsForHomePage", {});
}
