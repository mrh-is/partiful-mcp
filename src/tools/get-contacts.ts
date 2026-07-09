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
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>("/getContacts", {}),
});

export default tool;