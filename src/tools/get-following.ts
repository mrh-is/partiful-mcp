import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({
  userIds: z.array(z.string()).optional(),
});

const tool = defineTool({
  name: "get_following",
  description:
    "Get the user IDs the current user follows on Partiful, as a `userIds` array. Distinct from get_followers (who follows the current user, not who they follow). Use get_users to resolve these IDs into profiles.",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getFollowing", {}),
});

export default tool;
