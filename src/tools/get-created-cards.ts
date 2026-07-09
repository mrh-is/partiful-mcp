import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    cards: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            title: z.string().optional(),
            imageUrl: z.string().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_created_cards",
  description:
    "Get digital cards you've created on Partiful. Returns an array of card objects (id, title, image).",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getCreatedCards", {}),
});

export default tool;