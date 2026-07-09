import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_cohost_requested_events",
  description: "Get events where you've been asked to cohost.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<unknown> {
  return client.post("/getCohostRequestedEvents", {});
}
