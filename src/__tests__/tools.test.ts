import { describe, it, expect, vi } from "vitest";
import { handler as getMyEventsHandler } from "../tools/get-my-events.js";
import { handler as getEventHandler } from "../tools/get-event.js";
import { handler as getHostedEventsHandler } from "../tools/get-hosted-events.js";
import { handler as getMutualsHandler } from "../tools/get-mutuals.js";
import { handler as getUsersHandler } from "../tools/get-users.js";
import type { ApiClient } from "../api/client.js";

function mockClient(data: unknown): ApiClient {
  return {
    post: vi.fn().mockResolvedValue(data),
  };
}

describe("get-my-events", () => {
  it("calls getMyRsvps and returns events", async () => {
    const events = [{ id: "e1", title: "Party" }];
    const client = mockClient({ events });

    const result = await getMyEventsHandler(client, {});
    expect(result).toEqual({ events });
    expect(client.post).toHaveBeenCalledWith("/getMyRsvps", {});
  });
});

describe("get-event", () => {
  it("filters a specific event from getMyRsvps", async () => {
    const events = [
      { id: "e1", title: "Party" },
      { id: "e2", title: "Brunch" },
    ];
    const client = mockClient({ events });

    const result = await getEventHandler(client, { event_id: "e2" });
    expect(result).toEqual({ id: "e2", title: "Brunch" });
  });

  it("throws when event not found", async () => {
    const client = mockClient({ events: [] });
    await expect(
      getEventHandler(client, { event_id: "nope" })
    ).rejects.toThrow("not found");
  });
});

describe("get-hosted-events", () => {
  it("calls getHostedEvents and returns result", async () => {
    const data = { events: [{ id: "h1" }] };
    const client = mockClient(data);

    const result = await getHostedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostedEvents", {});
  });
});

describe("get-mutuals", () => {
  it("calls getMutuals and returns result", async () => {
    const data = { mutuals: [{ name: "Alice" }] };
    const client = mockClient(data);

    const result = await getMutualsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMutuals", {});
  });
});

describe("get-users", () => {
  it("calls getUsers with user IDs", async () => {
    const data = { users: [{ id: "u1", name: "Bob" }] };
    const client = mockClient(data);

    const result = await getUsersHandler(client, {
      user_ids: ["u1"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsers", {
      ids: ["u1"],
      excludePartyStats: false,
      includePartyStats: true,
    });
  });
});
