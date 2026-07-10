import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractFieldPaths } from "../field-selection.js";

describe("extractFieldPaths", () => {
  it("extracts top-level keys from a flat object", () => {
    const schema = z.looseObject({
      name: z.string(),
      age: z.number(),
    });
    expect(extractFieldPaths(schema)).toEqual(["age", "name"]);
  });

  it("extracts nested object paths", () => {
    const schema = z.looseObject({
      event: z.looseObject({
        title: z.string(),
        image: z.looseObject({
          url: z.string(),
          width: z.number(),
        }).partial(),
      }).partial(),
    });
    expect(extractFieldPaths(schema)).toEqual([
      "event",
      "event.image",
      "event.image.url",
      "event.image.width",
      "event.title",
    ]);
  });

  it("drills into array elements", () => {
    const schema = z.looseObject({
      events: z.array(
        z.looseObject({ id: z.string(), title: z.string() }).partial()
      ),
    });
    expect(extractFieldPaths(schema)).toEqual([
      "events",
      "events.id",
      "events.title",
    ]);
  });

  it("unwraps optional and nullable", () => {
    const schema = z.looseObject({
      name: z.string().optional(),
      bio: z.string().nullable(),
    });
    expect(extractFieldPaths(schema)).toEqual(["bio", "name"]);
  });

  it("handles union by merging paths from all variants", () => {
    const schema = z.looseObject({
      startDate: z.union([z.string(), z.literal("TBD")]),
    });
    expect(extractFieldPaths(schema)).toEqual(["startDate"]);
  });

  it("handles .partial().required() (nonoptional wrapper)", () => {
    const schema = z
      .looseObject({ id: z.string(), title: z.string() })
      .partial()
      .required({ id: true });
    expect(extractFieldPaths(schema)).toEqual(["id", "title"]);
  });

  it("returns empty array for empty looseObject", () => {
    const schema = z.looseObject({});
    expect(extractFieldPaths(schema)).toEqual([]);
  });

  it("handles the real eventSchema shape", () => {
    const imageSchema = z.looseObject({ url: z.string(), width: z.number() }).partial();
    const guestSchema = z.looseObject({ id: z.string(), status: z.string() }).partial();
    const eventSchema = z
      .looseObject({
        id: z.string(),
        title: z.string(),
        image: imageSchema,
        guest: guestSchema,
      })
      .partial()
      .required({ id: true });

    const outputSchema = z.looseObject({
      event: eventSchema,
      passwordRequired: z.boolean().optional(),
    });

    const paths = extractFieldPaths(outputSchema);
    expect(paths).toContain("event");
    expect(paths).toContain("event.id");
    expect(paths).toContain("event.title");
    expect(paths).toContain("event.image");
    expect(paths).toContain("event.image.url");
    expect(paths).toContain("event.guest");
    expect(paths).toContain("event.guest.id");
    expect(paths).toContain("event.guest.status");
    expect(paths).toContain("passwordRequired");
  });
});
