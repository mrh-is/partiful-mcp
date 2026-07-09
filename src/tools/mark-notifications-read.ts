import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const outputSchema = z.object({}).passthrough();

export const definition = {
  name: "mark_notifications_read",
  description:
    "Mark all notifications for a Partiful event as read. This is a write action — it changes state on your account. Only call this when the user's intent is clearly to mark notifications read; do not call it speculatively to 'check' notification state.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  annotations: {
    readOnlyHint: false,
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
  return client.post("/markAllNotificationsForEventAsRead", { eventId: args.event_id });
}
