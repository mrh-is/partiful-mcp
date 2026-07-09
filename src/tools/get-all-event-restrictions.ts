import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_all_event_restrictions",
  description: "Get restrictions across all of your Partiful events.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getAllEventRestrictions", {});
}
