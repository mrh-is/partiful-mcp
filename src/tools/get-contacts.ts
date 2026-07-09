import { z } from "zod";
import type { ApiClient } from "../api/client.js";

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

export const definition = {
  name: "get_contacts",
  description:
    "Get your Partiful contact list. Returns an array of contact user profiles (id, name, display name, username).",
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
  return client.post("/getContacts", {});
}
