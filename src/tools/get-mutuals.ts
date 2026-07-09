import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_mutuals",
  description:
    "Get your mutual connections on Partiful — people you've been at the same events with.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getMutuals", {});
}
