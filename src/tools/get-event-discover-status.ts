import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z
  .object({
    discoverable: z.boolean().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const definition = {
  name: "get_event_discover_status",
  description:
    "Check whether a Partiful event is listed on explore/discover. Returns the event's discoverability flag/status.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
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
  args: { event_id: string }
): Promise<z.infer<typeof outputSchema>> {
  const result = await client.post<unknown>("/getEventDiscoverStatus", {
    eventId: args.event_id,
  });
  // The real response shape isn't documented; the outputSchema is a best-effort
  // guess. Guard against a non-object (or missing) response so a mismatched
  // shape doesn't throw an MCP protocol error at the SDK's output-validation step.
  return (result && typeof result === "object" ? result : {}) as z.infer<
    typeof outputSchema
  >;
}
