import { z } from "zod";

export const imageSchema = z
  .object({
    url: z.string().optional(),
    contentType: z.string().optional(),
    blurHash: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .passthrough();
export type EventImage = z.infer<typeof imageSchema>;

export const displaySettingsSchema = z
  .object({
    effect: z.string().optional(),
    theme: z.string().optional(),
    titleFont: z.string().optional(),
  })
  .passthrough();
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;

export const guestStatusCountsSchema = z
  .object({
    GOING: z.number().optional(),
    MAYBE: z.number().optional(),
    DECLINED: z.number().optional(),
    SENT: z.number().optional(),
    WAITLIST: z.number().optional(),
    INTERESTED: z.number().optional(),
    PENDING_APPROVAL: z.number().optional(),
  })
  .passthrough();
export type GuestStatusCounts = z.infer<typeof guestStatusCountsSchema>;

export const guestSchema = z
  .object({
    id: z.string().optional(),
    eventId: z.string().optional(),
    userId: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();
export type Guest = z.infer<typeof guestSchema>;

export const eventSchema = z
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
    image: imageSchema.optional(),
    displaySettings: displaySettingsSchema.optional(),
    showHostList: z.boolean().optional(),
    showGuestList: z.boolean().optional(),
    showGuestCount: z.boolean().optional(),
    allowGuestPhotoUpload: z.boolean().optional(),
    attendedGuestCount: z.number().optional(),
    guestStatusCounts: guestStatusCountsSchema.optional(),
    calendarFile: z.string().optional(),
    guest: guestSchema.optional(),
  })
  .passthrough();
export type PartifulEvent = z.infer<typeof eventSchema>;

export const myRsvpsDataSchema = z
  .object({ events: z.array(eventSchema) })
  .passthrough();
export type MyRsvpsData = z.infer<typeof myRsvpsDataSchema>;

export const userSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    profileImageUrl: z.string().optional(),
  })
  .passthrough();
export type User = z.infer<typeof userSchema>;

export const mutualSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
  })
  .passthrough();
export type Mutual = z.infer<typeof mutualSchema>;
