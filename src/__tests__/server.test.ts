import { describe, it, expect, vi } from "vitest";
import { createServer, assertStructuredContent } from "../server.js";
import type { ApiClient } from "../api/client.js";

const EXPECTED_TOOL_NAMES = [
  "get_all_event_restrictions",
  "get_cohost_requested_events",
  "get_contacts",
  "get_created_cards",
  "get_discover_event_decorators",
  "get_discoverable_events",
  "get_event_comments",
  "get_event_discover_status",
  "get_event_host_messages",
  "get_event_media",
  "get_event_permission",
  "get_event_restrictions",
  "get_event_ticketing_eligibility",
  "get_event",
  "get_followed_events",
  "get_guests",
  "get_host_promo_codes",
  "get_host_ticket_types",
  "get_hosted_events",
  "get_invitable_contacts",
  "get_mutuals",
  "get_my_communities",
  "get_my_events",
  "get_my_past_events",
  "get_my_upcoming_events",
  "get_pending_cohost_request",
  "get_saved_events",
  "get_users_party_stats",
  "get_users",
  "mark_notifications_read",
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
