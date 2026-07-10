import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool, orEmptyObject } from "../define-tool.js";

const outputSchema = z.looseObject({});

const tool = defineTool({
  name: "mark_all_notifications_for_event_as_read",
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
    // This endpoint may return null/no body on success (a bare ack). orEmptyObject()
    // normalizes that to `{}`, which satisfies both the SDK's structuredContent
    // truthiness check and this schema's z.looseObject({}) — see its doc
    // comment in define-tool.ts for why that's needed.
    return orEmptyObject<z.infer<typeof outputSchema>>(result);
  },
});

export default tool;