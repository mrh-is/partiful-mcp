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
  // /getMutuals returns a bare array, not { mutuals: [...] } — wrap it so
  // structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, _args) => {
    const mutuals = await client.post<z.infer<typeof mutualSchema>[]>(
      "/getMutuals",
      {}
    );
    return { mutuals };
  },
});

export default tool;