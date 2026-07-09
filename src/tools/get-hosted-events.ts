import { z } from "zod";
import type { ApiClient } from "../api/client.js";

const eventSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
    timezone: z.string().optional(),
    location: z.string().optional(),
    locationDisplayText: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    image: z
      .object({
        url: z.string(),
        contentType: z.string(),
        blurHash: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .passthrough()
      .optional(),
    displaySettings: z
      .object({
        effect: z.string().optional(),
        theme: z.string().optional(),
        titleFont: z.string().optional(),
      })
      .passthrough()
      .optional(),
    attendedGuestCount: z.number().optional(),
    guestStatusCounts: z
      .object({
        GOING: z.number().optional(),
        MAYBE: z.number().optional(),
        DECLINED: z.number().optional(),
        SENT: z.number().optional(),
        WAITLIST: z.number().optional(),
        INTERESTED: z.number().optional(),
        PENDING_APPROVAL: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

export const definition = {
  name: "get_hosted_events",
  description:
    "Get all Partiful events you are hosting (any time period), as an `events` array with title, date, location, and guest counts. Use this instead of get_my_events (which covers events you attend/RSVP to, not necessarily host) or get_my_upcoming_events/get_my_past_events (which are home-page views scoped by time, not by host role).",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  outputSchema,
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<z.infer<typeof outputSchema>> {
  return client.post<z.infer<typeof outputSchema>>("/getHostedEvents", {});
}
