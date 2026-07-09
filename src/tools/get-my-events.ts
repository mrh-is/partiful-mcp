import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData } from "../types.js";

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
    showHostList: z.boolean().optional(),
    showGuestList: z.boolean().optional(),
    showGuestCount: z.boolean().optional(),
    allowGuestPhotoUpload: z.boolean().optional(),
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
    calendarFile: z.string().optional(),
    guest: z
      .object({
        id: z.string(),
        eventId: z.string(),
        userId: z.string(),
        status: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

export const definition = {
  name: "get_my_events",
  description:
    "Get every Partiful event you've been invited to or RSVPed to (any status, any time period), as an `events` array with the richest per-event data available (RSVP status, guest counts, image, display settings). Broader than get_my_upcoming_events/get_my_past_events (which are time-filtered home-page views) and distinct from get_hosted_events (events you host rather than attend) and get_discoverable_events/get_saved_events/get_followed_events (events you haven't necessarily RSVPed to).",
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
): Promise<MyRsvpsData> {
  return client.post<MyRsvpsData>("/getMyRsvps", {});
}
