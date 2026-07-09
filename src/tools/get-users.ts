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
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getUsers", {
      ids: args.user_ids,
      excludePartyStats: false,
      includePartyStats: true,
    }),
});

export default tool;