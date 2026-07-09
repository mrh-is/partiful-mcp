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
  })
  .passthrough();

const outputSchema = z.object({ events: z.array(eventSchema) }).passthrough();

export const definition = {
  name: "get_followed_events",
  description:
    "Get Partiful events you're following, as an `events` array. Following tracks events from hosts/pages you follow without necessarily RSVPing, distinct from get_saved_events (explicitly bookmarked events), get_discoverable_events (open invite public events), and get_my_events (events you've been invited to or RSVPed to).",
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
  return client.post<z.infer<typeof outputSchema>>("/getMyFollowedEvents", {});
}
