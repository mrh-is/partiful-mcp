import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "get_discover_event_decorators",
  description:
    "Get decorators/metadata for explore page event cards (badges like 'friends going', trending, etc.).",
  inputSchema: z.object({
    event_ids: z.array(z.string()).describe("Array of Partiful event IDs"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_ids: string[] }
): Promise<unknown> {
  return client.post("/getDiscoverEventItemDecorators", { eventIds: args.event_ids });
}
