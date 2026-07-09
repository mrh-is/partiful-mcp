import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events (the home page 'Open invite' tab).",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getDiscoverableEvents", {});
}
