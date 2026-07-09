import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_contacts",
  description: "Get your Partiful contact list.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getContacts", {});
}
