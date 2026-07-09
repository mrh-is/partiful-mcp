import { z } from "zod";
import type { ApiClient } from "../api/client.js";

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

export const definition = {
  name: "get_my_communities",
  description:
    "Get the Partiful communities you belong to. Returns an array of community objects (id, name).",
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  outputSchema,
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<z.infer<typeof outputSchema>> {
  return client.post("/getMyCommunities", {});
}
