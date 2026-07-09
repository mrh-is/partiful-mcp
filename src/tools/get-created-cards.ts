import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    cards: z
      .array(
        z
          .object({
            id: z.string().optional(),
            title: z.string().optional(),
            imageUrl: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const definition = {
  name: "get_created_cards",
  description:
    "Get digital cards you've created on Partiful. Returns an array of card objects (id, title, image).",
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
  return client.post("/getCreatedCards", {});
}
