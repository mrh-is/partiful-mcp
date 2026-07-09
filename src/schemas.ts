import { z } from "zod";

export const imageSchema = z
  .looseObject({
    url: z.string(),
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
    titleFont: z.string(),
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
export const eventSchema = z
  .looseObject({
    id: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
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
    calendarFile: z.string(),
    guest: guestSchema,
  })
  .partial()
  .required({ id: true });
export type PartifulEvent = z.infer<typeof eventSchema>;

export const myRsvpsDataSchema = z.looseObject({
  events: z.array(eventSchema),
});
export type MyRsvpsData = z.infer<typeof myRsvpsDataSchema>;

export const userSchema = z
  .looseObject({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    username: z.string(),
    profileImageUrl: z.string(),
  })
  .partial();
export type User = z.infer<typeof userSchema>;

export const mutualSchema = userSchema.omit({ profileImageUrl: true });
export type Mutual = z.infer<typeof mutualSchema>;
