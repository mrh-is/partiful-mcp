import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractFieldPaths, validateFields, filterFields } from "../field-selection.js";

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

describe("validateFields", () => {
  const validPaths = [
    "event",
    "event.id",
    "event.title",
    "event.image",
    "event.image.url",
    "passwordRequired",
  ];

  it("accepts valid field paths", () => {
    expect(() => validateFields(["event.id", "event.title"], validPaths)).not.toThrow();
  });

  it("accepts intermediate paths (returns whole subtree)", () => {
    expect(() => validateFields(["event"], validPaths)).not.toThrow();
  });

  it("throws for an unknown field path", () => {
    expect(() => validateFields(["event.nonexistent"], validPaths)).toThrow(
      /unknown field.*event\.nonexistent/i
    );
  });

  it("error message lists available paths", () => {
    expect(() => validateFields(["bad"], validPaths)).toThrow(/available fields/i);
  });

  it("throws for all invalid paths in one error", () => {
    expect(() => validateFields(["bad1", "event.id", "bad2"], validPaths)).toThrow(
      /bad1.*bad2/s
    );
  });

  it("deduplicates silently", () => {
    expect(() =>
      validateFields(["event.id", "event.id", "event.title"], validPaths)
    ).not.toThrow();
  });

  it("throws when validPaths is empty (no selectable fields)", () => {
    expect(() => validateFields(["anything"], [])).toThrow(
      /no selectable fields/i
    );
  });
});

describe("filterFields", () => {
  it("picks top-level scalar fields", () => {
    const data = { name: "Alice", age: 30, email: "a@b.com" };
    expect(filterFields(data, ["name", "age"])).toEqual({ name: "Alice", age: 30 });
  });

  it("picks nested object fields with dot-paths", () => {
    const data = {
      event: { id: "1", title: "Party", image: { url: "http://img", width: 100 } },
      passwordRequired: false,
    };
    expect(
      filterFields(data, ["event.title", "event.image.url", "passwordRequired"])
    ).toEqual({
      event: { title: "Party", image: { url: "http://img" } },
      passwordRequired: false,
    });
  });

  it("returns whole subtree when path stops at an object", () => {
    const data = {
      event: { id: "1", image: { url: "http://img", width: 100 } },
    };
    expect(filterFields(data, ["event.image"])).toEqual({
      event: { image: { url: "http://img", width: 100 } },
    });
  });

  it("filters array elements", () => {
    const data = {
      events: [
        { id: "1", title: "A", location: "NYC" },
        { id: "2", title: "B", location: "LA" },
      ],
    };
    expect(filterFields(data, ["events.id", "events.title"])).toEqual({
      events: [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ],
    });
  });

  it("filters nested objects inside array elements", () => {
    const data = {
      events: [
        { id: "1", guest: { userId: "u1", status: "GOING" } },
        { id: "2", guest: { userId: "u2", status: "MAYBE" } },
      ],
    };
    expect(
      filterFields(data, ["events.id", "events.guest.status"])
    ).toEqual({
      events: [
        { id: "1", guest: { status: "GOING" } },
        { id: "2", guest: { status: "MAYBE" } },
      ],
    });
  });

  it("superset path wins — broader path includes whole subtree", () => {
    const data = {
      event: { image: { url: "http://img", width: 100, height: 200 } },
    };
    expect(
      filterFields(data, ["event.image", "event.image.url"])
    ).toEqual({
      event: { image: { url: "http://img", width: 100, height: 200 } },
    });
  });

  it("handles missing keys gracefully (key not in data)", () => {
    const data = { name: "Alice" };
    expect(filterFields(data, ["name", "age"])).toEqual({ name: "Alice" });
  });

  it("returns whole array when path stops at array field", () => {
    const data = { events: [{ id: "1" }, { id: "2" }] };
    expect(filterFields(data, ["events"])).toEqual({
      events: [{ id: "1" }, { id: "2" }],
    });
  });
});
