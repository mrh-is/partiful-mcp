import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    stats: z
      .array(
        z
          .object({
            userId: z.string().optional(),
            attendedCount: z.number().optional(),
            hostedCount: z.number().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_users_party_stats",
  description:
    "Get just the party stats (events attended count, events hosted count) for a batch of Partiful user IDs — lighter weight than get_users, which returns full profile info (name, username, profile image) with party stats always baked in as well.",
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
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
  return client.post("/getUsersPartyStats", { userIds: args.user_ids });
}
