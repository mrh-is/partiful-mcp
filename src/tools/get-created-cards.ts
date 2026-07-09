import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_created_cards",
  description: "Get digital cards you've created on Partiful.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getCreatedCards", {});
}
