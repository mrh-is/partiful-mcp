import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "mark_notifications_read",
  description:
    "Mark all notifications for a Partiful event as read. This is a write action — it changes state on your account. Only call this when the user's intent is clearly to mark notifications read; do not call it speculatively to 'check' notification state.",
  annotations: { readOnlyHint: false },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) => {
    const result = await client.post<unknown>(
      "/markAllNotificationsForEventAsRead",
      { eventId: args.event_id }
    );
    // This endpoint may return null/no body on success (a bare ack). The SDK's
    // registerTool() requires `result.structuredContent` to be truthy whenever
    // an outputSchema is registered (see McpServer's tool-call handler), and
    // will throw "has an output schema but no structured content was provided"
    // before schema validation even runs if we pass through null/undefined
    // here. Normalize to `{}` — which satisfies both the truthiness check and
    // this schema's z.looseObject({}) — so a genuinely empty ack
    // doesn't hard-fail the tool call.
    return (result && typeof result === "object" ? result : {}) as z.infer<
      typeof outputSchema
    >;
  },
});

export default tool;