import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_hosted_events",
  description:
    "Get all Partiful events you're hosting. Returns event details including title, date, location, and guest counts.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getHostedEvents", {});
}
