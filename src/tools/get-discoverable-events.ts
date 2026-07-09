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
  })
  .passthrough();

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

export const definition = {
  name: "get_discoverable_events",
  description:
    "Get open-invite / discoverable Partiful events for the home page 'Open invite' tab, as an `events` array. Unlike get_my_events/get_my_upcoming_events/get_my_past_events/get_hosted_events, these events aren't necessarily ones you've been invited to or RSVPed to — they're publicly discoverable events surfaced to you. Distinct from get_saved_events (events you've explicitly bookmarked) and get_followed_events (events from people/pages you follow).",
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
    "/getDiscoverableEvents",
    {}
  );
}
