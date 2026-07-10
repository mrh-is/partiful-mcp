import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    communities: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            name: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_my_communities",
  description:
    "Get the Partiful communities you belong to. Returns an array of community objects (id, name).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyCommunities", {}),
});

export default tool;