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
        url: z.string().optional(),
        contentType: z.string().optional(),
        blurHash: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
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
  name: "get_my_upcoming_events",
  description:
    "Get your upcoming Partiful events for the home page 'Upcoming' view, as an `events` array. This is the future-only, home-page-curated subset — for the complete unfiltered RSVP/invite history use get_my_events, and for hosted-only events regardless of date use get_hosted_events.",
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
  return client.post<z.infer<typeof outputSchema>>(
    "/getMyUpcomingEventsForHomePage",
    {}
  );
}
