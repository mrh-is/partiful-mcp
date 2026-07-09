import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_followed_events",
  description: "Get Partiful events you're following.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyFollowedEvents", {});
}
