import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    users: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            displayName: z.string().optional(),
            username: z.string().optional(),
            profileImageUrl: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_users",
  description:
    "Fetch Partiful user profiles by their IDs. Returns per-user name, display name, username, and profile image (with party stats included by default). Use get_users_party_stats instead if you only need attended/hosted event counts, not full profile info.",
  inputSchema: z.object({
    user_ids: z
      .array(z.string())
      .describe("Array of Partiful user IDs to look up"),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  outputSchema,
};

export async function handler(
  client: ApiClient,
  args: { user_ids: string[] }
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getUsers", {
    ids: args.user_ids,
    excludePartyStats: false,
    includePartyStats: true,
  });
}
