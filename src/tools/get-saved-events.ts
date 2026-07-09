import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_saved_events",
  description: "Get your saved/bookmarked Partiful events.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMySavedEvents", {});
}
