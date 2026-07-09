import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_users_party_stats",
  description:
    "Get just the party stats (events attended count, events hosted count) for a batch of Partiful user IDs — lighter weight than get_users, which returns full profile info (name, username, profile image) with party stats always baked in as well.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    user_ids: z.array(z.string()).describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getUsersPartyStats", {
      userIds: args.user_ids,
    }),
});

export default tool;