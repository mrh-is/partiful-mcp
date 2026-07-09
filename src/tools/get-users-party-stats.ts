import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    stats: z
      .array(
        z
          .looseObject({
            userId: z.string().optional(),
            attendedCount: z.number().optional(),
            hostedCount: z.number().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_users_party_stats",
  description:
    "Get just the party stats (events attended count, events hosted count) for a batch of Partiful user IDs — lighter weight than get_users, which returns full profile info (name, username, profile image) with party stats always baked in as well.",
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  // The real endpoint responds with a bare object keyed by userId
  // (e.g. { "<userId>": { attendedCount, hostedCount, ... } }), not
  // { stats: [...] } — flatten it into the array shape this tool promises.
  handler: async (client: ApiClient, args) => {
    const data = await client.post<
      Record<string, { attendedCount?: number; hostedCount?: number }>
    >("/getUsersPartyStats", { userIds: args.user_ids });
    const stats = Object.entries(data).map(([userId, s]) => ({
      userId,
      ...s,
    }));
    return { stats };
  },
});

export default tool;