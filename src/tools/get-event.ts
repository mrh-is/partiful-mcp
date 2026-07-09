import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData, PartifulEvent } from "../types.js";

const outputSchema = z
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

export const definition = {
  name: "get_event",
  description:
    "Get full details for a specific Partiful event by ID. Returns the complete event object: title, dates, location, ownership, host/guest display settings, guest status counts, and the current user's own RSVP (guest) record.",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  outputSchema,
};

export async function handler(
  client: ApiClient,
  args: { event_id: string }
): Promise<PartifulEvent> {
  const data = await client.post<MyRsvpsData>("/getMyRsvps", {});
  const event = data.events.find((e) => e.id === args.event_id);
  if (!event) {
    throw new Error(
      `Event ${args.event_id} not found in your invites. Check the event ID and make sure you've been invited.`
    );
  }
  return event;
}
