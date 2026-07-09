import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_users_party_stats",
  description:
    "Get party stats (events attended, hosted) for a batch of Partiful user profiles.",
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { user_ids: string[] }
): Promise<unknown> {
  return client.post("/getUsersPartyStats", { userIds: args.user_ids });
}
