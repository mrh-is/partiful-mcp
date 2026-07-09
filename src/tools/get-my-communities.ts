import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    communities: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_my_communities",
  description:
    "Get the Partiful communities you belong to. Returns an array of community objects (id, name).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getMyCommunities", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
