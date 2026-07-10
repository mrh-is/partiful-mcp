import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";
import { mutualSchema } from "../schemas.js";

const outputSchema = z
  .looseObject({
    contacts: z.array(mutualSchema).optional(),
  });

const tool = defineTool({
  name: "get_contacts",
  description:
    "Get your Partiful contact list. Returns an array of contact user profiles (id, name, display name, username).",
  inputSchema: z.object({}),
  outputSchema,
  // /getContacts returns a bare array, not { contacts: [...] } — wrap it so
  // structuredContent stays a JSON object as the MCP SDK requires.
  handler: async (client: ApiClient, _args) => {
    const contacts = await client.post<z.infer<typeof mutualSchema>[]>(
      "/getContacts",
      {}
    );
    return { contacts };
  },
});

export default tool;