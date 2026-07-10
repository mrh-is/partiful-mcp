import { z } from "zod";

export const imageSchema = z
  .looseObject({
    url: z.url(),
    contentType: z.string(),
    blurHash: z.string(),
    width: z.number(),
    height: z.number(),
  })
  .partial();
export type EventImage = z.infer<typeof imageSchema>;

export const displaySettingsSchema = z
  .looseObject({
    effect: z.string(),
    theme: z.string(),
    // Real event data has titleFont: null for some events (e.g. "TBD" events
    // without a date set yet).
    titleFont: z.string().nullable(),
  })
  .partial();
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;

export const guestStatusCountsSchema = z
  .looseObject({
    GOING: z.number(),
    MAYBE: z.number(),
    DECLINED: z.number(),
    SENT: z.number(),
    WAITLIST: z.number(),
    INTERESTED: z.number(),
    PENDING_APPROVAL: z.number(),
  })
  .partial();
export type GuestStatusCounts = z.infer<typeof guestStatusCountsSchema>;

export const guestSchema = z
  .looseObject({
    id: z.string(),
    eventId: z.string(),
    userId: z.string(),
    status: z.string(),
  })
  .partial();
export type Guest = z.infer<typeof guestSchema>;

// Every field is optional except `id` — the one thing every caller needs to
// chain into other tools — since we don't control the API's actual shape.
// IDs stay z.string(): live-data checks (see __tests__/live.test.ts) confirm
// Partiful's event/user/guest IDs are Firestore auto-IDs or Firebase UIDs,
// not RFC 4122 UUIDs, so z.uuid() would reject real responses.
export const eventSchema = z
  .looseObject({
    id: z.string(),
    title: z.string(),
    // Events without a date set yet report startDate as the literal "TBD"
    // rather than an ISO string.
    startDate: z.union([z.iso.datetime(), z.literal("TBD")]),
    // Real event data has ongoing/open-ended events with endDate: null.
    endDate: z.union([z.iso.datetime(), z.literal("TBD")]).nullable(),
    status: z.string(),
    timezone: z.string(),
    location: z.string(),
    locationDisplayText: z.string(),
    ownerIds: z.array(z.string()),
    image: imageSchema,
    displaySettings: displaySettingsSchema,
    showHostList: z.boolean(),
    showGuestList: z.boolean(),
    showGuestCount: z.boolean(),
    allowGuestPhotoUpload: z.boolean(),
    attendedGuestCount: z.number(),
    guestStatusCounts: guestStatusCountsSchema,
    calendarFile: z.url(),
    guest: guestSchema,
  })
  .partial()
  .required({ id: true });
export type PartifulEvent = z.infer<typeof eventSchema>;

export const userSchema = z
  .looseObject({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    username: z.string(),
    profileImageUrl: z.url(),
  })
  .partial();
export type User = z.infer<typeof userSchema>;

export const mutualSchema = userSchema.omit({ profileImageUrl: true });
export type Mutual = z.infer<typeof mutualSchema>;
