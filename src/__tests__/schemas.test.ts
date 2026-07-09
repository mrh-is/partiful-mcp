import { describe, it, expect } from "vitest";
import { eventSchema, userSchema, mutualSchema, guestSchema } from "../schemas.js";

describe("schemas", () => {
  it("eventSchema accepts a minimal event with only id", () => {
    const result = eventSchema.safeParse({ id: "e1" });
    expect(result.success).toBe(true);
  });

  it("eventSchema accepts a fully populated event", () => {
    const result = eventSchema.safeParse({
      id: "e1",
      title: "Party",
      startDate: "2026-07-09T00:00:00.000Z",
      endDate: null,
      ownerIds: ["u1"],
      image: { url: "https://example.com/img.png", contentType: "image/png" },
      displaySettings: { effect: "confetti", theme: "dark" },
      guestStatusCounts: { GOING: 3, MAYBE: 1 },
      guest: { id: "g1", eventId: "e1", userId: "u1", status: "GOING" },
    });
    expect(result.success).toBe(true);
  });

  it("eventSchema accepts a null endDate (open-ended events)", () => {
    const result = eventSchema.safeParse({
      id: "e1",
      startDate: "2026-07-09T00:00:00.000Z",
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("eventSchema rejects a non-ISO startDate", () => {
    const result = eventSchema.safeParse({ id: "e1", startDate: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("eventSchema rejects a non-URL calendarFile", () => {
    const result = eventSchema.safeParse({ id: "e1", calendarFile: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("eventSchema rejects an event missing id", () => {
    const result = eventSchema.safeParse({ title: "No ID" });
    expect(result.success).toBe(false);
  });

  it("eventSchema passes through unknown fields", () => {
    const result = eventSchema.safeParse({ id: "e1", somethingNew: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).somethingNew).toBe(42);
    }
  });

  it("userSchema and mutualSchema accept minimal objects", () => {
    expect(userSchema.safeParse({}).success).toBe(true);
    expect(mutualSchema.safeParse({}).success).toBe(true);
  });

  it("guestSchema accepts a guest record", () => {
    const result = guestSchema.safeParse({
      id: "g1",
      eventId: "e1",
      userId: "u1",
      status: "GOING",
    });
    expect(result.success).toBe(true);
  });
});
