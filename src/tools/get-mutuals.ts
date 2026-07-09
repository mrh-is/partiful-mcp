import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { mutualSchema } from "../schemas.js";

const outputSchema = z
  .looseObject({ mutuals: z.array(mutualSchema).optional() });

const tool = defineTool({
  name: "get_mutuals",
  description:
    "Get your mutual connections on Partiful — people you've been at the same events with. Returns an array of user profiles (id, name, display name, username).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMutuals", {}),
});

export default tool;