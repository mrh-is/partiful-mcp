import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_users",
  description:
    "Fetch Partiful user profiles by their IDs. Returns name, display name, username, and profile image.",
  inputSchema: z.object({
    user_ids: z
      .array(z.string())
      .describe("Array of Partiful user IDs to look up"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { user_ids: string[] }
): Promise<unknown> {
  return client.post("/getUsers", {
    ids: args.user_ids,
    excludePartyStats: false,
    includePartyStats: true,
  });
}
