import { describe, it, expect, vi } from "vitest";
import { createServer, assertStructuredContent } from "../server.js";
import type { ApiClient } from "../api/client.js";

const EXPECTED_TOOL_NAMES = [
  "get_all_event_restrictions",
  "get_cohost_requested_events",
  "get_contacts",
  "get_contacts_filtered_by_event",
  "get_created_cards",
  "get_discover_curation_options",
  "get_discover_event_item_decorators",
  "get_discoverable_events",
  "get_event_comments",
  "get_event_discover_info",
  "get_event_discover_status",
  "get_event_displayed_host_messages",
  "get_event_info",
  "get_event_media",
  "get_event_permission",
  "get_event_restrictions",
  "get_event_ticketing_eligibility",
  "get_followers",
  "get_following",
  "get_guest_payment_info",
  "get_guests",
  "get_host_promo_codes",
  "get_host_ticket_types",
  "get_last_questionnaire_answers",
  "get_my_communities",
  "get_my_followed_events",
  "get_my_past_events_for_home_page",
  "get_my_rsvps",
  "get_my_saved_events",
  "get_my_upcoming_events_for_home_page",
  "get_mutual_guests",
  "get_mutuals",
  "get_payout_summary_for_event",
  "get_pending_cohost_request_for_event",
  "get_published_events",
  "get_ticket_fee_config",
  "get_tickets_for_event",
  "get_tickets_for_ticket_type",
  "get_users",
  "get_users_party_stats",
  "mark_all_notifications_for_event_as_read",
];

function mockClient(): ApiClient {
  return {
    post: vi.fn().mockResolvedValue({}),
    getUserId: vi.fn().mockResolvedValue("u1"),
  };
}

describe("createServer auto-discovery", () => {
  it("registers all expected tools", async () => {
    const server = await createServer(mockClient());
    const registered = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools
    );

    for (const name of EXPECTED_TOOL_NAMES) {
      expect(registered).toContain(name);
    }
    expect(registered).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });
});

describe("field selection", () => {
  it("filters response when fields parameter is provided", async () => {
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      event: {
        id: "e1",
        title: "Party",
        location: "NYC",
        image: { url: "http://img", width: 100 },
      },
      passwordRequired: false,
    });

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { handler: Function }> }
    )._registeredTools;

    const getEventInfo = registeredTools["get_event_info"];
    expect(getEventInfo).toBeDefined();

    const result = await getEventInfo.handler({
      event_id: "e1",
      fields: ["event.id", "event.title", "passwordRequired"],
    });

    expect(result.structuredContent).toEqual({
      event: { id: "e1", title: "Party" },
      passwordRequired: false,
    });
  });

  it("returns full response when fields is omitted", async () => {
    const fullData = { event: { id: "e1", title: "Party" }, passwordRequired: false };
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(fullData);

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { handler: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].handler({
      event_id: "e1",
    });

    expect(result.structuredContent).toEqual(fullData);
  });

  it("returns full response when fields is empty array", async () => {
    const fullData = { event: { id: "e1" }, passwordRequired: true };
    const client = mockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(fullData);

    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { handler: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].handler({
      event_id: "e1",
      fields: [],
    });

    expect(result.structuredContent).toEqual(fullData);
  });

  it("returns error for invalid field paths", async () => {
    const client = mockClient();
    const server = await createServer(client);
    const registeredTools = (
      server as unknown as { _registeredTools: Record<string, { handler: Function }> }
    )._registeredTools;

    const result = await registeredTools["get_event_info"].handler({
      event_id: "e1",
      fields: ["event.nonexistent"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/unknown field/i);
  });
});

describe("assertStructuredContent", () => {
  it("throws a message naming the tool when a handler returns a bare array", () => {
    expect(() => assertStructuredContent(["a", "b"], "get_example")).toThrow(
      /get_example.*bare array/
    );
  });

  it("does not throw for a plain object", () => {
    expect(() => assertStructuredContent({ items: [] }, "get_example")).not.toThrow();
  });
});
