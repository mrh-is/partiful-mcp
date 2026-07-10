import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { userSchema } from "../schemas.js";

const outputSchema = z.looseObject({ users: z.array(userSchema).optional() });

const tool = defineTool({
  name: "get_followers",
  description:
    "Get the current user's followers on Partiful, as a `users` array of profile objects. Distinct from get_following (who the current user follows, not who follows them).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getFollowers", {}),
});

export default tool;
