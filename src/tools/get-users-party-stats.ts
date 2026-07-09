import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  // The real endpoint responds with a bare object keyed by userId (no
  // wrapper field at all); statsByUserId names that shape for callers,
  // since our tool contract requires a top-level object schema.
  statsByUserId: z
    .record(
      z.string(),
      z.looseObject({
        attendedCount: z.number().optional(),
        hostedCount: z.number().optional(),
      })
    )
    .optional(),
});

const tool = defineTool({
  name: "get_users_party_stats",
  description:
    "Get just the party stats (events attended count, events hosted count) for a batch of Partiful user IDs — lighter weight than get_users, which returns full profile info (name, username, profile image) with party stats always baked in as well. Returns `statsByUserId`, an object of stats keyed by user ID.",
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const statsByUserId = await client.post<
      z.infer<typeof outputSchema>["statsByUserId"]
    >("/getUsersPartyStats", { userIds: args.user_ids });
    return { statsByUserId };
  },
});

export default tool;