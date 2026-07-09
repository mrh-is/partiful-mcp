import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_my_communities",
  description: "Get the Partiful communities you belong to.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMyCommunities", {});
}
