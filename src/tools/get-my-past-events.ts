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
  name: "get_my_past_events",
  description:
    "Get your past Partiful events for the home page 'All past events' tab, as an `events` array. This is the past-only counterpart to get_my_upcoming_events — for the complete unfiltered history (past and future) use get_my_events instead.",
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
    "/getMyPastEventsForHomePage",
    {}
  );
}
