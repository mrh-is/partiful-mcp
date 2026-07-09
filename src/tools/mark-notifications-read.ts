import { z } from "zod";
import type { ApiClient } from "../api/client.js";

export const definition = {
  name: "mark_notifications_read",
  description:
    "Mark all notifications for a Partiful event as read. This is a write action — it changes state on your account.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<unknown> {
  return client.post("/markAllNotificationsForEventAsRead", { eventId: args.event_id });
}
