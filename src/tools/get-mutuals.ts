import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    mutuals: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            displayName: z.string().optional(),
            username: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_mutuals",
  description:
    "Get your mutual connections on Partiful — people you've been at the same events with. Returns an array of user profiles (id, name, display name, username).",
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
  return client.post("/getMutuals", {});
}
