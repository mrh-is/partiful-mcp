import { describe, it, expect, vi } from "vitest";
import getMyEventsTool from "../tools/get-my-events.js";
import getEventTool from "../tools/get-event.js";
import getHostedEventsTool from "../tools/get-hosted-events.js";
import getMutualsTool from "../tools/get-mutuals.js";
import getUsersTool from "../tools/get-users.js";
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

    const result = await getMyEventsTool.handler(client, {});
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

    const result = await getEventTool.handler(client, { event_id: "e2" });
    expect(result).toEqual({ id: "e2", title: "Brunch" });
  });

  it("throws when event not found", async () => {
    const client = mockClient({ events: [] });
    await expect(
      getEventTool.handler(client, { event_id: "nope" })
    ).rejects.toThrow("not found");
  });
});

describe("get-hosted-events", () => {
  it("calls getHostedEvents and returns result", async () => {
    const data = { events: [{ id: "h1" }] };
    const client = mockClient(data);

    const result = await getHostedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostedEvents", {});
  });
});

describe("get-mutuals", () => {
  it("calls getMutuals and returns result", async () => {
    const data = { mutuals: [{ name: "Alice" }] };
    const client = mockClient(data);

    const result = await getMutualsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMutuals", {});
  });
});

describe("get-users", () => {
  it("calls getUsers with user IDs", async () => {
    const data = { users: [{ id: "u1", name: "Bob" }] };
    const client = mockClient(data);

    const result = await getUsersTool.handler(client, {
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

import getMyUpcomingEventsTool from "../tools/get-my-upcoming-events.js";
import getMyPastEventsTool from "../tools/get-my-past-events.js";
import getDiscoverableEventsTool from "../tools/get-discoverable-events.js";
import getSavedEventsTool from "../tools/get-saved-events.js";
import getFollowedEventsTool from "../tools/get-followed-events.js";

describe("get-my-upcoming-events", () => {
  it("calls getMyUpcomingEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getMyUpcomingEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyUpcomingEventsForHomePage", {});
  });
});

describe("get-my-past-events", () => {
  it("calls getMyPastEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e2" }] };
    const client = mockClient(data);

    const result = await getMyPastEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyPastEventsForHomePage", {});
  });
});

describe("get-discoverable-events", () => {
  it("calls getDiscoverableEvents and returns result", async () => {
    const data = { events: [{ id: "e3" }] };
    const client = mockClient(data);

    const result = await getDiscoverableEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverableEvents", {});
  });
});

describe("get-saved-events", () => {
  it("calls getMySavedEvents and returns result", async () => {
    const data = { events: [{ id: "e4" }] };
    const client = mockClient(data);

    const result = await getSavedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMySavedEvents", {});
  });
});

describe("get-followed-events", () => {
  it("calls getMyFollowedEvents and returns result", async () => {
    const data = { events: [{ id: "e5" }] };
    const client = mockClient(data);

    const result = await getFollowedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyFollowedEvents", {});
  });
});

import getGuestsTool from "../tools/get-guests.js";
import getEventCommentsTool from "../tools/get-event-comments.js";
import getEventMediaTool from "../tools/get-event-media.js";
import getEventRestrictionsTool from "../tools/get-event-restrictions.js";
import getEventPermissionTool from "../tools/get-event-permission.js";
import getEventHostMessagesTool from "../tools/get-event-host-messages.js";
import getEventTicketingEligibilityTool from "../tools/get-event-ticketing-eligibility.js";
import getPendingCohostRequestTool from "../tools/get-pending-cohost-request.js";

describe("get-guests", () => {
  it("calls getGuests with eventId", async () => {
    const data = { guests: [{ id: "g1" }] };
    const client = mockClient(data);

    const result = await getGuestsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getGuests", { eventId: "e1" });
  });
});

describe("get-event-comments", () => {
  it("calls getEventComments with eventId", async () => {
    const data = { comments: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getEventCommentsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventComments", { eventId: "e1" });
  });
});

describe("get-event-media", () => {
  it("calls getEventMedia with eventId", async () => {
    const data = { media: [{ id: "m1" }] };
    const client = mockClient(data);

    const result = await getEventMediaTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventMedia", { eventId: "e1" });
  });
});

describe("get-event-restrictions", () => {
  it("calls getEventRestrictions with eventId", async () => {
    const data = { minAge: 21 };
    const client = mockClient(data);

    const result = await getEventRestrictionsTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventRestrictions", { eventId: "e1" });
  });
});

describe("get-event-permission", () => {
  it("calls getEventPermission with eventId", async () => {
    const data = { canEdit: true };
    const client = mockClient(data);

    const result = await getEventPermissionTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventPermission", { eventId: "e1" });
  });
});

describe("get-event-host-messages", () => {
  it("calls getEventDisplayedHostMessages with eventId", async () => {
    const data = { messages: [] };
    const client = mockClient(data);

    const result = await getEventHostMessagesTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDisplayedHostMessages", { eventId: "e1" });
  });
});

describe("get-event-ticketing-eligibility", () => {
  it("calls getEventTicketingEligibility with eventId", async () => {
    const data = { eligible: false };
    const client = mockClient(data);

    const result = await getEventTicketingEligibilityTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventTicketingEligibility", { eventId: "e1" });
  });
});

describe("get-pending-cohost-request", () => {
  it("calls getPendingCohostRequestForEvent with eventId", async () => {
    const data = { request: null };
    const client = mockClient(data);

    const result = await getPendingCohostRequestTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getPendingCohostRequestForEvent", { eventId: "e1" });
  });
});

import getHostPromoCodesTool from "../tools/get-host-promo-codes.js";
import getHostTicketTypesTool from "../tools/get-host-ticket-types.js";
import getEventDiscoverStatusTool from "../tools/get-event-discover-status.js";

describe("get-host-promo-codes", () => {
  it("calls getHostPromoCodes with eventId", async () => {
    const data = { codes: [] };
    const client = mockClient(data);

    const result = await getHostPromoCodesTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostPromoCodes", { eventId: "e1" });
  });
});

describe("get-host-ticket-types", () => {
  it("calls getHostTicketTypes with eventId and includeDisabled", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    const result = await getHostTicketTypesTool.handler(client, {
      event_id: "e1",
      include_disabled: true,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });

  it("defaults includeDisabled to true when omitted", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    await getHostTicketTypesTool.handler(client, { event_id: "e1" });
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });
});

describe("get-event-discover-status", () => {
  it("calls getEventDiscoverStatus with eventId", async () => {
    const data = { listed: false };
    const client = mockClient(data);

    const result = await getEventDiscoverStatusTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDiscoverStatus", { eventId: "e1" });
  });
});

import getCohostRequestedEventsTool from "../tools/get-cohost-requested-events.js";
import getAllEventRestrictionsTool from "../tools/get-all-event-restrictions.js";
import getInvitableContactsTool from "../tools/get-invitable-contacts.js";

describe("get-cohost-requested-events", () => {
  it("calls getCohostRequestedEvents and returns result", async () => {
    const data = { events: [] };
    const client = mockClient(data);

    const result = await getCohostRequestedEventsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCohostRequestedEvents", {});
  });
});

describe("get-all-event-restrictions", () => {
  it("calls getAllEventRestrictions and returns result", async () => {
    const data = { restrictions: [] };
    const client = mockClient(data);

    const result = await getAllEventRestrictionsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getAllEventRestrictions", {});
  });
});

describe("get-invitable-contacts", () => {
  it("calls getInvitableContacts with eventId, skip, and limit", async () => {
    const data = { contacts: [] };
    const client = mockClient(data);

    const result = await getInvitableContactsTool.handler(client, {
      event_id: "e1",
      skip: 0,
      limit: 20,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getInvitableContacts", {
      eventId: "e1",
      skip: 0,
      limit: 20,
    });
  });
});

import getUsersPartyStatsTool from "../tools/get-users-party-stats.js";
import getContactsTool from "../tools/get-contacts.js";
import getMyCommunitiesTool from "../tools/get-my-communities.js";
import getCreatedCardsTool from "../tools/get-created-cards.js";

describe("get-users-party-stats", () => {
  it("calls getUsersPartyStats with userIds", async () => {
    const data = { stats: [] };
    const client = mockClient(data);

    const result = await getUsersPartyStatsTool.handler(client, { user_ids: ["u1", "u2"] });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsersPartyStats", { userIds: ["u1", "u2"] });
  });
});

describe("get-contacts", () => {
  it("calls getContacts and returns result", async () => {
    const data = { contacts: [] };
    const client = mockClient(data);

    const result = await getContactsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getContacts", {});
  });
});

describe("get-my-communities", () => {
  it("calls getMyCommunities and returns result", async () => {
    const data = { communities: [] };
    const client = mockClient(data);

    const result = await getMyCommunitiesTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyCommunities", {});
  });
});

describe("get-created-cards", () => {
  it("calls getCreatedCards and returns result", async () => {
    const data = { cards: [] };
    const client = mockClient(data);

    const result = await getCreatedCardsTool.handler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCreatedCards", {});
  });
});

import getDiscoverEventDecoratorsTool from "../tools/get-discover-event-decorators.js";

describe("get-discover-event-decorators", () => {
  it("calls getDiscoverEventItemDecorators with eventIds", async () => {
    const data = { decorators: [] };
    const client = mockClient(data);

    const result = await getDiscoverEventDecoratorsTool.handler(client, {
      event_ids: ["e1", "e2"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverEventItemDecorators", {
      eventIds: ["e1", "e2"],
    });
  });
});

import markNotificationsReadTool from "../tools/mark-notifications-read.js";

describe("mark-notifications-read", () => {
  it("calls markAllNotificationsForEventAsRead with eventId", async () => {
    const data = { success: true };
    const client = mockClient(data);

    const result = await markNotificationsReadTool.handler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/markAllNotificationsForEventAsRead", {
      eventId: "e1",
    });
  });
});
