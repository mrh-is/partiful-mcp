import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

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

const tool = defineTool({
  name: "get_created_cards",
  description:
    "Get digital cards you've created on Partiful. Returns an array of card objects (id, title, image).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getCreatedCards", {}),
});

export default tool;