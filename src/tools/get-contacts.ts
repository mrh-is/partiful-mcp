import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    contacts: z
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

const tool = defineTool({
  name: "get_contacts",
  description:
    "Get your Partiful contact list. Returns an array of contact user profiles (id, name, display name, username).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getContacts", {}),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
