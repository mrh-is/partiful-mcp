import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { userSchema } from "../schemas.js";

const outputSchema = z
  .looseObject({ users: z.array(userSchema).optional() });

const tool = defineTool({
  name: "get_users",
  description:
    "Fetch Partiful user profiles by their IDs. Returns per-user name, display name, username, and profile image, with party stats (events attended/hosted) baked into every response. Use get_users_party_stats instead if you only need attended/hosted event counts, not full profile info.",
  inputSchema: z.object({
    user_ids: z
      .array(z.string())
      .describe("Array of Partiful user IDs to look up"),
  }),
  outputSchema,
  // /getUsers returns a bare array, not { users: [...] } — wrap it so
  // structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, args) => {
    const users = await client.post<z.infer<typeof userSchema>[]>("/getUsers", {
      ids: args.user_ids,
      excludePartyStats: false,
      includePartyStats: true,
    });
    return { users };
  },
});

export default tool;